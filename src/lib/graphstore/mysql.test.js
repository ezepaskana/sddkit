import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMysqlStore } from './mysql.js';

const TEST_ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_NOT_SET';

test('missing-env: config.mysql.urlEnv apunta a una env var no seteada → {ok:false, reason:missing-env, envVar}, sin llamar a createPool', async () => {
  delete process.env[TEST_ENV_VAR];

  const createPool = () => {
    throw new Error('createPool no debería llamarse cuando falta la env var');
  };

  const res = await createMysqlStore({ mysql: { urlEnv: TEST_ENV_VAR } }, { createPool });
  assert.deepEqual(res, { ok: false, reason: 'missing-env', envVar: TEST_ENV_VAR });
});

test('missing-env: sin config.mysql.urlEnv → {ok:false, reason:missing-env, envVar:undefined}', async () => {
  const res = await createMysqlStore({});
  assert.deepEqual(res, { ok: false, reason: 'missing-env', envVar: undefined });
});

test('publishSystem: ejecuta INSERT ... ON DUPLICATE KEY UPDATE', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_PUBLISH';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const calls = [];
  const stubPool = {
    execute: async (sql, params) => {
      calls.push({ sql, params });
      return [[]];
    },
    end: async () => {},
  };
  const createPool = async () => stubPool;

  const store = await createMysqlStore({ mysql: { urlEnv: ENV_VAR } }, { createPool });
  t.after(() => store.close());

  await store.publishSystem({
    canonicalName: 'sys-a', repoPath: '/repo/a', c1: '# C1',
    endpoints: [{ method: 'GET', path: '/x' }], consumptions: [],
    commitHash: 'abc123', publishedAt: '2026-06-13T00:00:00Z',
  });

  const insertCall = calls.find((c) => c.sql.includes('INSERT INTO systems'));
  assert.ok(insertCall, 'debe haber ejecutado un INSERT INTO systems');
  assert.match(insertCall.sql, /ON DUPLICATE KEY UPDATE/);
});

/**
 * Helper: stub de pool cuyo `execute` responde a la query de
 * `information_schema.columns` con `infoColumns` (lista de nombres de columna),
 * y a cualquier otra query con `[[]]`. Registra todas las llamadas en `calls`.
 */
function makeStubPool(infoColumns, calls) {
  return {
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (/information_schema\.columns/i.test(sql)) {
        return [infoColumns.map((name) => ({ column_name: name }))];
      }
      return [[]];
    },
    end: async () => {},
  };
}

test('infra (P9): migración detecta columnas faltantes y ejecuta 2 ALTER TABLE', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_MIGRATE';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const calls = [];
  // information_schema devuelve SOLO las columnas viejas, sin infra_*.
  const oldCols = ['id', 'canonical_name', 'repo_path', 'c1', 'endpoints', 'consumptions', 'commit_hash', 'published_at'];
  const createPool = async () => makeStubPool(oldCols, calls);

  const store = await createMysqlStore({ mysql: { urlEnv: ENV_VAR } }, { createPool });
  t.after(() => store.close());

  const infoCall = calls.find((c) => /information_schema\.columns/i.test(c.sql));
  assert.ok(infoCall, 'debe consultar information_schema.columns');

  const alterCalls = calls.filter((c) => /ALTER TABLE systems ADD COLUMN/i.test(c.sql));
  assert.equal(alterCalls.length, 2, 'debe ejecutar 2 ALTER TABLE ADD COLUMN');
  assert.ok(alterCalls.some((c) => /infra_resources/.test(c.sql)), 'ALTER de infra_resources');
  assert.ok(alterCalls.some((c) => /infra_edges/.test(c.sql)), 'ALTER de infra_edges');
});

test('infra (P9): idempotencia — columnas ya presentes → ningún ALTER TABLE', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_IDEMPOTENT';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const calls = [];
  const allCols = ['id', 'canonical_name', 'repo_path', 'c1', 'endpoints', 'consumptions', 'infra_resources', 'infra_edges', 'commit_hash', 'published_at'];
  const createPool = async () => makeStubPool(allCols, calls);

  const store = await createMysqlStore({ mysql: { urlEnv: ENV_VAR } }, { createPool });
  t.after(() => store.close());

  const alterCalls = calls.filter((c) => /ALTER TABLE systems ADD COLUMN/i.test(c.sql));
  assert.equal(alterCalls.length, 0, 'no debe ejecutar ALTER TABLE si las columnas ya existen');
});

test('infra (P9): publishSystem incluye infra_resources/infra_edges en SQL y params', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_PUBLISH_INFRA';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const calls = [];
  const allCols = ['id', 'canonical_name', 'repo_path', 'c1', 'endpoints', 'consumptions', 'infra_resources', 'infra_edges', 'commit_hash', 'published_at'];
  const createPool = async () => makeStubPool(allCols, calls);

  const store = await createMysqlStore({ mysql: { urlEnv: ENV_VAR } }, { createPool });
  t.after(() => store.close());

  const infraResources = [{ name: 'x', arn: 'arn:x', type: 'storage', address: 'a' }];
  const infraEdges = [{ from: 'a', to: 'b', type: 'storage', confidence: 'confirmado' }];

  await store.publishSystem({
    canonicalName: 'sys-a', repoPath: '/repo/a', c1: '# C1',
    endpoints: [], consumptions: [], infraResources, infraEdges,
    commitHash: 'abc123', publishedAt: '2026-06-13T00:00:00Z',
  });

  const insertCall = calls.find((c) => c.sql.includes('INSERT INTO systems'));
  assert.ok(insertCall, 'debe haber ejecutado un INSERT INTO systems');
  assert.match(insertCall.sql, /infra_resources/);
  assert.match(insertCall.sql, /infra_edges/);
  assert.ok(insertCall.params.includes(JSON.stringify(infraResources)), 'params incluye infraResources stringify-ado');
  assert.ok(insertCall.params.includes(JSON.stringify(infraEdges)), 'params incluye infraEdges stringify-ado');
});

test('querySystem: sin filas → null; ejecuta SELECT ... WHERE canonical_name = ?', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_QUERY';
  process.env[ENV_VAR] = 'mysql://user:pass@localhost/db';
  t.after(() => delete process.env[ENV_VAR]);

  const calls = [];
  const stubPool = {
    execute: async (sql, params) => {
      calls.push({ sql, params });
      return [[]];
    },
    end: async () => {},
  };
  const createPool = async () => stubPool;

  const store = await createMysqlStore({ mysql: { urlEnv: ENV_VAR } }, { createPool });
  t.after(() => store.close());

  const result = await store.querySystem('algo');
  assert.equal(result, null);

  const selectCall = calls.find((c) => c.sql.includes('SELECT * FROM systems'));
  assert.ok(selectCall, 'debe haber ejecutado un SELECT');
  assert.match(selectCall.sql, /WHERE canonical_name = \?/);
  assert.deepEqual(selectCall.params, ['algo']);
});
