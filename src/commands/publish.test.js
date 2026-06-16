import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { publish } from './publish.js';
import { createGraphStore } from '../lib/graphstore/index.js';

let nativeReady = false;
try { await import('better-sqlite3'); nativeReady = true; } catch { /* opcional ausente */ }

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-publish-'));
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result }))
    .finally(() => { console.log = originalLog; });
}

test('publish: gate rechaza si hay checkboxes pendientes en C4', async () => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');
  fs.writeFileSync(
    path.join(c4dir, 'containers.md'),
    '# Containers\n\n## ❓ VALIDAR con el equipo\n\n- [ ] ¿pregunta sin responder?\n',
  );
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const { logs } = await withCapturedLogs(() => publish(root, {}));

  assert.ok(logs.some((l) => l.startsWith('✖')), `Se esperaba un mensaje de rechazo, logs: ${JSON.stringify(logs)}`);
});

test('publish: publica OK y querySystem devuelve la fila publicada', async (t) => {
  if (!nativeReady) return t.skip('better-sqlite3 no instalado');
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const dbPath = path.join(root, 'graph.db');
  const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const { logs } = await withCapturedLogs(() => publish(root, {}));

  assert.ok(logs.some((l) => l.startsWith('✓')), `Se esperaba un mensaje de éxito, logs: ${JSON.stringify(logs)}`);

  const store = await createGraphStore(cfg);
  t.after(() => store.close());

  const sys = store.querySystem('test-system');
  assert.ok(sys, 'querySystem debería encontrar el sistema publicado');
  assert.equal(sys.canonicalName, 'test-system');
  assert.deepEqual(sys.endpoints, [{ method: 'GET', path: '/x' }]);
  assert.ok(!Number.isNaN(Date.parse(sys.publishedAt)), 'publishedAt debería ser un string ISO válido');
  // commitHash puede ser null si tmpDir no es un repo git.
});

test('publish: grafo no configurado → advertencia, sin throw', async () => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );
  // Sin .sdd/config.json (o sin `graph`).

  const { logs } = await withCapturedLogs(() => publish(root, {}));

  assert.ok(
    logs.some((l) => l.startsWith('⚠') && (l.includes('"graph"') || l.includes('Grafo no configurado'))),
    `Se esperaba un mensaje de advertencia sobre grafo no configurado, logs: ${JSON.stringify(logs)}`,
  );
});

test('publish: repo CON infra en patterns.json → publica infraResources e infraEdges', async (t) => {
  if (!nativeReady) return t.skip('better-sqlite3 no instalado');
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system-with-infra\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  const infraResources = [
    {
      name: 'uploads-bucket',
      arn: 'arn:aws:s3:::uploads-bucket',
      type: 'storage',
      address: 'aws_s3_bucket.uploads',
    },
  ];
  const infraEdges = [
    {
      from: 'arn:aws:s3:::uploads-bucket',
      to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload',
      type: 'storage',
      confidence: 'confirmado',
      action: 's3-notification',
    },
  ];
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({
      capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] },
      infra: { resources: infraResources, edges: infraEdges },
    }),
  );

  const dbPath = path.join(root, 'graph-with-infra.db');
  const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const { logs } = await withCapturedLogs(() => publish(root, {}));

  assert.ok(logs.some((l) => l.startsWith('✓')), `Se esperaba un mensaje de éxito, logs: ${JSON.stringify(logs)}`);

  const store = await createGraphStore(cfg);
  t.after(() => store.close());

  const sys = store.querySystem('test-system-with-infra');
  assert.ok(sys, 'querySystem debería encontrar el sistema publicado');
  assert.equal(sys.canonicalName, 'test-system-with-infra');
  assert.deepEqual(sys.infraResources, infraResources, 'infraResources debería matchear exactamente');
  assert.deepEqual(sys.infraEdges, infraEdges, 'infraEdges debería matchear exactamente');
});

test('publish: repo SIN clave infra en patterns.json → infraResources e infraEdges vacíos', async (t) => {
  if (!nativeReady) return t.skip('better-sqlite3 no instalado');
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-system-no-infra\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const dbPath = path.join(root, 'graph-no-infra.db');
  const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const { logs } = await withCapturedLogs(() => publish(root, {}));

  assert.ok(logs.some((l) => l.startsWith('✓')), `Se esperaba un mensaje de éxito, logs: ${JSON.stringify(logs)}`);

  const store = await createGraphStore(cfg);
  t.after(() => store.close());

  const sys = store.querySystem('test-system-no-infra');
  assert.ok(sys, 'querySystem debería encontrar el sistema publicado');
  assert.equal(sys.canonicalName, 'test-system-no-infra');
  assert.deepEqual(sys.infraResources, [], 'infraResources debería ser un array vacío');
  assert.deepEqual(sys.infraEdges, [], 'infraEdges debería ser un array vacío');
});

