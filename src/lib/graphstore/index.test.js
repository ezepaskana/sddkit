import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGraphStore } from './index.js';

/**
 * Tests del bug documentado en `.sdd/LEARNINGS.md` (tarea 002): `wrap()` en
 * `index.js` pasa `store.listSystems()` SIN `await` a `queryCapability`/
 * `queryImpact`/`queryInfraImpact` (de `matching.js`). Para el driver `sqlite`
 * (síncrono) esto pasa desapercibido porque `listSystems()` ya devuelve un
 * array. Para `mysql` (único driver real, ver ADR-0011), `listSystems()`
 * devuelve una Promise: se le pasa esa Promise sin resolver a `matching.js`,
 * que hace `for (const sys of systems)` — iterar sobre una Promise no es
 * iterable, así que la llamada explota.
 *
 * Usamos el mismo patrón de `mysql.test.js`: un `createPool` inyectado cuyo
 * `execute`/`end` devuelven Promises con un `setTimeout` corto, para simular
 * latencia real de red — así un `await` faltante es detectable.
 */

const SEEDED_SYSTEM_ROW = {
  canonical_name: 'frontend-app',
  repo_path: '/repo/frontend',
  c1: '# C1',
  endpoints: JSON.stringify([{ method: 'GET', path: '/other' }]),
  consumptions: JSON.stringify([{ method: 'GET', target: '/x', file: 'src/api.js' }]),
  infra_resources: JSON.stringify([]),
  infra_edges: JSON.stringify([
    { from: 'arn:aws:s3:::bucket', to: 'arn:aws:lambda:us-east-1:1:function:f', type: 'storage', confidence: 'confirmado', action: 's3-notification' },
  ]),
  commit_hash: 'abc123',
  published_at: '2026-01-01T00:00:00.000Z',
};

const ALL_COLUMNS = ['id', 'canonical_name', 'repo_path', 'c1', 'endpoints', 'consumptions', 'infra_resources', 'infra_edges', 'commit_hash', 'published_at'];

/** Pool inyectable estilo mysql2 cuyas respuestas se demoran `delayMs` (latencia real de red). */
function makeDelayedPool(delayMs = 15) {
  const calls = [];
  return {
    calls,
    execute: (sql, params) => new Promise((resolve) => {
      setTimeout(() => {
        calls.push({ sql, params });
        if (/information_schema\.columns/i.test(sql)) {
          resolve([ALL_COLUMNS.map((name) => ({ column_name: name }))]);
        } else if (/WHERE canonical_name = \?/i.test(sql)) {
          resolve([[]]);
        } else if (/SELECT \* FROM systems/i.test(sql)) {
          resolve([[SEEDED_SYSTEM_ROW]]);
        } else {
          resolve([[]]);
        }
      }, delayMs);
    }),
    end: () => new Promise((resolve) => setTimeout(resolve, delayMs)),
  };
}

function mysqlCfg(envVar) {
  return { graph: { driver: 'mysql', mysql: { urlEnv: envVar } } };
}

test('queryCapability (mysql, listSystems() con delay): debe esperar antes de matchear, no lanzar "not iterable"', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_GRAPHSTORE_INDEX_CAPABILITY';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const pool = makeDelayedPool();
  const createPool = async () => pool;

  const store = await createGraphStore(mysqlCfg(ENV_VAR), { createPool });
  assert.equal(store.ok, true);
  t.after(() => store.close());

  const results = await store.queryCapability('GET', '/x');
  assert.equal(results.length, 1, `se esperaba 1 match, resultado: ${JSON.stringify(results)}`);
  assert.equal(results[0].canonicalName, 'frontend-app');
  assert.equal(results[0].confidence, 'exacto');
});

test('queryImpact {method,path} (mysql, listSystems() con delay): debe esperar antes de matchear', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_GRAPHSTORE_INDEX_IMPACT';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const pool = makeDelayedPool();
  const createPool = async () => pool;

  const store = await createGraphStore(mysqlCfg(ENV_VAR), { createPool });
  assert.equal(store.ok, true);
  t.after(() => store.close());

  const results = await store.queryImpact({ method: 'GET', path: '/x' });
  assert.equal(results.length, 1, `se esperaba 1 match, resultado: ${JSON.stringify(results)}`);
  assert.equal(results[0].canonicalName, 'frontend-app');
});

test('queryInfraImpact (mysql, listSystems() con delay): debe esperar antes de buscar el recurso', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_GRAPHSTORE_INDEX_INFRA';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const pool = makeDelayedPool();
  const createPool = async () => pool;

  const store = await createGraphStore(mysqlCfg(ENV_VAR), { createPool });
  assert.equal(store.ok, true);
  t.after(() => store.close());

  const results = await store.queryInfraImpact('arn:aws:s3:::bucket');
  assert.equal(results.length, 1, `se esperaba 1 match, resultado: ${JSON.stringify(results)}`);
  assert.equal(results[0].canonicalName, 'frontend-app');
  assert.equal(results[0].to, 'arn:aws:lambda:us-east-1:1:function:f');
});
