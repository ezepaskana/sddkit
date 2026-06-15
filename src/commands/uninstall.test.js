import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { uninstall } from './uninstall.js';
import { installPostCommit } from '../lib/hooks.js';

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sddkit-uninstall-'));
}

function initGitRepo(root) {
  fs.mkdirSync(path.join(root, '.git', 'hooks'), { recursive: true });
}

function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve(fn())
    .then((result) => ({ logs, result }))
    .finally(() => { console.log = originalLog; });
}

test('uninstall --repo: elimina post-commit hook si era solo de sddkit', async () => {
  const root = tmpRepo();
  initGitRepo(root);

  // Instalar el hook post-commit con installPostCommit (fixture)
  installPostCommit(root);

  const hookPath = path.join(root, '.git', 'hooks', 'post-commit');
  assert.ok(fs.existsSync(hookPath), 'El hook debería estar instalado');

  // Ejecutar uninstall --repo --yes
  await withCapturedLogs(() => uninstall(root, { repo: true, yes: true }));

  // Verificar que el hook fue eliminado
  assert.ok(!fs.existsSync(hookPath), 'El hook post-commit debería haber sido eliminado');
});

test('uninstall --repo: elimina solo la línea de sddkit si hay contenido previo en post-commit', async () => {
  const root = tmpRepo();
  initGitRepo(root);

  const hookPath = path.join(root, '.git', 'hooks', 'post-commit');

  // Crear un hook post-commit previo
  fs.writeFileSync(hookPath, '#!/bin/sh\n# Hook previo\necho "mi hook existente"\n');

  // Instalar el hook post-commit con installPostCommit (agregar al final del existente)
  installPostCommit(root);

  const hookContent = fs.readFileSync(hookPath, 'utf8');
  assert.ok(hookContent.includes('echo "mi hook existente"'), 'El contenido previo debería estar ahí');
  assert.ok(hookContent.includes('sdd publish'), 'El hook de sddkit debería estar ahí');

  // Ejecutar uninstall --repo --yes
  await withCapturedLogs(() => uninstall(root, { repo: true, yes: true }));

  // Verificar que solo se eliminó la línea de sddkit
  assert.ok(fs.existsSync(hookPath), 'El hook post-commit debería existir');
  const finalContent = fs.readFileSync(hookPath, 'utf8');
  assert.ok(!finalContent.includes('sdd publish'), 'La línea sdd publish debería estar eliminada');
  assert.ok(finalContent.includes('echo "mi hook existente"'), 'El contenido previo debería seguir ahí');
  assert.ok(!finalContent.includes('Agregado por sddkit'), 'El comentario de sddkit debería estar eliminado');
});

test('uninstall --repo: sin --yes requiere confirmación interactiva', async () => {
  const root = tmpRepo();
  initGitRepo(root);
  installPostCommit(root);

  // Sin terminal interactiva (isTTY = false), sin --yes → debe lanzar error
  const originalIsTTY = process.stdin.isTTY;
  try {
    process.stdin.isTTY = false;
    await assert.rejects(
      () => uninstall(root, { repo: true }),
      /sin terminal interactiva/,
      'Debería rechazar sin terminal y sin --yes'
    );
  } finally {
    process.stdin.isTTY = originalIsTTY;
  }
});

test('uninstall --repo: reporte incluye post-commit en la lista de eliminados', async () => {
  const root = tmpRepo();
  initGitRepo(root);
  installPostCommit(root);

  const { logs } = await withCapturedLogs(() => uninstall(root, { repo: true, yes: true }));

  const reportLine = logs.find((l) => l.includes('.git/hooks/post-commit'));
  assert.ok(reportLine, 'El reporte debería mencionar que se eliminó post-commit');
  assert.ok(reportLine.includes('✓'), 'Debería mostrar el checkmark de éxito');
});
