import { join } from 'node:path';
import { walk, readJSON } from '../lib/fsutil.js';
import { detectStack } from '../lib/detect.js';
import { recordDecision } from '../lib/catalog.js';
import { upsertAgentsMd } from '../lib/agentsmd.js';

export async function decide(root, pos, flags) {
  const [topic, chosen] = pos;
  if (!topic || !chosen) {
    throw new Error('Uso: sdd decide <topic> <variante> --why="razón"\n(Tip: `sdd setup` te propone las opciones y las registra solo.)');
  }
  const pj = readJSON(join(root, '.sdd', 'patterns.json'));
  if (!pj) throw new Error('No hay .sdd/patterns.json — corré `sdd setup` (o `sdd scan`) primero.');

  const { cat, legacy, date } = recordDecision(root, pj.patterns, topic, chosen, flags.why);
  const files = walk(root);
  upsertAgentsMd(root, detectStack(root, files), cat, date);

  console.log(`\n✓ Decisión registrada: ${topic} → ${chosen}`);
  if (Object.keys(legacy).length) {
    console.log(`  Deuda legacy tolerada (baseline, no debe crecer): ${Object.entries(legacy).map(([k, v]) => `${k}=${v} archivos`).join(', ')}`);
  }
  console.log('  ✓ AGENTS.md actualizado — los agentes van a respetar esta convención');
}
