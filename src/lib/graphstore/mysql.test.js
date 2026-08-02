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

// --- living docs (tarea 010): tablas inputs/outputs/entidades/casos_de_uso ---

test('living docs: al abrir el store se crean las 4 tablas nuevas (CREATE TABLE IF NOT EXISTS)', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_LIVINGDOCS_CREATE';
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

  assert.ok(
    calls.some((c) => /CREATE TABLE IF NOT EXISTS inputs/i.test(c.sql)),
    'debe crear la tabla inputs',
  );
  assert.ok(
    calls.some((c) => /CREATE TABLE IF NOT EXISTS outputs/i.test(c.sql)),
    'debe crear la tabla outputs',
  );
  assert.ok(
    calls.some((c) => /CREATE TABLE IF NOT EXISTS entidades/i.test(c.sql)),
    'debe crear la tabla entidades',
  );
  assert.ok(
    calls.some((c) => /CREATE TABLE IF NOT EXISTS casos_de_uso/i.test(c.sql)),
    'debe crear la tabla casos_de_uso',
  );
});

test('living docs: upsertLivingDocs con 1 ítem en inputs → DELETE en las 4 tablas + INSERT en inputs con los datos del ítem', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_LIVINGDOCS_UPSERT';
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

  calls.length = 0; // descartamos las CREATE TABLE de la apertura, nos interesa solo upsertLivingDocs

  await store.upsertLivingDocs('sistema-x', {
    inputs: [{ text: 'a', author: 'ana', date: '2026-01-01', commitHash: 'abc' }],
    outputs: [],
    entidades: [],
    casosDeUso: [],
  });

  for (const table of ['inputs', 'outputs', 'entidades', 'casos_de_uso']) {
    const deleteCall = calls.find(
      (c) => new RegExp(`DELETE FROM ${table}\\b`, 'i').test(c.sql) && c.params.includes('sistema-x'),
    );
    assert.ok(deleteCall, `debe ejecutar DELETE FROM ${table} con canonical_name='sistema-x'`);
  }

  const insertCall = calls.find((c) => /INSERT INTO inputs/i.test(c.sql));
  assert.ok(insertCall, 'debe haber ejecutado un INSERT INTO inputs');
  assert.ok(insertCall.params.includes('sistema-x'), 'params incluye canonical_name');
  assert.ok(insertCall.params.includes('a'), 'params incluye text');
  assert.ok(insertCall.params.includes('ana'), 'params incluye author');
  assert.ok(insertCall.params.includes('2026-01-01'), 'params incluye date');
  assert.ok(insertCall.params.includes('abc'), 'params incluye commitHash');
});

test('living docs: upsertLivingDocs con array vacío en una categoría → DELETE corre igual pero sin INSERT hacia esa tabla', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_LIVINGDOCS_EMPTY';
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

  calls.length = 0;

  await store.upsertLivingDocs('sistema-y', {
    inputs: [{ text: 'algo', author: 'bea', date: '2026-02-02', commitHash: 'def' }],
    outputs: [],
    entidades: [],
    casosDeUso: [],
  });

  const deleteOutputs = calls.find(
    (c) => /DELETE FROM outputs\b/i.test(c.sql) && c.params.includes('sistema-y'),
  );
  assert.ok(deleteOutputs, 'el DELETE de outputs debe correr aunque el array venga vacío');

  const insertOutputs = calls.find((c) => /INSERT INTO outputs/i.test(c.sql));
  assert.equal(insertOutputs, undefined, 'no debe haber ningún INSERT hacia outputs si el array viene vacío');
});

test('living docs: upsertLivingDocs con 2 ítems en la misma categoría → ambos ítems llegan reflejados', async (t) => {
  const ENV_VAR = 'SDDKIT_TEST_MYSQL_URL_LIVINGDOCS_MULTI';
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

  calls.length = 0;

  await store.upsertLivingDocs('sistema-z', {
    inputs: [
      { text: 'primero', author: 'ana', date: '2026-01-01', commitHash: 'aaa' },
      { text: 'segundo', author: 'bea', date: '2026-01-02', commitHash: 'bbb' },
    ],
    outputs: [],
    entidades: [],
    casosDeUso: [],
  });

  // Diseño: un INSERT por ítem (no multi-row). Si la implementación eligiera
  // un único INSERT multi-row, este test debería adaptarse a inspeccionar los
  // params concatenados de esa única llamada.
  const insertCalls = calls.filter((c) => /INSERT INTO inputs/i.test(c.sql));
  const allParams = insertCalls.flatMap((c) => c.params);

  assert.ok(allParams.includes('primero'), 'debe incluir el text del primer ítem');
  assert.ok(allParams.includes('segundo'), 'debe incluir el text del segundo ítem');
  assert.ok(allParams.includes('ana'), 'debe incluir el author del primer ítem');
  assert.ok(allParams.includes('bea'), 'debe incluir el author del segundo ítem');
  assert.ok(allParams.includes('aaa'), 'debe incluir el commitHash del primer ítem');
  assert.ok(allParams.includes('bbb'), 'debe incluir el commitHash del segundo ítem');
});
