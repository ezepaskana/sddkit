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

test('sync: misma versión → lista las acciones reales, sin "ya estás al día" ni AGENTS.md', async () => {
  const { root, cleanup } = gitFixture();
  try {
    setupRepoWithConfig(root, { version: VERSION, skills: 'local' });

    // 1ra corrida (deja todo sincronizado/al día)
    await withCapturedLogs(() => sync(root, {}));

    // 2da corrida: aunque la versión no cambie, el mensaje lista lo que tocó
    const { logs } = await withCapturedLogs(() => sync(root, {}));
    const full = logs.join('\n');

    assert.ok(!full.includes('ya estás al día'), `No se esperaba "ya estás al día", salida: ${full}`);
    assert.ok(full.includes(VERSION), `Se esperaba que el log incluya "${VERSION}", salida: ${full}`);
    assert.ok(/skills SDD/.test(full), `Se esperaba la acción de skills en el listado, salida: ${full}`);
    assert.ok(/CLAUDE\.md/.test(full), `Se esperaba la acción de CLAUDE.md en el listado, salida: ${full}`);
    assert.ok(!full.includes('AGENTS.md'), `El mensaje no debe mencionar AGENTS.md, salida: ${full}`);
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

test('sync: 2da corrida consecutiva sin cambios → reporta al día, no actualizado', async () => {
  const { root, cleanup } = gitFixture();
  try {
    setupRepoWithConfig(root, { version: VERSION, skills: 'local' });

    // 1ra corrida: deja CLAUDE.md y las skills instaladas/sincronizadas
    await withCapturedLogs(() => sync(root, {}));

    // 2da corrida: nada cambió, no debería reportar "actualizado"/"instaladas/actualizadas"
    const { logs } = await withCapturedLogs(() => sync(root, {}));
    const full = logs.join('\n');

    assert.ok(
      !full.includes('bloque gestionado actualizado'),
      `No se esperaba "bloque gestionado actualizado", salida: ${full}`,
    );
    assert.ok(
      !full.includes('instaladas/actualizadas'),
      `No se esperaba "instaladas/actualizadas", salida: ${full}`,
    );
    assert.ok(full.includes('al día'), `Se esperaba que el log incluya "al día", salida: ${full}`);
  } finally { cleanup(); }
});

test('sync: skill instalada modificada a mano → sync la reporta como actualizada', async () => {
  const { root, cleanup } = gitFixture();
  try {
    setupRepoWithConfig(root, { version: VERSION, skills: 'local' });

    // 1ra corrida: instala las skills
    await withCapturedLogs(() => sync(root, {}));

    // Modificación manual de una skill instalada
    const installedSkillPath = join(root, '.claude', 'skills', 'sdd-task', 'SKILL.md');
    const original = readFileSync(installedSkillPath, 'utf8');
    writeFileSync(installedSkillPath, original + '\nlínea agregada a mano\n');

    // 2da corrida: debería detectar la diferencia y reportarla como actualizada
    const { logs } = await withCapturedLogs(() => sync(root, {}));
    const full = logs.join('\n');

    assert.ok(
      full.includes('skills SDD actualizadas'),
      `Se esperaba que el log incluya "skills SDD actualizadas", salida: ${full}`,
    );
    assert.ok(full.includes('sdd-task'), `Se esperaba que el log incluya "sdd-task", salida: ${full}`);
    assert.ok(
      !full.includes('skills SDD al día'),
      `No se esperaba "skills SDD al día", salida: ${full}`,
    );
  } finally { cleanup(); }
});
