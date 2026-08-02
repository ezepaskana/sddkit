import { join, resolve, isAbsolute } from 'node:path';
import { execSync } from 'node:child_process';
import { read, readJSON } from '../lib/fsutil.js';
import { createGraphStore } from '../lib/graphstore/index.js';
import { parseSectionItems } from '../lib/livingDocs.js';
import { blameLine } from '../lib/gitBlame.js';

/** ¿Corremos en CI? (`sdd publish --ci` o `CI=true` en el entorno). */
function isCiRun(flags) {
  return flags?.ci === true || process.env.CI === 'true';
}

/**
 * Parsea los bullets de `## <heading>` en `content` y les agrega la autoría real
 * (`git blame -L`) de la línea donde vive cada uno.
 *
 * El blame es best-effort por ítem: si falla (archivo sin versionar, repo sin
 * git, línea no blameable), el ítem igual se conserva con la metadata en `null`
 * — el texto del doc vivo es el dato principal, la autoría es enriquecimiento.
 *
 * @returns {{text: string, author: string|null, date: string|null, commitHash: string|null}[]}
 */
function collectLivingDocsItems(root, relPath, content, heading) {
  return parseSectionItems(content, heading).map((item) => {
    try {
      const { commitHash, author, date } = blameLine(root, relPath, item.line);
      return { text: item.text, author, date, commitHash };
    } catch {
      return { text: item.text, author: null, date: null, commitHash: null };
    }
  });
}

/**
 * `sdd publish`: gate de calidad (BR-013, criterio 2) + upsert del snapshot del
 * sistema (C1, capacidades, hash+timestamp) al graphstore configurado en
 * `.sdd/config.json → graph` (Fase 2). Degrada en silencio (BR-012) si el grafo
 * no está configurado o falta una dependencia opcional (ADR-0008).
 *
 * En CI (`flags.ci` o `CI=true`) re-detecta las capabilities de los archivos
 * tocados desde la última publicación con el LLM (ADR-0011) y mergea el
 * resultado en `.sdd/patterns.json` antes de publicar.
 *
 * @param {string} root Raíz del repo.
 * @param {object} flags Flags de la CLI (`ci`).
 * @param {object} [deps] Inyección para tests (`callDetectionLlm`).
 */
export async function publish(root, flags, deps = {}) {
  const c4dir = join(root, '.sdd', 'c4');

  const cfg = readJSON(join(root, '.sdd', 'config.json'));

  // 1. Gate de calidad: no publicar mientras haya preguntas sin responder en C4.
  const files = ['context.md', 'containers.md', 'components.md'];
  const counts = files.map((f) => ({
    file: f,
    count: (read(join(c4dir, f)) || '').match(/- \[ \] /g)?.length || 0,
  }));
  const total = counts.reduce((acc, c) => acc + c.count, 0);
  if (total > 0) {
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
  const store = await createGraphStore(cfg, deps);

  if (store.ok === false) {
    if (store.reason === 'not-configured') {
      console.log('⚠ Grafo no configurado — agregá a .sdd/config.json: { "graph": { "driver": "mysql", "mysql": { "urlEnv": "SDDKIT_GRAPH_DB_URL" } } }. Requiere CI/CD corriendo `sdd publish --ci` (ver ADR-0011). Ver README, sección "Grafo de impacto".');
    } else if (store.reason === 'missing-dependency') {
      console.log(`⚠ Falta una dependencia opcional para el driver del grafo. Instalala con: ${store.install}`);
    }
    return;
  }

  // 5. Living docs (tarea 010, Pivot 2): SOLO en CI. Reemplaza al viejo bloque de
  // detección LLM-en-CI (Pivot 1) por un parseo determinístico de las secciones de
  // `.sdd/c4/components.md` y `.sdd/domain.md`, enriquecido con `git blame` por
  // ítem. Es NO BLOQUEANTE: cualquier fallo se loguea y `publish()` continúa —
  // la publicación del snapshot del sistema no depende de los docs vivos.
  if (isCiRun(flags)) {
    try {
      const componentsRel = '.sdd/c4/components.md';
      const domainRel = '.sdd/domain.md';
      const componentsMd = read(join(root, '.sdd', 'c4', 'components.md')) || '';
      const domainMd = read(join(root, '.sdd', 'domain.md')) || '';

      await store.upsertLivingDocs(canonicalName, {
        inputs: collectLivingDocsItems(root, componentsRel, componentsMd, 'Inputs'),
        outputs: collectLivingDocsItems(root, componentsRel, componentsMd, 'Outputs'),
        entidades: collectLivingDocsItems(root, domainRel, domainMd, 'Entidades principales'),
        casosDeUso: collectLivingDocsItems(root, domainRel, domainMd, 'Casos de uso'),
      });
    } catch (err) {
      console.log(`⚠ No se pudieron actualizar los living docs: ${err.message}`);
    }
  }

  await store.publishSystem({ canonicalName, repoPath, c1, endpoints, consumptions, infraResources, infraEdges, commitHash, publishedAt });
  await store.close();
  console.log(`✓ Publicado "${canonicalName}" → commit ${commitHash ? commitHash.slice(0, 7) : '(sin git)'} @ ${publishedAt}`);
}
