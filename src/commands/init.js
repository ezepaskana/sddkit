import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { symlinkSync, unlinkSync, lstatSync } from 'node:fs';
import { detectAgentEnv, detectStack } from '../lib/detect.js';
import { walk, write, read, existsSync, listDirs } from '../lib/fsutil.js';
import { loadCatalog } from '../lib/catalog.js';
import { upsertAgentsMd } from '../lib/agentsmd.js';
import { installPreCommit, installPostCommit } from '../lib/hooks.js';
import { ensureBranchingPolicy } from '../lib/branching.js';
import { CURSOR_RULE } from '../templates.js';
import { installSkills, availableSkills, globalBase } from '../lib/skills.js';
import { VERSION } from '../version.js';

/** Niveles de modelo según el agente detectado. Claude Code: aliases estables (no envejecen). */
function modelsFor(env) {
  const hasClaude = env.some((e) => e.path.startsWith('.claude') || e.path === 'CLAUDE.md');
  if (hasClaude || env.length === 0) {
    return {
      rapido: 'haiku',
      medio: 'sonnet',
      fuerte: 'opus',
      _nota: 'Aliases de Claude Code para delegar pasos del plan via subagentes (Task tool). El agente debe verificar en su primer arranque que estos modelos existan en su runtime y ajustarlos si no.',
    };
  }
  return {
    rapido: '(completar: modelo rápido/barato de tu agente)',
    medio: '(completar: modelo balanceado)',
    fuerte: '(completar: modelo más capaz)',
    _nota: 'Completar con los modelos disponibles en tu agente. El agente puede hacerlo solo en su primer arranque.',
  };
}

