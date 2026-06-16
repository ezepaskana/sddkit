import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { find, context } from './context.js';
import { createGraphStore } from '../lib/graphstore/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-context-'));
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result }))
    .finally(() => { console.log = originalLog; });
}

test('sdd find busca en capabilities.consumptions', async () => {
  const fixtureRoot = join(__dirname, '__fixtures__', 'sample-repo');

  // Capturar salida de console.log
  const logs = [];
  const originalLog = console.log;
  try {
    console.log = (...args) => logs.push(args.join(' '));

    // Llamar find con el query que debería encontrar el consumo
    await find(fixtureRoot, ['queryDeviceList']);
  } finally {
    console.log = originalLog;
  }

  // Verificar que hay al menos una línea que empieza con "consumo" y contiene "queryDeviceList"
  const consumoLines = logs
    .map(l => l.trim())
    .filter(l => l.startsWith('consumo') && l.toLowerCase().includes('querydevicelist'));

  assert.ok(consumoLines.length > 0, 'Debería haber al menos un hit "consumo" que contenga "queryDeviceList"');
});

test('sdd context: sistema publicado → muestra "Publicado:" con hash corto', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');

  const dbPath = path.join(root, 'graph.db');
  const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };
  fs.writeFileSync(path.join(root, '.sdd', 'config.json'), JSON.stringify(cfg));

  const store = await createGraphStore(cfg);
  if (!store.ok) { t.skip(`graphstore no disponible: ${store.reason}`); return; }
  store.publishSystem({
    canonicalName: 'test-system',
    repoPath: '/tmp/x',
    c1: '',
    endpoints: [],
    consumptions: [],
    commitHash: 'abc1234567',
    publishedAt: new Date().toISOString(),
  });
  store.close();

  const { logs } = await withCapturedLogs(() => context(root));
  const full = logs.join('\n');

  assert.ok(full.includes('Publicado:'), `Se esperaba una línea "Publicado:", salida: ${full}`);
  assert.ok(full.includes('abc1234'), `Se esperaba el hash corto "abc1234", salida: ${full}`);
});

test('sdd context: sistema nunca publicado → "Sin publicar"', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** never-published-system\n');

  const dbPath = path.join(root, 'graph.db');
  const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };
  fs.writeFileSync(path.join(root, '.sdd', 'config.json'), JSON.stringify(cfg));

  const store = await createGraphStore(cfg);
  if (!store.ok) { t.skip(`graphstore no disponible: ${store.reason}`); return; }
  store.close();

  const { logs } = await withCapturedLogs(() => context(root));
  const full = logs.join('\n');

  assert.ok(full.includes('Sin publicar'), `Se esperaba "Sin publicar", salida: ${full}`);
});

test('sdd context: sin grafo configurado → no muestra "Publicado:"', async () => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');

  fs.writeFileSync(path.join(root, '.sdd', 'config.json'), JSON.stringify({}));

  const { logs } = await withCapturedLogs(() => context(root));
  const full = logs.join('\n');

  assert.ok(!full.includes('Publicado:'), `No se esperaba "Publicado:", salida: ${full}`);
});
