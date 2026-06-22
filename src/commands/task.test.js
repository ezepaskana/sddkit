import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'sdd.js');

/** Repo temporal con una tarea de un solo paso, cuya línea de Verificación es `verificacion`. */
function fixtureWithStep(verificacion) {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-task-'));
  mkdirSync(join(root, '.sdd', 'tasks', '001-demo'), { recursive: true });
  writeFileSync(join(root, '.sdd', 'tasks', 'index.json'), JSON.stringify({
    nextId: 2,
    tasks: [{ id: '001', dir: '001-demo', title: 'Demo', status: 'in-progress', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  }, null, 2));
  writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), [
    '# Plan',
    '',
    '## Pasos',
    '',
    '- [ ] **1. Paso de prueba** _(rapido)_',
    '  - **Hace:** algo',
    '  - **Archivos:** —',
    '  - **Depende de:** —',
    `  - **Verificación:** ${verificacion}`,
    '',
  ].join('\n'));
  return root;
}

/** Repo temporal con una tarea cuyo plan.md tiene 2 pasos simples (sin sección "Rama de trabajo"). */
function fixtureWithPlan({ title = 'Integracion plan', branching = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-task-plan-'));
  mkdirSync(join(root, '.sdd', 'tasks', '001-demo'), { recursive: true });
  writeFileSync(join(root, '.sdd', 'tasks', 'index.json'), JSON.stringify({
    nextId: 2,
    tasks: [{ id: '001', dir: '001-demo', title, status: 'planned', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  }, null, 2));
  writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), [
    '# Plan — tarea 001: ' + title,
    '',
    '## Pasos',
    '',
    '- [ ] **1. Hacer algo** _(rapido)_',
    '  - **Hace:** lo primero',
    '  - **Archivos:** —',
    '  - **Depende de:** —',
    '  - **Verificación:** manual',
    '',
    '- [ ] **2. Hacer otra cosa** _(medio)_',
    '  - **Hace:** lo segundo',
    '  - **Archivos:** —',
    '  - **Depende de:** paso 1',
    '  - **Verificación:** manual',
    '',
  ].join('\n'));

  if (branching) {
    mkdirSync(join(root, '.sdd'), { recursive: true });
    writeFileSync(join(root, '.sdd', 'branching.md'), [
      '# Branching Policy',
      '',
      '```json',
      JSON.stringify({ versions: [{ date: '2026-01-01', author: 'dev', ...branching }], active: 0 }, null, 2),
      '```',
      '',
    ].join('\n'));
  }

  return root;
}

function runPlan(root) {
  return spawnSync(process.execPath, [BIN, 'task', 'plan', '001', `--dir=${root}`, '--no-open'], { encoding: 'utf8' });
}

function runVerify(root) {
  return spawnSync(process.execPath, [BIN, 'task', 'verify', '001', '1', `--dir=${root}`], { encoding: 'utf8' });
}

test('task verify ejecuta "cmd: ..." sin backticks (forma original)', () => {
  const root = fixtureWithStep('cmd: exit 5');
  try {
    assert.equal(runVerify(root).status, 5);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('task verify ejecuta "`cmd: ...`" envuelto en un code span', () => {
  const root = fixtureWithStep('`cmd: exit 7`');
  try {
    assert.equal(runVerify(root).status, 7);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('task verify ejecuta "`cmd: ...`" con prosa después del code span', () => {
  const root = fixtureWithStep('`cmd: exit 9` — nota explicativa');
  try {
    assert.equal(runVerify(root).status, 9);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('task verify degrada a verificación manual (exit 3) si no es cmd:', () => {
  const root = fixtureWithStep('revisión visual del resultado');
  try {
    assert.equal(runVerify(root).status, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Paso 13: sdd task plan — integración de branching ---------------------

test('sdd task plan with branching: con .sdd/branching.md, genera sección "Rama de trabajo" y Paso 1 = git checkout -b', () => {
  const root = fixtureWithPlan({
    title: 'Integracion plan',
    branching: { convención: 'Conventional Commits', flujo: 'GitHub Flow', patrón: 'task/{numero}-{slug}' },
  });
  try {
    const r = runPlan(root);
    assert.equal(r.status, 0, r.stderr);

    const plan = readFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), 'utf8');

    // Sección "Rama de trabajo" presente, antes de "## Pasos".
    assert.match(plan, /^## Rama de trabajo/m);
    assert.ok(plan.indexOf('## Rama de trabajo') < plan.indexOf('## Pasos'));
    assert.match(plan, /\*\*Rama:\*\*.*task\/001-integracion-plan/);

    // Paso 1 = git checkout -b <rama>; pasos originales corridos a 2 y 3.
    assert.match(plan, /- \[ \] \*\*1\..*\n(.*\n)*.*cmd: git checkout -b task\/001-integracion-plan/);
    assert.match(plan, /- \[ \] \*\*2\. Hacer algo\*\*/);
    assert.match(plan, /- \[ \] \*\*3\. Hacer otra cosa\*\*/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task plan with branching: es idempotente — si ya tiene "## Rama de trabajo" no la duplica', () => {
  const root = fixtureWithPlan({
    title: 'Integracion plan',
    branching: { convención: 'Conventional Commits', flujo: 'GitHub Flow', patrón: 'task/{numero}-{slug}' },
  });
  try {
    assert.equal(runPlan(root).status, 0);
    const first = readFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), 'utf8');

    assert.equal(runPlan(root).status, 0);
    const second = readFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), 'utf8');

    assert.equal(second, first);
    assert.equal((second.match(/## Rama de trabajo/g) || []).length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Paso 14: sdd task plan sin .sdd/branching.md → defaults + aviso -------

test('sdd task plan defaults warning: sin .sdd/branching.md, usa defaults y avisa "Política de branching no definida"', () => {
  const root = fixtureWithPlan({ title: 'Sin politica', branching: null });
  try {
    const r = runPlan(root);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /⚠️ Política de branching no definida\. Usamos defaults\./);

    const plan = readFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), 'utf8');
    assert.match(plan, /⚠️ Política de branching no definida\. Usamos defaults\./);

    // Defaults: Conventional Commits + GitHub Flow + task/{numero}-{slug}
    assert.match(plan, /\*\*Convención de commits:\*\*.*Conventional Commits/);
    assert.match(plan, /\*\*Rama:\*\*.*task\/001-sin-politica/);
    assert.match(plan, /- \[ \] \*\*1\..*\n(.*\n)*.*cmd: git checkout -b task\/001-sin-politica/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Tests para analysis.md y estado analyzed ---------------------------------

import { existsSync } from 'node:fs';

test('sdd task new crea analysis.md con sección "Análisis crítico"', () => {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-task-new-'));
  try {
    const r = spawnSync(process.execPath, [BIN, 'task', 'new', 'test analysis', `--dir=${root}`, '--no-open'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const analysisPath = join(root, '.sdd', 'tasks', '001-test-analysis', 'analysis.md');
    assert.ok(existsSync(analysisPath), `analysis.md no existe en ${analysisPath}`);

    const content = readFileSync(analysisPath, 'utf8');
    assert.match(content, /Análisis crítico/, 'analysis.md debe contener "Análisis crítico"');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** Fixture con una tarea en estado draft para probar transición a analyzed. */
function fixtureWithDraftTask() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-task-analyzed-'));
  mkdirSync(join(root, '.sdd', 'tasks', '001-demo'), { recursive: true });
  writeFileSync(join(root, '.sdd', 'tasks', 'index.json'), JSON.stringify({
    nextId: 2,
    tasks: [{ id: '001', dir: '001-demo', title: 'Demo', status: 'draft', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  }, null, 2));
  writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'analysis.md'), '# Analysis\n\n## Análisis crítico\n\nContenido de prueba.\n');
  writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), '# Plan\n');
  return root;
}

test('sdd task status <id> analyzed es un estado válido y actualiza index.json', () => {
  const root = fixtureWithDraftTask();
  try {
    const r = spawnSync(process.execPath, [BIN, 'task', 'status', '001', 'analyzed', `--dir=${root}`, '--no-open'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const idx = JSON.parse(readFileSync(join(root, '.sdd', 'tasks', 'index.json'), 'utf8'));
    const task = idx.tasks.find((t) => t.id === '001');
    assert.equal(task.status, 'analyzed', 'El estado en index.json debe ser "analyzed"');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task status <id> analyzed muestra analysis.md en stdout', () => {
  const root = fixtureWithDraftTask();
  try {
    const r = spawnSync(process.execPath, [BIN, 'task', 'status', '001', 'analyzed', `--dir=${root}`, '--no-open'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.match(r.stdout, /analysis\.md/, 'stdout debe contener "analysis.md" como archivo para revisar');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
