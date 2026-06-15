import { join } from 'node:path';
import { readJSON } from '../lib/fsutil.js';
import { createGraphStore } from '../lib/graphstore/index.js';
import { normalizeRoute } from '../lib/patterns.js';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

/** Imprime un consumidor en formato legible (criterio 6). `indent` se antepone a cada línea. */
function printConsumer(c, indent = '') {
  const method = c.method ?? '?';
  console.log(`${indent}- ${c.canonicalName} [${c.confidence}] ${method} ${c.target}`);
  console.log(`${indent}    archivo: ${c.file}`);
  console.log(`${indent}    repo: ${c.repoPath}`);
  console.log(`${indent}    publicado: ${c.publishedAt}`);
}

/**
 * `sdd impact <MÉTODO> <ruta>` → ¿quién consume este endpoint? (BR-014)
 * `sdd impact <sistema>` → ¿quién consume los endpoints de este sistema? (reverse lookup)
 * Consulta el grafo de impacto configurado en `.sdd/config.json → graph` (Fase 2).
 * Degrada en silencio (BR-012) si el grafo no está configurado o falta una dependencia.
 */
export async function impact(root, pos, flags) {
  if (pos.length === 0) {
    throw new Error('Uso: sdd impact <MÉTODO> <ruta>  |  sdd impact <sistema>');
  }

  let query;
  const maybeMethod = pos[0].toUpperCase();
  if (HTTP_METHODS.has(maybeMethod) && pos.length >= 2) {
    query = { method: maybeMethod, path: pos[1] };
  } else {
    query = { system: pos[0] };
  }

  const cfg = readJSON(join(root, '.sdd', 'config.json'));
  const store = await createGraphStore(cfg);

  if (store.ok === false) {
    if (store.reason === 'not-configured') {
      console.log('⚠ Grafo no configurado — agregá a .sdd/config.json: { "graph": { "driver": "sqlite" } } (default: ~/.sddkit/graph.db). Ver README, sección "Grafo de impacto".');
    } else if (store.reason === 'missing-dependency') {
      console.log(`⚠ Falta una dependencia opcional para el driver del grafo. Instalala con: ${store.install}`);
    }
    return;
  }

  try {
    if (query.system != null) {
      const results = store.queryImpact(query);
      if (results === null) {
        const infraResults = store.queryInfraImpact(pos[0]);
        if (infraResults.length > 0) {
          console.log(`Recurso de infra "${pos[0]}":`);
          for (const r of infraResults) {
            console.log(`- ${r.canonicalName} [${r.confidence}] ${r.type}: ${r.from} → ${r.to}${r.action ? ` (${r.action})` : ''}`);
          }
          return;
        }
        console.log(`✖ "${pos[0]}" no encontrado: no matchea ningún sistema publicado ni recurso de infra publicado, ni se interpreta como "<MÉTODO> <ruta>". Probá: sdd impact <MÉTODO> <ruta> | sdd impact <sistema> | sdd impact <ARN-o-nombre-de-recurso>`);
        return;
      }
      console.log(`Impacto de ${query.system}:`);
      for (const { endpoint, consumers } of results) {
        console.log(`${endpoint.method} ${endpoint.path}`);
        if (consumers.length === 0) {
          console.log('    (sin consumidores publicados para este endpoint)');
        } else {
          for (const c of consumers) printConsumer(c, '  ');
        }
      }
      return;
    }

    const results = store.queryImpact(query);
    if (results.length === 0) {
      console.log(`Sin consumidores publicados hasta la fecha para ${query.method} ${normalizeRoute(query.path)}.`);
      return;
    }
    console.log(`Consumidores de ${query.method} ${query.path}:`);
    for (const c of results) printConsumer(c);
  } finally {
    store.close();
  }
}