export async function init(root, flags = {}) {
  const files = walk(root);
  const stack = detectStack(root, files);
  const env = detectAgentEnv(root);
  const date = new Date().toISOString().slice(0, 10);

  if (!flags.quiet) console.log(`\nsddkit init — ${stack.name}\n`);
  if (!flags.silent) {
    if (env.length === 0) {
      console.log('Entorno: desde cero (sin configuración previa de agentes) → set completo con defaults.');
    } else {
      console.log('Entorno existente detectado → modo merge (no se pisa nada):');
      for (const e of env) console.log(`  • ${e.label}  →  ${e.path}`);
    }
  }

  const actions = [];
  const skipped = [];

  // 1. Config (incluye el switch del hook pre-commit)
  const cfgPath = join(root, '.sdd', 'config.json');
  if (!existsSync(cfgPath) || flags.force) {
    write(cfgPath, JSON.stringify({
      version: VERSION,
      createdAt: date,
      detectedAgents: env.map((e) => e.path),
      hooks: { preCommit: true, autoPublish: true },
      models: modelsFor(env),
      skills: flags.global ? 'global' : 'local',
    }, null, 2) + '\n');
    actions.push('.sdd/config.json creado (models rapido/medio/fuerte + alcance de skills)');
  } else {
    // Migración: configs anteriores (models faltante, hooks.autoPublish faltante y/o versión vieja).
    const cfg = JSON.parse(read(cfgPath));
    let migrated = false;
    if (!cfg.models) { cfg.models = modelsFor(env); migrated = true; }
    if (!cfg.hooks) { cfg.hooks = { preCommit: true, autoPublish: true }; migrated = true; }
    else if (cfg.hooks.autoPublish === undefined) { cfg.hooks.autoPublish = true; migrated = true; }
    if (cfg.version !== VERSION) { cfg.version = VERSION; migrated = true; }
    if (migrated) {
      write(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
      actions.push(`.sdd/config.json migrado a v${VERSION}`);
    } else {
      skipped.push('.sdd/config.json al día');
    }
  }

  // 2. AGENTS.md (superficie multi-agente)
  actions.push('AGENTS.md ' + upsertAgentsMd(root, stack, loadCatalog(root), date));

  // 3. Skills SDD (una carpeta por fase: definición + templates + ejemplos + referencias).
  //    Alcance elegido por el dev: local (este repo, versionadas en git) o global (toda la máquina).
  const cfgNow = JSON.parse(read(cfgPath));
  let scope = flags.global ? 'global' : flags.local ? 'local' : (cfgNow.skills || 'local');
  if (cfgNow.skills !== scope) { cfgNow.skills = scope; write(cfgPath, JSON.stringify(cfgNow, null, 2) + '\n'); }
  const targetBase = scope === 'global' ? globalBase() : root;
  // sdd-bootstrap es global por naturaleza (detección de repos sin configurar): no se duplica en local.
  const names = scope === 'global' ? null : availableSkills().filter((n) => n !== 'sdd-bootstrap');
  const installed = installSkills(targetBase, names);
  actions.push(`skills SDD instaladas/actualizadas en alcance ${scope}: ${installed.join(', ')}`);
  const others = listDirs(join(root, '.claude', 'skills')).filter((d) => !d.startsWith('sdd-'));
  if (others.length && !flags.silent) console.log(`Skills existentes conservadas (revisá solapamientos): ${others.join(', ')}`);

  // 4. Rule de Cursor
  const hasCursor = env.some((e) => e.path.startsWith('.cursor'));
  if (hasCursor || flags.cursor) {
    const cp = join(root, '.cursor', 'rules', 'sdd.mdc');
    const curC = read(cp);
    if (curC !== CURSOR_RULE) {
      write(cp, CURSOR_RULE);
      actions.push(curC === null ? '.cursor/rules/sdd.mdc instalada (alwaysApply)' : '.cursor/rules/sdd.mdc actualizada');
    } else {
      skipped.push('.cursor/rules/sdd.mdc al día');
    }
  }

  // 5. CLAUDE.md: symlink a AGENTS.md para evitar duplicación
  const cmPath = join(root, 'CLAUDE.md');
  const agentsMdPath = 'AGENTS.md';
  try {
    const stat = lstatSync(cmPath);
    // Si es un symlink que apunta a AGENTS.md, está al día
    if (stat.isSymbolicLink()) {
      skipped.push('CLAUDE.md: symlink a AGENTS.md al día');
    } else {
      // Si existe pero no es symlink, migrar a symlink
      unlinkSync(cmPath);
      symlinkSync(agentsMdPath, cmPath);
      actions.push('CLAUDE.md: migrado a symlink a AGENTS.md');
    }
  } catch (err) {
    // No existe, crear symlink
    if (err.code === 'ENOENT') {
      symlinkSync(agentsMdPath, cmPath);
      actions.push('CLAUDE.md: creado como symlink a AGENTS.md');
    } else {
      throw err;
    }
  }

  // 6. Hooks pre-commit y post-commit automáticos (desactivables en config)
  actions.push(installPreCommit(root));
  actions.push(installPostCommit(root));

  // 7. Política de branding (.sdd/branching.md): si no existe, se pregunta
  //    (terminal interactiva) o se usan los defaults de sddkit (modo agente).
  {
    const interactive = process.stdin.isTTY && !flags.agent && !flags.quiet;
    let rl = null;
    if (interactive) rl = createInterface({ input: process.stdin, output: process.stdout });
    const { created, policy } = await ensureBranchingPolicy(root, { rl });
    if (rl) rl.close();
    if (created) actions.push(`.sdd/branching.md creado — branching policy: ${policy.convención} + ${policy.flujo} + ${policy.patrón}`);
    else skipped.push('.sdd/branching.md al día');
  }

  if (!flags.silent) {
    console.log('Acciones:');
    for (const a of actions) console.log('  ✓ ' + a);
    for (const s of skipped) console.log('  – ' + s);
    if (!flags.quiet) console.log('\nTip: `sdd setup` hace esto + escaneo + decisiones de convenciones, todo en un paso.');
  }

  return { actions, skipped };
}