test('publish --hook: driver !== sqlite (mysql) → sin logs, sin upsert', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-hook-mysql\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  // Config con un sqlite secundario para poder verificar que NO se escribió,
  // pero el driver del grafo es mysql → --hook debe degradar en silencio (BR-024).
  const dbPath = path.join(root, 'graph-hook-mysql.db');
  fs.writeFileSync(
    path.join(sddDir, 'config.json'),
    JSON.stringify({ graph: { driver: 'mysql' } }),
  );

  const { logs } = await withCapturedLogs(() => publish(root, { hook: true }));
  assert.deepEqual(logs, [], `Se esperaba sin logs en --hook con driver mysql, logs: ${JSON.stringify(logs)}`);

  // El store sqlite secundario nunca recibió el upsert (ni siquiera se creó el archivo).
  const cfgSqlite = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };
  const store = await createGraphStore(cfgSqlite);
  if (store.ok === false) {
    t.skip(`graphstore no disponible: ${store.reason}`);
    return;
  }
  t.after(() => store.close());
  assert.equal(store.querySystem('test-hook-mysql'), null, 'no debería existir upsert');
});

test('publish --hook: sqlite con hooks.autoPublish === false → sin logs, sin upsert', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-hook-disabled\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const dbPath = path.join(root, 'graph-hook-disabled.db');
  const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } }, hooks: { autoPublish: false } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const { logs } = await withCapturedLogs(() => publish(root, { hook: true }));
  assert.deepEqual(logs, [], `Se esperaba sin logs con autoPublish:false, logs: ${JSON.stringify(logs)}`);

  const store = await createGraphStore(cfg);
  if (store.ok === false) {
    t.skip(`graphstore no disponible: ${store.reason}`);
    return;
  }
  t.after(() => store.close());
  assert.equal(store.querySystem('test-hook-disabled'), null, 'no debería existir upsert');
});

test('publish --hook: gate rechaza (checkbox pendiente) → sin logs, querySystem null', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-hook-gate\n');
  fs.writeFileSync(
    path.join(c4dir, 'containers.md'),
    '# Containers\n\n## ❓ VALIDAR con el equipo\n\n- [ ] ¿pregunta sin responder?\n',
  );
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const dbPath = path.join(root, 'graph-hook-gate.db');
  const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  const { logs } = await withCapturedLogs(() => publish(root, { hook: true }));
  assert.deepEqual(logs, [], `Se esperaba sin logs con gate rechazado en --hook, logs: ${JSON.stringify(logs)}`);

  const store = await createGraphStore(cfg);
  if (store.ok === false) {
    t.skip(`graphstore no disponible: ${store.reason}`);
    return;
  }
  t.after(() => store.close());
  assert.equal(store.querySystem('test-hook-gate'), null, 'no debería existir upsert');
});

test('publish --hook: todo OK en repo git → log corto + commitHash persistido', async (t) => {
  const root = tmpRepo();
  const c4dir = path.join(root, '.sdd', 'c4');
  fs.mkdirSync(c4dir, { recursive: true });
  fs.writeFileSync(path.join(c4dir, 'context.md'), '**Sistema:** test-hook-ok\n');
  fs.writeFileSync(path.join(c4dir, 'containers.md'), '# Containers\n\nC1 de prueba.\n');
  fs.writeFileSync(path.join(c4dir, 'components.md'), '# Components\n');

  const sddDir = path.join(root, '.sdd');
  fs.writeFileSync(
    path.join(sddDir, 'patterns.json'),
    JSON.stringify({ capabilities: { endpoints: [{ method: 'GET', path: '/x' }], consumptions: [] } }),
  );

  const dbPath = path.join(root, 'graph-hook-ok.db');
  const cfg = { graph: { driver: 'sqlite', sqlite: { path: dbPath } } };
  fs.writeFileSync(path.join(sddDir, 'config.json'), JSON.stringify(cfg));

  // Repo git real con un commit.
  execSync('git init -q', { cwd: root });
  execSync('git -c user.email=t@t -c user.name=t commit --allow-empty -q -m x', { cwd: root });
  const headHash = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();

  const { logs } = await withCapturedLogs(() => publish(root, { hook: true }));

  // Si better-sqlite3 no está disponible, --hook degrada en silencio → skip.
  const probe = await createGraphStore(cfg);
  if (probe.ok === false) {
    if (probe.close) probe.close();
    t.skip(`graphstore no disponible: ${probe.reason}`);
    return;
  }
  t.after(() => probe.close());

  assert.ok(
    logs.some((l) => l.startsWith('✓ grafo local actualizado (sqlite)')),
    `Se esperaba el log corto de --hook, logs: ${JSON.stringify(logs)}`,
  );

  const sys = probe.querySystem('test-hook-ok');
  assert.ok(sys, 'querySystem debería encontrar el sistema publicado');
  assert.equal(sys.commitHash, headHash, 'commitHash debería matchear HEAD');
});
