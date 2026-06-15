import { join } from 'node:path';
import { read, readJSON, write, writeJSON, existsSync } from '../lib/fsutil.js';
import { openFile, openEnabled } from '../lib/open.js';
import { readFileSync } from 'node:fs';
import { PKG_SKILLS } from '../lib/skills.js';
import { loadCatalog } from '../lib/catalog.js';
import {
  readPolicy, getActiveBranching, getCurrentBranch, verifyBranchPushed,
  detectGitPlatform, buildPRCommand, buildManualPRInstructions, isPRToolAvailable,
} from '../lib/branching.js';
import { applyBranchingToPlan, originBranch } from '../lib/plan-generator.js';
import { runExecuteGate } from './execute.js';
import { spawnSync } from 'node:child_process';

const STATUSES = ['draft', 'specified', 'planned', 'in-progress', 'paused', 'done', 'cancelled'];

const tasksDir = (root) => join(root, '.sdd', 'tasks');
const loadIndex = (root) => readJSON(join(tasksDir(root), 'index.json')) || { nextId: 1, tasks: [] };
const saveIndex = (root, idx) => writeJSON(join(tasksDir(root), 'index.json'), idx);

function slugify(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-') || 'tarea';
}

/** Progreso de una tarea: pasos done/total + próximo paso pendiente (con su detalle), parseados de plan.md. */
function progress(root, t) {
  // Ignorar bloques de código (el template incluye un ejemplo de formato dentro de un fence).
  const plan = (read(join(tasksDir(root), t.dir, 'plan.md')) || '').replace(/```[\s\S]*?```/g, '');
  const lines = plan.split('\n');
  let total = 0; let done = 0; let next = null; const nextDetail = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!/^- \[[ x]\] /.test(l)) continue;
    total++;
    if (l.startsWith('- [x]')) { done++; continue; }
    if (next === null) {
      next = l.slice(6).replace(/\*\*/g, '').trim();
      for (let j = i + 1; j < lines.length && /^\s+- /.test(lines[j]); j++) {
        nextDetail.push(lines[j].replace(/\*\*/g, '').trim());
      }
    }
  }
  return { total, done, next, nextDetail };
}

function requirementTemplate(id, text, date) {
  return `# Requisito original — tarea ${id}

> Capturado verbatim el ${date}. **No editar este archivo**: el refinamiento va en spec.md.

${text}
`;
}




/** Carga un template desde la carpeta de la skill correspondiente (fuente única). */
function loadTemplate(skill, file, vars) {
  let t = readFileSync(join(PKG_SKILLS, skill, 'templates', file), 'utf8');
  for (const [k, v] of Object.entries(vars)) t = t.split('__' + k + '__').join(v);
  return t;
}
const specTemplate = (id, title) => loadTemplate('sdd-specify', 'spec.md', { ID: id, TITLE: title });
const planTemplate = (id, title) => loadTemplate('sdd-plan', 'plan.md', { ID: id, TITLE: title });
const retroTemplate = (id, title, date) => loadTemplate('sdd-close', 'retro.md', { ID: id, TITLE: title, DATE: date });

const LEARNINGS_TEMPLATE = `# Aprendizajes del proyecto

> Memoria curada del repo, alimentada por las retros de cada tarea (\`.sdd/tasks/*/retro.md\`). **Los agentes DEBEN leer este archivo antes de implementar** y actualizarlo al cerrar cada tarea.
>
> Reglas de curado (responsabilidad del agente que cierra una tarea): entradas accionables y específicas, nunca genéricas; fusionar las similares; podar las obsoletas; **máximo ~30 entradas** — esto es contexto que se inyecta en cada tarea, la calidad importa más que la cantidad.

## Gotchas y convenciones aprendidas

_(vacío aún — se llena al cerrar tareas)_

## Decisiones de producto/dominio aprendidas

_(vacío aún)_
`;


/** Extrae el bloque completo del paso N de plan.md (línea checkbox + sub-ítems). */
function stepBlock(root, t, n) {
  const plan = (read(join(tasksDir(root), t.dir, 'plan.md')) || '').replace(/```[\s\S]*?```/g, '');
  const lines = plan.split('\n');
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!/^- \[[ x]\] /.test(lines[i])) continue;
    count++;
    if (count !== n) continue;
    const block = [lines[i]];
    for (let j = i + 1; j < lines.length && /^\s+(-|\d+\.) /.test(lines[j]); j++) block.push(lines[j]);
    return block.join('\n');
  }
  return null;
}

