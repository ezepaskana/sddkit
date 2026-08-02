import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateSection } from './llmClient.js';

// Tarea 010, paso 24: tests de `generateSection` (Pivot 2 — genera texto Markdown
// de una categoría, ya NO valida contra un schema JSON). `generateSection`
// todavía no existe en `llmClient.js` (ahí solo vive `callDetectionLlm`, del
// Pivot 1 superseded) — estos tests deben quedar en ROJO (TypeError: no es una
// función / undefined no es exportado), no en verde.
//
// Reusa el mismo mecanismo de inyección de `opts.client`, retry y timeout que
// `callDetectionLlm` ya tenía validado — lo único que cambia es QUÉ se le pide
// al LLM (una lista Markdown de una categoría) y CÓMO se valida la respuesta
// (¿tiene líneas `- ` o está vacía?, en vez de contra un JSON schema).
//
// Mock de la respuesta "cruda" del SDK de Anthropic: la forma real de
// `client.messages.create(...)` es `{ content: [{ type: 'text', text: '<md>' }] }`.

function rawResponse(text) {
  return { content: [{ type: 'text', text }] };
}

function baseOpts(overrides = {}) {
  return {
    client: undefined, // cada test setea su propio mock
    model: 'claude-haiku-4-5-20251001',
    temperature: 0.1,
    maxRetries: 1,
    timeoutMs: 5000,
    ...overrides,
  };
}

const FILES = [{ path: 'src/x.js', content: 'const x = 1;' }];

const VALID_MARKDOWN = '- Endpoint GET /x\n- Endpoint POST /y';

// Fixture explícita de "respuesta inválida": el string contiene la palabra
// literal ERROR y no tiene ninguna línea que empiece con `- ` ni es vacía.
const INVALID_TEXT = 'ERROR: no pude procesar';

// ---------------------------------------------------------------------------
// Éxito al primer intento
// ---------------------------------------------------------------------------

test('generateSection: respuesta válida (bullets) en el primer intento → status ok, UNA sola llamada al cliente', async () => {
  let calls = 0;
  const client = {
    messages: {
      create: async () => {
        calls += 1;
        return rawResponse(VALID_MARKDOWN);
      },
    },
  };

  const result = await generateSection('inputs', FILES, baseOpts({ client }));

  assert.equal(result.status, 'ok');
  assert.equal(result.markdown, VALID_MARKDOWN);
  assert.equal(calls, 1);
});

// ---------------------------------------------------------------------------
// Éxito con resultado vacío (categoría no encontrada en esos archivos)
// ---------------------------------------------------------------------------

test('generateSection: respuesta vacía → status ok con markdown vacío (NO es un fallo)', async () => {
  let calls = 0;
  const client = {
    messages: {
      create: async () => {
        calls += 1;
        return rawResponse('');
      },
    },
  };

  const result = await generateSection('outputs', FILES, baseOpts({ client }));

  assert.equal(result.status, 'ok');
  assert.equal(result.markdown, '');
  assert.equal(calls, 1);
});

// ---------------------------------------------------------------------------
// Reintento por texto inválido
// ---------------------------------------------------------------------------

test('generateSection: primer intento inválido + segundo válido → status ok tras DOS llamadas', async () => {
  let call = 0;
  const responses = [rawResponse(INVALID_TEXT), rawResponse(VALID_MARKDOWN)];
  const client = {
    messages: {
      create: async () => responses[call++],
    },
  };

  const result = await generateSection('entidades', FILES, baseOpts({ client, maxRetries: 1 }));

  assert.equal(result.status, 'ok');
  assert.equal(result.markdown, VALID_MARKDOWN);
  assert.equal(call, 2);
});

// ---------------------------------------------------------------------------
// Agota reintentos
// ---------------------------------------------------------------------------

