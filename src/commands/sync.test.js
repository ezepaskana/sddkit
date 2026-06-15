import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sync } from './sync.js';
import { VERSION } from '../version.js';
import { PKG_SKILLS } from '../lib/skills.js';

/** Crea un repo temporal con .git/ y devuelve { root, cleanup }. */
function gitFixture() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-sync-'));
  mkdirSync(join(root, '.git', 'hooks'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'demo', version: '1.0.0' }, null, 2));
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

test('sync: sin .sdd/config.json → no crea .sdd/ y el log menciona "sdd setup"', async () => {
  const { root, cleanup } = gitFixture();
  try {
    const { logs } = await withCapturedLogs(() => sync(root, {}));
    const full = logs.join('\n');

    assert.ok(!existsSync(join(root, '.sdd')), '.sdd/ no debería haberse creado');
    assert.ok(full.includes('sdd setup'), `Se esperaba que el log mencione "sdd setup", salida: ${full}`);
  } finally { cleanup(); }
});

test('sync: con .sdd/config.json en version 0.0.0 → migra a VERSION, sincroniza skills y loguea "v0.0.0 → vVERSION"', async () => {
  const { root, cleanup } = gitFixture();
  try {
    setupRepoWithConfig(root, { version: '0.0.0', skills: 'local' });

    const { logs } = await withCapturedLogs(() => sync(root, {}));
    const full = logs.join('\n');

    const cfg = JSON.parse(readFileSync(join(root, '.sdd', 'config.json'), 'utf8'));
    assert.equal(cfg.version, VERSION, `cfg.version debería ser ${VERSION}, fue ${cfg.version}`);

    const installedSkillPath = join(root, '.claude', 'skills', 'sdd-task', 'SKILL.md');
    const pkgSkillPath = join(PKG_SKILLS, 'sdd-task', 'SKILL.md');
    assert.ok(existsSync(installedSkillPath), `Debería existir ${installedSkillPath}`);
    assert.equal(
      readFileSync(installedSkillPath, 'utf8'),
      readFileSync(pkgSkillPath, 'utf8'),
      'el SKILL.md instalado debería ser idéntico al del paquete',
    );

    assert.ok(full.includes('0.0.0'), `Se esperaba que el log incluya "0.0.0", salida: ${full}`);
    assert.ok(full.includes('→'), `Se esperaba que el log incluya "→", salida: ${full}`);
    assert.ok(full.includes(VERSION), `Se esperaba que el log incluya "${VERSION}", salida: ${full}`);
  } finally { cleanup(); }
});

test('sync: corrido dos veces → la 2da corrida loguea "ya estás al día" y VERSION', async () => {
  const { root, cleanup } = gitFixture();
  try {
    setupRepoWithConfig(root, { version: VERSION, skills: 'local' });

    // 1ra corrida (deja todo sincronizado/al día)
    await withCapturedLogs(() => sync(root, {}));

    // 2da corrida
    const { logs } = await withCapturedLogs(() => sync(root, {}));
    const full = logs.join('\n');

    assert.ok(full.includes('ya estás al día'), `Se esperaba "ya estás al día" en la 2da corrida, salida: ${full}`);
    assert.ok(full.includes(VERSION), `Se esperaba que el log incluya "${VERSION}", salida: ${full}`);
  } finally { cleanup(); }
});

test('sync: version === VERSION pero config sin hooks.autoPublish → migra (BR-029) y NO loguea "ya estás al día"', async () => {
  const { root, cleanup } = gitFixture();
  try {
    setupRepoWithConfig(root, { version: VERSION, hooks: { preCommit: true }, skills: 'local' });

    const { logs } = await withCapturedLogs(() => sync(root, {}));
    const full = logs.join('\n');

    assert.ok(full.includes(VERSION), `Se esperaba que el log incluya "${VERSION}", salida: ${full}`);
    assert.ok(!full.includes('ya estás al día'), `No se esperaba "ya estás al día", salida: ${full}`);

    const cfg = JSON.parse(readFileSync(join(root, '.sdd', 'config.json'), 'utf8'));
    assert.equal(cfg.hooks.autoPublish, true, 'cfg.hooks.autoPublish debería haberse migrado a true');
  } finally { cleanup(); }
});

test('sync: con skills:"global" → avisa de skills GLOBALES y muestra <HOME>/.claude/skills', async () => {
  const { root, cleanup } = gitFixture();
  setupRepoWithConfig(root, { version: '0.0.1', skills: 'global' });

  const originalHome = process.env.HOME;
  const tmpHome = mkdtempSync(join(tmpdir(), 'sddkit-sync-home-'));
  try {
    process.env.HOME = tmpHome;

    const { logs } = await withCapturedLogs(() => sync(root, {}));
    const full = logs.join('\n');

    assert.ok(/global/i.test(full), `Se esperaba un aviso que mencione "global", salida: ${full}`);
    assert.ok(
      full.includes(join(tmpHome, '.claude', 'skills')),
      `Se esperaba que el log incluya la ruta ${join(tmpHome, '.claude', 'skills')}, salida: ${full}`,
    );
  } finally {
    process.env.HOME = originalHome;
    rmSync(tmpHome, { recursive: true, force: true });
    cleanup();
  }
});
