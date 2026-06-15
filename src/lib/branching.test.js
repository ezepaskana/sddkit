import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readPolicy,
  validatePolicy,
  getBranchingDefaults,
  getActiveBranching,
  formatBranchName,
} from './branching.js';

// TODO: src/lib/branching.js no existe todavía (paso 5 del plan). Este archivo
// importa las funciones esperadas por el plan:
//   - readPolicy(rootPath)        -> lee .sdd/branching.md, retorna {convención, flujo, patrón, versions, active} o null
//   - validatePolicy(policy)      -> {valid: boolean, errors: string[]}
//   - getBranchingDefaults()      -> policy default (Conventional Commits + GitHub Flow + task/{numero}-{slug})
//   - getActiveBranching(rootPath)-> readPolicy(rootPath) ?? getBranchingDefaults()
// `formatBranchName(taskId, taskTitle, policy)` también la implementa el paso 5, pero
// se cubre con tests dedicados en el paso 6 — no se importa aquí.
//
// Formato asumido de `.sdd/branching.md` (a confirmar en paso 5):
// versionado con `versions: [{date, author, convención, flujo, patrón}]` + `active` (índice
// de la versión vigente). El contenido se serializa como un bloque ```json embebido en el
// markdown (sin nueva dependencia de parseo YAML — no hay js-yaml en package.json).
// readPolicy() debe devolver la versión activa "aplanada" junto con `versions` y `active`.

/** Crea un repo temporal y devuelve { root, cleanup }. */
function tmpRepo() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-branching-'));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** Escribe `.sdd/branching.md` con el contenido dado (string). */
function writeBranchingMd(root, content) {
  const dir = join(root, '.sdd');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'branching.md'), content);
}

/** Policy válida de ejemplo, en el formato versionado (versions + active). */
function validPolicyMd() {
  const policy = {
    versions: [
      {
        date: '2026-06-15',
        author: 'dev',
        convención: 'Conventional Commits',
        flujo: 'GitHub Flow',
        patrón: 'task/{numero}-{slug}',
      },
    ],
    active: 0,
  };
  return [
    '# Branching Policy',
    '',
    '```json',
    JSON.stringify(policy, null, 2),
    '```',
    '',
  ].join('\n');
}

// --- Lectura: archivo existe y es válido --------------------------------

test('readPolicy: .sdd/branching.md existe y es JSON válido → retorna objeto con convención/flujo/patrón', () => {
  const { root, cleanup } = tmpRepo();
  try {
    writeBranchingMd(root, validPolicyMd());
    const policy = readPolicy(root);
    assert.ok(policy, 'readPolicy debe retornar un objeto, no null');
    assert.equal(policy.convención, 'Conventional Commits');
    assert.equal(policy.flujo, 'GitHub Flow');
    assert.equal(policy.patrón, 'task/{numero}-{slug}');
  } finally { cleanup(); }
});

test('readPolicy: retorna también `versions` (array) y `active` (índice numérico)', () => {
  const { root, cleanup } = tmpRepo();
  try {
    writeBranchingMd(root, validPolicyMd());
    const policy = readPolicy(root);
    assert.ok(Array.isArray(policy.versions), '`versions` debe ser un array');
    assert.equal(policy.versions.length, 1);
    assert.equal(policy.active, 0);
  } finally { cleanup(); }
});

// --- Lectura: archivo NO existe -------------------------------------------

test('readPolicy: .sdd/branching.md NO existe → retorna null', () => {
  const { root, cleanup } = tmpRepo();
  try {
    const policy = readPolicy(root);
    assert.equal(policy, null);
  } finally { cleanup(); }
});

test('readPolicy: .sdd/branching.md con JSON malformado → retorna null (error controlado, no excepción)', () => {
  const { root, cleanup } = tmpRepo();
  try {
    writeBranchingMd(root, ['# Branching Policy', '', '```json', '{ not valid json', '```', ''].join('\n'));
    assert.doesNotThrow(() => readPolicy(root));
    assert.equal(readPolicy(root), null);
  } finally { cleanup(); }
});

// --- Validación de schema ---------------------------------------------------

test('validatePolicy: policy con convención + flujo + patrón → {valid: true, errors: []}', () => {
  const policy = {
    convención: 'Conventional Commits',
    flujo: 'GitHub Flow',
    patrón: 'task/{numero}-{slug}',
  };
  const result = validatePolicy(policy);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validatePolicy: falta `convención` → {valid: false, errors incluye "convención"}', () => {
  const policy = { flujo: 'GitHub Flow', patrón: 'task/{numero}-{slug}' };
  const result = validatePolicy(policy);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /convención/i.test(e)), `errors debe mencionar 'convención': ${JSON.stringify(result.errors)}`);
});

test('validatePolicy: falta `flujo` → {valid: false, errors incluye "flujo"}', () => {
  const policy = { convención: 'Conventional Commits', patrón: 'task/{numero}-{slug}' };
  const result = validatePolicy(policy);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /flujo/i.test(e)), `errors debe mencionar 'flujo': ${JSON.stringify(result.errors)}`);
});

test('validatePolicy: falta `patrón` → {valid: false, errors incluye "patrón"}', () => {
  const policy = { convención: 'Conventional Commits', flujo: 'GitHub Flow' };
  const result = validatePolicy(policy);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /patrón/i.test(e)), `errors debe mencionar 'patrón': ${JSON.stringify(result.errors)}`);
});

