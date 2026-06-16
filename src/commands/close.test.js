import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import {
  verifyBranchPushed,
  detectGitPlatform,
  buildPRCommand,
  buildManualPRInstructions,
  isPRToolAvailable,
} from '../lib/branching.js';

// TODO: estas funciones se implementan en src/lib/branching.js (pasos 18-22):
//   - verifyBranchPushed(rootPath, branchName)        -> {pushed: boolean}
//   - detectGitPlatform(rootPath)                     -> 'github'|'azure'|'gitlab'|'unknown'
//   - buildPRCommand(branch, base, title, body, plat) -> string | null
//   - buildManualPRInstructions(rootPath, branch, base) -> {manual: true, message, url}
//   - isPRToolAvailable(platform, rootPath)           -> boolean
// `sdd task close <id>` (paso 22) vive en src/commands/task.js, invocado via bin/sdd.js.

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'sdd.js');

/** Crea un repo temporal git-inicializado y devuelve { root, cleanup }. */
function tmpGitRepo() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-close-'));
  execSync('git init -q -b main', { cwd: root });
  execSync('git config user.email "test@example.com"', { cwd: root });
  execSync('git config user.name "Test"', { cwd: root });
  writeFileSync(join(root, 'README.md'), '# repo\n');
  execSync('git add README.md', { cwd: root });
  execSync('git commit -q -m "chore: initial commit"', { cwd: root });
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** Repo temporal con una tarea "done" (todos los pasos completos) en una rama de trabajo. */
function tmpTaskRepo({ branchName = 'task/001-demo', pushed = false, withRemote = false } = {}) {
  const { root, cleanup } = tmpGitRepo();
  execSync(`git checkout -b ${branchName} -q`, { cwd: root });
  writeFileSync(join(root, 'feature.txt'), 'feature\n');
  execSync('git add feature.txt', { cwd: root });
  execSync('git commit -q -m "feat: add feature"', { cwd: root });

  mkdirSync(join(root, '.sdd', 'tasks', '001-demo'), { recursive: true });
  writeFileSync(join(root, '.sdd', 'tasks', 'index.json'), JSON.stringify({
    nextId: 2,
    tasks: [{ id: '001', dir: '001-demo', title: 'Demo task', status: 'in-progress', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  }, null, 2));
  writeFileSync(join(root, '.sdd', 'tasks', '001-demo', 'plan.md'), [
    '# Plan — tarea 001: Demo task',
    '',
    '## Pasos',
    '',
    '- [x] **1. Crear rama de trabajo** _(rapido)_',
    '  - **Hace:** crear rama',
    '  - **Archivos:** —',
    '  - **Depende de:** —',
    `  - **Verificación:** \`cmd: git checkout -b ${branchName}\``,
    '',
    '- [x] **2. Hacer algo** _(rapido)_',
    '  - **Hace:** lo primero',
    '  - **Archivos:** —',
    '  - **Depende de:** paso 1',
    '  - **Verificación:** manual',
    '',
  ].join('\n'));

  if (withRemote) {
    const remote = mkdtempSync(join(tmpdir(), 'sddkit-close-remote-'));
    execSync('git init -q --bare', { cwd: remote });
    execSync(`git remote add origin ${remote}`, { cwd: root });
    if (pushed) {
      execSync('git push -q -u origin main', { cwd: root });
      execSync(`git push -q -u origin ${branchName}`, { cwd: root });
    } else {
      execSync('git push -q -u origin main', { cwd: root });
    }
    return {
      root, branchName,
      cleanup: () => { cleanup(); rmSync(remote, { recursive: true, force: true }); },
    };
  }

  return { root, branchName, cleanup };
}

// --- Paso 18: branch pushed check -------------------------------------------

test('verifyBranchPushed: branch pushed check — rama existe en origin (git branch -r) → pushed: true', () => {
  const { root, branchName, cleanup } = tmpTaskRepo({ withRemote: true, pushed: true });
  try {
    const result = verifyBranchPushed(root, branchName);
    assert.equal(result.pushed, true);
  } finally { cleanup(); }
});

test('verifyBranchPushed: branch pushed check — rama NO existe en origin → pushed: false', () => {
  const { root, branchName, cleanup } = tmpTaskRepo({ withRemote: true, pushed: false });
  try {
    const result = verifyBranchPushed(root, branchName);
    assert.equal(result.pushed, false);
  } finally { cleanup(); }
});

test('verifyBranchPushed: branch pushed check — sin remoto origin → pushed: false (sin lanzar excepción)', () => {
  const { root, branchName, cleanup } = tmpTaskRepo({ withRemote: false });
  try {
    assert.doesNotThrow(() => verifyBranchPushed(root, branchName));
    const result = verifyBranchPushed(root, branchName);
    assert.equal(result.pushed, false);
  } finally { cleanup(); }
});

// --- Paso 19: platform detection --------------------------------------------

test('detectGitPlatform: platform detection — origin github.com (https) → "github"', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    execSync('git remote add origin https://github.com/acme/repo.git', { cwd: root });
    assert.equal(detectGitPlatform(root), 'github');
  } finally { cleanup(); }
});

