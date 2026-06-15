import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setup } from './setup.js';
import { readJSON, read } from '../lib/fsutil.js';
import { setupBranchingPolicy, getBranchingDefaults, validatePolicy } from '../lib/branching.js';

/** Crea un repo temporal mínimo (sin .git) y devuelve { root, cleanup }. */
function plainFixture() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-setup-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }, null, 2));
  writeFileSync(join(root, 'index.js'), 'export const hello = () => "hola";\n');
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function setupRepoWithConfig(root, cfg = {}) {
  const sddDir = join(root, '.sdd');
  mkdirSync(sddDir, { recursive: true });
  const defaultCfg = {
    version: '0.0.1',
    createdAt: '2020-01-01',
    detectedAgents: [],
    hooks: { preCommit: true, autoPublish: true },
    models: { rapido: 'a', medio: 'b', fuerte: 'c' },
    skills: 'local',
    ...cfg,
  };
  writeFileSync(join(sddDir, 'config.json'), JSON.stringify(defaultCfg, null, 2) + '\n');
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result }))
    .finally(() => { console.log = originalLog; });
}

test('setup: repo nuevo (sin .sdd/config.json) → activa graph sqlite con path default', async () => {
  const { root, cleanup } = plainFixture();
  try {
    await withCapturedLogs(() => setup(root, { agent: true }));

    const cfg = readJSON(join(root, '.sdd', 'config.json'));
    assert.deepEqual(cfg.graph, { driver: 'sqlite', sqlite: { path: '~/.sddkit/graph.db' } });
  } finally { cleanup(); }
});

test('setup: con graph mysql preexistente → no lo modifica', async () => {
  const { root, cleanup } = plainFixture();
  try {
    const originalGraph = { driver: 'mysql', mysql: { urlEnv: 'X' } };
    setupRepoWithConfig(root, { graph: originalGraph });

    await withCapturedLogs(() => setup(root, { agent: true }));

    const cfg = readJSON(join(root, '.sdd', 'config.json'));
    assert.deepEqual(cfg.graph, originalGraph);
  } finally { cleanup(); }
});

test('setup: con graph sqlite preexistente sin sqlite.path → lo deja exactamente igual', async () => {
  const { root, cleanup } = plainFixture();
  try {
    setupRepoWithConfig(root, { graph: { driver: 'sqlite' } });

    await withCapturedLogs(() => setup(root, { agent: true }));

    const cfg = readJSON(join(root, '.sdd', 'config.json'));
    assert.deepEqual(cfg.graph, { driver: 'sqlite' });
  } finally { cleanup(); }
});

// --- Paso 7: branching policy questions -----------------------------------

test('setupBranchingPolicy: branching policy questions — sin rl (modo agente) retorna defaults {convención, flujo, patrón}', async () => {
  const result = await setupBranchingPolicy(null);
  const defaults = getBranchingDefaults();

  assert.deepEqual(result, defaults);
  assert.equal(validatePolicy(result).valid, true);
});

test('setupBranchingPolicy: branching policy questions — modo interactivo respeta los Enter (defaults) y retorna {convención, flujo, patrón}', async () => {
  // Simula un readline que siempre responde "" (Enter) → toma los defaults.
  const fakeRl = { question: async () => '' };

  const result = await setupBranchingPolicy(fakeRl);
  const defaults = getBranchingDefaults();

  assert.equal(result.convención, defaults.convención);
  assert.equal(result.flujo, defaults.flujo);
  assert.equal(result.patrón, defaults.patrón);
  assert.equal(validatePolicy(result).valid, true);
});

test('setupBranchingPolicy: branching policy questions — modo interactivo permite elegir otra opción de la lista', async () => {
  // Responde "2" a las tres preguntas → segunda opción de cada lista.
  const fakeRl = { question: async () => '2' };

  const result = await setupBranchingPolicy(fakeRl);

  assert.equal(result.convención, 'Semantic Commit Messages');
  assert.equal(result.flujo, 'Git Flow');
  assert.equal(result.patrón, 'feature/{numero}-{slug}');
  assert.equal(validatePolicy(result).valid, true);
});

// --- Paso 8: branching policy persisted -----------------------------------

test('setup: branching policy persisted — modo agente crea .sdd/branching.md versionado {versions: [{...}], active: 0}', async () => {
  const { root, cleanup } = plainFixture();
  try {
    await withCapturedLogs(() => setup(root, { agent: true }));

    const content = read(join(root, '.sdd', 'branching.md'));
    assert.ok(content, '.sdd/branching.md debería existir');

    const match = content.match(/```json\n([\s\S]*?)\n```/);
    assert.ok(match, '.sdd/branching.md debería contener un bloque ```json');

    const data = JSON.parse(match[1]);
    assert.ok(Array.isArray(data.versions), 'data.versions debería ser un array');
    assert.equal(data.versions.length, 1);
    assert.equal(data.active, 0);

    const v0 = data.versions[0];
    assert.ok(v0.date, 'la versión debería tener date');
    assert.ok(v0.author, 'la versión debería tener author');
    assert.equal(validatePolicy(v0).valid, true);
  } finally { cleanup(); }
});

test('setup: branching policy persisted — imprime "✓ Branching policy: <convención> + <flujo> + <patrón>"', async () => {
  const { root, cleanup } = plainFixture();
  try {
    const { logs } = await withCapturedLogs(() => setup(root, { agent: true }));

    const defaults = getBranchingDefaults();
    const expected = `✓ Branching policy: ${defaults.convención} + ${defaults.flujo} + ${defaults.patrón}`;
    assert.ok(logs.includes(expected), `Se esperaba la línea "${expected}", pero se imprimieron: ${logs.join(' | ')}`);
  } finally { cleanup(); }
});

test('setup: branching policy persisted — si .sdd/branching.md ya existe, no lo sobrescribe', async () => {
  const { root, cleanup } = plainFixture();
  try {
    mkdirSync(join(root, '.sdd'), { recursive: true });
    const existing = [
      '# Branching Policy',
      '',
      '```json',
      JSON.stringify({
        versions: [{ date: '2020-01-01', author: 'someone', convención: 'Gitmoji', flujo: 'Trunk Based Development', patrón: '{numero}-{slug}' }],
        active: 0,
      }, null, 2),
      '```',
      '',
    ].join('\n');
    writeFileSync(join(root, '.sdd', 'branching.md'), existing);

    await withCapturedLogs(() => setup(root, { agent: true }));

    const content = read(join(root, '.sdd', 'branching.md'));
    assert.equal(content, existing);
  } finally { cleanup(); }
});
