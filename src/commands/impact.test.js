import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { impact } from './impact.js';
import { createGraphStore } from '../lib/graphstore/index.js';

// DB temporal compartida, seedeada una vez al inicio del archivo.
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-impact-db-'));
const dbPath = path.join(dbDir, 'graph.db');
const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };

/** Crea un root con `.sdd/config.json` apuntando a la DB seedeada (o sin graph). */
function tmpRoot(config) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-impact-'));
  const sddDir = path.join(root, '.sdd');
  fs.mkdirSync(sddDir, { recursive: true });
  if (config !== undefined) {
    fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(config));
  }
  return root;
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result, text: logs.join('\n') }))
    .finally(() => { console.log = originalLog; });
}

before(async () => {
  const store = await createGraphStore(cfg);
  assert.equal(store.ok, true, 'el store sqlite debería abrir (better-sqlite3 instalado)');
  await store.publishSystem({
    canonicalName: 'backend-service',
    repoPath: '/path/to/projects/backend-service',
    c1: '', endpoints: [{ method: 'GET', path: '/api/v1/public/invitations/{token}' }],
    consumptions: [], commitHash: 'aaa1111', publishedAt: '2026-06-13T00:00:00Z',
  });
  await store.publishSystem({
    canonicalName: 'frontend-app',
    repoPath: '/path/to/projects/frontend-app',
    c1: '', endpoints: [],
    consumptions: [{ method: 'GET', target: 'env:VITE_API_URL/public/invitations/:param', file: 'src/services/api/invitations.ts' }],
    commitHash: 'bbb2222', publishedAt: '2026-06-13T00:00:00Z',
  });
  await store.publishSystem({
    canonicalName: 'unrelated-system',
    repoPath: '/tmp/unrelated', c1: '', endpoints: [{ method: 'GET', path: '/health' }],
    consumptions: [{ method: 'GET', target: '(dynamic)', file: 'x.ts' }],
    commitHash: 'ccc3333', publishedAt: '2026-06-13T00:00:00Z',
  });
  await store.publishSystem({
    canonicalName: 'infra-service',
    repoPath: '/path/to/projects/infra-service',
    c1: '', endpoints: [], consumptions: [],
    infraResources: [],
    infraEdges: [{ from: 'arn:aws:s3:::uploads-bucket', to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload', type: 'storage', confidence: 'confirmado', action: 's3-notification' }],
    commitHash: 'ddd4444', publishedAt: '2026-06-13T00:00:00Z',
  });
  store.close();
});

test('impact {method,path}: lista consumidores que matchean, excluye los que no', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['GET', '/api/v1/public/invitations/{token}'], {}));

  assert.ok(text.includes('frontend-app'), `esperaba frontend-app, output:\n${text}`);
  assert.ok(text.includes('posible'), `esperaba confidence "posible", output:\n${text}`);
  assert.ok(text.includes('src/services/api/invitations.ts'), `esperaba el archivo, output:\n${text}`);
  assert.ok(!text.includes('unrelated-system'), `no esperaba unrelated-system, output:\n${text}`);
});

test('impact {method,path}: sin consumidores → mensaje informativo', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['GET', '/ruta/sin/consumidores'], {}));

  assert.ok(text.includes('Sin consumidores publicados'), `output:\n${text}`);
});

test('impact {system}: reverse lookup lista endpoints y consumidores', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['backend-service'], {}));

  assert.ok(text.includes('/api/v1/public/invitations/{token}'), `esperaba el endpoint, output:\n${text}`);
  assert.ok(text.includes('frontend-app'), `esperaba frontend-app como consumidor, output:\n${text}`);
  assert.ok(text.includes('posible'), `esperaba confidence "posible", output:\n${text}`);
});

test('impact {system}: sistema inexistente → "no encontrado"', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['no-existe'], {}));

  assert.ok(text.includes('no encontrado'), `output:\n${text}`);
});

test('impact <recurso>: ARN de infra publicado → lista aristas de infraestructura', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['arn:aws:s3:::uploads-bucket'], {}));

  assert.ok(text.includes('infra-service'), `esperaba infra-service, output:\n${text}`);
  assert.ok(text.includes('confirmado'), `esperaba confidence "confirmado", output:\n${text}`);
  assert.ok(text.includes('arn:aws:s3:::uploads-bucket'), `esperaba el ARN origen, output:\n${text}`);
  assert.ok(text.includes('arn:aws:lambda:us-east-1:123456789012:function:process-upload'), `esperaba el ARN destino, output:\n${text}`);
});

test('impact <argumento>: ni sistema ni recurso de infra → mensaje con las 3 formas de uso', async () => {
  const root = tmpRoot(cfg);
  const { text } = await withCapturedLogs(() =>
    impact(root, ['no-existe-ni-como-sistema-ni-como-recurso'], {}));

  assert.ok(text.includes('sdd impact <MÉTODO> <ruta>'), `esperaba la forma {method,path}, output:\n${text}`);
  assert.ok(text.includes('sdd impact <sistema>'), `esperaba la forma {sistema}, output:\n${text}`);
  assert.ok(text.includes('sdd impact <ARN-o-nombre-de-recurso>'), `esperaba la forma {recurso}, output:\n${text}`);
});

test('impact: grafo no configurado → advertencia, sin throw', async () => {
  const root = tmpRoot(undefined); // sin .sdd/config.json
  const { text } = await withCapturedLogs(() =>
    impact(root, ['GET', '/x'], {}));

  assert.ok(text.includes('Grafo no configurado'), `output:\n${text}`);
});
