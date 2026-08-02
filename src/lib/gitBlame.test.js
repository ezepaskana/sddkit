import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { blameLine } from './gitBlame.js';

// Tarea 010, paso 26: tests de `blameLine` — corre `git blame -L <n>,<n>
// --porcelain <file>` sobre un repo git REAL (no se mockea execSync) y parsea
// la salida a `{author, date, commitHash}`. El módulo `gitBlame.js` todavía no
// existe — estos tests deben quedar en rojo (módulo no encontrado).

/** Crea un repo git temporal (con user.email/user.name seteados) y devuelve { root, cleanup }. */
function tmpGitRepo() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-gitblame-'));
  execSync('git init -q -b main', { cwd: root });
  execSync('git config user.email "test@example.com"', { cwd: root });
  execSync('git config user.name "Test"', { cwd: root });
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function writeAndCommit(root, relPath, content, message) {
  writeFileSync(join(root, relPath), content);
  execSync(`git add ${relPath}`, { cwd: root });
  execSync(`git commit -q -m "${message}"`, { cwd: root });
}

function headOf(root) {
  return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
}

// ---------------------------------------------------------------------------
// blameLine
// ---------------------------------------------------------------------------

test('blameLine: archivo con 1 solo commit → cualquier línea devuelve autor/hash de ese commit', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeAndCommit(root, 'file.txt', 'line uno\nline dos\n', 'chore: add file');
    const commitHash = headOf(root);

    const resultLine1 = blameLine(root, 'file.txt', 1);
    const resultLine2 = blameLine(root, 'file.txt', 2);

    assert.equal(resultLine1.commitHash, commitHash);
    assert.equal(resultLine2.commitHash, commitHash);
    assert.equal(resultLine1.author, 'Test');
    assert.equal(resultLine2.author, 'Test');
    assert.ok(resultLine1.date, 'date debería estar presente');
    assert.ok(resultLine2.date, 'date debería estar presente');
  } finally { cleanup(); }
});

test('blameLine: archivo con 2 commits (el segundo solo agrega una línea nueva) → blame por línea, no por archivo entero', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeAndCommit(root, 'file.txt', 'line uno\n', 'chore: add file');
    const commitViejo = headOf(root);

    writeAndCommit(root, 'file.txt', 'line uno\nline dos\n', 'feat: add line dos');
    const commitNuevo = headOf(root);

    assert.notEqual(commitViejo, commitNuevo);

    const resultLineVieja = blameLine(root, 'file.txt', 1);
    const resultLineNueva = blameLine(root, 'file.txt', 2);

    assert.equal(resultLineVieja.commitHash, commitViejo);
    assert.equal(resultLineNueva.commitHash, commitNuevo);
    assert.notEqual(resultLineVieja.commitHash, resultLineNueva.commitHash);
  } finally { cleanup(); }
});
