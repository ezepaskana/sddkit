import { join } from 'node:path';
import { readJSON, writeJSON } from './fsutil.js';

export function loadCatalog(root) {
  return readJSON(join(root, '.sdd', 'catalog.json')) || { version: 1, decisions: [] };
}

export function saveCatalog(root, cat) {
  writeJSON(join(root, '.sdd', 'catalog.json'), cat);
}

export function renderCatalogMd(cat) {
  if (!cat.decisions.length) {
    return '_Sin decisiones registradas aún. Si detectás más de una forma de hacer lo mismo, preguntale al dev cuál es la canónica y pedile que la registre con `sdd decide <topic> <variante> --why="..."`. Mientras tanto, seguí el estilo dominante del código existente._';
  }
  return cat.decisions.map((d) => {
    const legacy = Object.keys(d.legacy || {}).length
      ? ` Existe código legacy con otras variantes (${Object.entries(d.legacy).map(([k, v]) => `${k}: ${v} archivos`).join(', ')}): NO lo migres salvo pedido explícito, pero NUNCA escribas código nuevo con esas variantes.`
      : '';
    return `- **${d.topic}** → usar siempre \`${d.chosen}\` _(decidido ${d.date})_. ${d.why ? 'Razón: ' + d.why + '.' : ''}${legacy}`;
  }).join('\n');
}

/** Registra una decisión de convención. Usado por `sdd decide` y el wizard de `sdd setup`. */
export function recordDecision(root, patterns, topic, chosen, why) {
  const t = patterns.find((p) => p.topic === topic);
  if (!t) throw new Error(`Topic desconocido: "${topic}". Disponibles: ${patterns.map((p) => p.topic).join(', ')}`);
  const variant = t.variants.find((v) => v.id === chosen);
  if (!variant) throw new Error(`Variante desconocida: "${chosen}". Detectadas: ${t.variants.map((v) => v.id).join(', ')}`);
  const legacy = {};
  for (const v of t.variants) if (v.id !== chosen) legacy[v.id] = v.count;
  const date = new Date().toISOString().slice(0, 10);
  const cat = loadCatalog(root);
  cat.decisions = cat.decisions.filter((d) => d.topic !== topic);
  cat.decisions.push({ topic, chosen, why: String(why || ''), date, legacy });
  saveCatalog(root, cat);
  return { cat, legacy, date };
}
