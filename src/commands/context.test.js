import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { find, context } from './context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-context-'));
}

/**
 * Columnas completas de la tabla `systems` (evita que `createMysqlStore` intente
 * ALTER TABLE al migrar infra_resources/infra_edges — no es lo que testeamos acá).
 */
const ALL_MYSQL_COLUMNS = ['id', 'canonical_name', 'repo_path', 'c1', 'endpoints', 'consumptions', 'infra_resources', 'infra_edges', 'commit_hash', 'published_at'];

/**
 * Parchea `mysql2/promise`.`createPool` (paquete CJS) para que `createMysqlStore`
 * — invocado internamente por `createGraphStore` con driver `mysql`, SIN
 * inyección de `deps` desde los comandos — reciba un pool falso cuyo
 * `execute`/`end` resuelven con un delay real (`setTimeout`), simulando
 * latencia de red. Así, un `await` faltante en el comando bajo test es
 * detectable: leería el resultado antes de que la promesa resuelva.
 *
 * `mysql2` es CJS; Node expone sus named exports en ESM como getters "vivos"
 * sobre el mismo objeto `module.exports`, así que mutar la propiedad vía
 * `require()` (misma instancia de módulo, cacheada) es visible para el
 * `import('mysql2/promise')` dinámico que hace `mysql.js`.
 */
function patchMysqlCreatePool(delayMs, seedRows) {
  const mysql2Promise = require('mysql2/promise');
  const original = mysql2Promise.createPool;
  const calls = [];
  mysql2Promise.createPool = async () => ({
    execute: (sql, params) => new Promise((resolve) => {
      setTimeout(() => {
        calls.push({ sql, params, resolvedAt: Date.now() });
        if (/information_schema\.columns/i.test(sql)) {
          resolve([ALL_MYSQL_COLUMNS.map((name) => ({ column_name: name }))]);
        } else if (/WHERE canonical_name = \?/i.test(sql)) {
          const row = seedRows.find((r) => r.canonical_name === params[0]);
          resolve([row ? [row] : []]);
        } else if (/SELECT \* FROM systems/i.test(sql)) {
          resolve([seedRows]);
        } else {
          resolve([[]]);
        }
      }, delayMs);
    }),
    end: () => new Promise((resolve) => {
      calls.push({ sql: '__end__', calledAt: Date.now() });
      setTimeout(resolve, delayMs);
    }),
  });
  return { calls, restore: () => { mysql2Promise.createPool = original; } };
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result }))
    .finally(() => { console.log = originalLog; });
}

test('sdd find busca en capabilities.consumptions', async () => {
  const fixtureRoot = join(__dirname, '__fixtures__', 'sample-repo');

  // Capturar salida de console.log
  const logs = [];
  const originalLog = console.log;
  try {
    console.log = (...args) => logs.push(args.join(' '));

    // Llamar find con el query que debería encontrar el consumo
    await find(fixtureRoot, ['queryDeviceList']);
  } finally {
    console.log = originalLog;
  }

  // Verificar que hay al menos una línea que empieza con "consumo" y contiene "queryDeviceList"
  const consumoLines = logs
    .map(l => l.trim())
    .filter(l => l.startsWith('consumo') && l.toLowerCase().includes('querydevicelist'));

  assert.ok(consumoLines.length > 0, 'Debería haber al menos un hit "consumo" que contenga "queryDeviceList"');
});

test('sdd context: sistema publicado → muestra "Publicado:" con hash corto', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');

  const ENV_VAR = 'SDDKIT_TEST_CONTEXT_MYSQL_URL_PUBLISHED';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } };
  fs.writeFileSync(path.join(root, '.sdd', 'config.json'), JSON.stringify(cfg));

  const seedRow = {
    canonical_name: 'test-system',
    repo_path: '/tmp/x',
    c1: '', endpoints: '[]', consumptions: '[]', infra_resources: '[]', infra_edges: '[]',
    commit_hash: 'abc1234567',
    published_at: new Date().toISOString(),
  };
  const { restore } = patchMysqlCreatePool(0, [seedRow]);
  t.after(restore);

  const { logs } = await withCapturedLogs(() => context(root));
  const full = logs.join('\n');

  assert.ok(full.includes('Publicado:'), `Se esperaba una línea "Publicado:", salida: ${full}`);
  assert.ok(full.includes('abc1234'), `Se esperaba el hash corto "abc1234", salida: ${full}`);
});

