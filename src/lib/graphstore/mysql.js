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

/**
 * Tablas de living docs (tarea 010): una por categoría, con la misma forma.
 * La clave del objeto en JS es camelCase (`casosDeUso`) pero la tabla es
 * snake_case (`casos_de_uso`) — ver LIVING_DOCS_TABLES.
 */
const LIVING_DOCS_TABLES = [
  { key: 'inputs', table: 'inputs' },
  { key: 'outputs', table: 'outputs' },
  { key: 'entidades', table: 'entidades' },
  { key: 'casosDeUso', table: 'casos_de_uso' },
];

const createLivingDocsTable = (table) => `
  CREATE TABLE IF NOT EXISTS ${table} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    canonical_name VARCHAR(255) NOT NULL,
    text TEXT,
    added_by VARCHAR(255),
    added_at VARCHAR(32),
    commit_hash VARCHAR(64)
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
 * `() => import('mysql2/promise').then((m) => (m.default ?? m).createPool(connectionString))`).
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

  // `mysql2/promise` es CJS: sus named exports en ESM (`m.createPool`) son un
  // snapshot congelado en el primer import del proceso, mientras que `m.default`
  // ES el `module.exports` vivo. Usamos `m.default` para leer siempre el valor
  // actual (los tests parchean `createPool` sobre el objeto CJS).
  const createPool = deps.createPool || (() => import('mysql2/promise').then((m) => (m.default ?? m).createPool(connectionString)));
  const pool = await createPool();
  await pool.execute(CREATE_TABLE);
  for (const { table } of LIVING_DOCS_TABLES) {
    await pool.execute(createLivingDocsTable(table));
  }

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
    /**
     * Reemplaza (delete + insert) los living docs de un sistema. El DELETE corre
     * siempre para las 4 categorías, aunque el array venga vacío: así una
     * categoría que se vació queda vacía también en la DB.
     */
    async upsertLivingDocs(canonicalName, docs = {}) {
      for (const { key, table } of LIVING_DOCS_TABLES) {
        await pool.execute(`DELETE FROM ${table} WHERE canonical_name = ?`, [canonicalName]);
        for (const item of docs?.[key] ?? []) {
          await pool.execute(
            `INSERT INTO ${table} (canonical_name, text, added_by, added_at, commit_hash) VALUES (?, ?, ?, ?, ?)`,
            [
              canonicalName,
              item.text ?? null,
              item.author ?? null,
              item.date ?? null,
              item.commitHash ?? null,
            ],
          );
        }
      }
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
