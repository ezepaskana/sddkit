/**
 * execute.js — Integración de branching en `sdd task execute`
 *
 * Gate de pre-ejecución de una tarea SDD: antes de que el orquestador lance
 * subagentes para los pasos del plan, valida que el repo tiene `.git`,
 * ejecuta el Paso 1 (`git checkout -b <rama>`, auto-generado por `sdd task
 * plan` vía branching) y confirma que la rama activa coincide con la
 * esperada. Si el Paso 1 falla (o la rama no coincide), la ejecución se
 * detiene ANTES del Paso 2: es bloqueante.
 */

import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { read, readJSON, existsSync } from '../lib/fsutil.js';
import { validateBranchBeforeExecute, getCurrentBranch } from '../lib/branching.js';

const tasksDir = (root) => join(root, '.sdd', 'tasks');
const loadIndex = (root) => readJSON(join(tasksDir(root), 'index.json')) || { nextId: 1, tasks: [] };

/**
 * Verifica que `${rootPath}/.git` existe.
 *
 * Retorna `{ok: true}` o `{ok: false, message}` (nunca lanza excepción). El
 * mensaje incluye la instrucción `git init` para que el agente sepa cómo
 * resolverlo.
 */
export function checkGitInitialized(rootPath) {
  if (existsSync(join(rootPath, '.git'))) return { ok: true };
  return {
    ok: false,
    message: 'No se encontró `.git` en este repo. `sdd task execute` requiere un repo git: corré `git init` antes de continuar.',
  };
}

/** Extrae el bloque completo del Paso 1 de plan.md (línea checkbox + sub-ítems). */
function step1Block(root, t) {
  const plan = (read(join(tasksDir(root), t.dir, 'plan.md')) || '').replace(/```[\s\S]*?```/g, '');
  const lines = plan.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^- \[[ x]\] \*\*1\. /.test(lines[i])) continue;
    const block = [lines[i]];
    for (let j = i + 1; j < lines.length && /^\s+(-|\d+\.) /.test(lines[j]); j++) block.push(lines[j]);
    return block.join('\n');
  }
  return null;
}

/**
 * Lee `.sdd/tasks/index.json` + el plan.md de la tarea `taskId` y extrae el
 * comando `git checkout -b <rama>` del Paso 1 (auto-generado por `sdd task
 * plan` vía branching).
 *
 * Retorna `{branchName, command}` o `null` si la tarea, el plan, o el Paso 1
 * con `cmd: git checkout -b ...` no existen.
 */