test('detectGitPlatform: platform detection — origin github.com (ssh) → "github"', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    execSync('git remote add origin git@github.com:acme/repo.git', { cwd: root });
    assert.equal(detectGitPlatform(root), 'github');
  } finally { cleanup(); }
});

test('detectGitPlatform: platform detection — origin dev.azure.com → "azure"', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    execSync('git remote add origin https://dev.azure.com/acme/proj/_git/repo', { cwd: root });
    assert.equal(detectGitPlatform(root), 'azure');
  } finally { cleanup(); }
});

test('detectGitPlatform: platform detection — origin gitlab.com → "gitlab"', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    execSync('git remote add origin git@gitlab.com:acme/repo.git', { cwd: root });
    assert.equal(detectGitPlatform(root), 'gitlab');
  } finally { cleanup(); }
});

test('detectGitPlatform: platform detection — sin remoto origin → "unknown"', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    assert.equal(detectGitPlatform(root), 'unknown');
  } finally { cleanup(); }
});

test('detectGitPlatform: platform detection — host desconocido → "unknown"', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    execSync('git remote add origin https://git.example.com/acme/repo.git', { cwd: root });
    assert.equal(detectGitPlatform(root), 'unknown');
  } finally { cleanup(); }
});

// --- Paso 20: pr command generation ------------------------------------------

test('buildPRCommand: pr command generation — GitHub genera { cmd: "gh", args: [...] }', () => {
  const cmd = buildPRCommand('task/001-demo', 'main', 'feat: demo task', 'Body de la PR', 'github');
  assert.equal(cmd.cmd, 'gh');
  assert.deepEqual(cmd.args, [
    'pr', 'create', '--draft',
    '--title=feat: demo task',
    '--body=Body de la PR',
    '--head=task/001-demo',
    '--base=main',
  ]);
});

test('buildPRCommand: pr command generation — Azure DevOps genera { cmd: "az", args: [...] }', () => {
  const cmd = buildPRCommand('task/001-demo', 'main', 'feat: demo task', 'Body de la PR', 'azure');
  assert.equal(cmd.cmd, 'az');
  assert.deepEqual(cmd.args, [
    'repos', 'pr', 'create',
    '--source-branch', 'task/001-demo',
    '--target-branch', 'main',
    '--draft',
    '--title', 'feat: demo task',
    '--description', 'Body de la PR',
  ]);
});

test('buildPRCommand: pr command generation — GitLab genera { cmd: "gl", args: [...] }', () => {
  const cmd = buildPRCommand('task/001-demo', 'main', 'feat: demo task', 'Body de la PR', 'gitlab');
  assert.equal(cmd.cmd, 'gl');
  assert.deepEqual(cmd.args, [
    'mr', 'create',
    '--source-branch', 'task/001-demo',
    '--target-branch', 'main',
    '--draft',
    '--title', 'feat: demo task',
    '--description', 'Body de la PR',
  ]);
});

test('buildPRCommand: pr command generation — plataforma "unknown" → null (degradar a manual)', () => {
  const cmd = buildPRCommand('task/001-demo', 'main', 'feat: demo task', 'Body de la PR', 'unknown');
  assert.equal(cmd, null);
});

test('buildPRCommand: pasa metacaracteres de shell como argumentos literales', () => {
  const result = buildPRCommand('task/1;whoami', 'main', 'feat: $(rm -rf x)', 'cuerpo normal', 'github');
  assert.equal(result.cmd, 'gh');
  assert.ok(result.args.includes('--title=feat: $(rm -rf x)'));
  assert.ok(result.args.includes('--body=cuerpo normal'));
  assert.ok(result.args.includes('--head=task/1;whoami'));
  assert.ok(result.args.includes('--base=main'));
});

// --- Paso 21: manual pr creation ---------------------------------------------

