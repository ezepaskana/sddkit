import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
import { read, write } from '../lib/fsutil.js';
import { removeSkills, globalBase } from '../lib/skills.js';

const BEGIN = '<!-- sddkit:begin -->';
const END = '<!-- sddkit:end -->';

/**
 * `sdd uninstall` — por defecto solo lo de la máquina (skill global).
 * Lo del repo es memoria del equipo versionada en git: se limpia solo con
 * `--repo` (+ confirmación), usando los delimitadores exactos que sddkit instaló.
 */
export async function uninstall(root, flags) {
  console.log('sddkit uninstall\n');

  // 1. Skills a nivel máquina (global)
  const removedGlobal = removeSkills(globalBase());
  if (removedGlobal.length) console.log('✓ Skills globales eliminadas: ' + removedGlobal.join(', '));
  else console.log('– Skills globales: no había instaladas');

  if (!flags.repo) {
    console.log(`
Lo del repo NO se tocó (es del equipo y está versionado en git). Para limpiar
un repo: corré \`sdd uninstall --repo\` parado en él (pide confirmación y usa
los delimitadores exactos que sddkit instaló), o a mano:

  · .sdd/                          (docs C4, catálogo, tareas)
  · .claude/skills/sdd-* (las 7 skills, si elegiste alcance local)
  · .cursor/rules/sdd.mdc
  · bloque ${BEGIN} … ${END} en AGENTS.md
  · línea <!-- sddkit --> al final de CLAUDE.md
  · línea "sdd validate --hook" en .git/hooks/pre-commit
  · línea "sdd publish --hook" en .git/hooks/post-commit

Para borrar el comando \`sdd\` de la máquina: npm rm -g sddkit (o \`npm unlink\` si usaste npm link).`);
    return;
  }

  // 2. --repo: limpieza precisa del repo actual, con confirmación
  if (!flags.yes) {
    if (!process.stdin.isTTY) throw new Error('--repo sin terminal interactiva requiere confirmación explícita: agregá --yes');
    const { createInterface } = await import('node:readline/promises');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const a = (await rl.question(`Esto elimina .sdd/ (catálogo, tareas, docs C4) y los artefactos sddkit de:\n  ${root}\n¿Seguro? (escribí "si"): `)).trim().toLowerCase();
    rl.close();
    if (a !== 'si' && a !== 'sí') { console.log('Cancelado — no se tocó nada.'); return; }
  }

  const gone = [];
  for (const p of ['.sdd', join('.cursor', 'rules', 'sdd.mdc')]) {
    const full = join(root, p);
    if (existsSync(full)) { rmSync(full, { recursive: true, force: true }); gone.push(p); }
  }
  for (const s of removeSkills(root)) gone.push(join('.claude', 'skills', s));

  // AGENTS.md: solo el bloque gestionado; el resto del archivo queda intacto.
  const ap = join(root, 'AGENTS.md');
  const am = read(ap);
  if (am && am.includes(BEGIN) && am.includes(END)) {
    const next = (am.slice(0, am.indexOf(BEGIN)) + am.slice(am.indexOf(END) + END.length))
      .replace(/\n{3,}/g, '\n\n').trim();
    write(ap, next + '\n');
    gone.push('AGENTS.md (solo el bloque gestionado; tu contenido quedó)');
  }

  // CLAUDE.md: solo la línea puntero.
  const cp = join(root, 'CLAUDE.md');
  const cm = read(cp);
  if (cm && cm.includes('<!-- sddkit -->')) {
    write(cp, cm.replace(/\n*<!-- sddkit -->\nLeé AGENTS\.md[^\n]*/g, '').trimEnd() + '\n');
    gone.push('CLAUDE.md (solo la línea sddkit)');
  }

  // pre-commit: solo nuestras líneas; si el hook era solo nuestro, se borra entero.
  const hp = join(root, '.git', 'hooks', 'pre-commit');
  const hk = read(hp);
  if (hk && hk.includes('sdd validate')) {
    const lines = hk.split('\n').filter((l) =>
      !l.includes('sdd validate') && !l.includes('Instalado por sddkit') &&
      !l.includes('Agregado por sddkit') && !l.includes('desactivable en .sdd/config.json'));
    const rest = lines.join('\n').replace(/^#!\/bin\/sh\n?/, '').trim();
    if (rest === '') { rmSync(hp, { force: true }); gone.push('.git/hooks/pre-commit (era solo de sddkit)'); }
    else { write(hp, lines.join('\n').replace(/\n{3,}/g, '\n\n')); gone.push('.git/hooks/pre-commit (solo la línea de sddkit)'); }
  }

  // post-commit: solo nuestras líneas; si el hook era solo nuestro, se borra entero.
  const pcp = join(root, '.git', 'hooks', 'post-commit');
  const pck = read(pcp);
  if (pck && pck.includes('sdd publish')) {
    const lines = pck.split('\n').filter((l) =>
      !l.includes('sdd publish') && !l.includes('Instalado por sddkit') &&
      !l.includes('Agregado por sddkit') && !l.includes('desactivable en .sdd/config.json'));
    const rest = lines.join('\n').replace(/^#!\/bin\/sh\n?/, '').trim();
    if (rest === '') { rmSync(pcp, { force: true }); gone.push('.git/hooks/post-commit (era solo de sddkit)'); }
    else { write(pcp, lines.join('\n').replace(/\n{3,}/g, '\n\n')); gone.push('.git/hooks/post-commit (solo la línea de sddkit)'); }
  }

  if (!gone.length) { console.log('Este repo no tenía artefactos de sddkit.'); return; }
  for (const x of gone) console.log('  ✓ eliminado: ' + x);
  console.log('\nRepo limpio. Si .sdd/ estaba commiteado, sigue en el historial de git (recuperable).');
  console.log('Para borrar el comando de la máquina: npm rm -g sddkit (o npm unlink).');
}
