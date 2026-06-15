import { join } from 'node:path';
import { readJSON } from '../lib/fsutil.js';
import { globalBase } from '../lib/skills.js';
import { VERSION } from '../version.js';
import { init } from './init.js';

export async function sync(root, flags = {}) {
  const cfg = readJSON(join(root, '.sdd', 'config.json'));
  if (!cfg) {
    console.log('Repo sin sddkit — corré `sdd setup` (este comando es para repos ya configurados).');
    return;
  }

  const before = cfg.version || '(desconocida)';
  const scope = cfg.skills || 'local';

  const { actions } = await init(root, { ...flags, quiet: true, silent: true });
  const configChanged = actions.some((a) => a.startsWith('.sdd/config.json'));

  console.log('━━━ sddkit sync ━━━');
  if (before !== VERSION) {
    console.log(`v${before} → v${VERSION}: skills, config, AGENTS.md y hooks actualizados.`);
  } else if (configChanged) {
    console.log(`v${VERSION}: config migrado (campos nuevos) — skills, AGENTS.md y hooks revisados.`);
  } else {
    console.log(`ya estás al día en v${VERSION} (skills, config, AGENTS.md y hooks revisados).`);
  }

  if (scope === 'global') {
    console.log(`⚠ Skills GLOBALES actualizadas en ${join(globalBase(), '.claude', 'skills')} — afecta a todos los repos de esta máquina.`);
  }
}