test('generateSection: SIEMPRE inválido con maxRetries=1 → status failed tras EXACTAMENTE 2 llamadas (1 intento + 1 reintento)', async () => {
  let calls = 0;
  const client = {
    messages: {
      create: async () => {
        calls += 1;
        return rawResponse(INVALID_TEXT);
      },
    },
  };

  const result = await generateSection('casos_de_uso', FILES, baseOpts({ client, maxRetries: 1 }));

  assert.equal(result.status, 'failed');
  assert.equal(typeof result.reason, 'string');
  assert.equal(calls, 2);
});

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

test('generateSection: el cliente tarda más que timeoutMs → status failed mencionando timeout', async () => {
  const client = {
    messages: {
      create: async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return rawResponse(VALID_MARKDOWN);
      },
    },
  };

  const result = await generateSection(
    'inputs',
    FILES,
    baseOpts({ client, timeoutMs: 50, maxRetries: 0 }),
  );

  assert.equal(result.status, 'failed');
  assert.match(result.reason.toLowerCase(), /timeout/);
});

// ---------------------------------------------------------------------------
// Excepción del cliente
// ---------------------------------------------------------------------------

test('generateSection: el cliente rechaza la promise → status failed, sin propagar la excepción', async () => {
  const client = {
    messages: {
      create: async () => {
        throw new Error('network error');
      },
    },
  };

  // No debe haber try/catch acá — generateSection tiene que capturar la
  // excepción internamente y devolver el objeto failed.
  const result = await generateSection('outputs', FILES, baseOpts({ client, maxRetries: 0 }));

  assert.equal(result.status, 'failed');
  assert.equal(typeof result.reason, 'string');
});

test('generateSection: el cliente rechaza SIEMPRE con maxRetries=1 → status failed tras EXACTAMENTE 2 llamadas', async () => {
  let calls = 0;
  const client = {
    messages: {
      create: async () => {
        calls += 1;
        throw new Error('network error');
      },
    },
  };

  const result = await generateSection('entidades', FILES, baseOpts({ client, maxRetries: 1 }));

  assert.equal(result.status, 'failed');
  assert.equal(calls, 2);
});

// ---------------------------------------------------------------------------
// temperature/model pasados tal cual al cliente
// ---------------------------------------------------------------------------

test('generateSection: pasa opts.temperature al invocar client.messages.create', async () => {
  let capturedArgs;
  const client = {
    messages: {
      create: async (args) => {
        capturedArgs = args;
        return rawResponse(VALID_MARKDOWN);
      },
    },
  };

  await generateSection('inputs', FILES, baseOpts({ client, temperature: 0.1 }));

  assert.equal(capturedArgs.temperature, 0.1);
});

test('generateSection: pasa opts.model al invocar client.messages.create', async () => {
  let capturedArgs;
  const client = {
    messages: {
      create: async (args) => {
        capturedArgs = args;
        return rawResponse(VALID_MARKDOWN);
      },
    },
  };

  await generateSection('inputs', FILES, baseOpts({ client, model: 'claude-haiku-4-5-20251001' }));

  assert.equal(capturedArgs.model, 'claude-haiku-4-5-20251001');
});

// ---------------------------------------------------------------------------
// La categoría viaja en el prompt enviado al cliente
// ---------------------------------------------------------------------------

test('generateSection: la categoría pedida aparece en el prompt enviado al cliente', async () => {
  let capturedArgs;
  const client = {
    messages: {
      create: async (args) => {
        capturedArgs = args;
        return rawResponse(VALID_MARKDOWN);
      },
    },
  };

  await generateSection('casos_de_uso', FILES, baseOpts({ client }));

  // El texto del prompt puede ir en `system` y/o en `messages[].content`
  // según cómo esté armado hoy el prompt en llmClient.js — buscamos la
  // categoría en cualquiera de los dos lugares.
  const haystack = [
    capturedArgs.system,
    ...(Array.isArray(capturedArgs.messages)
      ? capturedArgs.messages.map((m) => m?.content)
      : []),
  ]
    .filter((s) => typeof s === 'string')
    .join('\n');

  assert.match(haystack, /casos_de_uso/);
});
