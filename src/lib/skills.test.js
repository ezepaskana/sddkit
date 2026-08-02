import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkills, PKG_SKILLS } from './skills.js';

test('installSkills: limpia archivos huérfanos al re-instalar (mirror behavior)', () => {
  const tmpBase = mkdtempSync(join(tmpdir(), 'sddkit-skills-'));
  try {
    // Paso 1: Instala sdd-bootstrap por primera vez
    installSkills(tmpBase, ['sdd-bootstrap']);

    const skillPath = join(tmpBase, '.claude', 'skills', 'sdd-bootstrap');
    const skillMdPath = join(skillPath, 'SKILL.md');

    // Verifica que SKILL.md fue instalado
    assert.ok(existsSync(skillMdPath), 'SKILL.md debería existir después de la primera instalación');

    // Paso 2: Agrega un archivo huérfano dentro de la carpeta instalada
    const orphanFile = join(skillPath, 'huerfano.txt');
    writeFileSync(orphanFile, 'Este archivo no debería existir después del mirror');

    // Verifica que el huérfano existe
    assert.ok(existsSync(orphanFile), 'huerfano.txt debería existir antes del re-install');

    // Paso 3: Re-instala sdd-bootstrap (esto debería hacer mirror y eliminar huérfanos)
    installSkills(tmpBase, ['sdd-bootstrap']);

    // Paso 4: Verifica el comportamiento esperado
    // El archivo huérfano NO debería existir (mirror behavior)
    assert.ok(!existsSync(orphanFile), 'huerfano.txt NO debería existir después del mirror (cleanup)');

    // SKILL.md sigue presente y es idéntico al del paquete
    assert.ok(existsSync(skillMdPath), 'SKILL.md debería seguir existiendo');
    const installedContent = readFileSync(skillMdPath, 'utf8');
    const pkgContent = readFileSync(join(PKG_SKILLS, 'sdd-bootstrap', 'SKILL.md'), 'utf8');
    assert.equal(installedContent, pkgContent, 'SKILL.md instalado debe ser idéntico al del paquete');
  } finally {
    rmSync(tmpBase, { recursive: true, force: true });
  }
});

test('installSkills: segunda llamada consecutiva no re-escribe (updated vacío, todo en unchanged)', () => {
  const tmpBase = mkdtempSync(join(tmpdir(), 'sddkit-skills-'));
  try {
    const first = installSkills(tmpBase, ['sdd-bootstrap']);
    assert.deepEqual(first.updated, ['sdd-bootstrap']);
    assert.deepEqual(first.unchanged, []);

    const skillMdPath = join(tmpBase, '.claude', 'skills', 'sdd-bootstrap', 'SKILL.md');
    const mtimeBefore = statSync(skillMdPath).mtimeMs;

    const second = installSkills(tmpBase, ['sdd-bootstrap']);
    assert.deepEqual(second.updated, [], 'la segunda llamada no debería tocar nada');
    assert.deepEqual(second.unchanged, ['sdd-bootstrap']);

    const mtimeAfter = statSync(skillMdPath).mtimeMs;
    assert.equal(mtimeAfter, mtimeBefore, 'el archivo no debería haber sido re-escrito');
  } finally {
    rmSync(tmpBase, { recursive: true, force: true });
  }
});

test('installSkills: archivo del destino modificado → esa skill va a updated y queda igual al paquete', () => {
  const tmpBase = mkdtempSync(join(tmpdir(), 'sddkit-skills-'));
  try {
    installSkills(tmpBase, ['sdd-bootstrap']);

    const skillMdPath = join(tmpBase, '.claude', 'skills', 'sdd-bootstrap', 'SKILL.md');
    writeFileSync(skillMdPath, 'contenido modificado a mano, no coincide con el paquete');

    const result = installSkills(tmpBase, ['sdd-bootstrap']);
    assert.deepEqual(result.updated, ['sdd-bootstrap']);
    assert.deepEqual(result.unchanged, []);

    const installedContent = readFileSync(skillMdPath, 'utf8');
    const pkgContent = readFileSync(join(PKG_SKILLS, 'sdd-bootstrap', 'SKILL.md'), 'utf8');
    assert.equal(installedContent, pkgContent, 'el archivo modificado debe quedar igual al del paquete tras el mirror');
  } finally {
    rmSync(tmpBase, { recursive: true, force: true });
  }
});

test('installSkills: archivo extra en destino → la skill difiere → mirror lo elimina (BR-032)', () => {
  const tmpBase = mkdtempSync(join(tmpdir(), 'sddkit-skills-'));
  try {
    installSkills(tmpBase, ['sdd-bootstrap']);

    const skillPath = join(tmpBase, '.claude', 'skills', 'sdd-bootstrap');
    const orphanFile = join(skillPath, 'extra-no-deberia-estar.txt');
    writeFileSync(orphanFile, 'archivo que no pertenece al paquete');

    const result = installSkills(tmpBase, ['sdd-bootstrap']);
    assert.deepEqual(result.updated, ['sdd-bootstrap']);
    assert.deepEqual(result.unchanged, []);
    assert.ok(!existsSync(orphanFile), 'el archivo extra debería haber sido eliminado por el mirror');
  } finally {
    rmSync(tmpBase, { recursive: true, force: true });
  }
});
