import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genDomain } from './domain.js';

const stack = { name: 'demo-app' };

/** Extrae la sección que empieza en `heading` hasta el próximo "## " (o fin del doc). */
function section(md, heading) {
  const idx = md.indexOf(heading);
  if (idx === -1) return null;
  const nextIdx = md.indexOf('\n## ', idx + heading.length);
  return nextIdx === -1 ? md.slice(idx) : md.slice(idx, nextIdx);
}

// --- Paso 10 (tarea 011, BR-061): "Flujos clave del negocio" ofrece formato diagrama ---

test('genDomain: la sección "Flujos clave del negocio" incluye un bloque ```mermaid', () => {
  const md = genDomain(stack, [], '2026-06-12');
  const sec = section(md, '## Flujos clave del negocio');
  assert.ok(sec, 'debe existir la sección "## Flujos clave del negocio"');
  assert.match(sec, /```mermaid/, 'la sección de flujos clave debe ofrecer un bloque mermaid');
});

test('genDomain: el bloque mermaid de "Flujos clave del negocio" declara un flowchart', () => {
  const md = genDomain(stack, [], '2026-06-12');
  const sec = section(md, '## Flujos clave del negocio');
  const m = sec.match(/```mermaid\n([\s\S]*?)```/);
  assert.ok(m, 'debe poder extraerse el bloque mermaid dentro de la sección');
  assert.match(m[1], /flowchart/, 'el bloque mermaid debe declarar un tipo de diagrama (flowchart)');
});
