import { join } from 'node:path';
import { read, readJSON } from '../lib/fsutil.js';
import { createGraphStore } from '../lib/graphstore/index.js';

const grab = (txt, re) => (txt.match(re) || []);

/**
 * `sdd context` — one-pager destilado para arrancar una tarea.
 * Extracción determinística: solo las líneas con señal (sin diagramas,
 * checkboxes abiertos ni prosa). Un archivo corto en vez de seis largos.
 */
export async function context(root) {
  const out = [];
  const cfg = readJSON(join(root, '.sdd', 'config.json'));
  if (!cfg) throw new Error('Repo sin sddkit — corré `sdd setup`.');

  const ctx = read(join(root, '.sdd', 'c4', 'context.md')) || '';
  const stackLine = (ctx.match(/\*\*Stack detectado:\*\* (.+)/) || [])[1];
  const descLine = (ctx.match(/\*\*Descripción:\*\* (.+)/) || [])[1];
  out.push('# Contexto destilado (generado por `sdd context` — fuente: .sdd/)');
  if (descLine && !descLine.includes('pendiente')) out.push(`Sistema: ${descLine}`);
  if (stackLine) out.push(`Stack: ${stackLine}`);

  // Estado de publicación en el grafo de impacto (Fase 2, BR-016 criterio 8).
  // Degradación silenciosa (BR-012): si el grafo no está configurado, falta
  // una dependencia opcional, o no hay canonicalName, no se agrega nada.
  const canonicalName = ctx.match(/\*\*Sistema:\*\*\s*(.+)/)?.[1]?.trim();
  if (cfg?.graph?.driver && canonicalName) {
    const store = await createGraphStore(cfg);
    if (store.ok === true) {
      const sys = store.querySystem(canonicalName);
      if (sys) {
        out.push(`Publicado: ${sys.publishedAt} (${sys.commitHash ? sys.commitHash.slice(0, 7) : '(sin git)'})`);
      } else {
        out.push('Sin publicar — correr `sdd publish`');
      }
      store.close();
    }
  }

  const cont = read(join(root, '.sdd', 'c4', 'containers.md')) || '';
  const rows = grab(cont, /^\| `[^`]+` \|.+$/gm);
  if (rows.length) out.push('\n## Contenedores\n' + rows.join('\n'));

  const comp = read(join(root, '.sdd', 'c4', 'components.md')) || '';
  const crows = grab(comp, /^\| `[^`]+` \| \d+ \| (?!❓).+\|$/gm);
  if (crows.length) out.push('\n## Módulos (con rol conocido)\n' + crows.join('\n'));

  const dom = read(join(root, '.sdd', 'domain.md')) || '';
  const brs = grab(dom, /^- \*\*BR-\d+\*\*.+$/gm).filter((l) => !l.includes('❓'));
  if (brs.length) out.push('\n## Reglas de negocio (vinculantes)\n' + brs.join('\n'));

  const cat = readJSON(join(root, '.sdd', 'catalog.json'));
  if (cat?.decisions?.length) {
    out.push('\n## Catálogo (vinculante)\n' + cat.decisions.map((d) =>
      `- ${d.topic} → ${d.chosen}${d.why ? ' (' + d.why + ')' : ''}`).join('\n'));
  }

  const learn = read(join(root, '.sdd', 'LEARNINGS.md')) || '';
  const entries = grab(learn, /^- .+$/gm).filter((l) => !l.startsWith('- [ ]'));
  if (entries.length) out.push('\n## Aprendizajes\n' + entries.join('\n'));

  const { readdirSync, existsSync } = await import('node:fs');
  const dDir = join(root, '.sdd', 'decisions');
  if (existsSync(dDir)) {
    const files = readdirSync(dDir).filter((f) => /^\d{4}-/.test(f) && !f.startsWith('0000'));
    if (files.length) out.push('\n## ADRs vigentes\n' + files.map((f) => '- ' + f.replace('.md', '')).join('\n'));
  }

  const tidx = readJSON(join(root, '.sdd', 'tasks', 'index.json'));
  const active = (tidx?.tasks || []).filter((t) => ['in-progress', 'paused'].includes(t.status));
  if (active.length) out.push('\n## Tareas activas\n' + active.map((t) => `- ${t.id} (${t.status}): ${t.title}`).join('\n'));

  console.log(out.join('\n'));
}

/**
 * `sdd find <texto>` — ¿ya existe algo que hace esto? Búsqueda determinística
 * sobre el índice de capacidades, módulos, reglas y aprendizajes. Sin explorar con LLM.
 */
export async function find(root, pos) {
  const q = pos.join(' ').toLowerCase().trim();
  if (!q) throw new Error('Uso: sdd find <texto>');
  const hits = [];
  const pj = readJSON(join(root, '.sdd', 'patterns.json'));
  for (const e of pj?.capabilities?.endpoints || []) {
    if ((e.method + ' ' + e.path + ' ' + e.file).toLowerCase().includes(q)) {
      hits.push(`endpoint  ${e.method} ${e.path}  (${e.file})`);
    }
  }
  for (const c of pj?.capabilities?.consumptions || []) {
    const method = c.method ?? '?';
    if ((method + ' ' + c.target + ' ' + c.file).toLowerCase().includes(q)) {
      hits.push(`consumo   ${method} ${c.target}  (${c.file})`);
    }
  }
  const comp = read(join(root, '.sdd', 'c4', 'components.md')) || '';
  for (const l of grab(comp, /^\| `[^`]+` \|.+$/gm)) if (l.toLowerCase().includes(q)) hits.push('módulo    ' + l);
  const dom = read(join(root, '.sdd', 'domain.md')) || '';
  for (const l of grab(dom, /^- \*\*.+$/gm)) if (l.toLowerCase().includes(q)) hits.push('dominio   ' + l);
  const learn = read(join(root, '.sdd', 'LEARNINGS.md')) || '';
  for (const l of grab(learn, /^- .+$/gm)) if (l.toLowerCase().includes(q)) hits.push('learning  ' + l);

  if (!hits.length) console.log(`Sin coincidencias para "${q}" en capacidades/módulos/dominio/aprendizajes. (No prueba que no exista: confirmá con una búsqueda dirigida en el código si el análisis lo amerita.)`);
  else { console.log(`Coincidencias para "${q}":\n`); for (const h of hits) console.log('  ' + h); }
}
