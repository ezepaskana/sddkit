import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

import { docs } from './docs.js';
import { readSection } from '../lib/livingDocs.js';

// Tarea 010, paso 28: tests del comando `sdd docs` (hook pre-commit LLM, BR-051 a
// BR-054). `src/commands/docs.js` todavía no existe — estos tests deben quedar en
// rojo por ese motivo, no por otro.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Formato real de este mismo repo, recortado: `## ❓ VALIDAR con el equipo` y
// `<!-- sdd:manual -->` con `## Notas del equipo` deben sobrevivir intactos.
const COMPONENTS_MD = `# C4 — Nivel 3: Componentes

> Generado por sddkit el 2026-06-15. Base: \`src\`.

| Módulo | Archivos | Rol |
|---|---|---|
| \`src/lib\` | 24 | Librería interna |
| \`src/commands\` | 24 | Comandos |
| \`(raíz)\` | 3 | ❓ por validar |

## ❓ VALIDAR con el equipo

- [ ] ¿Cuál es el rol del módulo \`(raíz)\`?

<!-- sdd:manual — todo lo que está debajo de esta línea se preserva en regeneraciones -->

## Notas del equipo

_(esta sección no se pisa al regenerar)_
`;

// `## Entidades principales` YA EXISTE (heading exacto, con "principales"); `##
// Casos de uso` es nuevo. El resto (Glosario, Reglas de negocio, manual) debe
// sobrevivir intacto.
const DOMAIN_MD = `# Dominio y lógica de negocio — sddkit

> Generado por sddkit el 2026-06-15.

## Glosario (lenguaje del dominio)

| Término | Significado en este sistema |
|---|---|
| _(completar)_ | … |

## Entidades principales

_(no se detectaron candidatos automáticamente — completar desde el código y la documentación)_

## Reglas de negocio

- **BR-001** — _(ejemplo de formato)_ ❓ completar

## Flujos clave del negocio

- [ ] ❓ ¿Cuáles son los flujos principales?

<!-- sdd:manual — todo lo que está debajo de esta línea se preserva en regeneraciones -->

## Notas del equipo

_(esta sección no se pisa al regenerar)_
`;

/** Crea un repo git temporal (con user.email/user.name configurados) y devuelve { root, cleanup }. */
function tmpGitRepo() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-docs-'));
  execSync('git init -q -b main', { cwd: root });
  execSync('git config user.email "test@example.com"', { cwd: root });
  execSync('git config user.name "Test"', { cwd: root });
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function writeFileAt(root, relPath, content) {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function writeLivingDocs(root) {
  writeFileAt(root, '.sdd/c4/components.md', COMPONENTS_MD);
  writeFileAt(root, '.sdd/domain.md', DOMAIN_MD);
}

function stage(root, relPath) {
  execSync(`git add ${relPath}`, { cwd: root });
}

function readComponents(root) {
  return readFileSync(join(root, '.sdd', 'c4', 'components.md'), 'utf8');
}

function readDomain(root) {
  return readFileSync(join(root, '.sdd', 'domain.md'), 'utf8');
}

/** Captura console.log/console.warn durante `fn` y los devuelve como líneas planas. */
async function withCapturedLogs(fn) {
  const lines = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => lines.push(args.join(' '));
  console.warn = (...args) => lines.push(args.join(' '));
  try {
    const result = await fn();
    return { lines, result };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

// ---------------------------------------------------------------------------
// 1. Éxito en las 4 categorías
// ---------------------------------------------------------------------------

test('docs(): éxito en las 4 categorías escribe cada sección en el archivo que corresponde, preservando el resto', async () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeLivingDocs(root);
    writeFileAt(root, 'src/foo.js', 'export const foo = 1;\n');
    stage(root, 'src/foo.js');

    const calls = [];
    const generateSection = async (category, files) => {
      calls.push({ category, files });
      return { status: 'ok', markdown: `- ${category}-item` };
    };

    await docs(root, {}, { generateSection });

    assert.equal(calls.length, 4, 'debe llamar a generateSection una vez por categoría');
    assert.deepEqual(
      calls.map((c) => c.category).sort(),
      ['casos_de_uso', 'entidades', 'inputs', 'outputs'],
    );

    const components = readComponents(root);
    assert.equal(readSection(components, 'Inputs')?.trim(), '- inputs-item');
    assert.equal(readSection(components, 'Outputs')?.trim(), '- outputs-item');
    // preserva el resto de components.md
    assert.match(components, /¿Cuál es el rol del módulo `\(raíz\)`\?/);
    assert.match(components, /<!-- sdd:manual/);
    assert.match(components, /esta sección no se pisa al regenerar/);

    const domain = readDomain(root);
    assert.equal(readSection(domain, 'Entidades principales')?.trim(), '- entidades-item');
    assert.equal(readSection(domain, 'Casos de uso')?.trim(), '- casos_de_uso-item');
    // preserva el resto de domain.md
    assert.match(domain, /BR-001/);
    assert.match(domain, /Glosario \(lenguaje del dominio\)/);
    assert.match(domain, /esta sección no se pisa al regenerar/);
  } finally { cleanup(); }
});

// ---------------------------------------------------------------------------
// 2. Sin archivos stageados
// ---------------------------------------------------------------------------

test('docs(): sin archivos stageados (index vacío) no llama a generateSection y no tira', async () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeLivingDocs(root);
    // nada stageado: ni siquiera .sdd/ fue agregado al index

    let called = false;
    const generateSection = async () => {
      called = true;
      return { status: 'ok', markdown: '- x' };
    };

    await assert.doesNotReject(() => docs(root, {}, { generateSection }));
    assert.equal(called, false, 'generateSection no debe llamarse si no hay nada stageado');
  } finally { cleanup(); }
});

