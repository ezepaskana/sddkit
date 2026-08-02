import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { readSection, replaceSection } from './livingDocs.js';
// `parseSectionItems` todavía no existe como export de `livingDocs.js` (paso
// 26: solo tests). Se importa como namespace en vez de destructurado para que
// la falta del export NO tumbe la carga de todo el archivo (lo que pondría en
// rojo también los 11 tests viejos, ya en verde, que no debemos tocar) — así
// el rojo queda acotado a los tests nuevos que sí invocan la función
// (TypeError: parseSectionItems no es función), tal como permite el contrato.
import * as livingDocsNs from './livingDocs.js';
const parseSectionItems = (...args) => livingDocsNs.parseSectionItems(...args);

// Tarea 010, paso 22: tests de livingDocs.js — leer y reemplazar una sección
// Markdown de nivel 2 (## Heading) preservando el resto del archivo intacto.
// El módulo `livingDocs.js` todavía no existe — estos tests deben quedar en
// rojo (módulo no encontrado, no error de sintaxis).

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Construye contenido Markdown a partir de líneas, uniendo con '\n'. */
function md(lines) {
  return lines.join('\n');
}

/**
 * Referencia (basada en la definición textual del contrato, no en la
 * implementación) del cuerpo de una sección: desde la línea siguiente al
 * heading hasta el próximo heading de nivel 2 exacto o EOF.
 */
function expectedBody(content, heading) {
  const lines = content.split('\n');
  const headingLine = `## ${heading}`;
  const headingIdx = lines.indexOf(headingLine);
  if (headingIdx === -1) return null;
  let nextHeadingIdx = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) {
      nextHeadingIdx = i;
      break;
    }
  }
  return lines.slice(headingIdx + 1, nextHeadingIdx).join('\n');
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Fixture con tres secciones: heading de interés en el medio del archivo.
const contentMiddle = md([
  '# Doc',
  '',
  '## Antes',
  '',
  'Contenido antes.',
  '',
  '## Inputs',
  '',
  'Contenido de inputs.',
  '',
  '## Despues',
  '',
  'Contenido después.',
  '',
]);

// Fixture con el heading de interés al final (sin ningún ## después),
// y sin salto de línea final.
const contentAtEof = md([
  '# Doc',
  '',
  '## Antes',
  '',
  'Contenido antes.',
  '',
  '## Inputs',
  '',
  'Última línea sin salto final.',
]);

// Fixture con heading con tildes y capitalización exacta.
const contentTildes = md([
  '# Doc',
  '',
  '## Casos de uso',
  '',
  'Descripción con tildes: acción, información.',
  '',
  '## Otra sección',
  '',
  'Otro contenido.',
  '',
]);

// Fixture con un code fence dentro del cuerpo de la sección, que contiene
// '##' en medio de una línea (no al inicio) — no debe confundirse con heading.
const contentWithFence = md([
  '## Inputs',
  '',
  'Ejemplo:',
  '',
  '```js',
  '// ## esto no es un heading real',
  'const x = 1; // usa ## como comentario también',
  '```',
  '',
  'Fin de sección.',
  '',
  '## Outputs',
  '',
  'salida',
]);

// Fixture con heading vacío (el siguiente ## viene inmediatamente).
const contentEmptySection = md([
  '# Doc',
  '',
  '## Vacia',
  '## Siguiente',
  '',
  'Algo.',
]);

// ---------------------------------------------------------------------------
// readSection
// ---------------------------------------------------------------------------

test('readSection: heading en el medio del archivo → devuelve solo el cuerpo de esa sección', () => {
  const result = readSection(contentMiddle, 'Inputs');
  assert.equal(result, expectedBody(contentMiddle, 'Inputs'));
  assert.equal(result, '\nContenido de inputs.\n');
});

test('readSection: heading al final del archivo (sin ## después) → devuelve todo hasta EOF', () => {
  const result = readSection(contentAtEof, 'Inputs');
  assert.equal(result, expectedBody(contentAtEof, 'Inputs'));
  assert.equal(result, '\nÚltima línea sin salto final.');
});

test('readSection: heading inexistente → null', () => {
  const result = readSection(contentMiddle, 'NoExiste');
  assert.equal(result, null);
});

test('readSection: heading con tildes y mayúsculas exactas matchea exacto', () => {
  const result = readSection(contentTildes, 'Casos de uso');
  assert.equal(result, expectedBody(contentTildes, 'Casos de uso'));
  assert.equal(result, '\nDescripción con tildes: acción, información.\n');
});

