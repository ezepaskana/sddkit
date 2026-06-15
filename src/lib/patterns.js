import { join } from 'node:path';
import { read } from './fsutil.js';

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|java|kt)$/;
const TEST_PATH = /(\.test\.|\.spec\.|(^|\/)test_|_test\.go$|Tests?\.(java|kt)$|(^|\/)tests?\/)/;

const ENDPOINT_STYLES = [
  { id: 'express-router', label: 'Express Router (router.get/post...)', re: /\brouter\.(get|post|put|delete|patch)\s*\(/, ext: /\.(ts|tsx|js|jsx|mjs|cjs)$/ },
  { id: 'express-app', label: 'Express app directo (app.get/post...)', re: /\bapp\.(get|post|put|delete|patch)\s*\(\s*['"`]\//, ext: /\.(ts|tsx|js|jsx|mjs|cjs)$/ },
  { id: 'nest-decorators', label: 'Decoradores NestJS (@Get/@Post...)', re: /@(Get|Post|Put|Delete|Patch)\s*\(/, ext: /\.(ts|js)$/ },
  { id: 'fastify', label: 'Fastify (fastify.get / .route)', re: /\bfastify\.(get|post|put|delete|patch|route)\s*\(/ },
  { id: 'flask-route', label: 'Flask (@app.route)', re: /@app\.route\s*\(/ },
  { id: 'fastapi', label: 'FastAPI (@app/@router.get...)', re: /@(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]/ },
  { id: 'spring-mapping', label: 'Spring (@GetMapping/@PostMapping...)', re: /@(Get|Post|Put|Delete|Patch)Mapping\b/ },
  { id: 'spring-requestmapping', label: 'Spring (@RequestMapping con method=)', re: /@RequestMapping\s*\([^)]*method\s*=/ },
  { id: 'jaxrs', label: 'JAX-RS (@GET/@POST + @Path)', re: /@(GET|POST|PUT|DELETE|PATCH)\b[\s\S]{0,200}@Path\b|@Path\b[\s\S]{0,200}@(GET|POST|PUT|DELETE|PATCH)\b/ },
  { id: 'javalin-fluent', label: 'Javalin fluido (.get("/ruta", handler))', re: /\.(get|post|put|delete|patch)\s*\(\s*"\//, ext: /\.(java|kt)$/ },
];

const MODULE_STYLES = [
  { id: 'esm', label: 'ES Modules (import/export)', re: /^\s*(import\s.+from\s|export\s(default\s|const\s|function\s|class\s|\{))/m, ext: /\.(ts|tsx|js|jsx|mjs)$/ },
  { id: 'cjs', label: 'CommonJS (require/module.exports)', re: /\b(module\.exports|exports\.[a-zA-Z]|require\s*\(\s*['"])/, ext: /\.(js|cjs)$/ },
];

const TEST_STYLES = [
  { id: 'dot-test', label: 'archivo.test.*', re: /\.test\.(ts|tsx|js|jsx|mjs)$/ },
  { id: 'dot-spec', label: 'archivo.spec.*', re: /\.spec\.(ts|tsx|js|jsx|mjs)$/ },
  { id: 'py-test', label: 'test_archivo.py', re: /(^|\/)test_[^/]+\.py$/ },
  { id: 'go-test', label: 'archivo_test.go', re: /_test\.go$/ },
  { id: 'java-test', label: 'ArchivoTest.java (JUnit)', re: /[A-Z][\w]*Tests?\.(java|kt)$/ },
];

const TOPICS = [
  { topic: 'http-endpoints', question: '¿Cuál es la forma canónica de definir endpoints HTTP?', styles: ENDPOINT_STYLES, mode: 'content', skipTests: true },
  { topic: 'module-system', question: '¿ESM o CommonJS como sistema de módulos?', styles: MODULE_STYLES, mode: 'content', skipTests: false },
  { topic: 'test-naming', question: '¿Cómo se nombran los archivos de test?', styles: TEST_STYLES, mode: 'path', skipTests: false },
];

function bump(map, style, file) {
  map[style.id] = map[style.id] || { id: style.id, label: style.label, count: 0, examples: [] };
  map[style.id].count++;
  if (map[style.id].examples.length < 3) map[style.id].examples.push(file);
}

/**
 * Detecta patrones con múltiples variantes en el código.
 * count = cantidad de ARCHIVOS que contienen cada variante (no ocurrencias),
 * lo que permite usar los counts como baseline de deuda legacy (ratchet).
 */
export function detectPatterns(root, files) {
  const acc = {};
  for (const t of TOPICS) acc[t.topic] = {};

  for (const f of files) {
    for (const t of TOPICS) {
      if (t.mode !== 'path') continue;
      for (const s of t.styles) if (s.re.test(f)) bump(acc[t.topic], s, f);
    }
    if (!CODE_EXT.test(f)) continue;
    const isTest = TEST_PATH.test(f);
    let content = null;
    for (const t of TOPICS) {
      if (t.mode !== 'content') continue;
      if (t.skipTests && isTest) continue;
      if (content === null) {
        content = read(join(root, f));
        if (content === null || content.length > 300000) { content = false; }
      }
      if (content === false) continue;
      for (const s of t.styles) {
        if (s.ext && !s.ext.test(f)) continue;
        if (s.re.test(content)) bump(acc[t.topic], s, f);
      }
    }
  }

  const result = [];
  for (const t of TOPICS) {
    const variants = Object.values(acc[t.topic]).sort((a, b) => b.count - a.count);
    if (variants.length) {
      result.push({
        topic: t.topic,
        question: t.question,
        variants,
        multipleStyles: variants.length > 1,
      });
    }
  }
  return result;
}

const ROUTE_RES = [
  { re: /\b(?:router|app|r|fastify)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g, m: (x) => [x[1].toUpperCase(), x[2]] },
  { re: /\.(get|post|put|delete|patch)\s*\(\s*"(\/[^"]*)"/g, m: (x) => [x[1].toUpperCase(), x[2]] },
  { re: /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?"([^"]+)"/g, m: (x) => [x[1].toUpperCase(), x[2]] },
  { re: /@app\.route\s*\(\s*['"]([^'"]+)/g, m: (x) => ['ROUTE', x[1]] },
];

/** Índice de capacidades: endpoints existentes con método, ruta y archivo (para responder "¿ya existe?" sin explorar con LLM). */
export function extractEndpoints(root, files) {
  const out = [];
  const seen = new Set();
  for (const f of files) {
    if (!CODE_EXT.test(f) || TEST_PATH.test(f)) continue;
    const content = read(join(root, f));
    if (!content || content.length > 300000) continue;
    for (const r of ROUTE_RES) {
      r.re.lastIndex = 0;
      let x;
      while ((x = r.re.exec(content)) !== null) {
        const [method, path] = r.m(x);
        const key = method + ' ' + path;
        if (!seen.has(key)) { seen.add(key); out.push({ method, path, file: f }); }
      }
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

const JS_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const JAVA_EXT = /\.(java|kt)$/;

/**
 * Mapa de identificadores declarados en el archivo como
 * `const X = import.meta.env.VAR` o `const X = process.env.VAR`
 * (con o sin `as ...`) → nombre de la env var (BR-009).
 */
function envConsts(content) {
  const map = {};
  const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:import\.meta\.env|process\.env)\.([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(content)) !== null) map[m[1]] = m[2];
  return map;
}

/** Resuelve un identificador simple a `env:VAR` si está declarado como env const; si no, `null`. */
function resolveEnvIdent(name, env) {
  return env[name] ? 'env:' + env[name] : null;
}

/**
 * Resuelve el `<target>` de una llamada JS/TS a su forma canónica:
 * - literal `"..."`/`'...'` → tal cual
 * - identificador simple → `env:VAR` si resoluble, si no `(dynamic)`
 * - template literal → segmentos literales preservados; `${expr}` → `env:VAR`
 *   si `expr` es un env const, si no `:param`; todo dinámico → `(dynamic)`.
 */
function resolveTarget(raw, env) {
  const s = raw.trim();
  // Literal string.
  const lit = s.match(/^(['"])([\s\S]*?)\1$/);
  if (lit) return lit[2];
  // Template literal.
  if (s[0] === '`' && s[s.length - 1] === '`') {
    const inner = s.slice(1, -1);
    let out = '';
    let hadLiteralOrEnv = false;
    // Solo emitimos `:param` cuando hay texto literal inmediatamente antes
    // (un segmento de ruta real); un `${expr}` dinámico adyacente a un
    // segmento `env:`/otro `:param` colapsa (no es un segmento normalizable).
    let prevWasLiteral = false;
    let i = 0;
    while (i < inner.length) {
      const open = inner.indexOf('${', i);
      if (open === -1) {
        const lit2 = inner.slice(i);
        if (lit2) { out += lit2; hadLiteralOrEnv = true; prevWasLiteral = true; }
        break;
      }
      const litChunk = inner.slice(i, open);
      if (litChunk) { out += litChunk; hadLiteralOrEnv = true; prevWasLiteral = true; }
      // Encontrar el `}` que cierra esta interpolación.
      let depth = 1;
      let j = open + 2;
      for (; j < inner.length && depth > 0; j++) {
        if (inner[j] === '{') depth++;
        else if (inner[j] === '}') depth--;
      }
      const expr = inner.slice(open + 2, j - 1).trim();
      const ident = expr.match(/^[A-Za-z_$][\w$]*$/) ? expr : null;
      const envT = ident ? resolveEnvIdent(ident, env) : null;
      if (envT) { out += envT; hadLiteralOrEnv = true; prevWasLiteral = false; }
      else if (prevWasLiteral) { out += ':param'; prevWasLiteral = false; }
      i = j;
    }
    return hadLiteralOrEnv ? out : '(dynamic)';
  }
  // Identificador simple (p.ej. `fetch(LOG_ENDPOINT, ...)`).
  if (/^[A-Za-z_$][\w$]*$/.test(s)) {
    const envT = resolveEnvIdent(s, env);
    return envT || '(dynamic)';
  }
  return '(dynamic)';
}

/** Resuelve el `method` de un bloque de opciones/config de `fetch`/`axios(...)`. */
function resolveMethod(opts) {
  if (opts == null) return 'GET';
  const m = opts.match(/\bmethod\s*:\s*['"]([A-Za-z]+)['"]/);
  if (m) return m[1].toUpperCase();
  if (/\.\.\./.test(opts)) return null;
  return 'GET';
}

/**
 * Dado el contenido a partir de la posición de un `(`, devuelve los argumentos
 * de nivel superior de esa llamada (respetando paréntesis/llaves/corchetes y
 * template literals anidados). Devuelve `null` si no se balancea.
 */
function callArgs(content, openIdx) {
  let depth = 0;
  const args = [];
  let start = openIdx + 1;
  let tplDepth = 0;
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i];
    if (ch === '`') {
      // Alternar dentro/fuera de template literal de primer nivel.
      tplDepth = tplDepth ? 0 : 1;
      continue;
    }
    if (tplDepth) continue;
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < content.length && content[i] !== q) {
        if (content[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') {
      depth++;
      if (depth === 1) start = i + 1;
    } else if (ch === ')' || ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) { args.push(content.slice(start, i)); return args; }
    } else if (ch === ',' && depth === 1) {
      args.push(content.slice(start, i));
      start = i + 1;
    }
  }
  return null;
}

/**
 * Mapa de constantes String declaradas en el archivo Java como
 * `private/public static final String CONST = "literal";` → valor literal.
 */
function javaStringConsts(content) {
  const map = {};
  const re = /\b(?:private|public|protected)?\s*(?:static\s+)?(?:final\s+)?(?:static\s+)?final\s+String\s+([A-Za-z_$][\w$]*)\s*=\s*"([^"]*)"\s*;/g;
  let m;
  while ((m = re.exec(content)) !== null) map[m[1]] = m[2];
  return map;
}

/**
 * Resuelve el `<expr>` dentro de `URI.create(<expr>)` (Java) a su forma canónica:
 * - literal `"https://..."` → tal cual
 * - `CONST + "literal"` con `CONST` constante String literal del mismo archivo →
 *   concatenación resuelta, normalizando `+ variable +` a `:param` (ADR-0007)
 * - identificador simple no resoluble (p.ej. parámetro de método) → `(dynamic)`
 */
function resolveJavaUri(raw, consts) {
  const s = raw.trim();
  // Literal string puro.
  const lit = s.match(/^"([^"]*)"$/);
  if (lit) return lit[1];
  // Identificador simple → const literal o (dynamic).
  if (/^[A-Za-z_$][\w$]*$/.test(s)) {
    return consts[s] != null ? consts[s] : '(dynamic)';
  }
  // Concatenación con `+`: recorrer términos de nivel superior.
  const terms = splitTopLevelPlus(s);
  if (terms.length < 2) return '(dynamic)';
  let out = '';
  let hadLiteralOrConst = false;
  let prevWasLiteral = false;
  for (const t of terms) {
    const term = t.trim();
    const tl = term.match(/^"([^"]*)"$/);
    if (tl) { out += tl[1]; hadLiteralOrConst = true; prevWasLiteral = true; continue; }
    if (/^[A-Za-z_$][\w$]*$/.test(term) && consts[term] != null) {
      out += consts[term]; hadLiteralOrConst = true; prevWasLiteral = true; continue;
    }
    // Término dinámico (`+ variable +`): un `:param` si hay un segmento literal previo.
    if (prevWasLiteral) { out += ':param'; prevWasLiteral = false; }
  }
  return hadLiteralOrConst ? out : '(dynamic)';
}

/** Parte una expresión Java en sus términos de `+` de nivel superior (respeta strings y paréntesis). */
function splitTopLevelPlus(s) {
  const terms = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      i++;
      while (i < s.length && s[i] !== '"') { if (s[i] === '\\') i++; i++; }
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === '+' && depth === 0) { terms.push(s.slice(start, i)); start = i + 1; }
  }
  terms.push(s.slice(start));
  return terms;
}

/**
 * Resuelve el `method` de un bloque Java `HttpRequest.newBuilder()...build()`.
 * `.GET()`→GET, `.POST(...)`→POST, etc; `.method("X",...)`→X; default `GET`.
 */
function resolveJavaMethod(block) {
  const verb = block.match(/\.(GET|POST|PUT|DELETE|PATCH|HEAD)\s*\(/);
  if (verb) return verb[1];
  const generic = block.match(/\.method\s*\(\s*"([A-Za-z]+)"/);
  if (generic) return generic[1].toUpperCase();
  return 'GET';
}

/**
 * Detecta consumos Java vía `java.net.http.HttpClient`: localiza bloques
 * `HttpRequest.newBuilder()...build()` (anclados SIEMPRE a `HttpRequest`, nunca a
 * `.get(`/`.post(` sueltos), extrae el `<expr>` de `.uri(URI.create(<expr>))` y el
 * verbo de la cadena. `target` y `method` se resuelven con `resolveJavaUri`/`resolveJavaMethod`.
 */
function extractJavaConsumptions(content, push) {
  if (!/\bHttpRequest\b/.test(content)) return;
  const consts = javaStringConsts(content);
  const builderRe = /\bHttpRequest\s*\.\s*newBuilder\s*\(/g;
  let m;
  while ((m = builderRe.exec(content)) !== null) {
    // El bloque del builder va desde `newBuilder(` hasta el `.build()` que cierra la cadena.
    const buildIdx = content.indexOf('.build(', builderRe.lastIndex);
    if (buildIdx === -1) continue;
    const block = content.slice(m.index, buildIdx);
    // El `target` viene de `.uri(URI.create(<expr>))`.
    const uriIdx = block.search(/\.\s*uri\s*\(/);
    if (uriIdx === -1) continue;
    const createM = block.slice(uriIdx).match(/URI\s*\.\s*create\s*\(/);
    if (!createM) continue;
    const createAt = uriIdx + createM.index + createM[0].length - 1;
    const inner = balancedSlice(block, createAt);
    const target = inner === null ? '(dynamic)' : resolveJavaUri(inner, consts);
    const method = resolveJavaMethod(block);
    push(method, target);
  }
}

/**
 * Detecta consumos Java vía Spring `RestTemplate` (mejor esfuerzo, P1):
 * `restTemplate.getForObject(<url>, ...)`, `.postForObject(<url>, ...)`,
 * `.<verbo>For(Object|Entity)(<url>, ...)` → method del verbo; y
 * `.exchange(<url>, HttpMethod.<VERBO>, ...)` → method de `HttpMethod.<VERBO>`.
 * `<url>` se resuelve con `resolveJavaUri` (mismo criterio que `HttpClient`, paso 3).
 */
function extractRestTemplateConsumptions(content, consts, push) {
  if (!/\brestTemplate\b/.test(content)) return;
  // `.<verbo>For(Object|Entity)(<url>, ...)` → method del verbo.
  const forRe = /\brestTemplate\s*\.\s*(get|post|put|delete|patch|head|options)For(?:Object|Entity)\s*\(/gi;
  let m;
  while ((m = forRe.exec(content)) !== null) {
    const args = callArgs(content, forRe.lastIndex - 1);
    if (!args || !args.length) continue;
    push(m[1].toUpperCase(), resolveJavaUri(args[0], consts));
  }
  // `.exchange(<url>, HttpMethod.<VERBO>, ...)` → method de HttpMethod.<VERBO>.
  const exchangeRe = /\brestTemplate\s*\.\s*exchange\s*\(/g;
  while ((m = exchangeRe.exec(content)) !== null) {
    const args = callArgs(content, exchangeRe.lastIndex - 1);
    if (!args || args.length < 2) continue;
    const verb = args[1].trim().match(/^HttpMethod\s*\.\s*([A-Za-z]+)$/);
    if (!verb) continue;
    push(verb[1].toUpperCase(), resolveJavaUri(args[0], consts));
  }
}

/**
 * Detecta consumos Java vía Spring `WebClient` (mejor esfuerzo, P1):
 * `webClient.get().uri(<url>)`, `.post().uri(<url>)`, etc → method del verbo
 * que precede a `.uri(`. `<url>` se resuelve con `resolveJavaUri`.
 */
function extractWebClientConsumptions(content, consts, push) {
  if (!/\bwebClient\b/.test(content)) return;
  const re = /\bwebClient\s*\.\s*(get|post|put|delete|patch|head|options)\s*\(\s*\)\s*\.\s*uri\s*\(/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const inner = balancedSlice(content, re.lastIndex - 1);
    if (inner === null) continue;
    push(m[1].toUpperCase(), resolveJavaUri(inner, consts));
  }
}

/**
 * Detecta consumos Java vía OkHttp `Request.Builder` (mejor esfuerzo, P1):
 * `new Request.Builder()...url(<url>)...` + `.get()`/`.post(<body>)`/etc en
 * cualquier punto de la cadena → method del verbo; sin verbo explícito →
 * default `GET` (comportamiento real de `Request.Builder`). `<url>` se
 * resuelve con `resolveJavaUri`.
 */
function extractOkHttpConsumptions(content, consts, push) {
  if (!/\bnew\s+Request\s*\.\s*Builder\s*\(\s*\)/.test(content)) return;
  const builderRe = /\bnew\s+Request\s*\.\s*Builder\s*\(\s*\)/g;
  let m;
  while ((m = builderRe.exec(content)) !== null) {
    // El bloque del builder va desde `new Request.Builder()` hasta el `.build()` que cierra la cadena.
    const buildIdx = content.indexOf('.build(', builderRe.lastIndex);
    if (buildIdx === -1) continue;
    const block = content.slice(m.index, buildIdx);
    const urlIdx = block.search(/\.\s*url\s*\(/);
    if (urlIdx === -1) continue;
    const openAt = urlIdx + block.slice(urlIdx).indexOf('(');
    const inner = balancedSlice(block, openAt);
    const target = inner === null ? '(dynamic)' : resolveJavaUri(inner, consts);
    const verb = block.match(/\.\s*(get|post|put|delete|patch|head)\s*\(/i);
    const method = verb ? verb[1].toUpperCase() : 'GET';
    push(method, target);
  }
}

/** Dado el índice de un `(`, devuelve el contenido hasta su `)` balanceado (sin paréntesis), o null. */
function balancedSlice(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      i++;
      while (i < s.length && s[i] !== '"') { if (s[i] === '\\') i++; i++; }
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') { depth--; if (depth === 0) return s.slice(openIdx + 1, i); }
  }
  return null;
}

/**
 * Índice de dependencias salientes: llamadas HTTP detectadas en el código,
 * espejo de `extractEndpoints` (BR-010). Cubre JS/TS:
 * `fetch(<target>[, <opts>])`, `axios.<verbo>(<target>[, ...])`, `axios(<config>)`;
 * y Java: `java.net.http.HttpClient` (`HttpRequest.newBuilder()...uri(URI.create(<expr>))...send(...)`)
 * y, de mejor esfuerzo (P1, sin validar contra repos piloto): `RestTemplate`
 * (`.getForObject`/`.postForObject`/`.exchange(...HttpMethod.X)`), `WebClient`
 * (`.get().uri(...)`/`.post().uri(...)`/etc) y OkHttp (`new Request.Builder()...url(...)`
 * + `.get()`/`.post(...)`/etc, default `GET`).
 * Salida `{method, target, file}[]`, orden estable, dedupe por `method+target+file`.
 */
export function extractConsumptions(root, files) {
  const out = [];
  const seen = new Set();
  for (const f of files) {
    if (!CODE_EXT.test(f) || TEST_PATH.test(f)) continue;
    const isJs = JS_EXT.test(f);
    const isJava = JAVA_EXT.test(f);
    if (!isJs && !isJava) continue;
    const content = read(join(root, f));
    if (!content || content.length > 300000) continue;

    const push = (method, target) => {
      const key = method + '\x00' + target + '\x00' + f;
      if (!seen.has(key)) { seen.add(key); out.push({ method, target, file: f }); }
    };

    if (isJava) {
      extractJavaConsumptions(content, push);
      const consts = javaStringConsts(content);
      extractRestTemplateConsumptions(content, consts, push);
      extractWebClientConsumptions(content, consts, push);
      extractOkHttpConsumptions(content, consts, push);
      continue;
    }

    const env = envConsts(content);

    // axios.<verbo>(<target>[, ...])
    const axiosVerb = /\baxios\.(get|post|put|delete|patch|head|options)\s*\(/g;
    let m;
    while ((m = axiosVerb.exec(content)) !== null) {
      const args = callArgs(content, axiosVerb.lastIndex - 1);
      if (!args || !args.length) continue;
      const target = resolveTarget(args[0], env);
      push(m[1].toUpperCase(), target);
    }

    // fetch(<target>[, <opts>])
    const fetchRe = /(?<![.\w$])fetch\s*\(/g;
    while ((m = fetchRe.exec(content)) !== null) {
      const args = callArgs(content, fetchRe.lastIndex - 1);
      if (!args || !args.length) continue;
      const target = resolveTarget(args[0], env);
      const method = resolveMethod(args[1]);
      push(method, target);
    }

    // axios(<config>) — config object con url y method.
    const axiosCall = /(?<![.\w$])axios\s*\(\s*\{/g;
    while ((m = axiosCall.exec(content)) !== null) {
      const args = callArgs(content, axiosCall.lastIndex - 2);
      if (!args || !args.length) continue;
      const cfg = args[0];
      const urlM = cfg.match(/\burl\s*:\s*(`[\s\S]*?`|'[^']*'|"[^"]*"|[A-Za-z_$][\w$]*)/);
      const target = urlM ? resolveTarget(urlM[1], env) : '(dynamic)';
      const method = resolveMethod(cfg);
      push(method, target);
    }
  }
  return out;
}

const ROUTE_PARAM_RE = /:[A-Za-z_][\w]*|\{[^/{}]+\}/g;
const ENV_PREFIX_RE = /^env:[A-Za-z0-9_]+/;

/**
 * Normaliza una ruta a la forma canónica usada para el matching del grafo de
 * impacto (Fase 2, BR-014): cualquier segmento dinámico `:xxx` (convención
 * `:param` de Fase 1/consumptions) o `{xxx}` (convención Javalin/OpenAPI de
 * `capabilities.endpoints`) se reemplaza por el placeholder común `:param`.
 * Un eventual prefijo `env:VAR` al inicio del string se preserva tal cual
 * (no se confunde con un segmento `:xxx`); los segmentos dinámicos del resto
 * de la ruta (incluso después de ese prefijo) sí se normalizan. La
 * resolución/match de ese prefijo es responsabilidad de `matching.js` (paso 3).
 */
export function normalizeRoute(path) {
  const envPrefix = path.match(ENV_PREFIX_RE);
  if (!envPrefix) return path.replace(ROUTE_PARAM_RE, ':param');
  const prefix = envPrefix[0];
  return prefix + path.slice(prefix.length).replace(ROUTE_PARAM_RE, ':param');
}
