import { createSqliteStore } from './sqlite.js';
import { createMysqlStore } from './mysql.js';
import { queryCapability, queryImpact, queryInfraImpact } from './matching.js';

/**
 * Envuelve un store de bajo nivel (`{publishSystem, querySystem, listSystems, close}`)
 * en la interfaz única del graphstore (BR-012): delega publish/query/close y agrega
 * `queryCapability`/`queryImpact` (paso 3) y `queryInfraImpact` (Fase 3, BR-021)
 * alimentados por `listSystems()`.
 */
function wrap(store) {
  return {
    ok: true,
    publishSystem: store.publishSystem,
    querySystem: store.querySystem,
    close: store.close,
    queryCapability: (method, normalizedPath) => queryCapability(store.listSystems(), method, normalizedPath),
    queryImpact: (query) => queryImpact(store.listSystems(), query),
    queryInfraImpact: (resource) => queryInfraImpact(store.listSystems(), resource),
  };
}

/**
 * Factory del graphstore (Fase 2). `cfg` es el `.sdd/config.json` parseado completo
 * (puede ser `null`/`undefined`). Según `cfg.graph.driver`:
 * - sin driver / driver desconocido → `{ok:false, reason:'not-configured'}` (BR-012).
 * - `sqlite` → store SQLite; si el módulo no está instalado → `missing-dependency`.
 * - `mysql` → store MySQL (BR-015); sin `config.mysql.urlEnv`/env var seteada →
 *   `missing-env`; si el módulo no está instalado → `missing-dependency`.
 */
export async function createGraphStore(cfg, deps = {}) {
  const driver = cfg?.graph?.driver;
  if (!driver) return { ok: false, reason: 'not-configured' };

  if (driver === 'sqlite') {
    try {
      const store = await createSqliteStore(cfg.graph, deps);
      return wrap(store);
    } catch (err) {
      return { ok: false, reason: 'missing-dependency', install: 'npm i better-sqlite3' };
    }
  }

  if (driver === 'mysql') {
    try {
      const result = await createMysqlStore(cfg.graph, deps);
      if (result.ok === false) return result; // missing-env: propagar tal cual
      return wrap(result);
    } catch (err) {
      return { ok: false, reason: 'missing-dependency', install: 'npm i mysql2' };
    }
  }

  return { ok: false, reason: 'not-configured' };
}
