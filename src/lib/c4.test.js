import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genContainers, genComponents } from './c4.js';

const stack = {
  name: 'demo-app',
  description: 'Demo',
  languages: [{ lang: 'TypeScript', files: 3 }],
  frameworks: ['Express'],
  dataStores: [],
  workspaces: [],
  monorepo: false,
};

const containers = [{ id: 'app', name: 'demo-app', tech: 'Express' }];

test('genContainers con consumptions de 2 entradas → incluye sección "Dependencias salientes" con ambas filas', () => {
  const consumptions = [
    { method: 'GET', target: '/plants', file: 'src/api/client.ts' },
    { method: null, target: 'env:VITE_API_URL/orders/:param', file: 'src/api/orders.ts' },
  ];
  const md = genContainers(stack, containers, consumptions, '2026-06-12');
  assert.match(md, /## Dependencias salientes/);
  assert.match(md, /\| GET \| \/plants \| src\/api\/client\.ts \|/);
  assert.match(md, /\| \? \| env:VITE_API_URL\/orders\/:param \| src\/api\/orders\.ts \|/);
});

test('genContainers con consumptions vacío → "_Sin dependencias salientes detectadas._"', () => {
  const md = genContainers(stack, containers, [], '2026-06-12');
  assert.match(md, /## Dependencias salientes/);
  assert.match(md, /_Sin dependencias salientes detectadas\._/);
});

test('genContainers preserva la sección "## ❓ VALIDAR con el equipo" después de "Dependencias salientes"', () => {
  const md = genContainers(stack, containers, [], '2026-06-12');
  const depIdx = md.indexOf('## Dependencias salientes');
  const validarIdx = md.indexOf('## ❓ VALIDAR con el equipo');
  assert.ok(depIdx > -1 && validarIdx > -1 && depIdx < validarIdx);
});

// --- Paso 10 (tarea 011, BR-061): genComponents incluye diagrama Mermaid de módulos ---

const componentFiles = [
  'src/routes/a.js', 'src/routes/b.js',
  'src/services/c.js', 'src/services/d.js', 'src/services/e.js',
];

/** Extrae el primer bloque ```mermaid ... ``` de un markdown, o null si no hay ninguno. */
function extractMermaidBlock(md) {
  const m = md.match(/```mermaid\n([\s\S]*?)```/);
  return m ? m[1] : null;
}

test('genComponents incluye un bloque ```mermaid con flowchart de los módulos detectados', () => {
  const md = genComponents('/root', componentFiles, '2026-06-12');
  assert.match(md, /```mermaid/, 'debe incluir un bloque de código mermaid');
  const block = extractMermaidBlock(md);
  assert.ok(block, 'debe poder extraerse el bloque mermaid');
  assert.match(block, /flowchart/, 'el bloque mermaid debe declarar un flowchart');
});

test('genComponents: el flowchart de módulos incluye cada módulo detectado (routes, services) como nodo', () => {
  const md = genComponents('/root', componentFiles, '2026-06-12');
  const block = extractMermaidBlock(md);
  assert.ok(block, 'debe existir un bloque mermaid');
  assert.match(block, /routes/, 'el módulo "routes" debe aparecer en el diagrama');
  assert.match(block, /services/, 'el módulo "services" debe aparecer en el diagrama');
});

test('genComponents: sin archivos detectados, no rompe (no exige bloque mermaid vacío inválido)', () => {
  assert.doesNotThrow(() => genComponents('/root', [], '2026-06-12'));
});
