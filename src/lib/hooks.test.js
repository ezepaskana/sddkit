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

for (const c of cases) {
  test(`install${c.name === 'pre-commit' ? 'PreCommit' : 'PostCommit'}: sin hook existente crea el archivo con la línea esperada y permisos ejecutables`, () => {
    const { root, cleanup } = gitFixture();
    try {
      const msg = c.install(root);
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
      const msg = c.install(root);
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
      const firstMsg = c.install(root);
      assert.match(firstMsg, new RegExp(c.installedMsgPart));
      const contentAfterFirst = readFileSync(p, 'utf8');

      const secondMsg = c.install(root);
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
      const msg = c.install(root);
      assert.match(msg, /sin repo git todavía/);
      assert.ok(!existsSync(join(root, '.git')));
    } finally { cleanup(); }
  });
}
