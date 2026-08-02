import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { publish } from './publish.js';
import { createGraphStore } from '../lib/graphstore/index.js';

const require = createRequire(import.meta.url);

/**
 * Columnas completas de la tabla `systems` (evita ALTER TABLE al migrar
 * infra_resources/infra_edges — no es lo que testeamos acá).
 */
const ALL_MYSQL_COLUMNS = ['id', 'canonical_name', 'repo_path', 'c1', 'endpoints', 'consumptions', 'infra_resources', 'infra_edges', 'commit_hash', 'published_at'];

/**
 * Parchea `mysql2/promise`.`createPool` (paquete CJS) para que `createMysqlStore`
 * — invocado internamente por `createGraphStore` con driver `mysql`, SIN
 * inyección de `deps` desde `publish.js` — reciba un pool falso cuyo
 * `execute`/`end` resuelven con un delay real (`setTimeout`), simulando latencia
 * de red. Así, un `await` faltante en `publish()` (bug documentado en
 * `.sdd/LEARNINGS.md`, tarea 002) queda expuesto: el código seguiría antes de
 * que la operación real haya terminado. `order` (si se pasa) registra, en el
 * momento real en que ocurre, cuándo se INVOCA `end()` y cuándo TERMINA
 * (resuelve) el INSERT de `publishSystem` — para verificar que `close()` no se
 * invoca antes de que el INSERT haya resuelto.
 */
function patchMysqlCreatePool(delayMs, { seedRows = [], order } = {}) {
  const mysql2Promise = require('mysql2/promise');
  const original = mysql2Promise.createPool;
  mysql2Promise.createPool = async () => ({
    execute: (sql, params) => new Promise((resolve) => {
      setTimeout(() => {
        if (/information_schema\.columns/i.test(sql)) {
          resolve([ALL_MYSQL_COLUMNS.map((name) => ({ column_name: name }))]);
        } else if (/INSERT INTO systems/i.test(sql)) {
          order?.push('insert-resolved');
          resolve([{}]);
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
    end: () => {
      order?.push('end-called');
      return new Promise((resolve) => {
        setTimeout(() => { order?.push('end-resolved'); resolve(); }, delayMs);
      });
    },
  });
  return { restore: () => { mysql2Promise.createPool = original; } };
}

/**
 * Fake pool en memoria para `deps.createPool` (inyectado directo en
 * `createGraphStore`/`publish`, sin parchear `mysql2/promise`). Interpreta las
 * queries reales de `src/lib/graphstore/mysql.js` y persiste el estado en un
 * `Map` interno indexado por `canonical_name`, para poder migrar los tests de
 * `driver:'sqlite'` a `driver:'mysql'` sin tocar dependencias nativas opcionales.
 */
function fakeMysqlPool(seedRows = []) {
  const rows = new Map(seedRows.map((r) => [r.canonical_name, r]));
  return {
    async execute(sql, params) {
      if (/CREATE TABLE IF NOT EXISTS systems/i.test(sql)) return [[]];
      if (/information_schema\.columns/i.test(sql)) return [[]];
      if (/ALTER TABLE systems ADD COLUMN/i.test(sql)) return [[]];
      if (/INSERT INTO systems/i.test(sql)) {
        const [canonicalName, repoPath, c1, endpoints, consumptions, infraResources, infraEdges, commitHash, publishedAt] = params;
        rows.set(canonicalName, {
          canonical_name: canonicalName,
          repo_path: repoPath,
          c1,
          endpoints,
          consumptions,
          infra_resources: infraResources,
          infra_edges: infraEdges,
          commit_hash: commitHash,
          published_at: publishedAt,
        });
        return [{}];
      }
      if (/SELECT \* FROM systems WHERE canonical_name = \?/i.test(sql)) {
        const row = rows.get(params[0]);
        return [row ? [row] : []];
      }
      if (/SELECT \* FROM systems/i.test(sql)) {
        return [[...rows.values()]];
      }
      return [[]];
    },
    async end() {},
  };
}

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-publish-'));
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result }))
    .finally(() => { console.log = originalLog; });
}

test('publish: gate rechaza si hay checkboxes pendientes en C4', async () => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');
  fs.writeFileSync(
    path.join(c4dir, 'containers.md'),
    '# Containers\n\n## ❓ VALIDAR con el equipo\n\n- [ ] ¿pregunta sin responder?\n',
  );
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const { logs } = await withCapturedLogs(() => publish(root, {}));

  assert.ok(logs.some((l) => l.startsWith('✖')), `Se esperaba un mensaje de rechazo, logs: ${JSON.stringify(logs)}`);
});

