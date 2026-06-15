import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
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
