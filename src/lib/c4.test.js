import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genContainers } from './c4.js';

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
