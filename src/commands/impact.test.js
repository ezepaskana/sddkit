import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { impact } from './impact.js';

const require = createRequire(import.meta.url);

/**
 * Columnas completas de la tabla `systems` (evita ALTER TABLE al migrar
 * infra_resources/infra_edges — no es lo que testeamos acá).
 */
const ALL_MYSQL_COLUMNS = ['id', 'canonical_name', 'repo_path', 'c1', 'endpoints', 'consumptions', 'infra_resources', 'infra_edges', 'commit_hash', 'published_at'];

/**
 * Parchea `mysql2/promise`.`createPool` (paquete CJS) para que `createMysqlStore`
 * — invocado internamente por `createGraphStore` con driver `mysql`, SIN
 * inyección de `deps` desde `impact.js` — reciba un pool falso cuyo
 * `execute`/`end` resuelven con un delay real (`setTimeout`), simulando
 * latencia de red. Un `await` faltante en `impact()` queda expuesto: leería
 * el resultado antes de que la promesa resuelva.
 */
function patchMysqlCreatePool(delayMs, seedRows) {
  const mysql2Promise = require('mysql2/promise');
  const original = mysql2Promise.createPool;
  mysql2Promise.createPool = async () => ({
    execute: (sql, params) => new Promise((resolve) => {
      setTimeout(() => {
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
    end: () => new Promise((resolve) => setTimeout(resolve, delayMs)),
  });
  return { restore: () => { mysql2Promise.createPool = original; } };
}

// Config mysql compartida + pool falso seedeado una vez al inicio del archivo
// (ADR-0011: sqlite fue retirado, mysql es el único driver soportado).
const ENV_VAR = 'SDDKIT_TEST_IMPACT_MYSQL_URL';
const cfg = { graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } };

const SEED_ROWS = [
  {
    canonical_name: 'backend-service',
    repo_path: '/path/to/projects/backend-service',
    c1: '', endpoints: JSON.stringify([{ method: 'GET', path: '/api/v1/public/invitations/{token}' }]),
    consumptions: '[]', infra_resources: '[]', infra_edges: '[]',
    commit_hash: 'aaa1111', published_at: '2026-06-13T00:00:00Z',
  },
  {
    canonical_name: 'frontend-app',
    repo_path: '/path/to/projects/frontend-app',
    c1: '', endpoints: '[]',
    consumptions: JSON.stringify([{ method: 'GET', target: 'env:VITE_API_URL/public/invitations/:param', file: 'src/services/api/invitations.ts' }]),
    infra_resources: '[]', infra_edges: '[]',
    commit_hash: 'bbb2222', published_at: '2026-06-13T00:00:00Z',
  },
  {
    canonical_name: 'unrelated-system',
    repo_path: '/tmp/unrelated', c1: '', endpoints: JSON.stringify([{ method: 'GET', path: '/health' }]),
    consumptions: JSON.stringify([{ method: 'GET', target: '(dynamic)', file: 'x.ts' }]),
    infra_resources: '[]', infra_edges: '[]',
    commit_hash: 'ccc3333', published_at: '2026-06-13T00:00:00Z',
  },
  {
    canonical_name: 'infra-service',
    repo_path: '/path/to/projects/infra-service',
    c1: '', endpoints: '[]', consumptions: '[]',
    infra_resources: '[]',
    infra_edges: JSON.stringify([{ from: 'arn:aws:s3:::uploads-bucket', to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload', type: 'storage', confidence: 'confirmado', action: 's3-notification' }]),
    commit_hash: 'ddd4444', published_at: '2026-06-13T00:00:00Z',
  },
];

let restorePool = () => {};

/** Crea un root con `.sdd/config.json` apuntando a la config mysql compartida (o sin graph). */
function tmpRoot(config) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-impact-'));
  const sddDir = path.join(root, '.sdd');
  fs.mkdirSync(sddDir, { recursive: true });
  if (config !== undefined) {
    fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(config));
  }
  return root;
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result, text: logs.join('\n') }))
    .finally(() => { console.log = originalLog; });
}

before(() => {
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  restorePool = patchMysqlCreatePool(0, SEED_ROWS).restore;
});

after(() => {
  delete process.env[ENV_VAR];
  restorePool();
});

test('impact {method,path}: lista consumidores que matchean, excluye los que no', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['GET', '/api/v1/public/invitations/{token}'], {}));

  assert.ok(text.includes('frontend-app'), `esperaba frontend-app, output:\n${text}`);
  assert.ok(text.includes('posible'), `esperaba confidence "posible", output:\n${text}`);
  assert.ok(text.includes('src/services/api/invitations.ts'), `esperaba el archivo, output:\n${text}`);
  assert.ok(!text.includes('unrelated-system'), `no esperaba unrelated-system, output:\n${text}`);
});

test('impact {method,path}: sin consumidores → mensaje informativo', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['GET', '/ruta/sin/consumidores'], {}));

  assert.ok(text.includes('Sin consumidores publicados'), `output:\n${text}`);
});

test('impact {system}: reverse lookup lista endpoints y consumidores', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['backend-service'], {}));

  assert.ok(text.includes('/api/v1/public/invitations/{token}'), `esperaba el endpoint, output:\n${text}`);
  assert.ok(text.includes('frontend-app'), `esperaba frontend-app como consumidor, output:\n${text}`);
  assert.ok(text.includes('posible'), `esperaba confidence "posible", output:\n${text}`);
});

test('impact {system}: sistema inexistente → "no encontrado"', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['no-existe'], {}));

  assert.ok(text.includes('no encontrado'), `output:\n${text}`);
});

