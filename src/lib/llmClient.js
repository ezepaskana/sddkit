import { join } from 'node:path';

import Anthropic from '@anthropic-ai/sdk';

import { readJSON } from './fsutil.js';

// Defaults del ADR-0011 (detección LLM en CI/CD). Se pueden sobreescribir en
// `.sdd/config.json → llm` o, con prioridad máxima, por `opts` de la llamada.
const DEFAULTS = {
  model: 'claude-haiku-4-5-20251001',
  temperature: 0.1,
  maxRetries: 2,
  timeoutMs: 60000,
  maxTokens: 8192,
};

/**
 * Qué significa cada categoría documentable. Las claves son las categorías
 * soportadas hoy; una categoría desconocida igual funciona (viaja tal cual al
 * prompt, sin descripción extra).
 */
const CATEGORY_HINTS = {
  inputs: 'disparadores de proceso que el código EXPONE: endpoints HTTP, listeners de queue/topic, jobs programados, comandos CLI.',
  outputs: 'salidas que el código PRODUCE o CONSUME de afuera: llamadas HTTP salientes, escrituras a S3/FTP, mensajes publicados a una queue, escrituras a base de datos.',
  entidades: 'entidades de negocio que el sistema administra (modelos, agregados, tablas de dominio).',
  casos_de_uso: 'responsabilidades / casos de uso del sistema: qué puede hacer, en términos de negocio.',
};

/** Lee `.sdd/config.json → llm` de forma best-effort (nunca tira). */
function readLlmConfig(root) {
  const base = root || process.cwd();
  const cfg = readJSON(join(base, '.sdd', 'config.json'));
  const llm = cfg && typeof cfg === 'object' ? cfg.llm : null;
  return llm && typeof llm === 'object' ? llm : {};
}

/** Construye el cliente real del SDK de Anthropic (solo si no viene inyectado). */
function createDefaultClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('falta ANTHROPIC_API_KEY en el entorno');
  return new Anthropic({ apiKey });
}

/** Prompt de sistema para una categoría concreta. */
function buildSystemPrompt(category) {
  const name = typeof category === 'string' && category.trim() !== ''
    ? category.trim()
    : '(sin categoría)';
  const hint = CATEGORY_HINTS[name];
  return [
    `Sos un analizador de código que documenta la categoría \`${name}\` de un repositorio.`,
    '',
    hint ? `\`${name}\`: ${hint}` : `Documentá únicamente lo que corresponda a la categoría \`${name}\`.`,
    '',
    'Respondé ÚNICAMENTE con una lista Markdown: un bullet por ítem, cada línea empezando con "- ".',
    'Sin título, sin encabezados, sin texto introductorio, sin explicaciones, sin cercos de código.',
    `Si en estos archivos no hay nada de la categoría \`${name}\`, respondé con una respuesta COMPLETAMENTE VACÍA (string vacío).`,
    'Cada bullet debe ser corto, concreto y verificable contra el código recibido. No inventes.',
  ].join('\n');
}

/** Serializa los archivos a analizar en el prompt del usuario. */
function buildUserPrompt(category, files) {
  const list = Array.isArray(files) ? files : [];
  const blocks = list.map((f) => {
    const path = f?.path ?? '(sin path)';
    const content = f?.content ?? '';
    return `--- FILE: ${path} ---\n${content}`;
  });
  return [
    `Analizá los siguientes archivos y listá en Markdown los \`${category}\` que encuentres.`,
    '',
    blocks.join('\n\n'),
  ].join('\n');
}

/** Extrae el texto del primer bloque `text` de la respuesta del SDK. */
function extractText(response) {
  const blocks = response?.content;
  if (!Array.isArray(blocks)) throw new Error('respuesta del LLM sin `content`');
  const block = blocks.find((b) => b?.type === 'text' && typeof b.text === 'string');
  if (!block) throw new Error('respuesta del LLM sin bloque de texto');
  return block.text;
}

/** Quita cercos markdown (```markdown ... ```) si el modelo los agregó igual. */
function stripFences(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
}