test('readSection: heading no matchea case-insensitive', () => {
  assert.equal(readSection(contentTildes, 'casos de uso'), null);
  assert.equal(readSection(contentTildes, 'CASOS DE USO'), null);
  assert.equal(readSection(contentTildes, 'Casos De Uso'), null);
});

test('readSection: cuerpo con code fence que contiene "##" no al inicio de línea no corta la sección', () => {
  const result = readSection(contentWithFence, 'Inputs');
  assert.equal(result, expectedBody(contentWithFence, 'Inputs'));
  assert.match(result, /```js/);
  assert.match(result, /```\n/);
  assert.match(result, /Fin de sección\./);
});

test('readSection: heading existe pero está vacío (siguiente ## inmediato) → string vacío, no null', () => {
  const result = readSection(contentEmptySection, 'Vacia');
  assert.notEqual(result, null);
  assert.equal(result, '');
});

// ---------------------------------------------------------------------------
// replaceSection
// ---------------------------------------------------------------------------

test('replaceSection: reemplaza una sección existente en el medio, el resto queda idéntico', () => {
  const newBody = 'Cuerpo nuevo de inputs.\nSegunda línea.';
  const result = replaceSection(contentMiddle, 'Inputs', newBody);

  // Lo anterior al heading '## Inputs' (inclusive la línea del heading y su
  // salto de línea) permanece byte a byte idéntico.
  const prefix = contentMiddle.slice(0, contentMiddle.indexOf('## Inputs') + '## Inputs\n'.length);
  assert.equal(result.slice(0, prefix.length), prefix);

  // Lo posterior al heading siguiente ('## Despues' en adelante) permanece
  // byte a byte idéntico.
  const suffix = contentMiddle.slice(contentMiddle.indexOf('## Despues'));
  assert.ok(result.endsWith(suffix));

  // El cuerpo de la sección reemplazada es exactamente el nuevo cuerpo.
  assert.equal(readSection(result, 'Inputs'), newBody);

  // La sección 'Antes' no fue tocada.
  assert.equal(readSection(result, 'Antes'), readSection(contentMiddle, 'Antes'));
});

test('replaceSection: heading no existe y el archivo NO tiene marca sdd:manual → se agrega al final', () => {
  const content = md(['# Doc', '', '## Uno', '', 'Cuerpo uno.', '']);
  const newBody = 'Cuerpo nuevo.';

  const result = replaceSection(content, 'Nueva', newBody);

  assert.ok(result.startsWith(content));
  assert.equal(result, `${content}## Nueva\n${newBody}\n`);
  // La sección queda al final del archivo (EOF): el `\n` final del archivo
  // se preserva como parte del cuerpo al releerlo (mismo comportamiento que
  // el test de "heading al final" de readSection cuando el archivo SÍ termina
  // en salto de línea).
  assert.equal(readSection(result, 'Nueva'), `${newBody}\n`);
  // La sección preexistente sigue intacta — ya lo garantiza `result.startsWith(content)`
  // arriba (byte a byte); no comparamos `readSection` antes/después porque 'Uno'
  // deja de estar al final del archivo (ahora la sigue '## Nueva'), y el límite
  // EOF-vs-próximo-heading legítimamente cambia dónde termina su cuerpo.
});

test('replaceSection: heading no existe y el archivo SÍ tiene marca <!-- sdd:manual --> → se agrega ANTES de la marca', () => {
  const componentsMdPath = join(__dirname, '..', '..', '.sdd', 'c4', 'components.md');
  const componentsMd = readFileSync(componentsMdPath, 'utf8');
  assert.match(componentsMd, /<!-- sdd:manual/); // precondición del fixture real

  const newBody = 'Cuerpo nuevo de inputs.';
  const result = replaceSection(componentsMd, 'Inputs', newBody);

  const markerIdx = componentsMd.indexOf('<!-- sdd:manual');
  const before = componentsMd.slice(0, markerIdx);
  const after = componentsMd.slice(markerIdx);

  // Todo lo que estaba antes de la marca manual permanece intacto tal cual.
  assert.equal(result.slice(0, before.length), before);

  // La marca manual y todo lo que la sigue permanece byte a byte idéntico,
  // y nada se agregó después de ella.
  const afterIdx = result.indexOf('<!-- sdd:manual');
  assert.notEqual(afterIdx, -1);
  assert.equal(result.slice(afterIdx), after);

  // La sección nueva quedó ANTES de la marca manual, no adentro/después.
  const newHeadingIdx = result.indexOf('## Inputs');
  assert.notEqual(newHeadingIdx, -1);
  assert.ok(newHeadingIdx < afterIdx);

  // El cuerpo de la nueva sección es el esperado.
  assert.equal(readSection(result, 'Inputs'), newBody);
});

