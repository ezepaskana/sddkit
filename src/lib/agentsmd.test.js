import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBlock, upsertAgentsMd } from './agentsmd.js';

const BEGIN = '<!-- sddkit:begin -->';
const END = '<!-- sddkit:end -->';

/** Crea un directorio temporal aislado y devuelve { root, cleanup }. */
function tmpRoot() {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-agentsmd-'));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('buildBlock includes "regla cero" section before Arquitectura', () => {
  const result = buildBlock({ name: 'demo' }, { decisions: [] }, '2026-06-15');

  // BR-036: la sección existe y conserva su contrato (frenar ante incongruencias,
  // decisiones menores exentas); la prosa exacta es condensable (tarea 011).
  assert.ok(result.includes('## Ante dudas o incongruencias: preguntale al dev'));
  assert.ok(result.includes('**frená y preguntale al dev antes de seguir**'));
  assert.ok(/decisiones menores/i.test(result));

  // Assert 2: index of new section is LESS than index of "## Arquitectura (modelo C4 vivo)"
  const newSectionIndex = result.indexOf('## Ante dudas o incongruencias: preguntale al dev');
  const arquitecturaIndex = result.indexOf('## Arquitectura (modelo C4 vivo)');

  assert.ok(
    newSectionIndex < arquitecturaIndex,
    `New section (index ${newSectionIndex}) should come before Arquitectura (index ${arquitecturaIndex})`
  );
});

// --- BR-060 / ADR-0013: el bloque gestionado vive en CLAUDE.md (Claude-only) ---

test('buildBlock: el bloque generado tiene <= 450 palabras (progressive disclosure, BR-059/BR-060)', () => {
  const result = buildBlock({ name: 'demo' }, { decisions: [] }, '2026-08-01');
  const wordCount = result.trim().split(/\s+/).length;

  assert.ok(
    wordCount <= 450,
    `El bloque gestionado debería tener <= 450 palabras, tiene ${wordCount}`
  );
});

test('upsertAgentsMd: escribe el bloque gestionado en CLAUDE.md, no en AGENTS.md (repo sin AGENTS.md previo)', () => {
  const { root, cleanup } = tmpRoot();
  try {
    upsertAgentsMd(root, { name: 'demo' }, { decisions: [] }, '2026-08-01');

    const claudeMdPath = join(root, 'CLAUDE.md');
    assert.ok(existsSync(claudeMdPath), 'CLAUDE.md debería existir tras upsertAgentsMd');
    const claudeMd = readFileSync(claudeMdPath, 'utf8');
    assert.ok(claudeMd.includes(BEGIN) && claudeMd.includes(END), 'CLAUDE.md debería contener el bloque gestionado');

    const agentsMdPath = join(root, 'AGENTS.md');
    if (existsSync(agentsMdPath)) {
      const agentsMd = readFileSync(agentsMdPath, 'utf8');
      assert.ok(
        !agentsMd.includes(BEGIN) && !agentsMd.includes(END),
        'AGENTS.md no debería contener el bloque gestionado'
      );
    }
  } finally { cleanup(); }
});

test('upsertAgentsMd: migra un bloque gestionado previo de AGENTS.md a CLAUDE.md preservando el contenido manual', () => {
  const { root, cleanup } = tmpRoot();
  try {
    const manualBefore = '# AGENTS.md — demo\n\nNotas manuales del equipo antes del bloque.\n\n';
    const manualAfter = '\n\n## Notas manuales del equipo después del bloque\n\nEsto no lo toca sddkit.\n';
    const legacyBlock = `${BEGIN}\n<!-- Bloque gestionado por sddkit (legacy) -->\n\n## Contenido legacy del bloque\n${END}`;
    writeFileSync(join(root, 'AGENTS.md'), manualBefore + legacyBlock + manualAfter);

    upsertAgentsMd(root, { name: 'demo' }, { decisions: [] }, '2026-08-01');

    const claudeMd = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
    assert.ok(claudeMd.includes(BEGIN) && claudeMd.includes(END), 'CLAUDE.md debería contener el bloque migrado');

    const agentsMd = readFileSync(join(root, 'AGENTS.md'), 'utf8');
    assert.ok(!agentsMd.includes(BEGIN) && !agentsMd.includes(END), 'AGENTS.md debería quedar sin el bloque gestionado tras la migración');
    assert.ok(agentsMd.includes('Notas manuales del equipo antes del bloque'), 'El contenido manual previo al bloque debe preservarse');
    assert.ok(agentsMd.includes('Notas manuales del equipo después del bloque'), 'El contenido manual posterior al bloque debe preservarse');
  } finally { cleanup(); }
});

test('upsertAgentsMd: si el bloque gestionado es idéntico salvo la fecha, no escribe y devuelve null', () => {
  const { root, cleanup } = tmpRoot();
  try {
    const first = upsertAgentsMd(root, { name: 'demo' }, { decisions: [] }, '2026-06-15');
    assert.equal(first, 'creado');

    const claudeMdBefore = readFileSync(join(root, 'CLAUDE.md'), 'utf8');

    const second = upsertAgentsMd(root, { name: 'demo' }, { decisions: [] }, '2026-08-01');
    assert.equal(second, null, 'una corrida con solo la fecha distinta debería señalar "sin cambios"');

    const claudeMdAfter = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
    assert.equal(claudeMdAfter, claudeMdBefore, 'el archivo no debería reescribirse (se preserva la fecha vieja)');
    assert.ok(claudeMdAfter.includes('Última actualización: 2026-06-15'), 'la fecha vieja debe conservarse');
  } finally { cleanup(); }
});

test('upsertAgentsMd: si el bloque gestionado cambia de verdad, escribe y devuelve el string de acción', () => {
  const { root, cleanup } = tmpRoot();
  try {
    upsertAgentsMd(root, { name: 'demo' }, { decisions: [] }, '2026-06-15');

    const second = upsertAgentsMd(root, { name: 'demo' }, { decisions: [{ topic: 'module-system', variant: 'esm' }] }, '2026-08-01');
    assert.equal(second, 'bloque gestionado actualizado (el resto quedó intacto)');

    const claudeMdAfter = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
    assert.ok(claudeMdAfter.includes('Última actualización: 2026-08-01'), 'la fecha nueva debe aplicarse cuando hay un cambio real');
  } finally { cleanup(); }
});

test('buildBlock: Preferencias de respuesta incluye BR-063 (instrucción contextual de apertura de archivos)', () => {
  const result = buildBlock({ name: 'demo' }, { decisions: [] }, '2026-08-01');

  // Extraer la sección "## Preferencias de respuesta" hasta el próximo "## "
  const preferencesStart = result.indexOf('## Preferencias de respuesta');
  assert.ok(preferencesStart !== -1, 'La sección "Preferencias de respuesta" debería existir');

  const nextSectionStart = result.indexOf('\n## ', preferencesStart + 1);
  const preferencesSection = nextSectionStart !== -1
    ? result.substring(preferencesStart, nextSectionStart)
    : result.substring(preferencesStart);

  // Verificar que la sección contiene los tres literales de BR-063
  assert.ok(preferencesSection.includes('ui.opener'), 'La sección debería incluir "ui.opener"');
  assert.ok(preferencesSection.includes('TERMINAL_EMULATOR=JetBrains-JediTerm'), 'La sección debería incluir "TERMINAL_EMULATOR=JetBrains-JediTerm"');
  assert.ok(preferencesSection.includes('TERM_PROGRAM=vscode'), 'La sección debería incluir "TERM_PROGRAM=vscode"');
});
