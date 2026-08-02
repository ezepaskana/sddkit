/**
 * gitBlame — autoría de una línea concreta de un archivo versionado.
 *
 * Envuelve `git blame -L <n>,<n> --porcelain <file>` para saber QUIÉN y CUÁNDO
 * escribió una línea puntual de un doc vivo (típicamente un bullet devuelto por
 * `parseSectionItems`), y así distinguir contenido fresco de contenido rancio.
 *
 * Formato porcelain (solo lo que nos interesa):
 *
 *   <hash-40> <línea-origen> <línea-final> [<cant-líneas>]
 *   author <nombre>
 *   author-mail <<email>>
 *   author-time <timestamp-unix>
 *   ...
 *   \t<contenido de la línea>
 */

import { execSync } from 'node:child_process';

/**
 * Blame de una única línea.
 *
 * @param {string} root raíz del repo git (cwd del comando)
 * @param {string} file ruta del archivo, relativa a `root`
 * @param {number} line número de línea 1-indexed
 * @returns {{commitHash: string, author: string, date: string}} autoría de la
 *   línea; `date` es la fecha de autoría en ISO 8601 (UTC).
 */
export function blameLine(root, file, line) {
  const out = execSync(`git blame -L ${line},${line} --porcelain ${file}`, {
    cwd: root,
    encoding: 'utf8',
  });

  const lines = out.split('\n');
  const commitHash = lines[0].split(' ')[0];

  let author = '';
  let date = '';
  for (let i = 1; i < lines.length; i += 1) {
    const current = lines[i];
    // El contenido de la línea blameada llega prefijado con tab: fin del bloque
    // de cabeceras porcelain.
    if (current.startsWith('\t')) break;
    if (current.startsWith('author ')) {
      author = current.slice('author '.length);
    } else if (current.startsWith('author-time ')) {
      const timestamp = Number(current.slice('author-time '.length));
      if (Number.isFinite(timestamp)) date = new Date(timestamp * 1000).toISOString();
    }
  }

  return { commitHash, author, date };
}
