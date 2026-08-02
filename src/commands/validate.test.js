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

/**
 * Corre validate() capturando console.log y stubeando process.exit (que validate() invoca
 * directamente ante violaciones), para poder aserter sobre el resultado sin matar el proceso
 * de test. Devuelve { logs, exitCode }.
 */
async function runValidate(root, flags = {}) {
  const logs = [];
  const origLog = console.log;
  const origExit = process.exit;
  let exitCode;
  console.log = (...args) => logs.push(args.map(String).join(' '));
  process.exit = (code) => {
    exitCode = code;
    throw new Error('__validate_exit__');
  };
  try {
    await validate(root, flags);
  } catch (err) {
    if (!(err instanceof Error) || err.message !== '__validate_exit__') throw err;
  } finally {
    console.log = origLog;
    process.exit = origExit;
  }
  return { logs, exitCode };
}

test('sdd validate: bullet de LEARNINGS.md con más de 200 caracteres hace fallar la validación (BR-062)', async () => {
  const longBullet = `- **Aprendizaje demasiado largo**: ${'x'.repeat(200)} _(tarea 011)_`;
  assert.ok(longBullet.length > 200, 'fixture inválida: el bullet de prueba debe superar los 200 caracteres');
  const { root, cleanup } = fixture({
    '.sdd/LEARNINGS.md': [
      '# Aprendizajes del proyecto',
      '',
      '## Gotchas y convenciones aprendidas',
      '',
      longBullet,
    ].join('\n'),
  });

  try {
    const { logs, exitCode } = await runValidate(root);
    assert.equal(exitCode, 1, 'validate() debe salir con código 1 ante un bullet de LEARNINGS.md > 200 caracteres');
    assert.ok(
      logs.some((l) => l.includes('LEARNINGS.md') && l.includes('200')),
      `Debe reportar con mensaje claro el bullet largo de LEARNINGS.md. Logs: ${JSON.stringify(logs)}`
    );
  } finally {
    cleanup();
  }
});

test('sdd validate: bullets de LEARNINGS.md dentro del límite de 200 caracteres no fallan', async () => {
  const shortBullet = '- **Aprendizaje corto**: bullet conciso dentro del límite. _(tarea 011)_';
  assert.ok(shortBullet.length <= 200, 'fixture inválida: el bullet de prueba debe cumplir el límite');
  const { root, cleanup } = fixture({
    '.sdd/LEARNINGS.md': [
      '# Aprendizajes del proyecto',
      '',
      '## Gotchas y convenciones aprendidas',
      '',
      shortBullet,
    ].join('\n'),
  });

  try {
    const { logs, exitCode } = await runValidate(root);
    assert.equal(exitCode, undefined, 'validate() no debe fallar cuando todos los bullets de LEARNINGS.md cumplen el límite');
    assert.ok(
      !logs.some((l) => l.includes('LEARNINGS.md') && /200/.test(l)),
      `No debe reportar violación de largo para un bullet conforme. Logs: ${JSON.stringify(logs)}`
    );
  } finally {
    cleanup();
  }
});

test('sdd validate: bloque Mermaid sin tipo de diagrama válido en la primera línea hace fallar la validación (BR-062)', async () => {
  const { root, cleanup } = fixture({
    '.sdd/c4/context.md': [
      '# C4 — Nivel 1: Contexto',
      '',
      '```mermaid',
      'diagrama-de-flujo-inventado',
      '  user --> sistema',
      '```',
      '',
    ].join('\n'),
  });

  try {
    const { logs, exitCode } = await runValidate(root);
    assert.equal(exitCode, 1, 'validate() debe salir con código 1 ante un bloque Mermaid sin tipo de diagrama válido');
    assert.ok(
      logs.some((l) => l.includes('mermaid') || l.includes('Mermaid')),
      `Debe reportar con mensaje claro el bloque Mermaid inválido. Logs: ${JSON.stringify(logs)}`
    );
  } finally {
    cleanup();
  }
});

test('sdd validate: bloque Mermaid con un flowchart válido no falla', async () => {
  const { root, cleanup } = fixture({
    '.sdd/c4/context.md': [
      '# C4 — Nivel 1: Contexto',
      '',
      '```mermaid',
      'flowchart LR',
      '  user(["Usuario"]) --> sistema["sddkit"]',
      '```',
      '',
    ].join('\n'),
  });

  try {
    const { logs, exitCode } = await runValidate(root);
    assert.equal(exitCode, undefined, 'validate() no debe fallar ante un bloque Mermaid con un flowchart válido');
    assert.ok(
      !logs.some((l) => (l.includes('mermaid') || l.includes('Mermaid')) && (l.includes('inválido') || l.includes('válido'))),
      `No debe reportar violación de Mermaid para un flowchart válido. Logs: ${JSON.stringify(logs)}`
    );
  } finally {
    cleanup();
  }
});
