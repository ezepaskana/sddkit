import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { read, readJSON } from '../lib/fsutil.js';
import { PKG_SKILLS, availableSkills, globalBase } from '../lib/skills.js';
import { VERSION } from '../version.js';

const ok = (m) => console.log('  ✓ ' + m);
const warn = (m) => console.log('  ⚠ ' + m);
const bad = (m) => console.log('  ✖ ' + m);
const info = (m) => console.log('  – ' + m);

/** `sdd doctor` — diagnóstico read-only del ecosistema sddkit (no modifica nada). */
export async function doctor(root) {
  console.log(`\nsddkit doctor v${VERSION} — diagnóstico read-only\n`);

  // Entorno
  const major = parseInt(process.versions.node.split('.')[0], 10);
  major >= 18 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node} — se requiere ≥ 18`);
  existsSync(join(root, '.git')) ? ok('Repo git') : warn('Sin .git — el pre-commit hook no aplica');
  try { execSync('docker info', { stdio: 'ignore' }); ok('Docker disponible (tests reproducibles)'); }
  catch { info('Docker no disponible — sdd test correrá nativo'); }

  // Config
  const cfg = readJSON(join(root, '.sdd', 'config.json'));
  if (!cfg) { bad('Sin .sdd/config.json — corré `sdd setup`'); return; }
  cfg.version === VERSION ? ok(`Config v${cfg.version} (al día)`) : warn(`Config v${cfg.version} vs CLI v${VERSION} — corré \`sdd sync\` para migrar`);
  const placeholders = Object.entries(cfg.models || {}).filter(([k, v]) => k !== '_nota' && String(v).includes('completar'));
  placeholders.length ? warn(`models sin completar: ${placeholders.map(([k]) => k).join(', ')}`) : ok('models configurados (rapido/medio/fuerte)');

  // Hook
  const hook = read(join(root, '.git', 'hooks', 'pre-commit'));
  if (cfg.hooks?.preCommit === false) info('pre-commit hook desactivado por config');
  else if (hook?.includes('sdd validate')) ok('pre-commit hook activo');
  else warn('pre-commit hook ausente — corré `sdd sync`');

  // Post-commit hook (auto-publish)
  const postCommitHook = read(join(root, '.git', 'hooks', 'post-commit'));
  if (cfg.hooks?.autoPublish === false) info('post-commit hook (auto-publish) desactivado por config');
  else if (postCommitHook?.includes('sdd publish')) ok('post-commit hook (auto-publish) activo');
  else warn('post-commit hook (auto-publish) ausente — corré `sdd sync`');

  // Skills
  const scope = cfg.skills || 'local';
  const base = scope === 'global' ? globalBase() : root;
  const expected = availableSkills().filter((n) => scope === 'global' || n !== 'sdd-bootstrap');
  let fresh = 0; const stale = []; const missing = [];
  for (const n of expected) {
    const dst = join(base, '.claude', 'skills', n, 'SKILL.md');
    if (!existsSync(dst)) { missing.push(n); continue; }
    try {
      readFileSync(dst, 'utf8') === readFileSync(join(PKG_SKILLS, n, 'SKILL.md'), 'utf8') ? fresh++ : stale.push(n);
    } catch { stale.push(n); }
  }
  if (!missing.length && !stale.length) ok(`Skills (${scope}): ${fresh}/${expected.length} instaladas y al día`);
  else {
    if (missing.length) warn(`Skills faltantes (${scope}): ${missing.join(', ')} — corré \`sdd sync\``);
    if (stale.length) warn(`Skills desactualizadas: ${stale.join(', ')} — corré \`sdd sync\``);
  }
  existsSync(join(globalBase(), '.claude', 'skills', 'sdd-bootstrap', 'SKILL.md'))
    ? ok('Skill global sdd-bootstrap instalada') : warn('Skill global sdd-bootstrap ausente — corré `sdd setup`');

  // Superficies y scripts
  const am = read(join(root, 'AGENTS.md'));
  am?.includes('<!-- sddkit:begin -->') ? ok('AGENTS.md con bloque gestionado') : warn('AGENTS.md sin bloque sddkit — corré `sdd scan`');
  existsSync(join(root, '.sdd', 'run-tests.mjs')) ? ok('Script de tests congelado (.sdd/run-tests.mjs)') : info('Sin .sdd/run-tests.mjs — la skill sdd-test lo crea en el primer uso');
  existsSync(join(root, '.sdd', 'run-checks.mjs')) ? ok('Script de checks (.sdd/run-checks.mjs)') : info('Sin .sdd/run-checks.mjs (opcional)');

  // Salud documental
  const openQ = (['context.md', 'containers.md', 'components.md']
    .map((f) => read(join(root, '.sdd', 'c4', f)) || '').join('\n') + (read(join(root, '.sdd', 'domain.md')) || ''))
    .match(/- \[ \] /g)?.length || 0;
  openQ === 0 ? ok('Docs sin preguntas abiertas') : warn(`${openQ} pregunta(s) abierta(s) en docs (ver .sdd/QUESTIONS.md)`);
  const tidx = readJSON(join(root, '.sdd', 'tasks', 'index.json'));
  const active = (tidx?.tasks || []).filter((t) => ['in-progress', 'paused'].includes(t.status));
  active.length ? info(`Tareas activas: ${active.map((t) => `${t.id}(${t.status})`).join(', ')}`) : ok('Sin tareas colgadas');

  console.log('\nDiagnóstico completo (read-only: nada fue modificado).');
}
