import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createGraphStore } from './index.js';

let Database = null;
try { ({ default: Database } = await import('better-sqlite3')); } catch { /* opcional ausente */ }
import { createSqliteStore, resolveDbPath } from './sqlite.js';

function tmpDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-graph-'));
  return path.join(dir, 'graph.db');
}

test('not-configured: cfg sin graph y graph sin driver → {ok:false, reason:not-configured}', async () => {
  assert.deepEqual(await createGraphStore({}), { ok: false, reason: 'not-configured' });
  assert.deepEqual(await createGraphStore({ graph: {} }), { ok: false, reason: 'not-configured' });
});

test('not-configured: cfg null/undefined → {ok:false, reason:not-configured}', async () => {
  assert.deepEqual(await createGraphStore(null), { ok: false, reason: 'not-configured' });
  assert.deepEqual(await createGraphStore(undefined), { ok: false, reason: 'not-configured' });
});

test('driver desconocido → {ok:false, reason:not-configured}', async () => {
  assert.deepEqual(await createGraphStore({ graph: { driver: 'postgres' } }), { ok: false, reason: 'not-configured' });
});

test('missing-dependency (sqlite): import inyectado que rechaza → {ok:false, reason:missing-dependency, install}', async () => {
  const res = await createGraphStore(
    { graph: { driver: 'sqlite' } },
    { importSqlite: () => Promise.reject(new Error('Cannot find module')) },
  );
  assert.deepEqual(res, { ok: false, reason: 'missing-dependency', install: 'npm i better-sqlite3' });
});

test('mysql sin config.mysql.urlEnv → {ok:false, reason:missing-env, envVar:undefined}', async () => {
  const res = await createGraphStore({ graph: { driver: 'mysql' } });
  assert.deepEqual(res, { ok: false, reason: 'missing-env', envVar: undefined });
});

test('upsert real: segundo publish con mismo canonicalName actualiza (no duplica)', async (t) => {
  if (!Database) return t.skip('better-sqlite3 no instalado');
  const store = await createSqliteStore({ driver: 'sqlite', sqlite: { path: tmpDbPath() } });
  t.after(() => store.close());

  store.publishSystem({
    canonicalName: 'sys-a', repoPath: '/repo/a', c1: '# C1',
    endpoints: [{ method: 'GET', path: '/x' }], consumptions: [],
    commitHash: 'abc123', publishedAt: '2026-06-13T00:00:00Z',
  });
  store.publishSystem({
    canonicalName: 'sys-a', repoPath: '/repo/a', c1: '# C1 v2',
    endpoints: [{ method: 'POST', path: '/y' }], consumptions: [],
    commitHash: 'def456', publishedAt: '2026-06-14T00:00:00Z',
  });

  const sys = store.querySystem('sys-a');
  assert.equal(sys.commitHash, 'def456');
  assert.equal(sys.c1, '# C1 v2');
  assert.deepEqual(sys.endpoints, [{ method: 'POST', path: '/y' }]);

  const all = store.listSystems();
  assert.equal(all.length, 1);
  assert.equal(all[0].canonicalName, 'sys-a');
});

test('querySystem inexistente → null', async (t) => {
  if (!Database) return t.skip('better-sqlite3 no instalado');
  const store = await createSqliteStore({ driver: 'sqlite', sqlite: { path: tmpDbPath() } });
  t.after(() => store.close());
  assert.equal(store.querySystem('no-existe'), null);
});

test('queryImpact end-to-end (P6) sobre graphstore real: frontend-app posible', async (t) => {
  if (!Database) return t.skip('better-sqlite3 no instalado');
  const wrapped = await createGraphStore({ graph: { driver: 'sqlite', sqlite: { path: tmpDbPath() } } });
  assert.equal(wrapped.ok, true);
  t.after(() => wrapped.close());

  wrapped.publishSystem({
    canonicalName: 'backend-service', repoPath: '/repo/backend', c1: null,
    endpoints: [{ method: 'GET', path: '/api/v1/public/invitations/{token}' }], consumptions: [],
    commitHash: 'h1', publishedAt: '2026-06-13T00:00:00Z',
  });
  wrapped.publishSystem({
    canonicalName: 'frontend-app', repoPath: '/repo/frontend', c1: null,
    endpoints: [],
    consumptions: [{ method: 'GET', target: 'env:VITE_API_URL/public/invitations/:param', file: 'src/services/api/invitations.ts' }],
    commitHash: 'h2', publishedAt: '2026-06-13T00:00:00Z',
  });

  const res = wrapped.queryImpact({ method: 'GET', path: '/api/v1/public/invitations/{token}' });
  assert.equal(res.length, 1);
  assert.equal(res[0].confidence, 'posible');
  assert.equal(res[0].canonicalName, 'frontend-app');
  assert.equal(res[0].file, 'src/services/api/invitations.ts');
});

