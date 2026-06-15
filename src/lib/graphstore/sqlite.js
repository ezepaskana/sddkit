import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Resuelve la ruta del archivo SQLite a partir de `config.sqlite?.path`:
 * - sin path explícito → default `~/.sddkit/graph.db` (vía `os.homedir()`).
 * - path explícito que empieza con `~` → expande el `~` a `os.homedir()`.
 * - path explícito sin `~` → tal cual.
 */
export function resolveDbPath(config) {
  const explicit = config?.sqlite?.path;
  if (!explicit) return path.join(os.homedir(), '.sddkit', 'graph.db');
  if (explicit === '~') return os.homedir();
  if (explicit.startsWith('~/') || explicit.startsWith('~\\')) {
    return path.join(os.homedir(), explicit.slice(2));
  }
  return explicit;
}

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_name TEXT UNIQUE NOT NULL,
    repo_path TEXT NOT NULL,
    c1 TEXT,
    endpoints TEXT NOT NULL DEFAULT '[]',
    consumptions TEXT NOT NULL DEFAULT '[]',
    infra_resources TEXT NOT NULL DEFAULT '[]',
    infra_edges TEXT NOT NULL DEFAULT '[]',
    commit_hash TEXT,
    published_at TEXT NOT NULL
  )
`;

const UPSERT = `
  INSERT INTO systems (canonical_name, repo_path, c1, endpoints, consumptions, infra_resources, infra_edges, commit_hash, published_at)
  VALUES (@canonical_name, @repo_path, @c1, @endpoints, @consumptions, @infra_resources, @infra_edges, @commit_hash, @published_at)
  ON CONFLICT(canonical_name) DO UPDATE SET
    repo_path = excluded.repo_path,
    c1 = excluded.c1,
    endpoints = excluded.endpoints,
    consumptions = excluded.consumptions,
    infra_resources = excluded.infra_resources,
    infra_edges = excluded.infra_edges,
    commit_hash = excluded.commit_hash,
    published_at = excluded.published_at
`;

/** Mapea una fila cruda de la tabla `systems` a la forma camelCase con JSON parseado. */
function rowToSystem(row) {
  return {
    canonicalName: row.canonical_name,
    repoPath: row.repo_path,
    c1: row.c1,
    endpoints: JSON.parse(row.endpoints),
    consumptions: JSON.parse(row.consumptions),
    infraResources: JSON.parse(row.infra_resources ?? '[]'),
    infraEdges: JSON.parse(row.infra_edges ?? '[]'),
    commitHash: row.commit_hash,
    publishedAt: row.published_at,
  };
}

/**
 * Store de bajo nivel sobre SQLite (driver `sqlite`). `config` es el `cfg.graph`
 * de `.sdd/config.json`. `deps.importSqlite` es inyectable para tests (default
 * `() => import('better-sqlite3')`). Si el import falla (módulo no instalado o
 * falla de bindings), el error se PROPAGA: quien llama (`index.js`) lo traduce a
 * `{ok:false, reason:'missing-dependency'}` (ADR-0008).
 */
export async function createSqliteStore(config, deps = {}) {
  const importSqlite = deps.importSqlite || (() => import('better-sqlite3'));
  const dbPath = resolveDbPath(config);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const { default: Database } = await importSqlite();
  const db = new Database(dbPath);
  db.exec(CREATE_TABLE);

  // Migración de DBs existentes (tarea 002, sin las columnas de infra): agrega
  // las columnas faltantes vía ALTER TABLE. SQLite aplica el DEFAULT a las filas
  // ya existentes. PRAGMA table_info hace la migración idempotente.
  const existingCols = new Set(db.prepare('PRAGMA table_info(systems)').all().map((c) => c.name));
  for (const col of ['infra_resources', 'infra_edges']) {
    if (!existingCols.has(col)) {
      db.exec(`ALTER TABLE systems ADD COLUMN ${col} TEXT NOT NULL DEFAULT '[]'`);
    }
  }

  const upsertStmt = db.prepare(UPSERT);
  const selectOneStmt = db.prepare('SELECT * FROM systems WHERE canonical_name = ?');
  const selectAllStmt = db.prepare('SELECT * FROM systems');

  return {
    publishSystem({ canonicalName, repoPath, c1, endpoints, consumptions, infraResources, infraEdges, commitHash, publishedAt }) {
      upsertStmt.run({
        canonical_name: canonicalName,
        repo_path: repoPath,
        c1: c1 ?? null,
        endpoints: JSON.stringify(endpoints ?? []),
        consumptions: JSON.stringify(consumptions ?? []),
        infra_resources: JSON.stringify(infraResources ?? []),
        infra_edges: JSON.stringify(infraEdges ?? []),
        commit_hash: commitHash ?? null,
        published_at: publishedAt,
      });
    },
    querySystem(canonicalName) {
      const row = selectOneStmt.get(canonicalName);
      return row ? rowToSystem(row) : null;
    },
    listSystems() {
      return selectAllStmt.all().map(rowToSystem);
    },
    close() {
      db.close();
    },
  };
}
