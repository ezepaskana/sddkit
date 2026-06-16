/**
 * plan-generator.js — Integración de la política de branching en plan.md
 *
 * Genera la sección "Rama de trabajo" (nombre de rama, origen, destino,
 * convención de commits) y el Paso 1 auto-generado (`git checkout -b
 * <rama>`), y los inserta en el plan de una tarea, renumerando los pasos
 * originales a partir del Paso 2.
 */

import { formatBranchName, getBranchingDefaults } from './branching.js';

const STEP_RE = /^- \[( |x)\] \*\*(\d+)\. (.*)$/;

/**
 * Deriva la rama de origen/destino según el `flujo` de la policy.
 * - "Git Flow" (o variantes que lo mencionen) → `develop`
 * - Cualquier otro (GitHub Flow, Trunk Based, etc.) → `main`
 */
export function originBranch(policy) {
  const flujo = (policy?.flujo ?? '').toLowerCase();
  return flujo.includes('git flow') ? 'develop' : 'main';
}

/**
 * Genera la sección Markdown "## Rama de trabajo" con: nombre de rama
 * (calculado vía `formatBranchName`), origen, destino y convención de
 * commits. Si `policy` es `null`/`undefined`, usa los defaults de sddkit y
 * agrega el aviso `⚠️ Política de branching no definida. Usamos defaults.`
 *
 * `opts.usingDefaults` (boolean, opcional) fuerza el aviso de defaults,
 * independientemente de si `policy` fue provisto.
 */
export function generateWorkBranchSection(taskId, taskTitle, policy, opts = {}) {
  const usingDefaults = opts.usingDefaults ?? !policy;
  const activePolicy = policy ?? getBranchingDefaults();
  const branchName = formatBranchName(taskId, taskTitle, activePolicy);
  const origin = originBranch(activePolicy);
  const destino = origin;

  const lines = [
    '## Rama de trabajo',
    '',
  ];

  if (usingDefaults) {
    lines.push('⚠️ Política de branching no definida. Usamos defaults. Correr `sdd branching-policy --define` para personalizarlo.', '');
  }

  lines.push(
    `- **Rama:** \`${branchName}\``,
    `- **Origen:** \`${origin}\``,
    `- **Destino:** \`${destino}\``,
    `- **Convención de commits:** ${activePolicy.convención}`,
    `- **Flujo:** ${activePolicy.flujo}`,
    `- **Patrón:** \`${activePolicy.patrón}\``,
    '',
  );

  return lines.join('\n');
}

/**
 * Genera el bloque Markdown del Paso 1 auto-generado: crear la rama de
 * trabajo con `git checkout -b <branchName>`.
 */
export function generateCheckoutStep(branchName) {
  return [
    `- [ ] **1. Crear rama de trabajo** _(rapido)_`,
    '  - **Hace:** crear y cambiar a la rama de trabajo de la tarea',
    '  - **Archivos:** —',
    '  - **Depende de:** —',
    `  - **Verificación:** \`cmd: git checkout -b ${branchName}\``,
    '',
  ].join('\n');
}

/**
 * Renumera los pasos de un plan (líneas `- [ ] **N. Título**`), corriendo
 * cada número en `offset` (ej: offset=1 → paso 1 pasa a ser paso 2, etc.).
 * No modifica el resto del contenido.
 */
export function renumberSteps(planMarkdown, offset) {
  return planMarkdown
    .split('\n')
    .map((line) => {
      const m = line.match(STEP_RE);
      if (!m) return line;
      const [, checkbox, num, rest] = m;
      const newNum = parseInt(num, 10) + offset;
      return `- [${checkbox}] **${newNum}. ${rest}`;
    })
    .join('\n');
}

/**
 * Aplica la integración de branching a un plan.md ya generado:
 * - Inserta la sección "## Rama de trabajo" antes de "## Pasos" (o antes del
 *   primer paso, si no hay encabezado "## Pasos").
 * - Renumera los pasos originales (Paso 1 → Paso 2, etc.).
 * - Inserta el Paso 1 auto-generado (`git checkout -b <rama>`).
 *
 * `policy`: policy activa de branching, o `null` para usar defaults (en
 * cuyo caso se incluye el aviso de defaults en la sección generada).
 *
 * Retorna el plan completo (string) con la integración aplicada.
 */
export function applyBranchingToPlan(planMarkdown, taskId, taskTitle, policy, opts = {}) {
  const activePolicy = policy ?? getBranchingDefaults();
  const branchName = formatBranchName(taskId, taskTitle, activePolicy);
  const workBranchSection = generateWorkBranchSection(taskId, taskTitle, policy, opts);
  const checkoutStep = generateCheckoutStep(branchName);

  // Renumerar los pasos existentes (Paso 1 → Paso 2, etc.)
  const renumbered = renumberSteps(planMarkdown, 1);

  const lines = renumbered.split('\n');
  const pasosIdx = lines.findIndex((l) => /^## Pasos\s*$/.test(l));

  if (pasosIdx === -1) {
    // No hay encabezado "## Pasos": insertar la sección + Paso 1 al final.
    return [renumbered.trimEnd(), '', workBranchSection.trimEnd(), '', checkoutStep.trimEnd(), ''].join('\n');
  }

  // Insertar la sección "Rama de trabajo" antes de "## Pasos", y el Paso 1
  // auto-generado justo después de "## Pasos" (antes de los pasos originales).
  const before = lines.slice(0, pasosIdx);
  const after = lines.slice(pasosIdx + 1);

  const result = [
    ...before,
    workBranchSection.trimEnd(),
    '',
    '## Pasos',
    '',
    checkoutStep.trimEnd(),
    ...after,
  ];

  return result.join('\n');
}
