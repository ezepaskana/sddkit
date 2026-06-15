import { join, isAbsolute, resolve } from 'node:path';
import { walk, read, write, writeJSON, readJSON } from '../lib/fsutil.js';
import { detectStack, detectDocs } from '../lib/detect.js';
import { detectPatterns, extractEndpoints, extractConsumptions } from '../lib/patterns.js';
import { loadCatalog } from '../lib/catalog.js';
import { upsertAgentsMd } from '../lib/agentsmd.js';
import { buildContainers, genContext, genContainers, genComponents, preserveManual } from '../lib/c4.js';
import { genDomain, ADR_TEMPLATE, ADR_README } from '../lib/domain.js';
import { extractInfra } from '../lib/terraform.js';

function upsertGenerated(path, generated) {
  if (read(path) !== null) return;
  write(path, preserveManual(null, generated));
}

function genQuestions(root, c4dir, docSources, date) {
  const qs = ['context.md', 'containers.md', 'components.md'].flatMap((f) => {
    const content = read(join(c4dir, f)) || '';
    return (content.match(/- \[ \] .+/g) || []).map((q) => `${q}  _(en .sdd/c4/${f})_`);
  });
  const dom = read(join(root, '.sdd', 'domain.md')) || '';
  qs.push(...(dom.match(/- \[ \] .+/g) || []).map((q) => `${q}  _(en .sdd/domain.md)_`));
  const sources = docSources.length
    ? docSources.map((s) => `- \`${s.path}\` (${s.files} archivo${s.files > 1 ? 's' : ''})${s.docs && s.docs.length > 1 ? ': ' + s.docs.slice(0, 8).join(', ') : ''}`).join('\n')
    : '_No se detectó documentación previa — las respuestas van a salir del código y del dev._';
  return `# Preguntas pendientes del proyecto

> Generado por \`sdd scan\` el ${date}. **Agente:** intentá responder estas preguntas en este orden de fuentes: 1) la documentación existente listada abajo, 2) el código, 3) preguntándole al dev. Al responder una, escribí la respuesta en el doc C4 correspondiente y marcá su checkbox allí — este archivo se regenera desde los docs C4.

## Fuentes de documentación existente (leelas primero)

${sources}

## Preguntas abiertas (${qs.length})

${qs.length ? qs.join('\n') : '_Ninguna — la documentación está al día._'}
`;
}

export async function scan(root, flags) {
  let infra;
  if (flags.terraform) {
    const tfPath = isAbsolute(flags.terraform) ? flags.terraform : resolve(process.cwd(), flags.terraform);
    const parsed = readJSON(tfPath);
    if (parsed === null) {
      throw new Error(`--terraform: no se pudo leer "${flags.terraform}" — ¿existe y es un terraform show -json válido?`);
    }
    infra = extractInfra(parsed);
  }

  const date = new Date().toISOString().slice(0, 10);
  const files = walk(root);
  if (!files.length) throw new Error(`No se encontraron archivos en ${root}`);
  const stack = detectStack(root, files);
  const containers = buildContainers(root, stack);
  const docSources = detectDocs(root, files);
  const capabilities = { endpoints: extractEndpoints(root, files), consumptions: extractConsumptions(root, files) };

  // 1. Docs C4 (preservando secciones manuales)
  const c4dir = join(root, '.sdd', 'c4');
  upsertGenerated(join(c4dir, 'context.md'), genContext(stack, date));
  upsertGenerated(join(c4dir, 'containers.md'), genContainers(stack, containers, capabilities.consumptions, date));
  upsertGenerated(join(c4dir, 'components.md'), genComponents(root, files, date));

  // 1b. Dominio y lógica de negocio (vinculante como el catálogo) + ADRs
  upsertGenerated(join(root, '.sdd', 'domain.md'), genDomain(stack, files, date));
  if (read(join(root, '.sdd', 'decisions', 'README.md')) === null) {
    write(join(root, '.sdd', 'decisions', 'README.md'), ADR_README);
    write(join(root, '.sdd', 'decisions', '0000-plantilla.md'), ADR_TEMPLATE);
  }

  // 2. Patrones con variantes
  const patterns = detectPatterns(root, files);
  writeJSON(join(root, '.sdd', 'patterns.json'), { scannedAt: date, filesScanned: files.length, patterns, capabilities, ...(infra ? { infra } : {}) });

  // 3. Indice de preguntas pendientes + fuentes documentales
  write(join(root, '.sdd', 'QUESTIONS.md'), genQuestions(root, c4dir, docSources, date));

  // 4. AGENTS.md (bloque gestionado)
  const cat = loadCatalog(root);
  upsertAgentsMd(root, stack, cat, date);

  // 5. Resumen
  console.log(`\nsddkit scan — ${stack.name} (${files.length} archivos)\n`);
  console.log(`Lenguajes:  ${stack.languages.map((l) => `${l.lang} (${l.files})`).join(', ') || 's/d'}`);
  if (stack.frameworks.length) console.log(`Frameworks: ${stack.frameworks.join(', ')}`);
  if (stack.dataStores.length) console.log(`Datos:      ${stack.dataStores.join(', ')}`);
  console.log(`Contenedores: ${containers.map((c) => c.name).join(', ')}`);
  if (docSources.length) console.log(`Documentación existente: ${docSources.map((s) => s.path).join(', ')} → fuente para responder preguntas`);
  console.log('\nGenerado/actualizado:');
  console.log('  ✓ .sdd/c4/ (context, containers, components) + .sdd/domain.md + .sdd/decisions/ + QUESTIONS.md');
  console.log('  ✓ .sdd/patterns.json + AGENTS.md (bloque gestionado)');

  const decided = new Set(cat.decisions.map((d) => d.topic));
  const conflicts = patterns.filter((p) => p.multipleStyles && !decided.has(p.topic));
  if (conflicts.length && !flags.quiet) {
    console.log('\n❓ Convenciones con más de una variante (se resuelven eligiendo una opción en `sdd setup`):');
    for (const c of conflicts) {
      console.log(`  · ${c.topic}: ${c.variants.map((v) => `${v.id}(${v.count})`).join(' vs ')}`);
    }
  }
  return { stack, patterns, conflicts, docSources };
}
