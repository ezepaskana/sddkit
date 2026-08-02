import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installPreCommit, installPostCommit } from './hooks.js';

/** Crea un repo temporal con .git/ y devuelve { root, cleanup }. */
function gitFixture() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-hooks-'));
  mkdirSync(join(root, '.git', 'hooks'), { recursive: true });
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** Crea un repo temporal SIN .git y devuelve { root, cleanup }. */
function noGitFixture() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-hooks-nogit-'));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function isExecutable(p) {
  const mode = statSync(p).mode;
  return (mode & 0o111) !== 0;
}

const cases = [
  {
    name: 'pre-commit',
    install: installPreCommit,
    hookFile: 'pre-commit',
    expectedLine: 'sdd validate --hook || exit 1',
    matchToken: 'sdd validate',
    installedMsgPart: 'pre-commit hook instalado',
    alreadyMsgPart: 'pre-commit hook ya estaba instalado',
    appendedMsgPart: 'pre-commit hook existente detectado',
  },
  {
    name: 'post-commit',
    install: installPostCommit,
    hookFile: 'post-commit',
    expectedLine: 'sdd publish --hook || true',
    matchToken: 'sdd publish',
    installedMsgPart: 'post-commit hook instalado',
    alreadyMsgPart: 'post-commit hook ya estaba instalado',
    appendedMsgPart: 'post-commit hook existente detectado',
  },
];

/** installPreCommit devuelve { msg, changed }; installPostCommit devuelve un string. Normaliza a string. */
function msgOf(result) {
  return typeof result === 'string' ? result : result.msg;
}

for (const c of cases) {
  test(`install${c.name === 'pre-commit' ? 'PreCommit' : 'PostCommit'}: sin hook existente crea el archivo con la línea esperada y permisos ejecutables`, () => {
    const { root, cleanup } = gitFixture();
    try {
      const msg = msgOf(c.install(root));
      assert.match(msg, new RegExp(c.installedMsgPart));
      const p = join(root, '.git', 'hooks', c.hookFile);
      assert.ok(existsSync(p));
      const content = readFileSync(p, 'utf8');
      assert.ok(content.includes(c.expectedLine), `expected content to include "${c.expectedLine}"`);
      assert.ok(content.startsWith('#!/bin/sh'));
      assert.ok(isExecutable(p), 'hook file should be executable');
    } finally { cleanup(); }
  });

  test(`install${c.name === 'pre-commit' ? 'PreCommit' : 'PostCommit'}: hook existente sin la línea de sddkit la agrega al final preservando lo previo`, () => {
    const { root, cleanup } = gitFixture();
    try {
      const p = join(root, '.git', 'hooks', c.hookFile);
      const previous = '#!/bin/sh\necho "custom hook"\n';
      writeFileSync(p, previous);
      const msg = msgOf(c.install(root));
      assert.match(msg, new RegExp(c.appendedMsgPart));
      const content = readFileSync(p, 'utf8');
      assert.ok(content.startsWith(previous.trimEnd()), 'previous content should be preserved');
      assert.ok(content.includes(c.expectedLine));
    } finally { cleanup(); }
  });

  test(`install${c.name === 'pre-commit' ? 'PreCommit' : 'PostCommit'}: hook existente con la línea de sddkit es idempotente`, () => {
    const { root, cleanup } = gitFixture();
    try {
      const p = join(root, '.git', 'hooks', c.hookFile);
      const firstMsg = msgOf(c.install(root));
      assert.match(firstMsg, new RegExp(c.installedMsgPart));
      const contentAfterFirst = readFileSync(p, 'utf8');

      const secondMsg = msgOf(c.install(root));
      assert.match(secondMsg, new RegExp(c.alreadyMsgPart));
      const contentAfterSecond = readFileSync(p, 'utf8');

      assert.equal(contentAfterSecond, contentAfterFirst, 'content should not change on second run');
      // No duplicated lines
      const occurrences = contentAfterSecond.split(c.matchToken).length - 1;
      assert.equal(occurrences, 1, 'sddkit line should not be duplicated');
    } finally { cleanup(); }
  });

  test(`install${c.name === 'pre-commit' ? 'PreCommit' : 'PostCommit'}: repo sin .git devuelve mensaje informativo y no crea .git/hooks`, () => {
    const { root, cleanup } = noGitFixture();
    try {
      const msg = msgOf(c.install(root));
      assert.match(msg, /sin repo git todavía/);
      assert.ok(!existsSync(join(root, '.git')));
    } finally { cleanup(); }
  });
}

