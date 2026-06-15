import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { doctor } from './doctor.js';
import { installPostCommit } from '../lib/hooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-doctor-'));
}

function setupRepoWithConfig(root, cfg = {}) {
  // Crear .sdd/config.json
  const sddDir = join(root, '.sdd');
  fs.mkdirSync(sddDir, { recursive: true });
  const defaultCfg = {
    version: '1.0.0',
    models: { rapido: 'claude-haiku', medio: 'claude-sonnet', fuerte: 'claude-opus' },
    hooks: { preCommit: true, autoPublish: true },
    ...cfg,
  };
  fs.writeFileSync(join(sddDir, 'config.json'), JSON.stringify(defaultCfg));

  // Crear .git/hooks/ directorio
  const hooksDir = join(root, '.git', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result }))
    .finally(() => { console.log = originalLog; });
}

test('doctor: sin .git/hooks/post-commit → loguea "ausente"', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root);

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('post-commit hook (auto-publish) ausente'),
    `Se esperaba mensaje de "ausente", salida: ${full}`
  );
});

test('doctor: .git/hooks/post-commit instalado vía installPostCommit → loguea "activo"', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root);

  // Instalar el hook post-commit
  installPostCommit(root);

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('post-commit hook (auto-publish) activo'),
    `Se esperaba mensaje de "activo", salida: ${full}`
  );
});

test('doctor: cfg.hooks.autoPublish = false → loguea "desactivado por config"', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root, { hooks: { preCommit: true, autoPublish: false } });

  // Aunque instalemos el hook, si autoPublish es false debería reportar como desactivado
  installPostCommit(root);

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('post-commit hook (auto-publish) desactivado por config'),
    `Se esperaba mensaje de "desactivado por config", salida: ${full}`
  );
});

// Nuevos tests para caso 1: Config version desactualizada sugiere `sdd sync`
test('doctor: Config version desactualizada sugiere `sdd sync`', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root, { version: '0.0.1' });

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('sdd sync'),
    `Se esperaba "sdd sync" en la línea de config desactualizada, salida: ${full}`
  );
});

// Nuevos tests para caso 2: pre-commit hook ausente sugiere `sdd sync`
test('doctor: pre-commit hook ausente sugiere `sdd sync`', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root);

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('pre-commit hook ausente') && full.includes('sdd sync'),
    `Se esperaba "sdd sync" en la línea de pre-commit ausente, salida: ${full}`
  );
});

// Nuevo test para caso 3: post-commit hook ausente sugiere `sdd sync` (extender test existente)
test('doctor: post-commit hook ausente sugiere `sdd sync`', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root);

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('post-commit hook (auto-publish) ausente') && full.includes('sdd sync'),
    `Se esperaba "sdd sync" en la línea de post-commit ausente, salida: ${full}`
  );
});

// Nuevo test para caso 4: Skills faltantes (scope local) sugieren `sdd sync`
test('doctor: Skills faltantes (scope local) sugieren `sdd sync`', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root, { skills: 'local' });
  // No crear .claude/skills/ para que falten skills

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('Skills faltantes') && full.includes('sdd sync'),
    `Se esperaba "sdd sync" en la línea de skills faltantes, salida: ${full}`
  );
});

// Nuevo test para caso 5: sdd-bootstrap global ausente sigue sugiriendo `sdd setup`
test('doctor: sdd-bootstrap global ausente sigue sugiriendo `sdd setup` (no sdd sync)', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root);

  const originalHome = process.env.HOME;
  try {
    // Apuntar HOME a un tmpdir sin .claude/skills/sdd-bootstrap
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-doctor-home-'));
    process.env.HOME = tmpHome;

    const { logs } = await withCapturedLogs(() => doctor(root));
    const full = logs.join('\n');

    assert.ok(
      full.includes('sdd-bootstrap') && full.includes('sdd setup') && !full.match(/sdd-bootstrap.*sdd sync/),
      `Se esperaba que sdd-bootstrap siga sugiriendo "sdd setup", no "sdd sync", salida: ${full}`
    );
  } finally {
    process.env.HOME = originalHome;
  }
});
