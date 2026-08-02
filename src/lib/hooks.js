import { join } from 'node:path';
import { chmodSync } from 'node:fs';
import { read, write, existsSync } from './fsutil.js';

const PRE_COMMIT_LINE = 'sdd validate --hook || exit 1';
const DOCS_HOOK_LINE = 'sdd docs --hook || true';
const POST_COMMIT_LINE = 'sdd publish --hook || true';

/**
 * Instala una línea de sddkit en un hook de git. No pisa hooks existentes: agrega al final.
 * @param {string} root - raíz del repo
 * @param {string} hookName - nombre del hook (ej. 'pre-commit', 'post-commit')
 * @param {string} hookLine - línea a agregar/ejecutar
 * @param {string} matchToken - substring que indica que el hook ya tiene la línea de sddkit
 * @param {{ installedMsg: string, alreadyMsg: string, appendedMsg: string }} messages
 */
function installHookLine(root, hookName, hookLine, matchToken, messages) {
  if (!existsSync(join(root, '.git'))) {
    return { msg: 'sin repo git todavía — el hook se instala automáticamente la próxima vez que corras sdd en un repo con .git', changed: false };
  }
  const p = join(root, '.git', 'hooks', hookName);
  const existing = read(p);
  let result;
  if (existing === null) {
    write(p, `#!/bin/sh\n# Instalado por sddkit. Para desactivarlo: .sdd/config.json -> "hooks": { "preCommit": false }\n${hookLine}\n`);
    result = { msg: messages.installedMsg, changed: true };
  } else if (existing.includes(matchToken)) {
    return { msg: messages.alreadyMsg, changed: false };
  } else {
    write(p, existing.trimEnd() + `\n\n# Agregado por sddkit (desactivable en .sdd/config.json)\n${hookLine}\n`);
    result = { msg: messages.appendedMsg, changed: true };
  }
  try { chmodSync(p, 0o755); } catch { /* en Windows no aplica */ }
  return result;
}

/**
 * Instala sdd validate (bloqueante) y sdd docs (no bloqueante, BR-051/BR-053) como pre-commit.
 * No pisa hooks existentes: agrega al final. Idempotente: cada línea se instala una sola vez.
 * @returns {{ msg: string, changed: boolean }} changed = true si instaló o agregó alguna línea;
 *   false si ambas ya estaban instaladas o no hay .git todavía.
 */
export function installPreCommit(root) {
  const validate = installHookLine(root, 'pre-commit', PRE_COMMIT_LINE, 'sdd validate', {
    installedMsg: 'pre-commit hook instalado: `sdd validate` corre solo en cada commit',
    alreadyMsg: 'pre-commit hook ya estaba instalado',
    appendedMsg: 'pre-commit hook existente detectado — se agregó `sdd validate` al final (lo previo quedó intacto)',
  });
  const docs = installHookLine(root, 'pre-commit', DOCS_HOOK_LINE, 'sdd docs', {
    installedMsg: '`sdd docs` instalado en el pre-commit: la doc viva se regenera sola en cada commit',
    alreadyMsg: '`sdd docs` ya estaba instalado en el pre-commit',
    appendedMsg: '`sdd docs` agregado al pre-commit existente (lo previo quedó intacto)',
  });
  return { msg: `${validate.msg} + ${docs.msg}`, changed: validate.changed || docs.changed };
}

/** Instala sdd publish como post-commit. No pisa hooks existentes: agrega al final. */
export function installPostCommit(root) {
  return installHookLine(root, 'post-commit', POST_COMMIT_LINE, 'sdd publish', {
    installedMsg: 'post-commit hook instalado: `sdd publish` corre solo en cada commit',
    alreadyMsg: 'post-commit hook ya estaba instalado',
    appendedMsg: 'post-commit hook existente detectado — se agregó `sdd publish` al final (lo previo quedó intacto)',
  }).msg;
}
