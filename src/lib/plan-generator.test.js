import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateWorkBranchSection,
  generateCheckoutStep,
  renumberSteps,
  applyBranchingToPlan,
} from './plan-generator.js';
import { getBranchingDefaults, formatBranchName } from './branching.js';

// --- Paso 11: sección "Rama de trabajo" ------------------------------------

test('rama de trabajo section: incluye nombre de rama, origen, destino y patrón de commits', () => {
  const policy = {
    convención: 'Conventional Commits',
    flujo: 'GitHub Flow',
    patrón: 'task/{numero}-{slug}',
  };
  const section = generateWorkBranchSection('011', 'Integracion plan', policy);

  assert.match(section, /^## Rama de trabajo/m);
  assert.match(section, /\*\*Rama:\*\*.*task\/011-integracion-plan/);
  assert.match(section, /\*\*Origen:\*\*.*main/);
  assert.match(section, /\*\*Destino:\*\*.*main/);
  assert.match(section, /\*\*Convención de commits:\*\*.*Conventional Commits/);
  assert.match(section, /\*\*Patrón:\*\*.*task\/\{numero\}-\{slug\}/);
});

test('rama de trabajo section: con flujo Git Flow, origen y destino son develop', () => {
  const policy = {
    convención: 'Conventional Commits',
    flujo: 'Git Flow',
    patrón: 'feature/{slug}',
  };
  const section = generateWorkBranchSection('012', 'Feature X', policy);

  assert.match(section, /\*\*Origen:\*\*.*develop/);
  assert.match(section, /\*\*Destino:\*\*.*develop/);
});

test('rama de trabajo section: sin policy (null) usa defaults y agrega aviso de defaults', () => {
  const section = generateWorkBranchSection('013', 'Tarea sin policy', null);
  const defaults = getBranchingDefaults();

  assert.match(section, /⚠️ Política de branching no definida\. Usamos defaults\./);
  assert.match(section, new RegExp(`\\*\\*Convención de commits:\\*\\*.*${defaults.convención}`));
  assert.match(section, new RegExp(`\\*\\*Patrón:\\*\\*.*\\\`${defaults.patrón.replace(/[{}]/g, '\\$&')}\\\``));
});

// --- Paso 12: Paso 1 = crear rama (git checkout -b) -------------------------

test('step 1 checkout: generateCheckoutStep genera bloque con cmd: git checkout -b <rama>', () => {
  const branchName = 'task/011-integracion-plan';
  const step = generateCheckoutStep(branchName);

  assert.match(step, /^- \[ \] \*\*1\./);
  assert.match(step, new RegExp(`cmd: git checkout -b ${branchName.replace(/\//g, '\\/')}`));
});

test('step 1 checkout: applyBranchingToPlan inserta el Paso 1 = git checkout -b <rama> y renumera los pasos originales', () => {
  const originalPlan = [
    '# Plan — tarea 011: Integracion plan',
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
  ].join('\n');

  const policy = {
    convención: 'Conventional Commits',
    flujo: 'GitHub Flow',
    patrón: 'task/{numero}-{slug}',
  };
  const branchName = formatBranchName('011', 'Integracion plan', policy);

  const result = applyBranchingToPlan(originalPlan, '011', 'Integracion plan', policy);

  // El Paso 1 generado es siempre `git checkout -b <rama>`.
  assert.match(result, new RegExp(`- \\[ \\] \\*\\*1\\. .*\\n(.*\\n)*.*cmd: git checkout -b ${branchName.replace(/\//g, '\\/')}`));

  // Los pasos originales 1 y 2 ahora son 2 y 3.
  assert.match(result, /- \[ \] \*\*2\. Hacer algo\*\*/);
  assert.match(result, /- \[ \] \*\*3\. Hacer otra cosa\*\*/);

  // La sección "Rama de trabajo" está presente, antes de "## Pasos".
  const ramaIdx = result.indexOf('## Rama de trabajo');
  const pasosIdx = result.indexOf('## Pasos');
  assert.ok(ramaIdx !== -1, 'debe incluir la sección "## Rama de trabajo"');
  assert.ok(ramaIdx < pasosIdx, 'la sección "Rama de trabajo" debe ir antes de "## Pasos"');
});

// --- renumberSteps ------------------------------------------------------------

test('renumberSteps: corre los números de paso por el offset dado, preservando el resto de la línea', () => {
  const plan = [
    '- [ ] **1. Primero** _(rapido)_',
    '- [x] **2. Segundo** _(medio)_',
  ].join('\n');

  const result = renumberSteps(plan, 1);

  assert.match(result, /^- \[ \] \*\*2\. Primero\*\* _\(rapido\)_$/m);
  assert.match(result, /^- \[x\] \*\*3\. Segundo\*\* _\(medio\)_$/m);
});
