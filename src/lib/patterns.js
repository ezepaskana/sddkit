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

// createRequire(...) es el interop estándar de Node para consumir paquetes CJS
// desde un módulo ESM (repo con "type": "module"); un archivo que lo usa no es
// CommonJS aunque contenga `require(...)`.
const CREATE_REQUIRE_RE = /\bcreateRequire\s*\(/;

const MODULE_STYLES = [
  { id: 'esm', label: 'ES Modules (import/export)', re: /^\s*(import\s.+from\s|export\s(default\s|const\s|function\s|class\s|\{))/m, ext: /\.(ts|tsx|js|jsx|mjs)$/ },
  { id: 'cjs', label: 'CommonJS (require/module.exports)', re: /\b(module\.exports|exports\.[a-zA-Z]|require\s*\(\s*['"])/, ext: /\.(js|cjs)$/, exclude: CREATE_REQUIRE_RE },
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
        if (s.exclude && s.exclude.test(content)) continue;
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
