import { execSync } from 'node:child_process';

function gitLines(command, root) {
  const out = execSync(command, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  });
  return [...new Set(out.split('\n').map((l) => l.trim()).filter(Boolean))];
}

/**
 * Archivos a analizar en esta pasada de detección.
 *
 * Con `sinceCommit` devuelve los archivos tocados entre ese commit y HEAD
 * (modo incremental); con `sinceCommit === null` devuelve todos los archivos
 * trackeados del repo (primera pasada / full scan).
 *
 * @param {string} root Raíz del repo git.
 * @param {string|null} sinceCommit Commit base, o null para escanear todo.
 * @returns {string[]} Paths relativos a `root`, sin duplicados.
 */
export function diffFilesSince(root, sinceCommit) {
  if (!sinceCommit) return gitLines('git ls-files', root);
  return gitLines(`git diff --name-only ${sinceCommit} HEAD`, root);
}