test('queryCapability directo (path ya normalizado) sobre graphstore real', async (t) => {
  if (!Database) return t.skip('better-sqlite3 no instalado');
  const wrapped = await createGraphStore({ graph: { driver: 'sqlite', sqlite: { path: tmpDbPath() } } });
  assert.equal(wrapped.ok, true);
  t.after(() => wrapped.close());

  wrapped.publishSystem({
    canonicalName: 'backend-service', repoPath: '/repo/backend', c1: null,
    endpoints: [{ method: 'GET', path: '/api/v1/public/invitations/{token}' }], consumptions: [],
    commitHash: 'h1', publishedAt: '2026-06-13T00:00:00Z',
  });
  wrapped.publishSystem({
    canonicalName: 'frontend-app', repoPath: '/repo/frontend', c1: null,
    endpoints: [],
    consumptions: [{ method: 'GET', target: 'env:VITE_API_URL/public/invitations/:param', file: 'src/services/api/invitations.ts' }],
    commitHash: 'h2', publishedAt: '2026-06-13T00:00:00Z',
  });

  const res = wrapped.queryCapability('GET', '/api/v1/public/invitations/:param');
  assert.equal(res.length, 1);
  assert.equal(res[0].confidence, 'posible');
  assert.equal(res[0].canonicalName, 'frontend-app');
});

test('infra (P9): DB nueva, roundtrip de infraResources/infraEdges', async (t) => {
  if (!Database) return t.skip('better-sqlite3 no instalado');
  const store = await createSqliteStore({ driver: 'sqlite', sqlite: { path: tmpDbPath() } });
  t.after(() => store.close());

  const infraResources = [{ name: 'x', arn: 'arn:x', type: 'storage', address: 'a' }];
  const infraEdges = [{ from: 'a', to: 'b', type: 'storage', confidence: 'confirmado' }];

  store.publishSystem({
    canonicalName: 'sys-infra', repoPath: '/repo/infra', c1: null,
    endpoints: [], consumptions: [], infraResources, infraEdges,
    commitHash: 'h1', publishedAt: '2026-06-13T00:00:00Z',
  });

  const sys = store.querySystem('sys-infra');
  assert.deepEqual(sys.infraResources, infraResources);
  assert.deepEqual(sys.infraEdges, infraEdges);
});

test('infra (P9): migración de DB vieja (tarea 002, sin columnas de infra) no rompe y aplica default []', async (t) => {
  if (!Database) return t.skip('better-sqlite3 no instalado');
  const dbPath = tmpDbPath();

  // CREATE_TABLE viejo de tarea 002, textual, sin infra_resources/infra_edges.
  const OLD_CREATE_TABLE = `
    CREATE TABLE systems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_name TEXT UNIQUE NOT NULL,
      repo_path TEXT NOT NULL,
      c1 TEXT,
      endpoints TEXT NOT NULL DEFAULT '[]',
      consumptions TEXT NOT NULL DEFAULT '[]',
      commit_hash TEXT,
      published_at TEXT NOT NULL
    )
  `;
  const legacyDb = new Database(dbPath);
  legacyDb.exec(OLD_CREATE_TABLE);
  legacyDb
    .prepare('INSERT INTO systems (canonical_name, repo_path, c1, endpoints, consumptions, commit_hash, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('legacy-sys', '/repo/legacy', '# C1', '[]', '[]', 'old123', '2026-06-12T00:00:00Z');
  legacyDb.close();

  // Abrir con el store nuevo: la migración debe correr sin error.
  const store = await createSqliteStore({ driver: 'sqlite', sqlite: { path: dbPath } });
  t.after(() => store.close());

  const sys = store.querySystem('legacy-sys');
  assert.ok(sys, 'la fila legacy debe seguir presente');
  assert.deepEqual(sys.infraResources, []);
  assert.deepEqual(sys.infraEdges, []);

  const all = store.listSystems();
  assert.equal(all.length, 1);
  assert.equal(all[0].canonicalName, 'legacy-sys');
});

test('infra (P9): migración idempotente — abrir la misma DB dos veces no tira "duplicate column name"', async (t) => {
  if (!Database) return t.skip('better-sqlite3 no instalado');
  const dbPath = tmpDbPath();

  const store1 = await createSqliteStore({ driver: 'sqlite', sqlite: { path: dbPath } });
  store1.close();

  // Segunda apertura: PRAGMA table_info detecta que las columnas ya existen.
  const store2 = await createSqliteStore({ driver: 'sqlite', sqlite: { path: dbPath } });
  t.after(() => store2.close());

  assert.equal(store2.listSystems().length, 0);
});

test('resolveDbPath: default ~/.sddkit/graph.db cuando no hay path explícito', () => {
  assert.equal(resolveDbPath({}), path.join(os.homedir(), '.sddkit', 'graph.db'));
  assert.equal(resolveDbPath({ sqlite: {} }), path.join(os.homedir(), '.sddkit', 'graph.db'));
});

test('resolveDbPath: expande ~ al inicio de un path explícito', () => {
  assert.equal(resolveDbPath({ sqlite: { path: '~/custom/graph.db' } }), path.join(os.homedir(), 'custom', 'graph.db'));
  assert.equal(resolveDbPath({ sqlite: { path: '~' } }), os.homedir());
});

test('resolveDbPath: path explícito sin ~ se respeta tal cual', () => {
  assert.equal(resolveDbPath({ sqlite: { path: '/tmp/x/graph.db' } }), '/tmp/x/graph.db');
});