// Determinista en cualquier entorno: NO asumimos ausencia de las CLIs (los
// runners de GitHub Actions traen `gh`/`az` preinstalados), sino que detectamos
// su disponibilidad real con el mismo mecanismo y verificamos que
// isPRToolAvailable la refleje (valida el mapeo plataforma→bin y el contrato
// booleano sin depender de qué tools haya instaladas).
function cliInstalled(bin, cwd) {
  try {
    execSync(`${bin} --version`, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

test('isPRToolAvailable: refleja la disponibilidad real de la CLI (gh/az/gl) en el entorno', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    assert.equal(isPRToolAvailable('github', root), cliInstalled('gh', root));
    assert.equal(isPRToolAvailable('azure', root), cliInstalled('az', root));
    assert.equal(isPRToolAvailable('gitlab', root), cliInstalled('gl', root));
  } finally { cleanup(); }
});

test('isPRToolAvailable: plataforma "unknown" → false', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    assert.equal(isPRToolAvailable('unknown', root), false);
  } finally { cleanup(); }
});

test('buildManualPRInstructions: manual pr creation — sin tool disponible, genera mensaje + URL "pull/new/<rama>" para GitHub', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    execSync('git remote add origin https://github.com/acme/repo.git', { cwd: root });
    const result = buildManualPRInstructions(root, 'task/001-demo', 'main');
    assert.equal(result.manual, true);
    assert.match(result.message, /PR ready to create manually/);
    assert.equal(result.url, 'https://github.com/acme/repo/pull/new/task/001-demo');
    assert.match(result.message, /pull\/new\/task\/001-demo/);
  } finally { cleanup(); }
});

test('buildManualPRInstructions: manual pr creation — sin remoto origin, mensaje sin URL pero con instrucción', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    const result = buildManualPRInstructions(root, 'task/001-demo', 'main');
    assert.equal(result.manual, true);
    assert.equal(result.url, null);
    assert.match(result.message, /PR ready to create manually/);
    assert.match(result.message, /task\/001-demo/);
  } finally { cleanup(); }
});

// --- Paso 22 + 23: sdd task close (CLI) — reporte de cierre -------------------

function runClose(root) {
  return spawnSync(process.execPath, [BIN, 'task', 'close', '001', `--dir=${root}`], { encoding: 'utf8' });
}

test('sdd task close: branch not pushed → avisa y NO intenta crear PR', () => {
  const { root, branchName, cleanup } = tmpTaskRepo({ withRemote: true, pushed: false });
  try {
    const r = runClose(root);
    assert.match(r.stdout + r.stderr, /Branch not pushed to origin/);
    assert.match(r.stdout + r.stderr, new RegExp(`git push origin ${branchName.replace(/\//g, '\\/')}`));
  } finally { cleanup(); }
});

test('sdd task close: close report — rama pusheada, sin remoto reconocido → degrada a PR manual y documenta reporte', () => {
  const { root, branchName, cleanup } = tmpTaskRepo({ withRemote: true, pushed: true });
  try {
    const r = runClose(root);
    assert.equal(r.status, 0, r.stderr);
    const out = r.stdout;

    // Documenta rama
    assert.match(out, new RegExp(branchName.replace(/\//g, '\\/')));
    // PR (manual, ya que no hay gh/az/gl ni plataforma reconocida)
    assert.match(out, /# PR:/);
    // Próximo paso
    assert.match(out, /Próximo: revisión manual/);
  } finally { cleanup(); }
});

test('sdd task close: close report — incluye detección de plataforma cuando origin es github', () => {
  const { root, branchName, cleanup } = tmpTaskRepo({ withRemote: false });
  try {
    // Remoto bare local pero con URL "github.com" simulada (no resoluble, pero detectable por nombre).
    const remote = mkdtempSync(join(tmpdir(), 'sddkit-close-remote-'));
    execSync('git init -q --bare', { cwd: remote });
    execSync(`git remote add origin ${remote}`, { cwd: root });
    execSync('git push -q -u origin main', { cwd: root });
    execSync(`git push -q -u origin ${branchName}`, { cwd: root });
    // Sobreescribimos la URL del remoto para simular GitHub (gh no está instalado -> degrada a manual).
    execSync('git remote set-url origin https://github.com/acme/repo.git', { cwd: root });

    try {
      const r = runClose(root);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /github/i);
      assert.match(r.stdout, /# PR:/);
      assert.match(r.stdout, /Próximo: revisión manual/);
    } finally {
      rmSync(remote, { recursive: true, force: true });
    }
  } finally { cleanup(); }
});
