import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildBlock } from './agentsmd.js';

test('buildBlock includes "regla cero" section before Arquitectura', () => {
  const result = buildBlock({ name: 'demo' }, { decisions: [] }, '2026-06-15');

  // Expected text for the new section (exact match as per spec)
  const expectedText = `## Ante dudas o incongruencias: preguntale al dev

Preguntar no es una falla — es la respuesta correcta cuando algo no cierra. Si encontrás un requisito que contradice el código existente, una instrucción que violaría una convención del catálogo o una regla de negocio/ADR ya documentada, información que falta o es ambigua, o cualquier otra cosa que simplemente no tiene sentido, **frená y preguntale al dev antes de seguir** — no avances con una suposición. Las decisiones menores que el buen juicio normal resuelve no necesitan esto: esas resolvélas vos y seguí.`;

  // Assert 1: result includes the exact text of the new section
  assert.ok(
    result.includes(expectedText),
    'buildBlock result should include the exact "regla cero" section text'
  );

  // Assert 2: index of new section is LESS than index of "## Arquitectura (modelo C4 vivo)"
  const newSectionIndex = result.indexOf('## Ante dudas o incongruencias: preguntale al dev');
  const arquitecturaIndex = result.indexOf('## Arquitectura (modelo C4 vivo)');

  assert.ok(
    newSectionIndex < arquitecturaIndex,
    `New section (index ${newSectionIndex}) should come before Arquitectura (index ${arquitecturaIndex})`
  );
});