/** Extrae una sección '## Título' de un markdown (hasta el próximo ## o ---). */
function mdSection(txt, title) {
  const re = new RegExp('^## ' + title + '\\s*$', 'm');
  const m = re.exec(txt);
  if (!m) return null;
  const rest = txt.slice(m.index);
  const end = rest.slice(3).search(/^(## |---)/m);
  return (end === -1 ? rest : rest.slice(0, end + 3)).trim();
}

export async function task(root, pos, flags) {
  const [sub, ...rest] = pos;
  const date = new Date().toISOString().slice(0, 10);

  if (sub === 'new') {
    const text = rest.join(' ').trim();
    if (!text) throw new Error('Uso: sdd task new "<requisito tal cual lo escribió el dev>"');
    const idx = loadIndex(root);
    const id = String(idx.nextId).padStart(3, '0');
    const title = text.length > 60 ? text.slice(0, 60) + '…' : text;
    const dir = `${id}-${slugify(text)}`;
    write(join(tasksDir(root), dir, 'requirement.md'), requirementTemplate(id, text, date));
    write(join(tasksDir(root), dir, 'spec.md'), specTemplate(id, title));
    write(join(tasksDir(root), dir, 'plan.md'), planTemplate(id, title));
    idx.tasks.push({ id, dir, title, status: 'draft', createdAt: date, updatedAt: date });
    idx.nextId += 1;
    saveIndex(root, idx);
    const abs = join(tasksDir(root), dir);
    console.log(`✓ Tarea ${id} creada:`);
    console.log(`  ${join(abs, 'requirement.md')}`);
    console.log(`  ${join(abs, 'spec.md')}`);
    console.log(`  ${join(abs, 'plan.md')}`);
    console.log(`
AGENTE — flujo obligatorio para esta tarea:
 1. ANALIZAR (críticamente)  leé .sdd/c4/, el catálogo y el código. El requisito es una HIPÓTESIS:
          ¿ya existe?, ¿hay algo más simple?, ¿qué supuestos trae?, ¿riesgos? Completá el
          "Análisis crítico" de spec.md y cerrá con recomendación honesta (proceder/con
          cambios/reconsiderar). Si recomendás reconsiderar, discutilo con el dev ANTES de seguir.
 2. CLARIFICAR  preguntale al dev TODO lo que haga falta (sin límite, en tandas, priorizando lo
          que cambia el alcance). Registrá cada respuesta en spec.md.
 3. SPEC  completá la spec refinada (historia, criterios EARS, fuera de alcance, impacto) y la
          MÉTRICA de impacto (baseline + resultado esperado; sin baseline → instrumentar es el
          paso 1 del plan). Luego corré:
          sdd task status ${id} specified   ← esto le ABRE spec.md al dev en su editor
          Pedile aprobación en el chat; con su ok marcá la línea de aprobación en spec.md.
 4. PLAN  completá plan.md con pasos CHICOS (tests antes que implementación, archivos por paso,
          dependencias, nivel de modelo por paso (rapido/medio/fuerte, ver
          .sdd/config.json → models), verificación) y corré:
          sdd task status ${id} planned     ← esto le ABRE plan.md al dev
          Pedile aprobación en el chat antes de ejecutar.
 5. EJECUTAR  sdd task status ${id} in-progress. Sos el ORQUESTADOR: no implementes vos.
          Cada paso (incluidos los fuerte) corre en un SUBAGENTE fresco con el modelo de su
          nivel (.sdd/config.json → models), que lee los archivos de la tarea él mismo.
          Verificá VOS el resultado de cada paso antes de marcarlo. Al terminar
          CADA paso: marcá su checkbox en plan.md y verificá según su criterio.
 6. PAUSAR/RETOMAR  el dev puede cortar cuando quiera: sdd task status ${id} paused.
          Para retomar (otra sesión, otro agente): sdd task show ${id} → te dice el próximo paso.
 7. CERRAR  actualizá .sdd/c4/ si cambió la arquitectura y corré: sdd task status ${id} done
          El cierre exige la RETRO (retro.md): resultado de la métrica vs baseline, desvíos del
          plan, aprendizajes. Cosechá los aprendizajes generales a .sdd/LEARNINGS.md (curado,
          máx ~30 entradas) — así cada tarea hace mejor a las siguientes.`);
    return;
  }

  if (sub === 'list') {
    const idx = loadIndex(root);
    if (!idx.tasks.length) { console.log('Sin tareas SDD. El agente las crea con: sdd task new "<requisito>"'); return; }
    console.log('\nID   Estado       Pasos  Título');
    for (const t of idx.tasks) {
      const p = progress(root, t);
      console.log(`${t.id}  ${t.status.padEnd(11)}  ${String(p.done).padStart(2)}/${String(p.total).padEnd(3)} ${t.title}`);
    }
    const active = idx.tasks.filter((t) => ['in-progress', 'paused'].includes(t.status));
    if (active.length) console.log(`\nRetomar: sdd task show ${active[0].id}`);
    return;
  }

  if (sub === 'show') {
    const idx = loadIndex(root);
    const t = idx.tasks.find((x) => x.id === rest[0]);
    if (!t) throw new Error(`Tarea no encontrada: "${rest[0]}". Listá con: sdd task list`);
    const p = progress(root, t);
    console.log(`\nTarea ${t.id} — ${t.title}`);
    const absT = join(tasksDir(root), t.dir);
    console.log(`Estado: ${t.status} · Pasos: ${p.done}/${p.total}`);
    console.log(`  ${join(absT, 'requirement.md')}`);
    console.log(`  ${join(absT, 'spec.md')}`);
    console.log(`  ${join(absT, 'plan.md')}`);
    if (p.next) {
      console.log(`\nPróximo paso pendiente:\n  ${p.next}`);
      for (const d of p.nextDetail) console.log(`    ${d}`);
      console.log(`\nAGENTE para retomar: leé requirement.md + spec.md + plan.md de la carpeta, ejecutá SOLO el próximo paso, marcá su checkbox y verificá. Si el estado es "paused", primero: sdd task status ${t.id} in-progress`);
    } else if (p.total > 0) {
      console.log('\nTodos los pasos completados. Si la arquitectura cambió actualizá .sdd/c4/ y cerrá: sdd task status ' + t.id + ' done');
    } else {
      console.log('\nEl plan todavía no tiene pasos — completar plan.md (ver contrato en spec.md).');
    }
    return;
  }

  if (sub === 'plan') {
    // Integra la política de branding en plan.md: sección "Rama de trabajo" +
    // Paso 1 auto-generado (`git checkout -b <rama>`), renumerando los pasos
    // originales a partir del Paso 2.
    const idx = loadIndex(root);
    const t = idx.tasks.find((x) => x.id === rest[0]);
    if (!t) throw new Error(`Tarea no encontrada: "${rest[0]}". Listá con: sdd task list`);
    const planPath = join(tasksDir(root), t.dir, 'plan.md');
    const plan = read(planPath);
    if (plan === null) throw new Error(`No existe plan.md para la tarea ${t.id}: ${planPath}`);

    if (plan.includes('## Rama de trabajo')) {
      console.log(`✓ Tarea ${t.id}: plan.md ya tiene la sección "Rama de trabajo" — no se modifica.`);
      console.log(`  ${planPath}`);
      return;
    }

    // .sdd/branching.md no existe (o está malformado) → usar defaults + aviso.
    const usingDefaults = readPolicy(root) === null;
    const policy = usingDefaults ? null : getActiveBranching(root);

    const updated = applyBranchingToPlan(plan, t.id, t.title, policy, { usingDefaults });
    write(planPath, updated);

    console.log(`✓ Tarea ${t.id}: plan with branching — sección "Rama de trabajo" + Paso 1 (git checkout -b) generados.`);
    console.log(`  ${planPath}`);
    if (usingDefaults) {
      console.log('  ⚠️ Política de branching no definida. Usamos defaults. Correr `sdd branching-policy --define` para personalizarlo.');
    }
    if (openEnabled(root, flags)) openFile(planPath);
    return;
  }

  if (sub === 'brief') {
    // Paquete mínimo de contexto para el subagente de UN paso: el CLI recorta, el LLM no decide qué leer.
    const idx = loadIndex(root);
    const t = idx.tasks.find((x) => x.id === rest[0]);
    if (!t) throw new Error(`Tarea no encontrada: "${rest[0]}"`);
    const p = progress(root, t);
    const n = rest[1] ? parseInt(rest[1], 10) : (p.done + 1);
    const block = stepBlock(root, t, n);
    if (!block) throw new Error(`Paso ${n} no encontrado en plan.md`);
    const spec = read(join(tasksDir(root), t.dir, 'spec.md')) || '';
    const refined = mdSection(spec, 'Spec refinada') || '(spec refinada no encontrada — leé spec.md completo)';
    // Solo las reglas BR citadas en la spec, no todo domain.md
    const brIds = [...new Set((spec.match(/BR-\d+/g) || []))];
    const dom = read(join(root, '.sdd', 'domain.md')) || '';
    const brLines = brIds.map((id) => {
      const all = dom.match(new RegExp('^- \\*\\*' + id + '\\*\\*.+$', 'gm')) || [];
      return all.find((l) => !l.includes('❓') && !l.includes('ejemplo de formato')) || all[0];
    }).filter(Boolean);
    const cat = loadCatalog(root);
    console.log(`# Brief — tarea ${t.id}, paso ${n} (generado por sdd task brief: contexto mínimo del paso)\n`);
    console.log('## Tu paso (lo ÚNICO que implementás)\n\n' + block + '\n');
    console.log(refined + '\n');
    if (brLines.length) console.log('## Reglas de negocio citadas (vinculantes)\n\n' + brLines.join('\n') + '\n');
    if (cat.decisions.length) console.log('## Catálogo (vinculante)\n\n' + cat.decisions.map((d) => `- ${d.topic} → usar ${d.chosen}`).join('\n') + '\n');
    console.log('Reglas: no toques archivos fuera de los del paso sin reportarlo; no "mejores" fuera de alcance; si falta una decisión, frená y devolvé la pregunta; reportá archivos tocados + resultado de la verificación.');
    return;
  }

  if (sub === 'verify') {
    // Verificación del paso: si es `cmd:`, se ejecuta literal (exit code = verdad). Exit 3 = manual.
    const idx = loadIndex(root);
    const t = idx.tasks.find((x) => x.id === rest[0]);
    if (!t) throw new Error(`Tarea no encontrada: "${rest[0]}"`);
    const n = parseInt(rest[1], 10);
    if (!n) throw new Error('Uso: sdd task verify <id> <paso>');
    const block = stepBlock(root, t, n);
    if (!block) throw new Error(`Paso ${n} no encontrado en plan.md`);
    const vm = block.match(/Verificación:\*{0,2}\s*(.+)$/m);
    if (!vm) throw new Error(`El paso ${n} no tiene línea de Verificación.`);
    let v = vm[1].trim();
    // Si el valor viene envuelto en un code span (`cmd: ...`), extraer su contenido antes de chequear el prefijo.
    const codeSpan = v.match(/^`([^`]*)`/);
    if (codeSpan) v = codeSpan[1].trim();
    if (v.startsWith('cmd:')) {
      const cmd = v.slice(4).trim();
      console.log(`[verify ${t.id}/${n}] $ ${cmd}`);
      const { spawnSync } = await import('node:child_process');
      const r = spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: root });
      process.exit(r.status ?? 1);
    }
    console.log(`[verify ${t.id}/${n}] verificación manual (no es cmd:):\n  ${v}`);
    process.exit(3);
  }

  if (sub === 'status') {
    const [id, status] = rest;
    if (!id || !STATUSES.includes(status)) {
      throw new Error(`Uso: sdd task status <id> <${STATUSES.join('|')}>`);
    }
    const idx = loadIndex(root);
    const t = idx.tasks.find((x) => x.id === id);
    if (!t) throw new Error(`Tarea no encontrada: "${id}"`);
    const p = progress(root, t);
    if (status === 'done' && p.total > 0 && p.done < p.total) {
      throw new Error(`No se puede cerrar: ${p.total - p.done} paso(s) sin marcar en plan.md. Completalos o canceá la tarea.`);
    }
    if (status === 'done') {
      // Gate de retro: el cierre alimenta el aprendizaje del framework.
      const rp = join(tasksDir(root), t.dir, 'retro.md');
      const rc = read(rp);
      if (rc === null) {
        write(rp, retroTemplate(t.id, t.title, date));
        if (openEnabled(root, flags)) openFile(rp);
        throw new Error(`Falta la retro. Creé la plantilla:\n  ${rp}\nAGENTE: completala (resultado de la métrica, desvíos del plan, aprendizajes) con input del dev, cosechá los aprendizajes generales hacia .sdd/LEARNINGS.md, y volvé a correr: sdd task status ${id} done`);
      }
      if (rc.includes('…')) {
        throw new Error(`La retro tiene campos sin completar (…):\n  ${rp}\nCompletá todos los campos antes de cerrar.`);
      }
      const lp = join(root, '.sdd', 'LEARNINGS.md');
      if (read(lp) === null) write(lp, LEARNINGS_TEMPLATE);
    }
    t.status = status;
    t.updatedAt = date;
    saveIndex(root, idx);
    console.log(`✓ Tarea ${id} → ${status}${status === 'paused' ? ` (retomar: sdd task show ${id})` : ''}`);
    if (status === 'done') {
      console.log('  ✓ Retro registrada. AGENTE: verificá que los aprendizajes generales estén en .sdd/LEARNINGS.md (curado: fusionar similares, podar viejos, máx ~30) y que las preguntas recurrentes hayan sido promovidas a los docs C4.');
    }
    // Gates de revisión: mostrar el archivo a leer y abrirlo (es más cómodo que la consola).
    const reviewFile = status === 'specified' ? 'spec.md' : status === 'planned' ? 'plan.md' : null;
    if (reviewFile) {
      const fp = join(tasksDir(root), t.dir, reviewFile);
      console.log(`\n📄 Para revisar y aprobar: ${fp}`);
      if (openEnabled(root, flags)) {
        openFile(fp);
        console.log('   (abierto con tu editor por defecto — desactivable con --no-open o en .sdd/config.json: "ui": {"openFiles": false})');
      }
    }
    return;
  }

  if (sub === 'execute') {
    // Gate de pre-ejecución (branching): .git existe, Paso 1 (git checkout -b
    // <rama>) corre y la rama activa coincide con la esperada. Bloqueante: si
    // falla, los pasos 2+ (subagentes vía sdd task brief) no deben lanzarse.
    const idx = loadIndex(root);
    const t = idx.tasks.find((x) => x.id === rest[0]);
    if (!t) throw new Error(`Tarea no encontrada: "${rest[0]}". Listá con: sdd task list`);

    const result = runExecuteGate(root, t.id);
    if (!result.ok) {
      for (const e of result.errors) console.error('✖ ' + e);
      throw new Error(`sdd task execute ${t.id}: gate de pre-ejecución falló. Resolvé el problema arriba y reintentá.`);
    }

    console.log(`✓ Tarea ${t.id}: Paso 1 OK — rama activa: ${result.branch.current}`);
    console.log(`  Listo para ejecutar los pasos 2+: sdd task brief ${t.id} <paso>`);
    return;
  }

  if (sub === 'close') {
    // Integración branching: rama pusheada + PR (draft) en la plataforma detectada,
    // o degradación a instrucciones de PR manual. No modifica el status de la tarea
    // (eso lo hace `sdd task status <id> done`, con el gate de retro).
    const idx = loadIndex(root);
    const t = idx.tasks.find((x) => x.id === rest[0]);
    if (!t) throw new Error(`Tarea no encontrada: "${rest[0]}". Listá con: sdd task list`);

    const branch = getCurrentBranch(root);
    if (!branch) {
      throw new Error('No se pudo determinar la rama actual (`git branch --show-current`). ¿Corriste `git init`?');
    }

    const policy = getActiveBranching(root);
    const base = originBranch(policy);

    const pushCheck = verifyBranchPushed(root, branch);
    if (!pushCheck.pushed) {
      console.log(`Rama actual: ${branch}`);
      console.log(`⚠️ Branch not pushed to origin. Push con \`git push origin ${branch}\` y vuelve a correr \`sdd task close\`.`);
      return;
    }

    const title = `Tarea ${t.id}: ${t.title}`;
    const body = `Implementa la tarea ${t.id} (\`.sdd/tasks/${t.dir}/\`).\n\nVer spec.md, plan.md y retro.md en esa carpeta para detalle completo.`;

    const platform = detectGitPlatform(root);
    let prLine;
    if (platform !== 'unknown' && isPRToolAvailable(platform, root)) {
      const { cmd, args } = buildPRCommand(branch, base, title, body, platform);
      const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
      if (r.error || r.status !== 0) {
        const stderr = r.stderr ? String(r.stderr).trim() : (r.error?.message || 'error desconocido');
        const manual = buildManualPRInstructions(root, branch, base);
        prLine = `# PR: no se pudo crear automáticamente (${platform}: ${stderr}). ${manual.message}`;
      } else {
        const out = (r.stdout || '').trim();
        const urlMatch = out.match(/https?:\/\/\S+/);
        const url = urlMatch ? urlMatch[0] : out;
        const idMatch = url.match(/\/(\d+)\s*$/);
        prLine = idMatch ? `# PR: #${idMatch[1]} (draft) — ${url}` : `# PR: (draft) — ${url}`;
      }
    } else {
      const manual = buildManualPRInstructions(root, branch, base);
      prLine = `# PR: ${manual.message}`;
    }

    console.log(`\nReporte de cierre — tarea ${t.id}`);
    console.log(`# Rama: ${branch} → ${base}`);
    console.log(prLine);
    console.log('# Próximo: revisión manual y merge del PR (no automático).');
    return;
  }

  throw new Error('Uso: sdd task <new|list|show|plan|status|brief|verify|execute|close> …');
}
