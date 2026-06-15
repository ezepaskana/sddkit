import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

/** Carpeta skills/ del paquete sddkit: una skill = una carpeta (SKILL.md + templates/ + examples/ + references/). */
export const PKG_SKILLS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills');

const LEGACY = ['sdd-workflow', 'sddkit-bootstrap']; // nombres de versiones anteriores

export function availableSkills() {
  return readdirSync(PKG_SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/**
 * Instala/actualiza skills del paquete en <targetBase>/.claude/skills.
 * Solo toca carpetas propias (sdd-*); limpia nombres legacy nuestros.
 */
export function installSkills(targetBase, names = null) {
  const list = names || availableSkills();
  const dest = join(targetBase, '.claude', 'skills');
  for (const legacy of LEGACY) {
    const lp = join(dest, legacy);
    if (existsSync(lp)) rmSync(lp, { recursive: true, force: true });
  }
  for (const n of list) {
    const destPath = join(dest, n);
    if (existsSync(destPath)) rmSync(destPath, { recursive: true, force: true });
    cpSync(join(PKG_SKILLS, n), destPath, { recursive: true });
  }
  return list;
}

/** Elimina nuestras skills (sdd-* y legacy) de <targetBase>/.claude/skills. Nunca toca skills ajenas. */
export function removeSkills(targetBase) {
  const dest = join(targetBase, '.claude', 'skills');
  const removed = [];
  if (!existsSync(dest)) return removed;
  for (const e of readdirSync(dest)) {
    if (e.startsWith('sdd-') || LEGACY.includes(e)) {
      rmSync(join(dest, e), { recursive: true, force: true });
      removed.push(e);
    }
  }
  return removed;
}

export const globalBase = () => homedir();
