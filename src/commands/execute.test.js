import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  validateBranchBeforeExecute,
  getCurrentBranch,
} from '../lib/branching.js';
import {
  checkGitInitialized,
  getStep1Command,
  runExecuteGate,
} from './execute.js';

// TODO: src/commands/execute.js no existe todavía (paso 17 del plan). Este
// archivo importa las funciones esperadas:
//   - checkGitInitialized(rootPath)        -> {ok: boolean, message?: string}
//   - getStep1Command(rootPath, taskId)    -> {branchName, command} | null
//   - runExecuteGate(rootPath, taskId)     -> {ok, branch?, step1?, errors?, warnings?}
// `validateBranchBeforeExecute(rootPath, branchName)` y `getCurrentBranch(rootPath)`
// se implementan en src/lib/branching.js (paso 15).

/** Crea un repo temporal git-inicializado y devuelve { root, cleanup }. */
function tmpGitRepo() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-execute-'));
  execSync('git init -q', { cwd: root });
  execSync('git config user.email "test@example.com"', { cwd: root });
  execSync('git config user.name "Test"', { cwd: root });
  writeFileSync(join(root, 'README.md'), '# repo\n');
  execSync('git add README.md', { cwd: root });
  execSync('git commit -q -m "chore: initial commit"', { cwd: root });
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** Escribe `.sdd/tasks/index.json` + `001-demo/plan.md` con un Paso 1 = git checkout -b <branchName>. */
function writeTaskWithPlan(root, branchName, { extraSteps = true } = {}) {
  mkdirSync(join(root, '.sdd', 'tasks', '001-demo'), { recursive: true });
  writeFileSync(join(root, '.sdd', 'tasks', 'index.json'), JSON.stringify({
    nextId: 2,
    tasks: [{ id: '001', dir: '001-demo', title: 'Demo', status: 'planned', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  }, null, 2));

  const lines = [
    '# Plan — tarea 001: Demo',
    '',
    '## Rama de trabajo',
    '',
    `- **Rama:** \`${branchName}\``,
    '- **Origen:** `main`',
    '- **Destino:** `main`',
    '',
    '## Pasos',
    '',
    '- [ ] **1. Crear rama de trabajo** _(rapido)_',
    '  - **Hace:** crear y cambiar a la rama de trabajo de la tarea',
    '  - **Archivos:** —',
    '  - **Depende de:** —',
    `  - **Verificación:** \`cmd: git checkout -b ${branchName}\``,
    '',
  ];

  if (extraSteps) {
    lines.push(
      '- [ ] **2. Hacer algo** _(rapido)_',
      '  - **Hace:** lo primero',
      '  - **Archivos:** —',
      '  - **Depende de:** paso 1',
      '  - **Verificación:** manual',
      '',
    );
  }

  writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), lines.join('\n'));
}

// --- Paso 15: validateBranchBeforeExecute -----------------------------------

test('validateBranchBeforeExecute: branch validation — rama actual coincide con la esperada → valid: true', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    execSync('git checkout -b task/001-demo -q', { cwd: root });
    const result = validateBranchBeforeExecute(root, 'task/001-demo');
    assert.equal(result.valid, true);
    assert.equal(result.current, 'task/001-demo');
    assert.equal(result.expected, 'task/001-demo');
  } finally { cleanup(); }
});

test('validateBranchBeforeExecute: branch validation — rama actual NO coincide con la esperada → valid: false', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    // Seguimos en la rama default (main/master), pero esperamos otra.
    const result = validateBranchBeforeExecute(root, 'task/099-otra');
    assert.equal(result.valid, false);
    assert.equal(result.expected, 'task/099-otra');
    assert.notEqual(result.current, 'task/099-otra');
  } finally { cleanup(); }
});

test('validateBranchBeforeExecute: branch validation — usa git branch --show-current internamente (getCurrentBranch)', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    execSync('git checkout -b feature/x -q', { cwd: root });
    const current = getCurrentBranch(root);
    const result = validateBranchBeforeExecute(root, current);
    assert.equal(result.valid, true);
    assert.equal(result.current, current);
  } finally { cleanup(); }
});

// --- Paso 16: Paso 1 (git checkout -b) es bloqueante ------------------------

test('runExecuteGate: step 1 blocking — si falta .git, falla ANTES de tocar ningún paso', () => {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-execute-nogit-'));
  try {
    writeTaskWithPlan(root, 'task/001-demo');
    const result = runExecuteGate(root, '001');
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /git init/i);
    // No debe haber ejecutado Paso 1 ni reportar rama.
    assert.equal(result.step1, undefined);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('runExecuteGate: step 1 blocking — si "git checkout -b" del Paso 1 falla (rama ya existe), pasos 2+ no corren', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    const branchName = 'task/001-demo';
    // La rama YA existe de antemano -> git checkout -b fallará.
    execSync(`git branch ${branchName}`, { cwd: root });
    writeTaskWithPlan(root, branchName);

    const result = runExecuteGate(root, '001');

    assert.equal(result.ok, false);
    assert.equal(result.step1.ok, false);
    // La rama actual sigue siendo la original (checkout -b no pudo correr).
    assert.notEqual(getCurrentBranch(root), branchName);
    // No debe reportar éxito de validación de rama post-paso-1.
    assert.ok(!result.branch || result.branch.valid === false);
  } finally { cleanup(); }
});

test('runExecuteGate: step 1 blocking — si Paso 1 succeeds y rama coincide, ok: true y listo para pasos 2+', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    const branchName = 'task/001-demo';
    writeTaskWithPlan(root, branchName);

    const result = runExecuteGate(root, '001');

    assert.equal(result.ok, true);
    assert.equal(result.step1.ok, true);
    assert.equal(result.branch.valid, true);
    assert.equal(getCurrentBranch(root), branchName);
  } finally { cleanup(); }
});

// --- checkGitInitialized -----------------------------------------------------

test('checkGitInitialized: repo sin .git → ok: false con mensaje "git init"', () => {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-execute-checkgit-'));
  try {
    const result = checkGitInitialized(root);
    assert.equal(result.ok, false);
    assert.match(result.message, /git init/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('checkGitInitialized: repo con .git → ok: true', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    const result = checkGitInitialized(root);
    assert.equal(result.ok, true);
  } finally { cleanup(); }
});

// --- getStep1Command ----------------------------------------------------------

test('getStep1Command: extrae rama y comando "git checkout -b" del Paso 1 de plan.md', () => {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-execute-step1-'));
  try {
    writeTaskWithPlan(root, 'task/001-demo');
    const step1 = getStep1Command(root, '001');
    assert.ok(step1);
    assert.equal(step1.branchName, 'task/001-demo');
    assert.equal(step1.command, 'git checkout -b task/001-demo');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