export function getStep1Command(rootPath, taskId) {
  const idx = loadIndex(rootPath);
  const t = idx.tasks.find((x) => x.id === taskId);
  if (!t) return null;

  const block = step1Block(rootPath, t);
  if (!block) return null;

  const vm = block.match(/Verificación:\*{0,2}\s*(.+)$/m);
  if (!vm) return null;
  let v = vm[1].trim();
  const codeSpan = v.match(/^`([^`]*)`/);
  if (codeSpan) v = codeSpan[1].trim();
  if (!v.startsWith('cmd:')) return null;

  const command = v.slice(4).trim();
  const m = command.match(/^git checkout -b (\S+)/);
  if (!m) return null;

  return { branchName: m[1], command };
}

/**
 * Ejecuta `command` (el `git checkout -b <rama>` del Paso 1) en `rootPath`.
 *
 * Retorna `{ok: true}` o `{ok: false, error}` (nunca lanza excepción).
 */
function runStep1Command(rootPath, command) {
  try {
    execSync(command, { cwd: rootPath, stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true };
  } catch (err) {
    const stderr = err && err.stderr ? String(err.stderr).trim() : '';
    return { ok: false, error: stderr || (err && err.message) || 'comando falló' };
  }
}

/**
 * Gate de pre-ejecución de `sdd task execute <taskId>`:
 *
 * 1. Verifica `.git` existe (`checkGitInitialized`) — si no, `{ok: false,
 *    errors: [...]}` con instrucción de `git init`. NO se ejecuta nada más.
 * 2. Lee el Paso 1 del plan (`getStep1Command`) — si no se encuentra,
 *    `{ok: false, errors: [...]}`.
 * 3. Ejecuta el Paso 1 (`git checkout -b <rama>`). Si falla (ej: la rama ya
 *    existe), `{ok: false, step1: {ok: false, error}, errors: [...]}` —
 *    bloqueante: los pasos 2+ NO corren.
 * 4. Valida `git branch --show-current` == rama esperada
 *    (`validateBranchBeforeExecute`). Si no coincide, `{ok: false, step1,
 *    branch, errors: [...]}` — bloqueante.
 * 5. Si todo OK, `{ok: true, step1: {ok: true}, branch: {valid: true, ...},
 *    warnings: []}` — el orquestador puede proceder con los pasos 2+.
 *
 * Nunca lanza excepción.
 */
export function runExecuteGate(rootPath, taskId) {
  const git = checkGitInitialized(rootPath);
  if (!git.ok) {
    return { ok: false, errors: [git.message] };
  }

  const step1Cmd = getStep1Command(rootPath, taskId);
  if (!step1Cmd) {
    return { ok: false, errors: [`No se encontró el Paso 1 (\`cmd: git checkout -b <rama>\`) en el plan de la tarea ${taskId}. Corré \`sdd task plan ${taskId}\` primero.`] };
  }

  const { branchName, command } = step1Cmd;
  const step1 = runStep1Command(rootPath, command);

  if (!step1.ok) {
    return {
      ok: false,
      step1,
      errors: [
        `Paso 1 (\`${command}\`) falló: ${step1.error}`,
        `Rama "${branchName}" ya existe o el comando no pudo correr. Opciones: (a) usar la rama existente (\`git checkout ${branchName}\`), (b) borrarla y recrear (\`git branch -D ${branchName}\` y reintentar), (c) abortar y revisar el plan.`,
      ],
    };
  }

  const branch = validateBranchBeforeExecute(rootPath, branchName);
  if (!branch.valid) {
    return {
      ok: false,
      step1,
      branch,
      errors: [`Paso 1 ejecutó OK pero la rama actual ("${branch.current}") no coincide con la esperada ("${branch.expected}"). Ejecución detenida — revisá el estado del repo antes de continuar.`],
    };
  }

  return { ok: true, step1, branch, warnings: [] };
}

/**
 * Valida que la rama actual sigue siendo la esperada, para los Pasos 2+ de
 * `sdd task execute`. A diferencia de `runExecuteGate` (bloqueante para el
 * Paso 1), esto es informativo: SI la rama desvió, retorna un warning pero
 * `ok: true` — el orquestador puede avisar y continuar.
 */
export function checkBranchForStep(rootPath, branchName) {
  const branch = validateBranchBeforeExecute(rootPath, branchName);
  if (branch.valid) return { ok: true, branch, warnings: [] };
  return {
    ok: true,
    branch,
    warnings: [`⚠️ Rama actual ("${branch.current}") no coincide con la esperada ("${branch.expected}"). Verificá que estás trabajando en la rama de la tarea.`],
  };
}

/**
 * CLI entry de `sdd task execute <id>`: corre `runExecuteGate` e imprime el
 * resultado en consola. Retorna el resultado del gate (no hace `process.exit`
 * — el caller decide).
 */
export function execute(root, taskId) {
  const result = runExecuteGate(root, taskId);

  if (!result.ok) {
    for (const e of result.errors) console.error('✖ ' + e);
    return result;
  }

  console.log(`✓ Paso 1 OK — rama activa: ${result.branch.current}`);
  console.log('  Listo para ejecutar los pasos 2+ (vía sdd task brief / subagentes).');
  return result;
}

export { getCurrentBranch };
