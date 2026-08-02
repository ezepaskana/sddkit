/**
 * livingDocs — lectura y reemplazo granular de secciones Markdown de nivel 2.
 *
 * Permite regenerar UNA sección (`## <heading>`) de un doc vivo (`.sdd/c4/*.md`,
 * `.sdd/domain.md`) preservando byte a byte todo el resto del archivo — mismo
 * espíritu que `preserveManual` (BR-037) en `src/lib/c4.js`, pero por sección en
 * vez de por archivo completo.
 *
 * Reglas de parseo (deliberadamente simples, sin dependencias):
 * - Un heading de nivel 2 es SOLO una línea que empieza (sin espacios previos)
 *   con `## `. Así, un `##` dentro de un code fence o en medio de una línea no
 *   corta la sección.
 * - El match del heading es exacto (case-sensitive, tildes incluidas).
 * - La marca manual `<!-- sdd:manual ... -->` cierra la sección: nada generado
 *   vive debajo de ella.
 */

const MANUAL_MARKER = '<!-- sdd:manual';

/** ¿La línea es la marca de contenido manual preservado? */
function isManualMarker(line) {
  return line.trimStart().startsWith(MANUAL_MARKER);
}

/** ¿La línea es un heading de nivel 2 (al inicio de línea, sin sangría)? */
function isHeading2(line) {
  return line.startsWith('## ');
}

/** Índice de la línea del heading `## <heading>`, o -1 si no existe. */
function findHeadingIndex(lines, heading) {
  const target = `## ${heading}`;
  return lines.findIndex((line) => line === target);
}

/**
 * Índice de la primera línea que cierra la sección abierta en `from`:
 * el próximo heading de nivel 2, la marca manual, o EOF.
 */
function findSectionEnd(lines, from) {
  for (let i = from; i < lines.length; i += 1) {
    if (isHeading2(lines[i]) || isManualMarker(lines[i])) return i;
  }
  return lines.length;
}

/**
 * Devuelve el cuerpo de la sección `## <heading>`: todo lo que hay entre la
 * línea del heading (exclusiva) y el próximo heading de nivel 2 / marca manual
 * / EOF (exclusivo).
 *
 * @param {string} content contenido Markdown completo
 * @param {string} heading texto del heading, sin el `## `
 * @returns {string|null} el cuerpo (puede ser `''` si la sección está vacía),
 *   o `null` si el heading no existe.
 */
export function readSection(content, heading) {
  const lines = String(content).split('\n');
  const headingIdx = findHeadingIndex(lines, heading);
  if (headingIdx === -1) return null;
  const end = findSectionEnd(lines, headingIdx + 1);
  return lines.slice(headingIdx + 1, end).join('\n');
}

/**
 * Parsea los bullets (`- `) del cuerpo de la sección `## <heading>`.
 *
 * A diferencia de `readSection`, un heading inexistente NO es un error: devuelve
 * un array vacío. Las líneas que no son bullets se ignoran, pero siguen contando
 * para el número de línea: `line` es 1-indexed y relativo al ARCHIVO COMPLETO,
 * no a la sección (así se puede pasar directo a `git blame -L`).
 *
 * @param {string} content contenido Markdown completo
 * @param {string} heading texto del heading, sin el `## `
 * @returns {{text: string, line: number}[]} bullets en orden de aparición
 */
export function parseSectionItems(content, heading) {
  const lines = String(content).split('\n');
  const headingIdx = findHeadingIndex(lines, heading);
  if (headingIdx === -1) return [];

  const end = findSectionEnd(lines, headingIdx + 1);
  const items = [];
  for (let i = headingIdx + 1; i < end; i += 1) {
    if (lines[i].startsWith('- ')) {
      items.push({ text: lines[i].slice(2).trim(), line: i + 1 });
    }
  }
  return items;
}

/**
 * Reemplaza el cuerpo de la sección `## <heading>` por `newBody`, dejando el
 * resto del archivo byte a byte idéntico.
 *
 * Si la sección no existe, se crea: antes de la marca manual si el archivo la
 * tiene, o al final del archivo si no.
 *
 * @param {string} content contenido Markdown completo
 * @param {string} heading texto del heading, sin el `## `
 * @param {string} newBody nuevo cuerpo de la sección
 * @returns {string} el contenido con la sección reemplazada/creada
 */
export function replaceSection(content, heading, newBody) {
  const original = String(content);
  const bodyLines = String(newBody).split('\n');
  const lines = original.split('\n');

  const headingIdx = findHeadingIndex(lines, heading);
  if (headingIdx !== -1) {
    const end = findSectionEnd(lines, headingIdx + 1);
    return [
      ...lines.slice(0, headingIdx + 1),
      ...bodyLines,
      ...lines.slice(end),
    ].join('\n');
  }

  const block = [`## ${heading}`, ...bodyLines];

  const markerIdx = lines.findIndex(isManualMarker);
  if (markerIdx !== -1) {
    return [...lines.slice(0, markerIdx), ...block, ...lines.slice(markerIdx)].join('\n');
  }

  const base = original.length > 0 && !original.endsWith('\n') ? `${original}\n` : original;
  return `${base}${block.join('\n')}\n`;
}
