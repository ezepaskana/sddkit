import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openCommand, resolveOpener, isEmbeddedIdeTerminal } from './open.js';

function tmpRoot() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-open-'));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('openCommand con opener configurado usa ese comando', () => {
  assert.equal(openCommand('/tmp/doc.md', 'code'), 'code "/tmp/doc.md"');
});

test('openCommand con opener con argumentos los preserva', () => {
  assert.equal(openCommand('/tmp/doc.md', 'open -a TextEdit'), 'open -a TextEdit "/tmp/doc.md"');
});

test('openCommand sin opener cae al default del SO', () => {
  const cmd = openCommand('/tmp/doc.md', null);
  if (process.platform === 'darwin') assert.equal(cmd, 'open "/tmp/doc.md"');
  else if (process.platform === 'win32') assert.equal(cmd, 'start "" "/tmp/doc.md"');
  else assert.equal(cmd, 'xdg-open "/tmp/doc.md"');
});

test('resolveOpener lee ui.opener de .sdd/config.json', () => {
  const { root, cleanup } = tmpRoot();
  try {
    mkdirSync(join(root, '.sdd'), { recursive: true });
    writeFileSync(join(root, '.sdd', 'config.json'), JSON.stringify({ ui: { opener: 'subl' } }));
    assert.equal(resolveOpener(root), 'subl');
  } finally { cleanup(); }
});

test('resolveOpener sin config o sin ui.opener devuelve null', () => {
  const { root, cleanup } = tmpRoot();
  try {
    assert.equal(resolveOpener(root), null);
    mkdirSync(join(root, '.sdd'), { recursive: true });
    writeFileSync(join(root, '.sdd', 'config.json'), JSON.stringify({ ui: { openFiles: true } }));
    assert.equal(resolveOpener(root), null);
  } finally { cleanup(); }
});

test('isEmbeddedIdeTerminal true para terminal embebida de JetBrains', () => {
  assert.equal(isEmbeddedIdeTerminal({ TERMINAL_EMULATOR: 'JetBrains-JediTerm' }), true);
});

test('isEmbeddedIdeTerminal true para terminal embebida de VSCode', () => {
  assert.equal(isEmbeddedIdeTerminal({ TERM_PROGRAM: 'vscode' }), true);
});

test('isEmbeddedIdeTerminal false para env vacío', () => {
  assert.equal(isEmbeddedIdeTerminal({}), false);
});

test('isEmbeddedIdeTerminal false para otra terminal (iTerm)', () => {
  assert.equal(isEmbeddedIdeTerminal({ TERM_PROGRAM: 'iTerm.app' }), false);
});

test('openCommand en terminal embebida de JetBrains con bundle id usa open -b, ignorando el opener', (t) => {
  if (process.platform !== 'darwin') return t.skip('solo aplica en darwin');
  const env = { TERMINAL_EMULATOR: 'JetBrains-JediTerm', __CFBundleIdentifier: 'com.jetbrains.pycharm' };
  assert.equal(
    openCommand('/tmp/doc.md', 'code', env),
    'open -b "com.jetbrains.pycharm" "/tmp/doc.md"'
  );
});

test('openCommand en terminal embebida sin bundle id cae al default del SO, ignorando el opener', () => {
  const env = { TERMINAL_EMULATOR: 'JetBrains-JediTerm' };
  const cmd = openCommand('/tmp/doc.md', 'code', env);
  if (process.platform === 'darwin') assert.equal(cmd, 'open "/tmp/doc.md"');
  else if (process.platform === 'win32') assert.equal(cmd, 'start "" "/tmp/doc.md"');
  else assert.equal(cmd, 'xdg-open "/tmp/doc.md"');
});

test('openCommand fuera de terminal embebida mantiene el comportamiento actual con opener', () => {
  const env = { TERM_PROGRAM: 'iTerm.app' };
  assert.equal(openCommand('/tmp/doc.md', 'code', env), 'code "/tmp/doc.md"');
});
