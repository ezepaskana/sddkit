const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS systems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    canonical_name VARCHAR(255) UNIQUE NOT NULL,
    repo_path TEXT,
    c1 LONGTEXT,
    endpoints LONGTEXT,
    consumptions LONGTEXT,
    infra_resources LONGTEXT,
    infra_edges LONGTEXT,
    commit_hash VARCHAR(64),
    published_at VARCHAR(32)
  )
`;

const UPSERT = `
  INSERT INTO systems (canonical_name, repo_path, c1, endpoints, consumptions, infra_resources, infra_edges, commit_hash, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    repo_path = VALUES(repo_path),
    c1 = VALUES(c1),
    endpoints = VALUES(endpoints),
    consumptions = VALUES(consumptions),
    infra_resources = VALUES(infra_resources),
    infra_edges = VALUES(infra_edges),
    commit_hash = VALUES(commit_hash),
    published_at = VALUES(published_at)
`;

/** Mapea una fila cruda de la tabla `systems` a la forma camelCase con JSON parseado. */
function rowToSystem(row) {
  return {
    canonicalName: row.canonical_name,
    repoPath: row.repo_path,
    c1: row.c1,
    endpoints: JSON.parse(row.endpoints),
    consumptions: JSON.parse(row.consumptions),
    infraResources: JSON.parse(row.infra_resources || '[]'),
    infraEdges: JSON.parse(row.infra_edges || '[]'),
    commitHash: row.commit_hash,
    publishedAt: row.published_at,
  };
}

/**
 * Store de bajo nivel sobre MySQL (driver `mysql`). `config` es el `cfg.graph`
 * de `.sdd/config.json`. `deps.createPool` es inyectable para tests (default
 * `() => import('mysql2/promise').then((m) => m.createPool(connectionString))`).
 *
 * BR-015: la connection string se resuelve vía la env var nombrada en
 * `config.mysql.urlEnv` — nunca se loguea ni se incluye su valor en ningún
 * mensaje, solo el nombre de la variable. Si `urlEnv` falta o la env var no
 * está seteada, devolvemos `{ok:false, reason:'missing-env', envVar}` de forma
 * SÍNCRONA sin intentar crear el pool.
 *
 * Si `createPool` falla (módulo `mysql2` no instalado o error de conexión), el
 * error se PROPAGA: quien llama (`index.js`) lo traduce a
 * `{ok:false, reason:'missing-dependency'}` (mismo contrato que sqlite.js).
 */
export async function createMysqlStore(config, deps = {}) {
  const urlEnv = config?.mysql?.urlEnv;
  const connectionString = urlEnv ? process.env[urlEnv] : undefined;
  if (!connectionString) {
    return { ok: false, reason: 'missing-env', envVar: urlEnv };
  }

  const createPool = deps.createPool || (() => import('mysql2/promise').then((m) => m.createPool(connectionString)));
  const pool = await createPool();
  await pool.execute(CREATE_TABLE);

  // Migración de DBs existentes (tarea 002, sin las columnas de infra): MySQL no
  // permite DEFAULT en columnas TEXT/LONGTEXT (<8.0.13), así que las agregamos
  // sin DEFAULT (filas migradas quedan con NULL → rowToSystem las trata como []).
  // Consultar information_schema hace la migración idempotente.
  const [infoRows] = await pool.execute(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'systems' AND table_schema = DATABASE()",
  );
  const existingCols = new Set(
    (infoRows ?? []).map((r) => String(r.column_name ?? r.COLUMN_NAME).toLowerCase()),
  );
  for (const col of ['infra_resources', 'infra_edges']) {
    if (!existingCols.has(col)) {
      await pool.execute(`ALTER TABLE systems ADD COLUMN ${col} LONGTEXT`);
    }
  }

  return {
    async publishSystem({ canonicalName, repoPath, c1, endpoints, consumptions, infraResources, infraEdges, commitHash, publishedAt }) {
      await pool.execute(UPSERT, [
        canonicalName,
        repoPath,
        c1 ?? null,
        JSON.stringify(endpoints ?? []),
        JSON.stringify(consumptions ?? []),
        JSON.stringify(infraResources ?? []),
        JSON.stringify(infraEdges ?? []),
        commitHash ?? null,
        publishedAt,
      ]);
    },
    async querySystem(canonicalName) {
      const [rows] = await pool.execute('SELECT * FROM systems WHERE canonical_name = ?', [canonicalName]);
      return rows.length === 0 ? null : rowToSystem(rows[0]);
    },
    async listSystems() {
      const [rows] = await pool.execute('SELECT * FROM systems');
      return rows.map(rowToSystem);
    },
    async close() {
      await pool.end();
    },
  };
}
