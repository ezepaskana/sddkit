import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { normalizeRoute, detectPatterns } from './patterns.js';

/** Crea un repo temporal con los archivos dados ({ ruta: contenido }) y devuelve { root, cleanup }. */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-patterns-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('normalizeRoute("/plants/:id") → "/plants/:param" (convención :param de Fase 1/consumptions)', () => {
  assert.equal(normalizeRoute('/plants/:id'), '/plants/:param');
});

test('normalizeRoute("/api/v1/public/invitations/{token}") → "/api/v1/public/invitations/:param" (convención Javalin/OpenAPI)', () => {
  assert.equal(normalizeRoute('/api/v1/public/invitations/{token}'), '/api/v1/public/invitations/:param');
});

test('normalizeRoute con dos segmentos {xxx} → ambos se normalizan a :param', () => {
  assert.equal(
    normalizeRoute('/api/v1/plants/{plant_id}/invitations/{invitation_id}'),
    '/api/v1/plants/:param/invitations/:param',
  );
});

test('normalizeRoute con prefijo env:VAR y :param ya presente → sin cambios', () => {
  assert.equal(
    normalizeRoute('env:VITE_API_URL/public/invitations/:param'),
    'env:VITE_API_URL/public/invitations/:param',
  );
});

test('normalizeRoute("/plants") sin segmentos dinámicos → sin cambios', () => {
  assert.equal(normalizeRoute('/plants'), '/plants');
});

test('normalizeRoute("(dynamic)") → sin cambios (caso especial de Fase 1)', () => {
  assert.equal(normalizeRoute('(dynamic)'), '(dynamic)');
});

test('detectPatterns: archivo ESM con createRequire (interop CJS estándar) NO cuenta como variante "cjs"', () => {
  const { root, cleanup } = fixture({
    'src/lib/mysql.js': [
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
      "const mysql = require('mysql2/promise');",
      'export default mysql;',
    ].join('\n'),
  });
  try {
    const result = detectPatterns(root, ['src/lib/mysql.js']);
    const moduleSystem = result.find((r) => r.topic === 'module-system');
    const cjs = moduleSystem?.variants.find((v) => v.id === 'cjs');
    assert.equal(cjs, undefined);
  } finally {
    cleanup();
  }
});

test('detectPatterns: archivo CJS real (module.exports/require sin createRequire) SÍ cuenta como variante "cjs"', () => {
  const { root, cleanup } = fixture({
    'src/legacy/util.cjs': [
      "const fs = require('node:fs');",
      'module.exports = { fs };',
    ].join('\n'),
  });
  try {
    const result = detectPatterns(root, ['src/legacy/util.cjs']);
    const moduleSystem = result.find((r) => r.topic === 'module-system');
    const cjs = moduleSystem?.variants.find((v) => v.id === 'cjs');
    assert.equal(cjs?.count, 1);
  } finally {
    cleanup();
  }
});
