import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { validate } from './validate.js';

/** Crea un repo temporal con los archivos dados ({ ruta: contenido }) y devuelve { root, cleanup }. */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-validate-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('sdd validate: no reporta drift para entradas de sub-secciones de components.md', async () => {
  const { root, cleanup } = fixture({
    'src/main/Foo.java': 'public class Foo {}',
    'src/test/FooTest.java': 'public class FooTest {}',
    '.sdd/c4/components.md': [
      '# C4 — Nivel 3: Componentes',
      '',
      '| Módulo | Archivos | Rol |',
      '|---|---|---|',
      '| `src/main` | 1 | ❓ por validar |',
      '| `src/test` | 1 | ❓ por validar |',
      '',
      '### Subcapas de src/main',
      '',
      '| Paquete | Rol |',
      '|---|---|',
      '| `domain/model` | Entidades de dominio |',
      '| `adapter/controller` | Controladores REST |',
    ].join('\n'),
  });

  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.map(String).join(' '));
  try {
    await validate(root, {});
  } finally {
    console.log = origLog;
    cleanup();
  }

  for (const line of logs) {
    assert.ok(!line.includes('domain/model'), `Falso positivo en log: "${line}"`);
    assert.ok(!line.includes('adapter/controller'), `Falso positivo en log: "${line}"`);
    assert.ok(!line.includes('Drift'), `Falso positivo de Drift en log: "${line}"`);
  }
});