/**
 * Una sección es válida si está vacía (la categoría no aparece en estos
 * archivos: resultado legítimo) o si tiene al menos una línea de bullet `- `.
 * Cualquier otra cosa (prosa, disculpas, JSON) es una respuesta que no sirve.
 */
function isValidSection(markdown) {
  if (markdown === '') return true;
  return markdown.split('\n').some((line) => line.trimStart().startsWith('- '));
}

/** Corre `promise` con un límite de tiempo; rechaza con un error de timeout. */
function withTimeout(promise, ms) {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve(promise);
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`timeout: el LLM no respondió en ${ms}ms`)),
      ms,
    );
    if (typeof timer?.unref === 'function') timer.unref();
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

function pick(value, fromConfig, fallback) {
  if (value !== undefined && value !== null) return value;
  if (fromConfig !== undefined && fromConfig !== null) return fromConfig;
  return fallback;
}

function reasonOf(err) {
  const msg = err?.message;
  return typeof msg === 'string' && msg.trim() !== '' ? msg : String(err);
}

/**
 * Invoca al LLM para generar, en Markdown, la sección de una `category`
 * (`inputs`, `outputs`, `entidades`, `casos_de_uso`) a partir de un set de
 * archivos.
 *
 * La respuesta se acepta si está vacía (nada de esa categoría en esos archivos)
 * o si es una lista de bullets `- `; en cualquier otro caso se reintenta hasta
 * `maxRetries` veces más. Nunca propaga excepciones: los errores se devuelven
 * como `{status:'failed', reason}` para que el caller degrade sin bloquear
 * (fallback no bloqueante de BR-053).
 *
 * @param {string} category Categoría a documentar.
 * @param {{path: string, content: string}[]} files Archivos a analizar.
 * @param {object} [opts] Opciones.
 * @param {object} [opts.client] Cliente inyectado (SDK de Anthropic o mock de tests).
 * @param {string} [opts.model] Modelo a usar; default `.sdd/config.json → llm.model`.
 * @param {number} [opts.temperature] Temperatura; default `.sdd/config.json → llm.temperature`.
 * @param {number} [opts.maxRetries] Reintentos ADICIONALES al primer intento.
 * @param {number} [opts.timeoutMs] Timeout por intento, en ms.
 * @param {number} [opts.maxTokens] Tope de tokens de salida.
 * @param {string} [opts.root] Raíz del repo para leer `.sdd/config.json`.
 * @returns {Promise<{status:'ok', markdown: string}|{status:'failed', reason: string}>}
 */
export async function generateSection(category, files, opts = {}) {
  const options = opts || {};
  const cfg = readLlmConfig(options.root);

  const model = pick(options.model, cfg.model, DEFAULTS.model);
  const temperature = pick(options.temperature, cfg.temperature, DEFAULTS.temperature);
  const maxRetries = pick(options.maxRetries, cfg.maxRetries, DEFAULTS.maxRetries);
  const timeoutMs = pick(options.timeoutMs, cfg.timeoutMs, DEFAULTS.timeoutMs);
  const maxTokens = pick(options.maxTokens, cfg.maxTokens, DEFAULTS.maxTokens);

  let client = options.client;
  if (!client) {
    try {
      client = createDefaultClient();
    } catch (err) {
      return { status: 'failed', reason: `no se pudo crear el cliente LLM: ${reasonOf(err)}` };
    }
  }

  const request = {
    model,
    temperature,
    max_tokens: maxTokens,
    system: buildSystemPrompt(category),
    messages: [{ role: 'user', content: buildUserPrompt(category, files) }],
  };

  const attempts = Math.max(0, Number(maxRetries) || 0) + 1;
  let reason = `el LLM no produjo una sección válida para \`${category}\``;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await withTimeout(client.messages.create(request), timeoutMs);
      const markdown = stripFences(extractText(response));
      if (isValidSection(markdown)) return { status: 'ok', markdown };
      reason = `la respuesta del LLM no es una lista Markdown de \`${category}\` (intento ${i + 1}/${attempts})`;
    } catch (err) {
      reason = `${reasonOf(err)} (intento ${i + 1}/${attempts})`;
    }
  }

  return { status: 'failed', reason };
}
