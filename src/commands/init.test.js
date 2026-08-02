import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, lstatSync } from 'node:fs';
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

test('init: config default incluye hooks.autoPublish:true (flag de config, independiente del hook)', async () => {
  const { root, cleanup } = gitFixture();
  try {
    await withSilencedLogs(() => init(root, { quiet: true }));

    const cfg = JSON.parse(readFileSync(join(root, '.sdd', 'config.json'), 'utf8'));
    assert.equal(cfg.hooks.preCommit, true);
    assert.equal(cfg.hooks.autoPublish, true);
  } finally { cleanup(); }
});

test('init: YA NO instala el hook post-commit (auto-publish retirado, ver ADR-0011)', async () => {
  const { root, cleanup } = gitFixture();
  try {
    await withSilencedLogs(() => init(root, { quiet: true }));

    const postCommitPath = join(root, '.git', 'hooks', 'post-commit');
    assert.ok(!existsSync(postCommitPath), 'init() no debería crear el hook post-commit');
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

// --- BR-060 / ADR-0013: Claude-only — sin soporte de Cursor, CLAUDE.md es el archivo real ---

test('init: NO instala .cursor/rules/sdd.mdc aunque se detecte entorno Cursor (soporte multi-agente retirado, ADR-0013)', async () => {
  const { root, cleanup } = gitFixture();
  try {
    mkdirSync(join(root, '.cursor', 'rules'), { recursive: true });

    const r = await withSilencedLogs(() => init(root, { quiet: true }));

    const cursorRulePath = join(root, '.cursor', 'rules', 'sdd.mdc');
    assert.ok(!existsSync(cursorRulePath), 'init() no debería crear .cursor/rules/sdd.mdc');
    assert.ok(
      !r.actions.some((a) => a.toLowerCase().includes('cursor')),
      `actions no debería mencionar cursor: ${JSON.stringify(r.actions)}`
    );
  } finally { cleanup(); }
});

test('init: NO instala .cursor/rules/sdd.mdc aunque se pase flags.cursor explícito', async () => {
  const { root, cleanup } = gitFixture();
  try {
    await withSilencedLogs(() => init(root, { quiet: true, cursor: true }));

    const cursorRulePath = join(root, '.cursor', 'rules', 'sdd.mdc');
    assert.ok(!existsSync(cursorRulePath), 'init() no debería crear .cursor/rules/sdd.mdc ni con flags.cursor');
  } finally { cleanup(); }
});

test('init: CLAUDE.md queda como archivo real con el bloque gestionado, no como symlink a AGENTS.md', async () => {
  const { root, cleanup } = gitFixture();
  try {
    await withSilencedLogs(() => init(root, { quiet: true }));

    const claudeMdPath = join(root, 'CLAUDE.md');
    assert.ok(existsSync(claudeMdPath), 'CLAUDE.md debería existir tras init()');
    const stat = lstatSync(claudeMdPath);
    assert.ok(!stat.isSymbolicLink(), 'CLAUDE.md no debería ser un symlink a AGENTS.md');

    const claudeMd = readFileSync(claudeMdPath, 'utf8');
    assert.ok(claudeMd.includes('<!-- sddkit:begin -->'), 'CLAUDE.md debería contener el bloque gestionado por sddkit');
  } finally { cleanup(); }
});
