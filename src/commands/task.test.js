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

// NOTA (tarea 011, paso 6): con el flujo adaptativo (BR-057/BR-058), `task new`
// deja de crear analysis.md — ese y los demás artefactos los crea `task type`
// (ya implementado en el paso 5) según el tipo que el agente clasifique. Este
// test reemplaza al viejo "crea analysis.md" y queda en ROJO hasta el paso 7.
test('sdd task new crea SOLO requirement.md (analysis.md ya no se crea acá — lo crea `task type`)', () => {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-task-new-'));
  try {
    const r = spawnSync(process.execPath, [BIN, 'task', 'new', 'test analysis', `--dir=${root}`, '--no-open'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const dir = join(root, '.sdd', 'tasks', '001-test-analysis');
    const reqPath = join(dir, 'requirement.md');
    assert.ok(existsSync(reqPath), `requirement.md no existe en ${reqPath}`);
    assert.match(readFileSync(reqPath, 'utf8'), /test analysis/, 'requirement.md debe contener el requisito verbatim');

    assert.ok(!existsSync(join(dir, 'analysis.md')), 'analysis.md NO debe crearse en `task new`');
    assert.ok(!existsSync(join(dir, 'spec.md')), 'spec.md NO debe crearse en `task new`');
    assert.ok(!existsSync(join(dir, 'plan.md')), 'plan.md NO debe crearse en `task new`');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task new: el contrato impreso por consola tiene ≤ 12 líneas y menciona `task type` (clasificar tipo+riesgo)', () => {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-task-new-contract-'));
  try {
    const r = spawnSync(process.execPath, [BIN, 'task', 'new', 'requisito contrato minimo', `--dir=${root}`, '--no-open'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const lines = r.stdout.split('\n').filter((l) => l.trim() !== '');
    assert.ok(
      lines.length <= 12,
      `el contrato de \`task new\` debe tener ≤ 12 líneas no vacías, tiene ${lines.length}:\n${r.stdout}`,
    );
    assert.match(r.stdout, /type/i, 'el contrato debe instruir clasificar tipo+riesgo mencionando `task type`');
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

// --- Paso 4: sdd task type <id> <simple|bug|feature|refactor> [--riesgo=alto] ---
//
// NOTA: el subcomando `task type` todavía no está implementado (llega en el
// paso 5 del plan de la tarea 011). Estos tests deben quedar en ROJO hasta
// entonces — no se toca task.js en este paso.

/** Fixture con una tarea recién creada (solo requirement.md, sin analysis/spec/plan). */
function fixtureFreshTask({ title = 'Tarea fresca' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-task-type-'));
  mkdirSync(join(root, '.sdd', 'tasks', '001-demo'), { recursive: true });
  writeFileSync(join(root, '.sdd', 'tasks', 'index.json'), JSON.stringify({
    nextId: 2,
    tasks: [{ id: '001', dir: '001-demo', title, status: 'draft', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  }, null, 2));
  writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'requirement.md'), '# Requisito\n\nHacer algo.\n');
  return root;
}

const typeTaskDir = (root) => join(root, '.sdd', 'tasks', '001-demo');
const readIndex = (root) => JSON.parse(readFileSync(join(root, '.sdd', 'tasks', 'index.json'), 'utf8'));

function runType(root, id, tipo, extraArgs = []) {
  return spawnSync(process.execPath, [BIN, 'task', 'type', id, tipo, `--dir=${root}`, '--no-open', ...extraArgs], { encoding: 'utf8' });
}

test('sdd task type simple: registra tipo=simple, riesgo=bajo por defecto y crea SOLO nota.md', () => {
  const root = fixtureFreshTask();
  try {
    const r = runType(root, '001', 'simple');
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const t = readIndex(root).tasks.find((x) => x.id === '001');
    assert.equal(t.tipo, 'simple');
    assert.equal(t.riesgo, 'bajo');

    assert.ok(existsSync(join(typeTaskDir(root), 'nota.md')), 'nota.md debe existir');
    assert.ok(!existsSync(join(typeTaskDir(root), 'analysis.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'spec.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'plan.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'reproduccion.md')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task type bug --riesgo=alto: registra riesgo y crea reproduccion.md + plan.md (sin analysis/spec)', () => {
  const root = fixtureFreshTask();
  try {
    const r = runType(root, '001', 'bug', ['--riesgo=alto']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const t = readIndex(root).tasks.find((x) => x.id === '001');
    assert.equal(t.tipo, 'bug');
    assert.equal(t.riesgo, 'alto');

    assert.ok(existsSync(join(typeTaskDir(root), 'reproduccion.md')));
    assert.ok(existsSync(join(typeTaskDir(root), 'plan.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'analysis.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'spec.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'nota.md')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task type refactor: crea analysis.md + plan.md, SIN spec.md', () => {
  const root = fixtureFreshTask();
  try {
    const r = runType(root, '001', 'refactor');
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    assert.ok(existsSync(join(typeTaskDir(root), 'analysis.md')));
    assert.ok(existsSync(join(typeTaskDir(root), 'plan.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'spec.md')), 'refactor no debe crear spec.md');
    assert.ok(!existsSync(join(typeTaskDir(root), 'nota.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'reproduccion.md')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task type feature: crea analysis.md + spec.md + plan.md', () => {
  const root = fixtureFreshTask();
  try {
    const r = runType(root, '001', 'feature');
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    assert.ok(existsSync(join(typeTaskDir(root), 'analysis.md')));
    assert.ok(existsSync(join(typeTaskDir(root), 'spec.md')));
    assert.ok(existsSync(join(typeTaskDir(root), 'plan.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'nota.md')));
    assert.ok(!existsSync(join(typeTaskDir(root), 'reproduccion.md')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task type: tipo inválido → error claro y exit code != 0', () => {
  const root = fixtureFreshTask();
  try {
    const r = runType(root, '001', 'no-existe');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /simple|bug|feature|refactor/, 'el error debe listar los tipos válidos');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task type: tarea inexistente → error', () => {
  const root = fixtureFreshTask();
  try {
    const r = runType(root, '999', 'simple');
    assert.notEqual(r.status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task type: re-clasificar bug → feature crea los artefactos faltantes SIN borrar ni pisar los existentes', () => {
  const root = fixtureFreshTask();
  try {
    assert.equal(runType(root, '001', 'bug').status, 0);

    // El dev/agente avanza sobre los artefactos de "bug" antes de re-clasificar.
    const planPath = join(typeTaskDir(root), 'plan.md');
    const reproPath = join(typeTaskDir(root), 'reproduccion.md');
    writeFileSync(planPath, readFileSync(planPath, 'utf8') + '\n<!-- progreso del dev -->\n');
    writeFileSync(reproPath, readFileSync(reproPath, 'utf8') + '\n<!-- progreso del dev -->\n');
    const planBefore = readFileSync(planPath, 'utf8');
    const reproBefore = readFileSync(reproPath, 'utf8');

    const r = runType(root, '001', 'feature');
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const t = readIndex(root).tasks.find((x) => x.id === '001');
    assert.equal(t.tipo, 'feature');

    // plan.md (ya existía por "bug") no se pisa.
    assert.equal(readFileSync(planPath, 'utf8'), planBefore, 'plan.md no debe pisarse al re-clasificar');
    // reproduccion.md de "bug" no se borra al pasar a "feature".
    assert.ok(existsSync(reproPath), 'reproduccion.md no debe borrarse al re-clasificar');
    assert.equal(readFileSync(reproPath, 'utf8'), reproBefore);

    // Faltantes de "feature" se crean.
    assert.ok(existsSync(join(typeTaskDir(root), 'analysis.md')));
    assert.ok(existsSync(join(typeTaskDir(root), 'spec.md')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sdd task type: re-clasificar al mismo tipo no pisa un artefacto ya editado por el dev', () => {
  const root = fixtureFreshTask();
  try {
    assert.equal(runType(root, '001', 'simple').status, 0);
    const notaPath = join(typeTaskDir(root), 'nota.md');
    writeFileSync(notaPath, readFileSync(notaPath, 'utf8').replace('…', 'contenido editado por el dev'));
    const notaBefore = readFileSync(notaPath, 'utf8');

    const r = runType(root, '001', 'simple');
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.equal(readFileSync(notaPath, 'utf8'), notaBefore, 'nota.md editado no debe pisarse');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Paso 6: gate de cierre acepta "N/A: <motivo>" en los campos de retro.md ---
//
// Hoy el gate rechaza cualquier retro.md que contenga el carácter "…" en
// CUALQUIER parte del archivo (`rc.includes('…')`) — incluida la nota
// explicativa del propio template de retro.md, que cita el carácter entre
// backticks ("Lo que NO satisface el gate: dejar un `…` sin reemplazar.").
// Eso significa que hoy, incluso una retro completamente llena con
// "N/A: <motivo>" en sus campos, NO puede cerrarse. El comportamiento nuevo
// esperado (BR-059): esa retro cierra sin error. Este test queda en ROJO
// hasta el paso 7 — no se toca task.js en este paso.

/** Tarea sin pasos en plan.md (total=0), lista solo para probar el gate de retro de `task status <id> done`. */
function fixtureForDoneGate() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-task-done-gate-'));
  mkdirSync(join(root, '.sdd', 'tasks', '001-demo'), { recursive: true });
  writeFileSync(join(root, '.sdd', 'tasks', 'index.json'), JSON.stringify({
    nextId: 2,
    tasks: [{ id: '001', dir: '001-demo', title: 'Demo', status: 'in-progress', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  }, null, 2));
  writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), '# Plan\n\n## Pasos\n\n_(sin pasos)_\n');
  return root;
}

test('sdd task status <id> done acepta un retro.md con campos "N/A: <motivo>" (aunque la nota del template cite el `…` entre backticks)', () => {
  const root = fixtureForDoneGate();
  try {
    const retro = [
      '# Retro — tarea 001: Demo',
      '',
      '> Su presupuesto es de **≤ 150 palabras**. `N/A: <motivo>` es respuesta válida en cualquier campo que no aplique — y satisface el gate de cierre. Lo que NO satisface el gate: dejar un `…` sin reemplazar.',
      '',
      '## Métrica vs baseline',
      '',
      '- **Baseline (de analysis.md) → resultado medido:** N/A: no se definió métrica para esta tarea',
      '- **¿Se cumplió lo esperado?:** N/A: sin métrica aplicable',
      '',
      '## Desvíos del plan',
      '',
      'N/A: el plan se ejecutó tal cual, sin desvíos.',
      '',
      '## Aprendizajes accionables',
      '',
      'N/A: sin aprendizajes generalizables de esta tarea.',
      '',
    ].join('\n');
    writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'retro.md'), retro);

    const r = spawnSync(process.execPath, [BIN, 'task', 'status', '001', 'done', `--dir=${root}`, '--no-open'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const idx = JSON.parse(readFileSync(join(root, '.sdd', 'tasks', 'index.json'), 'utf8'));
    assert.equal(idx.tasks.find((t) => t.id === '001').status, 'done');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