test('publish: publica OK y querySystem devuelve la fila publicada', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const ENV_VAR = 'SDDKIT_TEST_PUBLISH_BASIC';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const fakePool = fakeMysqlPool();
  const deps = { createPool: async () => fakePool };

  const { logs } = await withCapturedLogs(() => publish(root, {}, deps));

  assert.ok(logs.some((l) => l.startsWith('✓')), `Se esperaba un mensaje de éxito, logs: ${JSON.stringify(logs)}`);

  const store = await createGraphStore(cfg, deps);
  t.after(() => store.close());

  const sys = await store.querySystem('test-system');
  assert.ok(sys, 'querySystem debería encontrar el sistema publicado');
  assert.equal(sys.canonicalName, 'test-system');
  assert.deepEqual(sys.endpoints, [{ method: 'GET', path: '/x' }]);
  assert.ok(!Number.isNaN(Date.parse(sys.publishedAt)), 'publishedAt debería ser un string ISO válido');
  // commitHash puede ser null si tmpDir no es un repo git.
});

test('publish: grafo no configurado → advertencia, sin throw', async () => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );
  // Sin .sdd/config.json (o sin `graph`).

  const { logs } = await withCapturedLogs(() => publish(root, {}));

  assert.ok(
    logs.some((l) => l.startsWith('⚠') && (l.includes('"graph"') || l.includes('Grafo no configurado'))),
    `Se esperaba un mensaje de advertencia sobre grafo no configurado, logs: ${JSON.stringify(logs)}`,
  );
});

test('publish: repo CON infra en patterns.json → publica infraResources e infraEdges', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system-with-infra\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  const infraResources = [
    {
      name: 'uploads-bucket',
      arn: 'arn:aws:s3:::uploads-bucket',
      type: 'storage',
      address: 'aws_s3_bucket.uploads',
    },
  ];
  const infraEdges = [
    {
      from: 'arn:aws:s3:::uploads-bucket',
      to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload',
      type: 'storage',
      confidence: 'confirmado',
      action: 's3-notification',
    },
  ];
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({
      capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] },
      infra: { resources: infraResources, edges: infraEdges },
    }),
  );

  const ENV_VAR = 'SDDKIT_TEST_PUBLISH_WITH_INFRA';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const fakePool = fakeMysqlPool();
  const deps = { createPool: async () => fakePool };

  const { logs } = await withCapturedLogs(() => publish(root, {}, deps));

  assert.ok(logs.some((l) => l.startsWith('✓')), `Se esperaba un mensaje de éxito, logs: ${JSON.stringify(logs)}`);

  const store = await createGraphStore(cfg, deps);
  t.after(() => store.close());

  const sys = await store.querySystem('test-system-with-infra');
  assert.ok(sys, 'querySystem debería encontrar el sistema publicado');
  assert.equal(sys.canonicalName, 'test-system-with-infra');
  assert.deepEqual(sys.infraResources, infraResources, 'infraResources debería matchear exactamente');
  assert.deepEqual(sys.infraEdges, infraEdges, 'infraEdges debería matchear exactamente');
});

test('publish: repo SIN clave infra en patterns.json → infraResources e infraEdges vacíos', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system-no-infra\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const ENV_VAR = 'SDDKIT_TEST_PUBLISH_NO_INFRA';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const fakePool = fakeMysqlPool();
  const deps = { createPool: async () => fakePool };

  const { logs } = await withCapturedLogs(() => publish(root, {}, deps));

  assert.ok(logs.some((l) => l.startsWith('✓')), `Se esperaba un mensaje de éxito, logs: ${JSON.stringify(logs)}`);

  const store = await createGraphStore(cfg, deps);
  t.after(() => store.close());

  const sys = await store.querySystem('test-system-no-infra');
  assert.ok(sys, 'querySystem debería encontrar el sistema publicado');
  assert.equal(sys.canonicalName, 'test-system-no-infra');
  assert.deepEqual(sys.infraResources, [], 'infraResources debería ser un array vacío');
  assert.deepEqual(sys.infraEdges, [], 'infraEdges debería ser un array vacío');
});