test('docs(): repo sin .git no tira y no llama a generateSection', async () => {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-docs-nogit-'));
  try {
    writeLivingDocs(root);

    let called = false;
    const generateSection = async () => {
      called = true;
      return { status: 'ok', markdown: '- x' };
    };

    await assert.doesNotReject(() => docs(root, {}, { generateSection }));
    assert.equal(called, false, 'generateSection no debe llamarse en un repo sin .git');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------
// 3. Una categoría falla, las otras 3 tienen éxito
// ---------------------------------------------------------------------------

test('docs(): una categoría en {status:"failed"} deja esa sección sin cambios; las otras 3 se actualizan; hay warning; no tira', async () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeLivingDocs(root);
    writeFileAt(root, 'src/foo.js', 'export const foo = 1;\n');
    stage(root, 'src/foo.js');

    const domainBefore = readDomain(root);
    const entidadesBefore = readSection(domainBefore, 'Entidades principales');
    assert.ok(entidadesBefore !== null, 'la fixture debe tener el heading Entidades principales');

    const generateSection = async (category) => {
      if (category === 'entidades') return { status: 'failed', reason: 'timeout' };
      return { status: 'ok', markdown: `- ${category}-item` };
    };

    const { lines } = await withCapturedLogs(() => (
      assert.doesNotReject(() => docs(root, {}, { generateSection }))
    ));

    const domainAfter = readDomain(root);
    assert.equal(
      readSection(domainAfter, 'Entidades principales'),
      entidadesBefore,
      'la sección fallida debe quedar exactamente igual a como estaba',
    );
    assert.equal(readSection(domainAfter, 'Casos de uso')?.trim(), '- casos_de_uso-item');

    const components = readComponents(root);
    assert.equal(readSection(components, 'Inputs')?.trim(), '- inputs-item');
    assert.equal(readSection(components, 'Outputs')?.trim(), '- outputs-item');

    assert.ok(lines.some((l) => l.includes('⚠')), 'debe haber un log de advertencia con ⚠');
  } finally { cleanup(); }
});

// ---------------------------------------------------------------------------
// 4. generateSection tira una excepción
// ---------------------------------------------------------------------------

test('docs(): si generateSection tira (no devuelve {status:"failed"}), docs() lo captura, trata esa categoría como fallo y no propaga', async () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeLivingDocs(root);
    writeFileAt(root, 'src/foo.js', 'export const foo = 1;\n');
    stage(root, 'src/foo.js');

    const domainBefore = readDomain(root);
    const entidadesBefore = readSection(domainBefore, 'Entidades principales');

    const generateSection = async (category) => {
      if (category === 'entidades') throw new Error('boom: el cliente LLM explotó');
      return { status: 'ok', markdown: `- ${category}-item` };
    };

    await assert.doesNotReject(() => docs(root, {}, { generateSection }));

    const domainAfter = readDomain(root);
    assert.equal(
      readSection(domainAfter, 'Entidades principales'),
      entidadesBefore,
      'la categoría que tiró excepción no debe modificar su sección',
    );
    assert.equal(readSection(domainAfter, 'Casos de uso')?.trim(), '- casos_de_uso-item');

    const components = readComponents(root);
    assert.equal(readSection(components, 'Inputs')?.trim(), '- inputs-item');
    assert.equal(readSection(components, 'Outputs')?.trim(), '- outputs-item');
  } finally { cleanup(); }
});

// ---------------------------------------------------------------------------
// 5. Repo real: los archivos stageados se leen del filesystem y se pasan tal cual
// ---------------------------------------------------------------------------

test('docs(): los archivos stageados se leen del working tree y se pasan a generateSection para las 4 categorías', async () => {
  const { root, cleanup } = tmpGitRepo();
  try {
    writeLivingDocs(root);
    const content = 'export function listUsers() {\n  return [];\n}\n';
    writeFileAt(root, 'src/users.js', content);
    stage(root, 'src/users.js');

    const calls = [];
    const generateSection = async (category, files) => {
      calls.push({ category, files });
      return { status: 'ok', markdown: '- x' };
    };

    await docs(root, {}, { generateSection });

    assert.equal(calls.length, 4);
    for (const call of calls) {
      const match = Array.isArray(call.files)
        ? call.files.find((f) => f?.path === 'src/users.js')
        : undefined;
      assert.ok(match, `files recibido por la categoría "${call.category}" debe incluir src/users.js`);
      assert.equal(match.content, content);
    }
  } finally { cleanup(); }
});