test('validatePolicy: null/undefined → {valid: false, errors no vacío} (sin lanzar excepción)', () => {
  assert.doesNotThrow(() => validatePolicy(null));
  const result = validatePolicy(null);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

// --- Defaults -----------------------------------------------------------

test('getBranchingDefaults: defaults correctly returns Conventional Commits + GitHub Flow + task/{numero}-{slug}', () => {
  const defaults = getBranchingDefaults();
  assert.equal(defaults.convención, 'Conventional Commits');
  assert.equal(defaults.flujo, 'GitHub Flow');
  assert.equal(defaults.patrón, 'task/{numero}-{slug}');
  assert.equal(validatePolicy(defaults).valid, true);
});

// --- Versión activa / getActiveBranching ----------------------------------

test('getActiveBranching: .sdd/branching.md existe con `active` apuntando a la versión correcta → retorna esa versión', () => {
  const { root, cleanup } = tmpRepo();
  try {
    const policy = {
      versions: [
        { date: '2026-01-01', author: 'dev', convención: 'Semantic Commit', flujo: 'Git Flow', patrón: 'feature/{slug}' },
        { date: '2026-06-15', author: 'dev', convención: 'Conventional Commits', flujo: 'GitHub Flow', patrón: 'task/{numero}-{slug}' },
      ],
      active: 1,
    };
    writeBranchingMd(root, ['# Branching Policy', '', '```json', JSON.stringify(policy, null, 2), '```', ''].join('\n'));

    const active = getActiveBranching(root);
    assert.equal(active.convención, 'Conventional Commits');
    assert.equal(active.flujo, 'GitHub Flow');
    assert.equal(active.patrón, 'task/{numero}-{slug}');
  } finally { cleanup(); }
});

test('getActiveBranching: .sdd/branching.md NO existe → retorna los defaults (no null)', () => {
  const { root, cleanup } = tmpRepo();
  try {
    const active = getActiveBranching(root);
    const defaults = getBranchingDefaults();
    assert.deepEqual(
      { convención: active.convención, flujo: active.flujo, patrón: active.patrón },
      { convención: defaults.convención, flujo: defaults.flujo, patrón: defaults.patrón },
    );
  } finally { cleanup(); }
});

// --- Fixture example (.sdd/branching.example.md) --------------------------

test('reads and parses valid branching policy example fixture', () => {
  // Read the example fixture relative to project root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const examplePath = resolve(__dirname, '../../', '.sdd', 'branching.example.md');
  const content = readFileSync(examplePath, 'utf8');

  // Extract JSON from markdown code block
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(jsonMatch, 'fixture must contain a ```json code block');

  const policy = JSON.parse(jsonMatch[1]);

  // Verify the fixture has the expected structure
  assert.ok(Array.isArray(policy.versions), 'versions must be an array');
  assert.ok(policy.versions.length > 0, 'versions array must not be empty');
  assert.ok(typeof policy.active === 'number', 'active must be a number');
  assert.ok(policy.active >= 0 && policy.active < policy.versions.length, 'active index must be valid');

  // Verify the active version has required fields
  const activeVersion = policy.versions[policy.active];
  assert.ok(activeVersion.convención, 'active version must have convención');
  assert.ok(activeVersion.flujo, 'active version must have flujo');
  assert.ok(activeVersion.patrón, 'active version must have patrón');
  assert.ok(activeVersion.date, 'active version must have date');
  assert.ok(activeVersion.author, 'active version must have author');
});

test('valid branching policy example passes schema validation', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const examplePath = resolve(__dirname, '../../', '.sdd', 'branching.example.md');
  const content = readFileSync(examplePath, 'utf8');
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  const policy = JSON.parse(jsonMatch[1]);

  // Test the active version against validatePolicy
  const activeVersion = policy.versions[policy.active];
  const result = validatePolicy(activeVersion);

  assert.equal(result.valid, true, `fixture active version must be valid. Errors: ${JSON.stringify(result.errors)}`);
  assert.deepEqual(result.errors, []);
});

// --- Branch name formatting ---------------------------------------------------

test('formatBranchName: basic branch name formatting with task number and title slug', () => {
  const policy = { patrón: 'task/{numero}-{slug}' };
  const branchName = formatBranchName('010', 'Branching Model', policy);
  assert.equal(branchName, 'task/010-branching-model');
});

test('formatBranchName: title with multiple spaces collapses to single hyphens', () => {
  const policy = { patrón: 'task/{numero}-{slug}' };
  const branchName = formatBranchName('005', 'Feature  with   spaces', policy);
  assert.equal(branchName, 'task/005-feature-with-spaces');
});

test('formatBranchName: title with special characters removes them correctly', () => {
  const policy = { patrón: 'task/{numero}-{slug}' };
  const branchName = formatBranchName('012', 'API & Database (Update)', policy);
  assert.equal(branchName, 'task/012-api-database-update');
});

test('formatBranchName: very long title gets truncated to max 40 chars total', () => {
  const policy = { patrón: 'task/{numero}-{slug}' };
  // Pattern "task/001-" is 9 chars, so slug can be max 31 chars (40 - 9)
  const longTitle = 'This is a very long task title that should be truncated properly';
  const branchName = formatBranchName('001', longTitle, policy);
  assert.ok(branchName.length <= 40, `branch name must not exceed 40 chars, got ${branchName.length}: "${branchName}"`);
  assert.equal(branchName.startsWith('task/001-'), true);
  // Slug should not end with hyphen
  assert.ok(!/task\/001-.*-$/.test(branchName), `slug should not end with trailing hyphen: "${branchName}"`);
});

test('formatBranchName: different pattern formats work correctly', () => {
  const policy = { patrón: 'feature/{numero}/{slug}' };
  const branchName = formatBranchName('042', 'User Authentication', policy);
  assert.equal(branchName, 'feature/042/user-authentication');
});

test('formatBranchName: uses default pattern if not provided in policy', () => {
  const branchName = formatBranchName('020', 'Testing Feature', null);
  assert.equal(branchName, 'task/020-testing-feature');
});