// --- Paso 13: graphstore async-aware (driver mysql, único soportado según ADR-0011) ---
// `publish()` llama `store.publishSystem(...)` y `store.close()` SIN `await`, y calcula
// `previousCommitHash` leyendo `.commitHash` directo del resultado de `store.querySystem(...)`
// sin esperarlo (bug documentado en `.sdd/LEARNINGS.md`, tarea 002). Con `mysql` (async) esto
// significa que `close()` no espera a que el INSERT real termine, y que `previousCommitHash`
// siempre da `null` (una Promise no tiene `.commitHash`), aunque exista una publicación previa.

test('publish (mysql, delay real): close() no debe invocarse antes de que publishSystem() (INSERT) resuelva', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-mysql-order\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const ENV_VAR = 'SDDKIT_TEST_PUBLISH_MYSQL_ORDER';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const order = [];
  const { restore } = patchMysqlCreatePool(25, { seedRows: [], order });
  t.after(restore);

  await withCapturedLogs(() => publish(root, {}));

  // Dar tiempo real a que ambas operaciones (INSERT y end()) terminen de resolver,
  // para poder comparar el orden real en el que ocurrieron (no solo en el que se invocaron).
  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.ok(order.includes('insert-resolved'), `se esperaba que el INSERT llegue a resolver, orden real: ${JSON.stringify(order)}`);
  assert.ok(order.includes('end-called'), `se esperaba que close() invoque end(), orden real: ${JSON.stringify(order)}`);
  assert.ok(
    order.indexOf('insert-resolved') < order.indexOf('end-called'),
    `close() no debería invocarse antes de que publishSystem() (INSERT) resuelva — orden real: ${JSON.stringify(order)}`,
  );
});

// --- Tests de "publish --ci": parseo determinístico de Markdown + living docs (Pivot 2) ---
// Reemplaza por completo al mecanismo viejo (detección LLM vía callDetectionLlm, diff
// incremental con previousCommitHash) — ver nota en publish.js. `publish()` todavía NO
// implementa nada de esto: se espera que los tests de este bloque fallen en rojo.

function commitAll(root, message) {
  execSync('git add -A', { cwd: root });
  execSync(`git -c user.email=t@t -c user.name=t commit -q -m "${message}"`, { cwd: root });
  return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
}

const LIVING_DOCS_TABLE_NAMES = ['inputs', 'outputs', 'entidades', 'casos_de_uso'];

/**
 * Como `fakeMysqlPool`, pero además interpreta las queries de las 4 tablas de
 * living docs que usa `upsertLivingDocs` en `src/lib/graphstore/mysql.js`
 * (DELETE FROM <table> WHERE canonical_name = ? seguido de un INSERT por ítem),
 * y expone helpers para verificar en los tests qué quedó persistido — sin
 * necesidad de que `createGraphStore`/`wrap` expongan `upsertLivingDocs` para
 * poder inspeccionarlo desde afuera.
 *
 * `throwOnLivingDocs`: si es `true`, el DELETE de cada tabla de living docs
 * lanza (simula que `store.upsertLivingDocs` explota), después de contar el
 * intento — así se puede distinguir "nunca se llamó" de "se llamó y falló".
 */
function fakeMysqlPoolWithLivingDocs(seedRows = [], { throwOnLivingDocs = false } = {}) {
  const pool = fakeMysqlPool(seedRows);
  const originalExecute = pool.execute.bind(pool);
  const rowsByTable = new Map(LIVING_DOCS_TABLE_NAMES.map((t) => [t, []]));
  const deleteCounts = new Map(LIVING_DOCS_TABLE_NAMES.map((t) => [t, 0]));

  pool.execute = async (sql, params) => {
    const deleteMatch = sql.match(/^\s*DELETE FROM (\w+) WHERE canonical_name = \?/i);
    if (deleteMatch && rowsByTable.has(deleteMatch[1])) {
      const table = deleteMatch[1];
      deleteCounts.set(table, deleteCounts.get(table) + 1);
      if (throwOnLivingDocs) throw new Error(`boom: upsertLivingDocs falló a propósito (tabla ${table})`);
      rowsByTable.set(table, rowsByTable.get(table).filter((r) => r.canonical_name !== params[0]));
      return [{}];
    }

    const insertMatch = sql.match(/^\s*INSERT INTO (\w+) \(canonical_name, text, added_by, added_at, commit_hash\)/i);
    if (insertMatch && rowsByTable.has(insertMatch[1])) {
      const table = insertMatch[1];
      const [canonicalName, text, addedBy, addedAt, commitHash] = params;
      rowsByTable.get(table).push({ canonical_name: canonicalName, text, added_by: addedBy, added_at: addedAt, commit_hash: commitHash });
      return [{}];
    }

    return originalExecute(sql, params);
  };

  return {
    pool,
    getLivingDocs: (table, canonicalName) => rowsByTable.get(table).filter((r) => r.canonical_name === canonicalName),
    getDeleteCount: (table) => deleteCounts.get(table),
  };
}