test('replaceSection: reemplazar dos veces seguidas la misma sección no duplica ni deja restos', () => {
  const first = replaceSection(contentMiddle, 'Inputs', 'Primer reemplazo.');
  const second = replaceSection(first, 'Inputs', 'Segundo reemplazo.');

  assert.equal(readSection(second, 'Inputs'), 'Segundo reemplazo.');
  assert.equal(second.includes('Primer reemplazo.'), false);

  // Solo debe existir un heading '## Inputs' en el resultado final.
  const occurrences = second.split('\n').filter((line) => line === '## Inputs').length;
  assert.equal(occurrences, 1);

  // Las secciones vecinas siguen intactas.
  assert.equal(readSection(second, 'Antes'), readSection(contentMiddle, 'Antes'));
  assert.equal(readSection(second, 'Despues'), readSection(contentMiddle, 'Despues'));
});

// ---------------------------------------------------------------------------
// parseSectionItems
//
// Tarea 010, paso 26: parsea los bullets (`- `) del cuerpo de una sección de
// nivel 2 en `{text, line}[]`. `line` es 1-indexed y relativo al archivo
// COMPLETO (no a la sección), tal como especifica el contrato.
// ---------------------------------------------------------------------------

// Fixture: heading al inicio del archivo con 3 bullets consecutivos.
const contentBulletsConsecutivos = md([
  '# Doc',
  '',
  '## Items',
  '- Item uno',
  '- Item dos',
  '- Item tres',
  '',
  '## Otra',
  'prosa',
]);
// Líneas 1-indexed: 1:'# Doc' 2:'' 3:'## Items' 4:'- Item uno' 5:'- Item dos'
// 6:'- Item tres' 7:'' 8:'## Otra' 9:'prosa'

// Fixture: heading en el MEDIO del archivo (con prosa antes), bullets
// intercalados con líneas en blanco y prosa que no son bullets.
const contentBulletsIntercalados = md([
  '# Doc',
  '',
  'Prosa antes de todo.',
  '',
  '## Lista',
  '',
  'Intro prosa.',
  '',
  '- Uno',
  '',
  'Nota entre bullets (no es bullet).',
  '- Dos',
  '',
  '- Tres',
  '',
  '## Siguiente',
  'algo',
]);
// Líneas 1-indexed: 1:'# Doc' 2:'' 3:'Prosa antes de todo.' 4:'' 5:'## Lista'
// 6:'' 7:'Intro prosa.' 8:'' 9:'- Uno' 10:'' 11:'Nota entre bullets...'
// 12:'- Dos' 13:'' 14:'- Tres' 15:'' 16:'## Siguiente' 17:'algo'

// Fixture: sección existente pero sin ningún bullet (solo prosa).
const contentSinBullets = md([
  '# Doc',
  '',
  '## Prosa',
  '',
  'Solo texto, sin ningún guión al inicio de línea.',
  'Otra línea de prosa.',
  '',
  '## Otra',
  'algo',
]);

test('parseSectionItems: 3 bullets consecutivos → 3 items con line correcto contado desde el inicio real del archivo', () => {
  const result = parseSectionItems(contentBulletsConsecutivos, 'Items');
  assert.deepEqual(result, [
    { text: 'Item uno', line: 4 },
    { text: 'Item dos', line: 5 },
    { text: 'Item tres', line: 6 },
  ]);
});

test('parseSectionItems: bullets intercalados con prosa/líneas en blanco → solo los bullets generan items, pero las líneas no-bullet SÍ cuentan para el número de línea', () => {
  const result = parseSectionItems(contentBulletsIntercalados, 'Lista');
  assert.deepEqual(result, [
    { text: 'Uno', line: 9 },
    { text: 'Dos', line: 12 },
    { text: 'Tres', line: 14 },
  ]);
});

test('parseSectionItems: heading en el medio de un archivo con contenido antes → el line del primer bullet refleja las líneas previas, no arranca de 1', () => {
  const result = parseSectionItems(contentBulletsIntercalados, 'Lista');
  assert.equal(result[0].line, 9);
  assert.notEqual(result[0].line, 1);
});

test('parseSectionItems: heading inexistente → array vacío (no error, a diferencia de readSection que da null)', () => {
  const result = parseSectionItems(contentBulletsConsecutivos, 'NoExiste');
  assert.deepEqual(result, []);
});

test('parseSectionItems: sección existente sin ningún bullet (solo prosa) → array vacío', () => {
  const result = parseSectionItems(contentSinBullets, 'Prosa');
  assert.deepEqual(result, []);
});
