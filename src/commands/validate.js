import { join } from 'node:path';
import { walk, read, readJSON } from '../lib/fsutil.js';
import { detectPatterns } from '../lib/patterns.js';
import { loadCatalog, saveCatalog } from '../lib/catalog.js';
import { componentGroups } from '../lib/c4.js';

export async function validate(root, flags) {
  if (flags.hook) {
    // Modo pre-commit: si el repo no usa sddkit o el hook está desactivado, salir en silencio.
    const cfg = readJSON(join(root, '.sdd', 'config.json'));
    if (!cfg) return;
    if (cfg.hooks && cfg.hooks.preCommit === false) return;
  }
  const files = walk(root);
  const violations = [];
  const warnings = [];

  // 1. Catálogo: las variantes no canónicas no pueden crecer sobre su baseline legacy.
  const cat = loadCatalog(root);
  const patterns = cat.decisions.length ? detectPatterns(root, files) : [];
  let ratcheted = false;
  for (const d of cat.decisions) {
    const t = patterns.find((p) => p.topic === d.topic);
    if (!t) continue;
    for (const v of t.variants) {
      if (v.id === d.chosen) continue;
      const allowed = (d.legacy && d.legacy[v.id]) || 0;
      if (v.count > allowed) {
        violations.push(
          `Catálogo [${d.topic}]: la convención es "${d.chosen}", pero "${v.id}" creció de ${allowed} a ${v.count} archivos. Ejemplos: ${v.examples.join(', ')}`
        );
      } else if (v.count < allowed && flags.update) {
        d.legacy[v.id] = v.count; // ratchet: la deuda solo baja, nunca sube
        ratcheted = true;
      }
    }
  }
  if (ratcheted) {
    saveCatalog(root, cat);
    console.log('✓ Baseline de deuda legacy ajustado hacia abajo (ratchet).');
  }

  // 2. Drift estructural: components.md vs realidad del repo.
  const compDoc = read(join(root, '.sdd', 'c4', 'components.md'));
  if (compDoc) {
    const docDirs = [...compDoc.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
    const { srcRoot, groups } = componentGroups(files);
    const current = Object.keys(groups).map((d) => (srcRoot && d !== '(raíz)' ? `${srcRoot}/${d}` : d));
    for (const d of current) {
      if (!docDirs.includes(d)) warnings.push(`Drift: el módulo "${d}" existe en el repo pero no figura en .sdd/c4/components.md → corré \`sdd scan\``);
    }
    for (const d of docDirs) {
      if (!current.includes(d)) warnings.push(`Drift: "${d}" figura en .sdd/c4/components.md pero ya no existe en el repo → corré \`sdd scan\``);
    }
  } else {
    warnings.push('No hay documentación C4 (.sdd/c4/) — corré `sdd scan` primero.');
  }

  // 2b. Completitud: placeholders sin responder en los docs C4.
  const openQ = (['context.md', 'containers.md', 'components.md']
    .map((f) => read(join(root, '.sdd', 'c4', f)) || '')
    .join('\n') + (read(join(root, '.sdd', 'domain.md')) || ''))
    .match(/- \[ \] /g)?.length || 0;
  if (openQ > 0) {
    warnings.push(`Docs C4 incompletos: ${openQ} pregunta(s) abierta(s). El agente debe completarlas desde las fuentes de .sdd/QUESTIONS.md`);
  }

  // 2c. Tareas SDD activas (recordatorio de reanudación, informativo).
  const tidx = readJSON(join(root, '.sdd', 'tasks', 'index.json'));
  const active = (tidx?.tasks || []).filter((t) => ['in-progress', 'paused'].includes(t.status));

  // 3. Reporte
  console.log(`\nsddkit validate — ${files.length} archivos\n`);
  for (const w of warnings) console.log('  ⚠ ' + w);
  for (const v of violations) console.log('  ✖ ' + v);
  if (!violations.length && !warnings.length) {
    console.log('  ✓ Sin drift ni violaciones del catálogo.');
  } else if (!violations.length) {
    console.log(`\n✓ Sin violaciones del catálogo (${warnings.length} advertencia(s) de drift).`);
  }
  for (const t of active) {
    console.log(`  ℹ Tarea SDD activa: ${t.id} (${t.status}) — retomar con \`sdd task show ${t.id}\``);
  }
  if (violations.length) {
    console.log(`\n✖ ${violations.length} violación(es) del catálogo. El check falla (exit 1) — apto para CI o pre-commit.`);
    process.exit(1);
  }
}