// BR-051: installPreCommit también instala `sdd docs --hook || true` en el mismo pre-commit,
// además de `sdd validate --hook || exit 1` (que no cambia su comportamiento).
const VALIDATE_LINE = 'sdd validate --hook || exit 1';
const DOCS_LINE = 'sdd docs --hook || true';

test('installPreCommit: sin hook previo, crea el archivo con AMBAS líneas (validate primero, docs después)', () => {
  const { root, cleanup } = gitFixture();
  try {
    const { msg, changed } = installPreCommit(root);
    assert.match(msg, /pre-commit hook instalado/);
    assert.match(msg, /sdd docs/);
    assert.equal(changed, true);
    const p = join(root, '.git', 'hooks', 'pre-commit');
    const content = readFileSync(p, 'utf8');
    assert.ok(content.startsWith('#!/bin/sh'));
    const validateIdx = content.indexOf(VALIDATE_LINE);
    const docsIdx = content.indexOf(DOCS_LINE);
    assert.ok(validateIdx !== -1, 'validate line should be present');
    assert.ok(docsIdx !== -1, 'docs line should be present');
    assert.ok(validateIdx < docsIdx, 'validate line should come before docs line');
  } finally { cleanup(); }
});

test('installPreCommit: hook viejo (solo sdd validate, sin sdd docs) agrega SOLO la línea de docs al final, sin duplicar validate', () => {
  const { root, cleanup } = gitFixture();
  try {
    const p = join(root, '.git', 'hooks', 'pre-commit');
    const legacy = `#!/bin/sh\n# Instalado por sddkit. Para desactivarlo: .sdd/config.json -> "hooks": { "preCommit": false }\n${VALIDATE_LINE}\n`;
    writeFileSync(p, legacy);

    const { msg, changed } = installPreCommit(root);
    assert.match(msg, /sdd docs/);
    assert.equal(changed, true);

    const content = readFileSync(p, 'utf8');
    assert.ok(content.startsWith(legacy.trimEnd()), 'previous content (including validate line) should be preserved untouched');
    const validateOccurrences = content.split(VALIDATE_LINE).length - 1;
    assert.equal(validateOccurrences, 1, 'validate line should not be duplicated');
    assert.ok(content.includes(DOCS_LINE), 'docs line should have been appended');
  } finally { cleanup(); }
});

test('installPreCommit: hook con AMBAS líneas ya instaladas es idempotente (no duplica nada)', () => {
  const { root, cleanup } = gitFixture();
  try {
    const p = join(root, '.git', 'hooks', 'pre-commit');
    installPreCommit(root);
    const contentAfterFirst = readFileSync(p, 'utf8');

    const { msg: secondMsg, changed: secondChanged } = installPreCommit(root);
    assert.match(secondMsg, /pre-commit hook ya estaba instalado/);
    assert.match(secondMsg, /sdd docs.*ya estaba instalado/);
    assert.equal(secondChanged, false);

    const contentAfterSecond = readFileSync(p, 'utf8');
    assert.equal(contentAfterSecond, contentAfterFirst, 'content should not change on second run');
    assert.equal(contentAfterSecond.split(VALIDATE_LINE).length - 1, 1, 'validate line should not be duplicated');
    assert.equal(contentAfterSecond.split(DOCS_LINE).length - 1, 1, 'docs line should not be duplicated');
  } finally { cleanup(); }
});

test('installPreCommit: hook de otra herramienta (contenido ajeno) agrega AMBAS líneas al final, preservando lo ajeno intacto', () => {
  const { root, cleanup } = gitFixture();
  try {
    const p = join(root, '.git', 'hooks', 'pre-commit');
    const foreign = '#!/bin/sh\necho "some other tool hook"\nexit 0\n';
    writeFileSync(p, foreign);

    const { msg, changed } = installPreCommit(root);
    assert.match(msg, /sdd validate/);
    assert.match(msg, /sdd docs/);
    assert.equal(changed, true);

    const content = readFileSync(p, 'utf8');
    assert.ok(content.startsWith(foreign.trimEnd()), 'foreign content should be preserved untouched');
    assert.ok(content.includes(VALIDATE_LINE), 'validate line should be present');
    assert.ok(content.includes(DOCS_LINE), 'docs line should be present');
    const validateIdx = content.indexOf(VALIDATE_LINE);
    const docsIdx = content.indexOf(DOCS_LINE);
    assert.ok(validateIdx < docsIdx, 'validate line should come before docs line');
  } finally { cleanup(); }
});