test('impact <recurso>: ARN de infra publicado → lista aristas de infraestructura', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['arn:aws:s3:::uploads-bucket'], {}));

  assert.ok(text.includes('infra-service'), `esperaba infra-service, output:\n${text}`);
  assert.ok(text.includes('confirmado'), `esperaba confidence "confirmado", output:\n${text}`);
  assert.ok(text.includes('arn:aws:s3:::uploads-bucket'), `esperaba el ARN origen, output:\n${text}`);
  assert.ok(text.includes('arn:aws:lambda:us-east-1:123456789012:function:process-upload'), `esperaba el ARN destino, output:\n${text}`);
});

test('impact <argumento>: ni sistema ni recurso de infra → mensaje con las 3 formas de uso', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['no-existe-ni-como-sistema-ni-como-recurso'], {}));

  assert.ok(text.includes('sdd impact <MÉTODO> <ruta>'), `esperaba la forma {method,path}, output:\n${text}`);
  assert.ok(text.includes('sdd impact <sistema>'), `esperaba la forma {sistema}, output:\n${text}`);
  assert.ok(text.includes('sdd impact <ARN-o-nombre-de-recurso>'), `esperaba la forma {recurso}, output:\n${text}`);
});

test('impact: grafo no configurado → advertencia, sin throw', async () => {
  const root = tmpRoot(undefined); // sin .sdd/config.json
  const { text } = await withCapturedLogs(() =>
    impact(root, ['GET', '/x'], {}));

  assert.ok(text.includes('Grafo no configurado'), `output:\n${text}`);
});

// --- Paso 13: graphstore async-aware (driver mysql, único soportado según ADR-0011) ---
// `impact()` llama `store.queryImpact(query)`/`store.queryInfraImpact(resource)`/
// `store.close()` SIN `await` (bug documentado en .sdd/LEARNINGS.md, tarea 002). Con
// `mysql` (async), `wrap()` hoy pasa una Promise sin resolver a `matching.js`, que
// explota al iterarla — el bug se manifiesta ANTES incluso de llegar al `.then`.

const MYSQL_SEED_ROWS = [
  {
    canonical_name: 'backend-service-mysql',
    repo_path: '/path/backend', c1: '',
    endpoints: JSON.stringify([{ method: 'GET', path: '/api/v1/mysql-endpoint' }]),
    consumptions: '[]',
    infra_resources: '[]', infra_edges: '[]',
    commit_hash: 'aaa1111', published_at: '2026-02-03T00:00:00.000Z',
  },
  {
    canonical_name: 'frontend-app-mysql',
    repo_path: '/path/frontend', c1: '', endpoints: '[]',
    consumptions: JSON.stringify([{ method: 'GET', target: '/api/v1/mysql-endpoint', file: 'src/api.ts' }]),
    infra_resources: '[]', infra_edges: '[]',
    commit_hash: 'bbb2222', published_at: '2026-02-03T00:00:00.000Z',
  },
  {
    canonical_name: 'infra-service-mysql',
    repo_path: '/path/infra', c1: '', endpoints: '[]', consumptions: '[]',
    infra_resources: '[]',
    infra_edges: JSON.stringify([{ from: 'arn:aws:s3:::mysql-bucket', to: 'arn:aws:lambda:us-east-1:1:function:f', type: 'storage', confidence: 'confirmado', action: 's3-notification' }]),
    commit_hash: 'ccc3333', published_at: '2026-02-03T00:00:00.000Z',
  },
];

test('impact {method,path} (mysql, delay real): debe esperar queryImpact() y listar el consumidor real', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_IMPACT_MYSQL_URL_1';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const { restore } = patchMysqlCreatePool(20, MYSQL_SEED_ROWS);
  t.after(restore);

  const root = tmpRoot({ graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } });
  const { text } = await withCapturedLogs(() =>
    impact(root, ['GET', '/api/v1/mysql-endpoint'], {}));

  assert.ok(text.includes('frontend-app-mysql'), `se esperaba frontend-app-mysql como consumidor, output:\n${text}`);
  assert.ok(text.includes('exacto'), `se esperaba confidence "exacto", output:\n${text}`);
});

test('impact <recurso> (mysql, delay real): debe esperar queryInfraImpact() y listar la arista real', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_IMPACT_MYSQL_URL_2';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const { restore } = patchMysqlCreatePool(20, MYSQL_SEED_ROWS);
  t.after(restore);

  const root = tmpRoot({ graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } });
  const { text } = await withCapturedLogs(() =>
    impact(root, ['arn:aws:s3:::mysql-bucket'], {}));

  assert.ok(text.includes('infra-service-mysql'), `se esperaba infra-service-mysql, output:\n${text}`);
  assert.ok(text.includes('arn:aws:lambda:us-east-1:1:function:f'), `se esperaba el ARN destino, output:\n${text}`);
});

test('impact {system} (mysql, delay real): reverse lookup debe esperar queryImpact() y listar endpoints/consumidores reales', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_IMPACT_MYSQL_URL_3';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const { restore } = patchMysqlCreatePool(20, MYSQL_SEED_ROWS);
  t.after(restore);

  const root = tmpRoot({ graph: { driver: 'mysql', mysql: { urlEnv: ENV_VAR } } });
  const { text } = await withCapturedLogs(() =>
    impact(root, ['backend-service-mysql'], {}));

  assert.ok(text.includes('/api/v1/mysql-endpoint'), `se esperaba el endpoint real, output:\n${text}`);
  assert.ok(text.includes('frontend-app-mysql'), `se esperaba frontend-app-mysql como consumidor, output:\n${text}`);
});
