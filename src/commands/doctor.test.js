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

test('doctor: ya no reporta nada sobre "post-commit" (hook retirado, BR-023/027/028 supersedidas)', async () => {
  // Caso sin hook instalado
  const root1 = tmpRepo();
  setupRepoWithConfig(root1);
  const { logs: logs1 } = await withCapturedLogs(() => doctor(root1));
  const full1 = logs1.join('\n');
  assert.ok(!full1.includes('post-commit'), `No se esperaba mención de "post-commit" sin hook instalado, salida: ${full1}`);

  // Caso con el hook legacy instalado (installPostCommit) — doctor no debe mencionarlo ni para bien ni para mal
  const root2 = tmpRepo();
  setupRepoWithConfig(root2);
  installPostCommit(root2);
  const { logs: logs2 } = await withCapturedLogs(() => doctor(root2));
  const full2 = logs2.join('\n');
  assert.ok(!full2.includes('post-commit'), `No se esperaba mención de "post-commit" con el hook legacy presente, salida: ${full2}`);
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

// Tests para deprecación de graph.driver "sqlite" (ADR-0011, BR-049) y detección
// heurística de CI/CD corriendo `sdd publish` cuando graph.driver === "mysql".

test('doctor: graph.driver === sqlite → reporta ERROR de deprecación (ADR-0011)', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root, { graph: { driver: 'sqlite' } });

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('✖ graph.driver: "sqlite" está deprecado (ver ADR-0011) — migrá a "mysql" + CI/CD'),
    `Se esperaba el error de deprecación de sqlite, salida: ${full}`
  );
});

test('doctor: sin graph configurado → NO menciona sqlite ni mysql', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root); // Sin segundo arg, sin field graph

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(!full.includes('sqlite'), `No se esperaba mención de "sqlite" sin graph configurado, salida: ${full}`);
  assert.ok(!full.includes('mysql'), `No se esperaba mención de "mysql" sin graph configurado, salida: ${full}`);
});

test('doctor: graph.driver === mysql + CI/CD detectado (.github/workflows corriendo sdd publish) → "✓ CI/CD detectado corriendo sdd publish"', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root, { graph: { driver: 'mysql', mysql: { urlEnv: 'X' } } });

  const workflowsDir = join(root, '.github', 'workflows');
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.writeFileSync(join(workflowsDir, 'ci.yml'), [
    'name: CI',
    'on: push',
    'jobs:',
    '  publish:',
    '    steps:',
    '      - run: sdd publish',
    '',
  ].join('\n'));

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('✓ CI/CD detectado corriendo sdd publish'),
    `Se esperaba detección de CI/CD corriendo sdd publish, salida: ${full}`
  );
});

test('doctor: graph.driver === mysql + sin CI/CD detectado → warning (ver BR-050)', async () => {
  const root = tmpRepo();
  setupRepoWithConfig(root, { graph: { driver: 'mysql', mysql: { urlEnv: 'X' } } });
  // Sin ningún archivo de CI (.github/workflows, .gitlab-ci.yml, Jenkinsfile)

  const { logs } = await withCapturedLogs(() => doctor(root));
  const full = logs.join('\n');

  assert.ok(
    full.includes('⚠ Sin CI/CD detectado corriendo sdd publish — el grafo puede quedar desactualizado (ver BR-050)'),
    `Se esperaba el warning de CI/CD ausente, salida: ${full}`
  );
});