function writeLivingDocsFixture(root) {
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.writeFileSync(
    path.join(c4dir, 'components.md'),
    '# Components\n\n## Inputs\n\n- Recibe pedidos vía REST\n- Escucha eventos de Kafka\n\n## Outputs\n\n- Publica eventos a SNS\n',
  );
  fs.writeFileSync(
    path.join(root, '.sdd', 'domain.md'),
    '# Domain\n\n## Entidades principales\n\n- Usuario: representa a quien compra\n- Pedido: representa una orden\n\n## Casos de uso\n\n- Crear pedido\n',
  );
}

function setupPublishCiRepo(root, canonicalName) {
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), `**Sistema:** ${canonicalName}\n`);
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');
  fs.writeFileSync(path.join(root, '.sdd', 'domain.md'), '# Domain\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const envVar = `SDDKIT_TEST_PUBLISH_CI_${canonicalName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  process.env[envVar] = 'mysql://user:pass@localhost/db';
  const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: envVar } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  return { envVar, cfg };
}

test('publish --ci: parsea Markdown determinísticamente (blame real) y puebla las 4 tablas de living docs', async (t) => {
  const root = tmpRepo();
  const canonicalName = 'test-ci-living-docs-ok';
  const { envVar } = setupPublishCiRepo(root, canonicalName);
  t.after(() => delete process.env[envVar]);

  writeLivingDocsFixture(root);

  execSync('git init -q -b main', { cwd: root });
  const commitHash = commitAll(root, 'init'); // único commit: blame de toda línea da este hash.

  const { pool, getLivingDocs } = fakeMysqlPoolWithLivingDocs();
  const deps = { createPool: async () => pool };

  const originalCi = process.env.CI;
  delete process.env.CI;
  t.after(() => { if (originalCi !== undefined) process.env.CI = originalCi; });

  const { logs } = await withCapturedLogs(() => publish(root, { ci: true }, deps));
  assert.ok(logs.some((l) => l.startsWith('✓')), `se esperaba publicación exitosa, logs: ${JSON.stringify(logs)}`);

  const inputsRows = getLivingDocs('inputs', canonicalName);
  assert.deepEqual(
    inputsRows.map((r) => r.text),
    ['Recibe pedidos vía REST', 'Escucha eventos de Kafka'],
    `se esperaban los bullets de ## Inputs, recibido: ${JSON.stringify(inputsRows)}`,
  );

  const outputsRows = getLivingDocs('outputs', canonicalName);
  assert.deepEqual(outputsRows.map((r) => r.text), ['Publica eventos a SNS']);

  const entidadesRows = getLivingDocs('entidades', canonicalName);
  assert.deepEqual(
    entidadesRows.map((r) => r.text),
    ['Usuario: representa a quien compra', 'Pedido: representa una orden'],
  );

  const casosRows = getLivingDocs('casos_de_uso', canonicalName);
  assert.deepEqual(casosRows.map((r) => r.text), ['Crear pedido']);

  for (const row of [...inputsRows, ...outputsRows, ...entidadesRows, ...casosRows]) {
    assert.equal(
      row.commit_hash, commitHash,
      `se esperaba el commitHash real del blame (${commitHash}), recibido: ${JSON.stringify(row)}`,
    );
    assert.equal(row.added_by, 't', `se esperaba el autor real del blame ("t"), recibido: ${JSON.stringify(row)}`);
    assert.ok(row.added_at, `se esperaba una fecha real del blame, recibido: ${JSON.stringify(row)}`);
  }
});

