import { join, resolve, isAbsolute } from 'node:path';
import { execSync } from 'node:child_process';
import { read, readJSON } from '../lib/fsutil.js';
import { createGraphStore } from '../lib/graphstore/index.js';

/**
 * `sdd publish`: gate de calidad (BR-013, criterio 2) + upsert del snapshot del
 * sistema (C1, capacidades, hash+timestamp) al graphstore configurado en
 * `.sdd/config.json → graph` (Fase 2). Degrada en silencio (BR-012) si el grafo
 * no está configurado o falta una dependencia opcional (ADR-0008).
 */
export async function publish(root, flags) {
  const c4dir = join(root, '.sdd', 'c4');

  // 0. Config del repo. En modo --hook solo publicamos para el grafo local sqlite
  //    con autoPublish habilitado; cualquier otro caso degrada en silencio (BR-024).
  const cfg = readJSON(join(root, '.sdd', 'config.json'));
  if (flags.hook && (!cfg || cfg.graph?.driver !== 'sqlite' || cfg.hooks?.autoPublish === false)) {
    return;
  }

  // 1. Gate de calidad: no publicar mientras haya preguntas sin responder en C4.
  const files = ['context.md', 'containers.md', 'components.md'];
  const counts = files.map((f) => ({
    file: f,
    count: (read(join(c4dir, f)) || '').match(/- \[ \] /g)?.length || 0,
  }));
  const total = counts.reduce((acc, c) => acc + c.count, 0);
  if (total > 0) {
    if (flags.hook) return; // BR-025: gate rechazado en --hook → silencio.
    console.log(`✖ Publicación rechazada: hay ${total} pregunta(s) sin responder en .sdd/c4/`);
    for (const c of counts) {
      if (c.count > 0) console.log(`  - ${c.file}: ${c.count} pendiente(s)`);
    }
    return;
  }

  // 2. canonicalName desde context.md.
  const contextMd = read(join(c4dir, 'context.md')) || '';
  const canonicalName = contextMd.match(/\*\*Sistema:\*\*\s*(.+)/)?.[1]?.trim() || '(sin nombre)';

  // 3. Datos del snapshot.
  const repoPath = isAbsolute(root) ? root : resolve(root);
  const c1 = contextMd;
  const patternsJson = readJSON(join(root, '.sdd', 'patterns.json'));
  const capabilities = patternsJson?.capabilities;
  const endpoints = capabilities?.endpoints || [];
  const consumptions = capabilities?.consumptions || [];
  const infra = patternsJson?.infra;
  const infraResources = infra?.resources ?? [];
  const infraEdges = infra?.edges ?? [];

  let commitHash = null;
  try {
    commitHash = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    commitHash = null;
  }

  const publishedAt = new Date().toISOString();

  // 4. Graphstore: upsert o degradación (BR-012).
  const store = await createGraphStore(cfg);

  if (store.ok === false) {
    if (flags.hook) return; // BR-025: store.ok===false en --hook → silencio.
    if (store.reason === 'not-configured') {
      console.log('⚠ Grafo no configurado — agregá a .sdd/config.json: { "graph": { "driver": "sqlite" } } (default: ~/.sddkit/graph.db). Ver README, sección "Grafo de impacto".');
    } else if (store.reason === 'missing-dependency') {
      console.log(`⚠ Falta una dependencia opcional para el driver del grafo. Instalala con: ${store.install}`);
    }
    return;
  }

  store.publishSystem({ canonicalName, repoPath, c1, endpoints, consumptions, infraResources, infraEdges, commitHash, publishedAt });
  store.close();
  if (flags.hook) {
    console.log(`✓ grafo local actualizado (sqlite) → commit ${commitHash ? commitHash.slice(0, 7) : '(sin git)'} @ ${publishedAt}`);
  } else {
    console.log(`✓ Publicado "${canonicalName}" → commit ${commitHash ? commitHash.slice(0, 7) : '(sin git)'} @ ${publishedAt}`);
  }
}
