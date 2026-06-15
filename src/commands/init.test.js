import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init } from './init.js';

/** Crea un repo temporal con .git/ y devuelve { root, cleanup }. */
function gitFixture() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-init-'));
  mkdirSync(join(root, '.git', 'hooks'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'demo', version: '1.0.0' }, null, 2));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function withSilencedLogs(fn) {
  const originalLog = console.log;
  console.log = () => {};
  return Promise.resolve(fn()).finally(() => { console.log = originalLog; });
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result }))
    .finally(() => { console.log = originalLog; });
}

test('init: config default incluye hooks.autoPublish:true e instala el hook post-commit', async () => {
  const { root, cleanup } = gitFixture();
  try {
    await withSilencedLogs(() => init(root, { quiet: true }));

    const cfg = JSON.parse(readFileSync(join(root, '.sdd', 'config.json'), 'utf8'));
    assert.equal(cfg.hooks.preCommit, true);
    assert.equal(cfg.hooks.autoPublish, true);

    const postCommitPath = join(root, '.git', 'hooks', 'post-commit');
    assert.ok(existsSync(postCommitPath), 'post-commit hook debería existir');
    const content = readFileSync(postCommitPath, 'utf8');
    assert.ok(content.includes('sdd publish'), 'el hook post-commit debería incluir sdd publish');
  } finally { cleanup(); }
});

test('init: migra config existente sin hooks.autoPublish agregándolo (hooks.preCommit se conserva)', async () => {
  const { root, cleanup } = gitFixture();
  try {
    mkdirSync(join(root, '.sdd'), { recursive: true });
    writeFileSync(join(root, '.sdd', 'config.json'), JSON.stringify({
      version: '0.0.1',
      createdAt: '2020-01-01',
      detectedAgents: [],
      hooks: { preCommit: true },
      models: { rapido: 'a', medio: 'b', fuerte: 'c' },
      skills: 'local',
    }, null, 2) + '\n');

    await withSilencedLogs(() => init(root, { quiet: true }));

    const cfg = JSON.parse(readFileSync(join(root, '.sdd', 'config.json'), 'utf8'));
    assert.equal(cfg.hooks.preCommit, true);
    assert.equal(cfg.hooks.autoPublish, true);
  } finally { cleanup(); }
});

test('init devuelve {actions, skipped} con actions siendo un array de longitud > 0', async () => {
  const { root, cleanup } = gitFixture();
  try {
    const r = await init(root, { quiet: true });
    assert.ok(r !== undefined, 'init() debería retornar un objeto, no undefined');
    assert.ok(Array.isArray(r.actions), 'r.actions debería ser un array');
    assert.ok(r.actions.length > 0, 'r.actions debería tener al menos un elemento');
    assert.ok(Array.isArray(r.skipped), 'r.skipped debería ser un array');
  } finally { cleanup(); }
});

test('init con {quiet:true, silent:true} imprime 0 líneas', async () => {
  const { root, cleanup } = gitFixture();
  try {
    const { logs } = await withCapturedLogs(() => init(root, { quiet: true, silent: true }));
    assert.equal(logs.length, 0, `Se esperaba 0 líneas impresas, pero se imprimieron ${logs.length}: ${logs.join(' | ')}`);
  } finally { cleanup(); }
});

test('init con {quiet:true} (sin silent) sigue imprimiendo línea que empieza con "Acciones:"', async () => {
  const { root, cleanup } = gitFixture();
  try {
    const { logs } = await withCapturedLogs(() => init(root, { quiet: true }));
    const hasAcciones = logs.some((line) => line.startsWith('Acciones:'));
    assert.ok(hasAcciones, `Se esperaba una línea que empiece con "Acciones:", pero se imprimieron: ${logs.join(' | ')}`);
  } finally { cleanup(); }
});