test('publish sin --ci ni CI env: nunca parsea/blamea/puebla living docs', async (t) => {
  const root = tmpRepo();
  const canonicalName = 'test-no-ci-living-docs';
  const { envVar } = setupPublishCiRepo(root, canonicalName);
  t.after(() => delete process.env[envVar]);

  writeLivingDocsFixture(root);
  execSync('git init -q -b main', { cwd: root });
  commitAll(root, 'init');

  const originalCi = process.env.CI;
  delete process.env.CI;
  t.after(() => { if (originalCi !== undefined) process.env.CI = originalCi; });

  const { pool, getLivingDocs, getDeleteCount } = fakeMysqlPoolWithLivingDocs();
  const deps = { createPool: async () => pool };

  const { logs } = await withCapturedLogs(() => publish(root, {}, deps));
  assert.ok(logs.some((l) => l.startsWith('✓')), `se esperaba publicación normal, logs: ${JSON.stringify(logs)}`);

  for (const table of LIVING_DOCS_TABLE_NAMES) {
    assert.equal(getDeleteCount(table), 0, `sin señal de CI, upsertLivingDocs no debería tocar la tabla ${table}`);
    assert.deepEqual(getLivingDocs(table, canonicalName), [], `sin señal de CI, ${table} debería seguir vacía`);
  }
});

test('publish --ci: components.md/domain.md sin las secciones nuevas → living docs se puebla igual pero con arrays vacíos', async (t) => {
  const root = tmpRepo();
  const canonicalName = 'test-ci-empty-sections';
  const { envVar } = setupPublishCiRepo(root, canonicalName);
  t.after(() => delete process.env[envVar]);
  // NO llamamos a writeLivingDocsFixture: components.md/domain.md quedan sin
  // los headings `## Inputs`/`## Outputs`/`## Entidades principales`/`## Casos de uso`
  // (repo recién scaneado, antes de que el pre-commit los complete).

  execSync('git init -q -b main', { cwd: root });
  commitAll(root, 'init');

  const originalCi = process.env.CI;
  delete process.env.CI;
  t.after(() => { if (originalCi !== undefined) process.env.CI = originalCi; });

  const { pool, getLivingDocs, getDeleteCount } = fakeMysqlPoolWithLivingDocs();
  const deps = { createPool: async () => pool };

  const { logs } = await withCapturedLogs(() => publish(root, { ci: true }, deps));
  assert.ok(logs.some((l) => l.startsWith('✓')), `no debería tirar por secciones ausentes, logs: ${JSON.stringify(logs)}`);

  for (const table of LIVING_DOCS_TABLE_NAMES) {
    assert.equal(getDeleteCount(table), 1, `se esperaba que upsertLivingDocs igual se ejecute (DELETE) para ${table}`);
    assert.deepEqual(getLivingDocs(table, canonicalName), [], `sin heading, ${table} debería quedar vacía`);
  }
});

test('publish --ci: si store.upsertLivingDocs falla, no bloquea el resto de publish() (no bloqueante)', async (t) => {
  const root = tmpRepo();
  const canonicalName = 'test-ci-living-docs-throws';
  const { envVar } = setupPublishCiRepo(root, canonicalName);
  t.after(() => delete process.env[envVar]);

  writeLivingDocsFixture(root);
  execSync('git init -q -b main', { cwd: root });
  commitAll(root, 'init');

  const originalCi = process.env.CI;
  delete process.env.CI;
  t.after(() => { if (originalCi !== undefined) process.env.CI = originalCi; });

  const { pool, getDeleteCount } = fakeMysqlPoolWithLivingDocs([], { throwOnLivingDocs: true });
  const deps = { createPool: async () => pool };

  const { logs } = await withCapturedLogs(() => publish(root, { ci: true }, deps));

  assert.ok(
    getDeleteCount('inputs') > 0,
    'se esperaba que publish() intente actualizar los living docs (y falle) antes de continuar',
  );
  assert.ok(
    logs.some((l) => l.startsWith('✓')),
    `publishSystem debería completarse igual pese al error en living docs, logs: ${JSON.stringify(logs)}`,
  );

  const [rows] = await pool.execute('SELECT * FROM systems WHERE canonical_name = ?', [canonicalName]);
  assert.equal(rows.length, 1, 'el sistema debería quedar publicado en systems pese al error en living docs');
});
