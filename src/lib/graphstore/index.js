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
    upsertLivingDocs: store.upsertLivingDocs,
    querySystem: store.querySystem,
    close: store.close,
    queryCapability: async (method, normalizedPath) => queryCapability(await store.listSystems(), method, normalizedPath),
    queryImpact: async (query) => queryImpact(await store.listSystems(), query),
    queryInfraImpact: async (resource) => queryInfraImpact(await store.listSystems(), resource),
  };
}

/**
 * Factory del graphstore (Fase 2). `cfg` es el `.sdd/config.json` parseado completo
 * (puede ser `null`/`undefined`). Según `cfg.graph.driver`:
 * - sin driver / driver desconocido → `{ok:false, reason:'not-configured'}` (BR-012).
 * - `sqlite` → ya no soportado (ver ADR-0011); `{ok:false, reason:'unsupported-driver'}`.
 * - `mysql` → store MySQL (BR-015); sin `config.mysql.urlEnv`/env var seteada →
 *   `missing-env`; si el módulo no está instalado → `missing-dependency`.
 */
export async function createGraphStore(cfg, deps = {}) {
  const driver = cfg?.graph?.driver;
  if (!driver) return { ok: false, reason: 'not-configured' };

  if (driver === 'sqlite') {
    return {
      ok: false,
      reason: 'unsupported-driver',
      message: 'graph.driver: "sqlite" no está soportado (ver ADR-0011) — migrá a "mysql" + CI/CD',
    };
  }

  if (driver === 'mysql') {
    try {
      const result = await createMysqlStore(cfg.graph, deps);
      if (result.ok === false) return result; // missing-env: propagar tal cual
      return wrap(result);
    } catch (err) {
      if (!isModuleNotFound(err)) throw err;
      return { ok: false, reason: 'missing-dependency', install: 'npm i mysql2' };
    }
  }

  return { ok: false, reason: 'not-configured' };
}

/**
 * Distingue "el módulo opcional no está instalado" (única causa que justifica el
 * mensaje `missing-dependency`) de cualquier otro fallo de apertura (DB corrupta,
 * bindings rotos, permisos, bug del store), que debe propagarse con su mensaje real.
 */
function isModuleNotFound(err) {
  if (!err) return false;
  if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') return true;
  // El import dinámico de un paquete ausente no siempre trae `code`; el mensaje
  // de Node es "Cannot find module/package '<x>'".
  return /Cannot find (module|package)/i.test(err.message || '');
}
