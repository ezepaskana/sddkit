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

  const { actions, skipped } = await init(root, { ...flags, quiet: true, silent: true });

  console.log('━━━ sddkit sync ━━━');
  console.log(before !== VERSION ? `v${before} → v${VERSION}:` : `v${VERSION} (sin cambio de versión):`);
  for (const a of actions) console.log(`  · ${a}`);
  if (actions.length === 0) console.log('  sin cambios — todo ya estaba al día');
  for (const s of skipped) console.log(`  – ${s}`);

  if (scope === 'global') {
    console.log(`⚠ Skills GLOBALES actualizadas en ${join(globalBase(), '.claude', 'skills')} — afecta a todos los repos de esta máquina.`);
  }
}
