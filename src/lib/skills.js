import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
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

/** Recorre recursivamente `dir` y devuelve el listado de rutas relativas de todos los archivos (no directorios). */
function listFilesRecursive(dir, base = dir) {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out = out.concat(listFilesRecursive(full, base));
    } else if (e.isFile()) {
      out.push(full.slice(base.length + 1));
    }
  }
  return out;
}

/**
 * Compara dos carpetas (paquete vs destino): mismo conjunto de archivos (rutas relativas)
 * y mismo contenido byte a byte. `destDir` puede no existir (se considera distinto).
 */
function foldersAreIdentical(srcDir, destDir) {
  if (!existsSync(destDir)) return false;
  const srcFiles = listFilesRecursive(srcDir).sort();
  const destFiles = listFilesRecursive(destDir).sort();
  if (srcFiles.length !== destFiles.length) return false;
  for (let i = 0; i < srcFiles.length; i++) {
    if (srcFiles[i] !== destFiles[i]) return false;
  }
  for (const rel of srcFiles) {
    const a = readFileSync(join(srcDir, rel));
    const b = readFileSync(join(destDir, rel));
    if (!a.equals(b)) return false;
  }
  return true;
}

/**
 * Instala/actualiza skills del paquete en <targetBase>/.claude/skills.
 * Solo toca carpetas propias (sdd-*); limpia nombres legacy nuestros.
 * Mirror condicional: compara cada carpeta destino contra la del paquete (árbol + contenido);
 * solo mirrorea (rm + cp) las que difieren o no existen.
 * @returns {{ updated: string[], unchanged: string[] }} listas ordenadas como `names`.
 */
export function installSkills(targetBase, names = null) {
  const list = names || availableSkills();
  const dest = join(targetBase, '.claude', 'skills');
  for (const legacy of LEGACY) {
    const lp = join(dest, legacy);
    if (existsSync(lp)) rmSync(lp, { recursive: true, force: true });
  }
  const updated = [];
  const unchanged = [];
  for (const n of list) {
    const srcPath = join(PKG_SKILLS, n);
    const destPath = join(dest, n);
    if (foldersAreIdentical(srcPath, destPath)) {
      unchanged.push(n);
      continue;
    }
    if (existsSync(destPath)) rmSync(destPath, { recursive: true, force: true });
    cpSync(srcPath, destPath, { recursive: true });
    updated.push(n);
  }
  return { updated, unchanged };
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