test('sdd context: sistema nunca publicado → "Sin publicar"', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** never-published-system\n');

  const ENV_VAR = 'SDDKIT_TEST_CONTEXT_MYSQL_URL_NEVER_PUBLISHED';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } };
  fs.writeFileSync(path.join(root, '.sdd', 'config.json'), JSON.stringify(cfg));

  const { restore } = patchMysqlCreatePool(0, []);
  t.after(restore);

  const { logs } = await withCapturedLogs(() => context(root));
  const full = logs.join('\n');

  assert.ok(full.includes('Sin publicar'), `Se esperaba "Sin publicar", salida: ${full}`);
});

test('sdd context: sin grafo configurado → no muestra "Publicado:"', async () => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');

  fs.writeFileSync(path.join(root, '.sdd', 'config.json'), JSON.stringify({}));

  const { logs } = await withCapturedLogs(() => context(root));
  const full = logs.join('\n');

  assert.ok(!full.includes('Publicado:'), `No se esperaba "Publicado:", salida: ${full}`);
});

// --- Paso 13: graphstore async-aware (driver mysql, único soportado según ADR-0011) ---
// `context()` llama `store.querySystem(canonicalName)` SIN `await` (bug documentado en
// .sdd/LEARNINGS.md, tarea 002). Con el driver `sqlite` (síncrono) esto no se nota; con
// `mysql` (async), `sys` termina siendo la Promise misma (truthy), nunca `null`, y
// `sys.publishedAt`/`sys.commitHash` leídos sobre esa Promise dan `undefined`.

test('sdd context (mysql, driver async con delay real): debe esperar querySystem() y mostrar los datos reales, no "undefined"', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** mysql-test-system\n');

  const ENV_VAR = 'SDDKIT_TEST_CONTEXT_MYSQL_URL';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } };
  fs.writeFileSync(path.join(root, '.sdd', 'config.json'), JSON.stringify(cfg));

  const seedRow = {
    canonical_name: 'mysql-test-system',
    repo_path: '/repo/x',
    c1: '', endpoints: '[]', consumptions: '[]', infra_resources: '[]', infra_edges: '[]',
    commit_hash: 'deadbeef1234',
    published_at: '2026-02-03T00:00:00.000Z',
  };
  const { restore } = patchMysqlCreatePool(20, [seedRow]);
  t.after(restore);

  const { logs } = await withCapturedLogs(() => context(root));
  const full = logs.join('\n');

  assert.ok(full.includes('Publicado:'), `Se esperaba "Publicado:", salida: ${full}`);
  assert.ok(full.includes('deadbee'), `Se esperaba el hash corto real "deadbee" (7 chars, no un valor vacío/undefined por no esperar la Promise), salida: ${full}`);
  assert.ok(!full.includes('undefined'), `No debería imprimir "undefined" — señal de que "sys" quedó como la Promise sin resolver, salida: ${full}`);
});

// --- Paso 10 (tarea 011, BR-061/BR-062): sdd context incluye los bloques Mermaid de C4/domain ---
// Hoy context() extrae solo líneas puntuales por regex (sin diagramas, ver comentario del
// módulo en context.js:9 "sin diagramas"). Este test espera que los bloques ```mermaid de
// context.md, containers.md, components.md y domain.md aparezcan en el destilado.

test('sdd context incluye los bloques Mermaid de los docs C4/domain en el destilado', async () => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(
    path.join(c4dir, 'context.md'),
    '**Sistema:** test-system\n\n```mermaid\nflowchart LR\n  user_ctx["Usuario"] -- usa --> sys_ctx["Sistema"]\n```\n',
  );
  fs.writeFileSync(
    path.join(c4dir, 'containers.md'),
    '```mermaid\nflowchart TB\n  app_container["App"]\n```\n',
  );
  fs.writeFileSync(
    path.join(c4dir, 'components.md'),
    '```mermaid\nflowchart LR\n  mod_routes["routes"] --> mod_services["services"]\n```\n',
  );
  fs.writeFileSync(
    path.join(root, '.sdd', 'domain.md'),
    '```mermaid\nflowchart LR\n  alta_cliente["alta de cliente"] --> activacion_cliente["activación"]\n```\n',
  );
  fs.writeFileSync(path.join(root, '.sdd', 'config.json'), JSON.stringify({}));

  const { logs } = await withCapturedLogs(() => context(root));
  const full = logs.join('\n');

  assert.match(full, /```mermaid/, 'el destilado debe incluir al menos un bloque mermaid');
  assert.ok(full.includes('user_ctx'), 'debe incluir el diagrama de context.md');
  assert.ok(full.includes('app_container'), 'debe incluir el diagrama de containers.md');
  assert.ok(full.includes('mod_routes') && full.includes('mod_services'), 'debe incluir el diagrama de components.md');
  assert.ok(full.includes('alta_cliente') && full.includes('activacion_cliente'), 'debe incluir el diagrama de domain.md');
});
