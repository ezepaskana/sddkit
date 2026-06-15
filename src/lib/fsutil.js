import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', 'vendor',
  '__pycache__', '.next', '.nuxt', 'target', '.venv', 'venv', '.idea',
  '.vscode', '.sdd', '.turbo', '.cache', '.pytest_cache', 'bin', 'obj',
]);

/** Recorre el repo y devuelve paths relativos normalizados con '/'. */
export function walk(root, maxFiles = 20000) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name) && !e.name.startsWith('.')) stack.push(full);
      } else if (e.isFile()) {
        files.push(relative(root, full).split('\\').join('/'));
        if (files.length >= maxFiles) return files;
      }
    }
  }
  return files;
}

export function listDirs(p) {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !IGNORE_DIRS.has(e.name))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

export function read(p) { try { return readFileSync(p, 'utf8'); } catch { return null; } }
export function readJSON(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }
export function write(p, content) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); }
export function writeJSON(p, obj) { write(p, JSON.stringify(obj, null, 2) + '\n'); }
export { existsSync };
