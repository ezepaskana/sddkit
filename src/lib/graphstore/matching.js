import { normalizeRoute } from '../patterns.js';

const ENV_PREFIX_RE = /^env:[A-Za-z0-9_]+/;

/**
 * Cruza un endpoint con un consumo, ambos en su forma normalizada (`normalizeRoute`),
 * y devuelve la confianza del match (BR-014):
 * - `'(dynamic)'` como target nunca matchea → `null`.
 * - rutas idénticas → `'exacto'`.
 * - target con prefijo `env:VAR`: el resto del string (`stripped`) debe ser sufijo
 *   del endpoint → `'posible'` (no sabemos a qué host resuelve la env var).
 * - target sin prefijo `env:` que es sufijo (no idéntico) del endpoint → `'posible'`.
 * - caso contrario → `null`.
 */
export function matchOne(normEndpointPath, normConsumptionTarget) {
  if (normConsumptionTarget === '(dynamic)') return null;
  if (normEndpointPath === normConsumptionTarget) return 'exacto';
  const env = normConsumptionTarget.match(ENV_PREFIX_RE);
  if (env) {
    const stripped = normConsumptionTarget.slice(env[0].length);
    if (stripped.length > 0 && normEndpointPath.endsWith(stripped)) return 'posible';
    return null;
  }
  if (normEndpointPath !== normConsumptionTarget && normEndpointPath.endsWith(normConsumptionTarget)) {
    return 'posible';
  }
  return null;
}

/**
 * `true` si el método del consumo es desconocido (`null`) o coincide
 * (case-insensitive) con el método consultado.
 */
export function matchMethod(queryMethod, consumptionMethod) {
  if (consumptionMethod == null) return true;
  return consumptionMethod.toUpperCase() === queryMethod.toUpperCase();
}

/**
 * Cruza `method`/`normalizedPath` contra TODOS los `consumptions` de TODOS los
 * sistemas publicados y devuelve los matches ordenados por confianza
 * (`exacto` antes que `posible`) y, dentro de cada grupo, por `canonicalName`.
 */
export function queryCapability(systems, method, normalizedPath) {
  const out = [];
  for (const sys of systems) {
    for (const c of sys.consumptions || []) {
      if (!matchMethod(method, c.method)) continue;
      let confidence = matchOne(normalizedPath, normalizeRoute(c.target));
      if (confidence === null) continue;
      // Método incierto: no puede ser mejor que `posible`.
      if (c.method == null) confidence = 'posible';
      out.push({
        canonicalName: sys.canonicalName,
        repoPath: sys.repoPath,
        kind: 'consumption',
        method: c.method,
        target: c.target,
        file: c.file,
        publishedAt: sys.publishedAt,
        confidence,
      });
    }
  }
  return out.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === 'exacto' ? -1 : 1;
    return a.canonicalName.localeCompare(b.canonicalName);
  });
}

/**
 * Punto de entrada del grafo de impacto (Fase 2). Dos formas de query:
 * - `{ method, path }`: ¿quién consume este endpoint? → array de consumos.
 * - `{ system }`: reverse lookup, ¿quién consume los endpoints de este sistema?
 *   → array `[{ endpoint, consumers }]` (uno por endpoint), o `null` si el
 *   sistema no existe. Excluye los consumos del propio sistema.
 */
export function queryImpact(systems, query) {
  if (query && query.system != null) {
    const target = systems.find((s) => s.canonicalName === query.system);
    if (!target) return null;
    const otherSystems = systems.filter((s) => s !== target);
    return (target.endpoints || []).map((e) => ({
      endpoint: { method: e.method, path: e.path },
      consumers: queryCapability(otherSystems, e.method, normalizeRoute(e.path)),
    }));
  }
  const normalizedPath = normalizeRoute(query.path);
  return queryCapability(systems, query.method, normalizedPath);
}

/**
 * Grafo de impacto de infraestructura (Fase 3, BR-021): busca `resource` (ARN o
 * nombre de recurso, comparación exacta) en `from`/`to` de cada `infraEdges` de
 * cada sistema y devuelve un array con el sistema que publicó esa arista.
 */
export function queryInfraImpact(systems, resource) {
  const out = [];
  for (const sys of systems) {
    for (const edge of sys.infraEdges || []) {
      if (edge.from === resource || edge.to === resource) {
        out.push({
          canonicalName: sys.canonicalName,
          from: edge.from,
          to: edge.to,
          type: edge.type,
          confidence: edge.confidence,
          action: edge.action,
        });
      }
    }
  }
  return out;
}
