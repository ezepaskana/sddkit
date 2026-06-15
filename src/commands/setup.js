import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { walk, read, readJSON, writeJSON } from '../lib/fsutil.js';
import { detectStack } from '../lib/detect.js';
import { loadCatalog, recordDecision } from '../lib/catalog.js';
import { upsertAgentsMd } from '../lib/agentsmd.js';
import { installPreCommit } from '../lib/hooks.js';
import { ensureGlobalSkill } from './bootstrap.js';
import { ensureBranchingPolicy } from '../lib/branching.js';
import { init } from './init.js';
import { scan } from './scan.js';

/**
 * `sdd setup` — el único comando que el dev (o el agente) necesita.
 * Hace init + scan + instala el hook + resuelve las convenciones:
 *  - terminal interactiva: propone opciones y el dev elige un número
 *  - modo agente / sin TTY (--agent): emite las decisiones pendientes para que
 *    el agente se las pregunte al usuario en el chat y las registre con `sdd decide`.
 */
export async function setup(root, flags) {
  const interactive = process.stdin.isTTY && !flags.agent;

  console.log('━━━ sddkit setup ━━━');
  // Alcance de las skills: el dev elige al instalar (local = este repo, versionadas en git; global = toda la máquina).
  const cfg0 = readJSON(join(root, '.sdd', 'config.json'));
  if (!flags.global && !flags.local && !(cfg0 && cfg0.skills)) {
    if (interactive) {
      const { createInterface } = await import('node:readline/promises');
      const rl0 = createInterface({ input: process.stdin, output: process.stdout });
      const a = (await rl0.question('¿Dónde instalo las skills SDD?\n   1) local — solo este repo, versionadas en git (recomendado para equipos)\n   2) global — toda tu máquina, todos los repos\n   Elegí 1-2 [Enter=1]: ')).trim();
      rl0.close();
      if (a === '2') flags.global = true; else flags.local = true;
    } else {
      flags.local = true;
      console.log('Skills SDD: alcance local (default en modo agente; el dev puede cambiarlo con `sdd setup --global`).');
    }
  }
  const globalSkill = ensureGlobalSkill();
  if (globalSkill) {
    console.log('✓ Primera vez en esta máquina: skill global instalada (' + globalSkill + ')');
    console.log('  Los próximos repos no necesitan este comando: el agente los detecta y ofrece configurarlos solo.');
  }

  // Política de branding: el dev elige (o acepta los defaults) convención de commits,
  // flujo de ramas y patrón de nombres. Si .sdd/branching.md ya existe, no se pregunta.
  {
    let rl2 = null;
    if (interactive) rl2 = createInterface({ input: process.stdin, output: process.stdout });
    const { created, policy } = await ensureBranchingPolicy(root, { rl: rl2 });
    if (rl2) rl2.close();
    if (created) {
      console.log(`✓ Branching policy: ${policy.convención} + ${policy.flujo} + ${policy.patrón}`);
    }
  }

  // Grafo de impacto local: el dev elige (o acepta el default) dónde vive el SQLite del grafo.
  let graphSqlitePath = null;
  if (!cfg0?.graph) {
    if (interactive) {
      const rl1 = createInterface({ input: process.stdin, output: process.stdout });
      const a = (await rl1.question('¿Dónde guardo el grafo de impacto local (SQLite)? [Enter=~/.sddkit/graph.db]: ')).trim();
      rl1.close();
      graphSqlitePath = a === '' ? '~/.sddkit/graph.db' : a;
    } else {
      graphSqlitePath = '~/.sddkit/graph.db';
      console.log('Grafo de impacto: sqlite local en ~/.sddkit/graph.db (default en modo agente; el dev puede cambiarlo en .sdd/config.json).');
    }
  }

  await init(root, { ...flags, quiet: true });

  if (graphSqlitePath) {
    const cfg = readJSON(join(root, '.sdd', 'config.json'));
    cfg.graph = { driver: 'sqlite', sqlite: { path: graphSqlitePath } };
    writeJSON(join(root, '.sdd', 'config.json'), cfg);
    console.log('✓ Grafo de impacto: sqlite local → ' + graphSqlitePath);
  }

  const scanRes = await scan(root, { ...flags, quiet: true });
  console.log('\n✓ Hook: ' + installPreCommit(root));

  // Decisiones de convenciones pendientes
  const pj = readJSON(join(root, '.sdd', 'patterns.json'));
  const cat = loadCatalog(root);
  const decided = new Set(cat.decisions.map((d) => d.topic));
  const pending = (pj?.patterns || []).filter((p) => p.multipleStyles && !decided.has(p.topic));

  if (!pending.length) {
    console.log('\n✓ Sin conflictos de convenciones — no hay nada que decidir.');
  } else if (!interactive) {
    console.log(`\n[PENDIENTE] ${pending.length} convención(es) con múltiples variantes. AGENTE: preguntale al usuario cuál prefiere (mostrale las opciones) y registrá cada respuesta con:\n  sdd decide <topic> <variante> --why="<razón del usuario>"\n`);
    for (const p of pending) {
      console.log(`  topic: ${p.topic}`);
      console.log(`  pregunta: ${p.question}`);
      for (const v of p.variants) console.log(`    opción: ${v.id} — ${v.label} (${v.count} archivos, ej: ${v.examples[0]})`);
      console.log('');
    }
  } else {
    console.log(`\nEncontré ${pending.length} convención(es) con más de una variante en tu código. Elegí la oficial (Enter = la más usada, "s" = decidir después):\n`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let lastDate = null;
    for (const p of pending) {
      console.log(`▸ ${p.question}`);
      p.variants.forEach((v, i) => console.log(`   ${i + 1}) ${v.id} — ${v.label}  (${v.count} archivos, ej: ${v.examples[0]})`));
      const ans = (await rl.question(`   Elegí 1-${p.variants.length} [Enter=1] o "s": `)).trim().toLowerCase();
      if (ans === 's') { console.log('   – salteado (queda pendiente en .sdd/patterns.json)\n'); continue; }
      const idx = ans === '' ? 0 : parseInt(ans, 10) - 1;
      if (!(idx >= 0 && idx < p.variants.length)) { console.log('   – respuesta inválida, salteado\n'); continue; }
      const why = (await rl.question('   ¿Por qué? (opcional, Enter para omitir): ')).trim();
      const r = recordDecision(root, pj.patterns, p.topic, p.variants[idx].id, why);
      lastDate = r.date;
      console.log(`   ✓ ${p.topic} → ${p.variants[idx].id}\n`);
    }
    rl.close();
    if (lastDate) {
      const files = walk(root);
      upsertAgentsMd(root, detectStack(root, files), loadCatalog(root), lastDate);
    }
  }

  // Contrato de completado: los docs C4 son un esqueleto hasta que el agente los llena.
  const openQ = (['context.md', 'containers.md', 'components.md']
    .map((f) => read(join(root, '.sdd', 'c4', f)) || '')
    .join('\n') + (read(join(root, '.sdd', 'domain.md')) || ''))
    .match(/- \[ \] /g)?.length || 0;
  const srcs = (scanRes?.docSources || []).map((s) => `${s.path} (${s.files} archivo${s.files > 1 ? 's' : ''})`).join(', ');

  if (openQ > 0 && !interactive) {
    const srcsNote = srcs ? ` (fuentes detectadas: ${srcs})` : ' (sin fuentes detectadas — usar el código)';
    console.log(`\n[PENDIENTE] Completar la documentación de arquitectura Y de negocio — ${openQ} pregunta(s) abierta(s)${srcsNote}.`);
    console.log('Los docs de .sdd/ (arquitectura C4 y dominio de negocio) son un ESQUELETO generado por heurísticas. AGENTE: el setup NO está completo hasta que esto pase, y NO lo hagas vos en este contexto (saturás tu ventana). Aplicá AHORA, antes de la tarea que el usuario te haya pedido, el paso "Completar los docs" (c) de la skill sdd-bootstrap: orquestá subagentes en paralelo (uno medio/fuerte para arquitectura y negocio, acotado a .sdd/QUESTIONS.md, y uno rápido de solo lectura por entidad y por módulo pendiente). Si esa skill no está disponible en tu runtime, leé su SKILL.md (carpeta sdd-bootstrap) y aplicá ese mismo protocolo.');
  } else if (openQ > 0) {
    console.log(`\nLa documentación quedó como esqueleto (${openQ} preguntas abiertas${srcs ? '; fuentes detectadas: ' + srcs : ''}).`);
    console.log('Tu agente debe completarla en su primera sesión. Para forzarlo ya, decile:');
    console.log('  "Completá la documentación de .sdd/ (placeholders ❓ en .sdd/c4/ y .sdd/domain.md)');
    console.log('   aplicando el paso \'Completar los docs\' (c) de la skill sdd-bootstrap: NO lo hagas');
    console.log('   en este mismo contexto, orquestá subagentes en paralelo (uno medio/fuerte para');
    console.log('   arquitectura y negocio acotado a .sdd/QUESTIONS.md, y uno rápido de solo lectura');
    console.log('   por entidad y por módulo pendiente). Si no encontrás esa skill, leé su SKILL.md');
    console.log('   (carpeta sdd-bootstrap) y aplicá ese mismo protocolo."');
  }

  console.log('\n━━━ setup completo ━━━');
  console.log('· Los agentes ya ven la arquitectura, el catálogo y el flujo SDD (AGENTS.md / skill / rules).');
  console.log('· `sdd validate` corre solo en cada commit (desactivable en .sdd/config.json).');
}
