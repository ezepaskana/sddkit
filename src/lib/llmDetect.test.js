import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { diffFilesSince } from './llmDetect.js';

// Tarea 010: tests de `diffFilesSince` (scoping de archivos a analizar).
// Los tests de `validateDetectionResult`/`mergeCapabilities` se retiraron en el
// paso 25: eran específicos del schema JSON `{endpoints, consumptions}` del
// Pivot 1 (superseded), que el nuevo formato de secciones Markdown no usa.

/** Crea un repo git temporal y devuelve { root, cleanup }. */
function tmpGitRepo() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-llmdetect-'));
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
// diffFilesSince
// ---------------------------------------------------------------------------

test('diffFilesSince: commit real anterior a cambios → devuelve exactamente los archivos tocados desde ahí', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeAndCommit(root, 'a.js', 'a v1\n', 'chore: add a.js');
    writeAndCommit(root, 'b.js', 'b v1\n', 'chore: add b.js');
    const sinceCommit = headOf(root);

    writeAndCommit(root, 'a.js', 'a v2\n', 'feat: touch a.js');
    writeFileSync(join(root, 'c.js'), 'c v1\n');
    execSync('git add c.js', { cwd: root });
    execSync('git commit -q -m "feat: add c.js"', { cwd: root });

    const files = diffFilesSince(root, sinceCommit);
    assert.deepEqual([...files].sort(), ['a.js', 'c.js']);
  } finally { cleanup(); }
});

test('diffFilesSince: sinceCommit === null → devuelve TODOS los archivos trackeados del repo', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeAndCommit(root, 'a.js', 'a v1\n', 'chore: add a.js');
    writeAndCommit(root, 'b.js', 'b v1\n', 'chore: add b.js');

    const files = diffFilesSince(root, null);
    assert.deepEqual([...files].sort(), ['a.js', 'b.js']);
  } finally { cleanup(); }
});

test('diffFilesSince: sin ningún archivo modificado desde sinceCommit (mismo commit) → array vacío', () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeAndCommit(root, 'a.js', 'a v1\n', 'chore: add a.js');
    const sinceCommit = headOf(root);

    const files = diffFilesSince(root, sinceCommit);
    assert.deepEqual(files, []);
  } finally { cleanup(); }
});
