import { join } from 'node:path';
import { chmodSync } from 'node:fs';
import { read, write, existsSync } from './fsutil.js';

const PRE_COMMIT_LINE = 'sdd validate --hook || exit 1';
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
    return 'sin repo git todavía — el hook se instala automáticamente la próxima vez que corras sdd en un repo con .git';
  }
  const p = join(root, '.git', 'hooks', hookName);
  const existing = read(p);
  let result;
  if (existing === null) {
    write(p, `#!/bin/sh\n# Instalado por sddkit. Para desactivarlo: .sdd/config.json -> "hooks": { "preCommit": false }\n${hookLine}\n`);
    result = messages.installedMsg;
  } else if (existing.includes(matchToken)) {
    return messages.alreadyMsg;
  } else {
    write(p, existing.trimEnd() + `\n\n# Agregado por sddkit (desactivable en .sdd/config.json)\n${hookLine}\n`);
    result = messages.appendedMsg;
  }
  try { chmodSync(p, 0o755); } catch { /* en Windows no aplica */ }
  return result;
}

/** Instala sdd validate como pre-commit. No pisa hooks existentes: agrega al final. */
export function installPreCommit(root) {
  return installHookLine(root, 'pre-commit', PRE_COMMIT_LINE, 'sdd validate', {
    installedMsg: 'pre-commit hook instalado: `sdd validate` corre solo en cada commit',
    alreadyMsg: 'pre-commit hook ya estaba instalado',
    appendedMsg: 'pre-commit hook existente detectado — se agregó `sdd validate` al final (lo previo quedó intacto)',
  });
}

/** Instala sdd publish como post-commit. No pisa hooks existentes: agrega al final. */
export function installPostCommit(root) {
  return installHookLine(root, 'post-commit', POST_COMMIT_LINE, 'sdd publish', {
    installedMsg: 'post-commit hook instalado: `sdd publish` corre solo en cada commit',
    alreadyMsg: 'post-commit hook ya estaba instalado',
    appendedMsg: 'post-commit hook existente detectado — se agregó `sdd publish` al final (lo previo quedó intacto)',
  });
}
