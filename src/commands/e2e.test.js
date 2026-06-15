import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

// Test E2E (paso 24-25): flujo completo `sdd init` → `sdd task new` →
// `sdd task plan` → `sdd task execute` → `sdd task close`, sobre un repo
// temporal git-inicializado. Cubre la integración de branching (tarea 010)
// de punta a punta, tal como la usaría un proyecto real que instala sddkit.

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'sdd.js');

/** Crea un repo temporal git-inicializado (con commit inicial en `main`) y devuelve { root, cleanup }. */
function tmpGitRepo() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-e2e-'));
  execSync('git init -q -b main', { cwd: root });
  execSync('git config user.email "test@example.com"', { cwd: root });
  execSync('git config user.name "Test"', { cwd: root });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'demo-e2e', version: '1.0.0' }, null, 2));
  execSync('git add package.json', { cwd: root });
  execSync('git commit -q -m "chore: initial commit"', { cwd: root });
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** Crea un remoto bare local y lo agrega como `origin` al repo `root`. Devuelve { remote, cleanup }. */
function addBareRemote(root) {
  const remote = mkdtempSync(join(tmpdir(), 'sddkit-e2e-remote-'));
  execSync('git init -q --bare', { cwd: remote });
  execSync(`git remote add origin ${remote}`, { cwd: root });
  execSync('git push -q -u origin main', { cwd: root });
  return { remote, cleanup: () => rmSync(remote, { recursive: true, force: true }) };
}

function run(args, root) {
  return spawnSync(process.execPath, [BIN, ...args, `--dir=${root}`], { encoding: 'utf8' });
}

test('e2e flow complete: init → task new → task plan → task execute → task close', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    // 1. `sdd init` → crea `.sdd/branching.md` con la policy default.
    const rInit = run(['init', '--quiet', '--agent'], root);
    assert.equal(rInit.status, 0, rInit.stderr);
    const branchingPath = join(root, '.sdd', 'branching.md');
    assert.ok(existsSync(branchingPath), '.sdd/branching.md debería existir tras `sdd init`');
    assert.match(rInit.stdout, /branching\.md creado/);

    // 2. `sdd task new 001` → crea requirement.md + spec.md + plan.md
    const rNew = run(['task', 'new', 'Test task for e2e flow'], root);
    assert.equal(rNew.status, 0, rNew.stderr);
    assert.match(rNew.stdout, /Tarea 001 creada/);
    const taskDir = join(root, '.sdd', 'tasks', '001-test-task-for-e2e-flow');
    assert.ok(existsSync(join(taskDir, 'plan.md')), 'plan.md debería existir tras `sdd task new`');

    // 3. `sdd task plan 001` → plan con sección "Rama de trabajo" + Paso 1 (git checkout -b)
    const rPlan = run(['task', 'plan', '001', '--no-open'], root);
    assert.equal(rPlan.status, 0, rPlan.stderr);
    assert.match(rPlan.stdout, /plan with branching/);
    const planContent = readFileSync(join(taskDir, 'plan.md'), 'utf8');
    assert.match(planContent, /## Rama de trabajo/);
    assert.match(planContent, /\*\*Rama:\*\* `task\/001-test-task-for-e2e-flow`/);
    assert.match(planContent, /cmd: git checkout -b task\/001-test-task-for-e2e-flow/);

    // 4. `sdd task execute 001` → crea (y valida) la rama de trabajo (Paso 1)
    const rExecute = run(['task', 'execute', '001'], root);
    assert.equal(rExecute.status, 0, rExecute.stderr);
    assert.match(rExecute.stdout, /Paso 1 OK/);
    const currentBranch = execSync('git branch --show-current', { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(currentBranch, 'task/001-test-task-for-e2e-flow');

    // Commit + push de la rama de trabajo, para que `sdd task close` pueda
    // detectar que está pusheada y generar el reporte de cierre / PR.
    writeFileSync(join(root, 'feature.txt'), 'feature\n');
    execSync('git add feature.txt', { cwd: root });
    execSync('git -c core.hooksPath=/dev/null commit -q -m "feat: add feature for e2e task"', { cwd: root });
    const { cleanup: cleanupRemote } = addBareRemote(root);
    try {
      execSync(`git push -q -u origin ${currentBranch}`, { cwd: root });

      // 5. `sdd task close 001` → rama pusheada + PR (o aviso de PR manual)
      const rClose = run(['task', 'close', '001'], root);
      assert.equal(rClose.status, 0, rClose.stderr);
      assert.match(rClose.stdout, /Reporte de cierre — tarea 001/);
      assert.match(rClose.stdout, new RegExp(`# Rama: ${currentBranch.replace(/\//g, '\\/')} → main`));
      assert.match(rClose.stdout, /# PR:/);
      assert.match(rClose.stdout, /Próximo: revisión manual/);
    } finally {
      cleanupRemote();
    }
  } finally { cleanup(); }
});

test('policy not overwritten: si `.sdd/branching.md` ya existe, `sdd init` no lo sobrescribe', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    // Política custom pre-existente (distinta de los defaults de sddkit).
    const customPolicy = {
      versions: [
        { date: '2025-01-01', author: 'custom-author', convención: 'Gitmoji', flujo: 'Git Flow', patrón: 'feature/{numero}-{slug}' },
      ],
      active: 0,
    };
    const customContent = [
      '# Branching Policy',
      '',
      '```json',
      JSON.stringify(customPolicy, null, 2),
      '```',
      '',
    ].join('\n');
    mkdirSync(join(root, '.sdd'), { recursive: true });
    writeFileSync(join(root, '.sdd', 'branching.md'), customContent);

    const rInit = run(['init', '--quiet', '--agent'], root);
    assert.equal(rInit.status, 0, rInit.stderr);

    // No debe haberse sobrescrito: el contenido sigue siendo el custom.
    const after = readFileSync(join(root, '.sdd', 'branching.md'), 'utf8');
    assert.equal(after, customContent);
    assert.match(after, /Gitmoji/);
    assert.match(after, /custom-author/);

    // `sdd init` reporta que la policy ya estaba al día (no la recrea).
    assert.match(rInit.stdout, /branching\.md al día/);
  } finally { cleanup(); }
});
