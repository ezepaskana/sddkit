import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { installSkills, globalBase } from '../lib/skills.js';

/**
 * Asegura la skill global sdd-bootstrap (detección de repos sin configurar).
 * La instala `sdd setup` automáticamente la primera vez — no es un comando separado.
 */
export function ensureGlobalSkill() {
  const p = join(globalBase(), '.claude', 'skills', 'sdd-bootstrap', 'SKILL.md');
  const existed = existsSync(p);
  installSkills(globalBase(), ['sdd-bootstrap']); // idempotente; limpia nombres legacy
  return existed ? null : p;
}
