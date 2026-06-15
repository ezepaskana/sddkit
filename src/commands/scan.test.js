import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { scan } from './scan.js';
import { MANUAL_MARK } from '../lib/c4.js';

/** Crea un repo temporal con los archivos dados ({ ruta: contenido }) y devuelve { root, cleanup }. */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-scan-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('sdd scan: persiste capabilities.consumptions en patterns.json y "Dependencias salientes" en containers.md', async () => {
  const { root, cleanup } = fixture({
    'package.json': JSON.stringify({ name: 'demo-app', version: '1.0.0' }, null, 2),
    'src/api/plants.ts': [
      'export function listPlants() {',
      '  return fetch("/plants");',
      '}',
    ].join('\n'),
  });
  try {
    await scan(root, { quiet: true });

    const patterns = JSON.parse(readFileSync(join(root, '.sdd', 'patterns.json'), 'utf8'));
    assert.deepEqual(patterns.capabilities.consumptions, [
      { method: 'GET', target: '/plants', file: 'src/api/plants.ts' },
    ]);

    const containers = readFileSync(join(root, '.sdd', 'c4', 'containers.md'), 'utf8');
    assert.match(containers, /## Dependencias salientes/);
    assert.match(containers, /\| GET \| \/plants \| src\/api\/plants\.ts \|/);
  } finally { cleanup(); }
});

test('sdd scan --terraform=<path>: persiste infra.resources/infra.edges en patterns.json', async () => {
  const { root, cleanup } = fixture({
    'package.json': JSON.stringify({ name: 'demo-app', version: '1.0.0' }, null, 2),
  });
  try {
    const tfPath = join(import.meta.dirname, '__fixtures__', 'terraform-show.json');
    await scan(root, { quiet: true, terraform: tfPath });

    const patterns = JSON.parse(readFileSync(join(root, '.sdd', 'patterns.json'), 'utf8'));
    assert.equal(patterns.infra.resources.length, 6);
    assert.equal(patterns.infra.edges.length, 7);
  } finally { cleanup(); }
});

test('sdd scan --terraform=<path>: si el path no existe o el JSON es inválido, lanza error y no escribe .sdd/', async () => {
  const { root, cleanup } = fixture({
    'package.json': JSON.stringify({ name: 'demo-app', version: '1.0.0' }, null, 2),
  });
  try {
    await assert.rejects(
      () => scan(root, { quiet: true, terraform: '/no/existe/show.json' }),
      (err) => {
        assert.match(err.message, /--terraform/);
        return true;
      },
    );

    assert.ok(!existsSync(join(root, '.sdd', 'patterns.json')));
  } finally { cleanup(); }
});

test('sdd scan sin --terraform: patterns.json no tiene la clave infra', async () => {
  const { root, cleanup } = fixture({
    'package.json': JSON.stringify({ name: 'demo-app', version: '1.0.0' }, null, 2),
  });
  try {
    await scan(root, { quiet: true });

    const patterns = JSON.parse(readFileSync(join(root, '.sdd', 'patterns.json'), 'utf8'));
    assert.ok(!('infra' in patterns));
  } finally { cleanup(); }
});

test('segunda corrida de scan debe preservar ediciones arriba del marcador en los 4 archivos generados', async () => {
  const { root, cleanup } = fixture({
    'package.json': JSON.stringify({ name: 'demo-app', version: '1.0.0' }, null, 2),
  });
  try {
    // Primera corrida: genera los 4 archivos
    await scan(root, { quiet: true });

    const filesToCheck = [
      join(root, '.sdd', 'c4', 'context.md'),
      join(root, '.sdd', 'c4', 'containers.md'),
      join(root, '.sdd', 'c4', 'components.md'),
      join(root, '.sdd', 'domain.md'),
    ];

    // Para cada archivo, verifica que exista y contenga MANUAL_MARK
    const editedContents = {};
    for (const filePath of filesToCheck) {
      assert.ok(existsSync(filePath), `Archivo debe existir: ${filePath}`);
      const originalContent = readFileSync(filePath, 'utf8');
      assert.ok(originalContent.includes(MANUAL_MARK), `Archivo debe contener MANUAL_MARK: ${filePath}`);

      // Inserta una línea de edición curada ANTES de MANUAL_MARK
      const idx = originalContent.indexOf(MANUAL_MARK);
      const editedContent = originalContent.slice(0, idx) + '\n- EDICION-CURADA-DE-PRUEBA\n' + originalContent.slice(idx);
      editedContents[filePath] = editedContent;
      writeFileSync(filePath, editedContent, 'utf8');
    }

    // Segunda corrida: debe preservar la edición en cada archivo
    await scan(root, { quiet: true });

    // Verifica que cada archivo tenga exactamente el contenido editado
    for (const filePath of filesToCheck) {
      const afterSecondScan = readFileSync(filePath, 'utf8');
      assert.equal(afterSecondScan, editedContents[filePath], `Contenido editado debe preservarse en: ${filePath}`);
    }
  } finally { cleanup(); }
});
