import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { extractConsumptions, normalizeRoute } from './patterns.js';

/** Crea un repo temporal con los archivos dados ({ ruta: contenido }) y devuelve { root, files }. */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'sddkit-patterns-'));
  const list = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    list.push(rel);
  }
  return { root, files: list, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('fetch con template `${API_BASE_URL}${path}` (env var + spread en opts) → method null, target env:VITE_API_URL', () => {
  const { root, files, cleanup } = fixture({
    'api.ts': [
      'const API_BASE_URL = import.meta.env.VITE_API_URL as string | undefined;',
      'export function apiFetch(path: string, options: RequestInit) {',
      '  return fetch(`${API_BASE_URL}${path}`, { ...options });',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: null, target: 'env:VITE_API_URL', file: 'api.ts' },
    ]);
  } finally { cleanup(); }
});

test('fetch con template env var + segmento dinámico, sin method ni spread → GET, target env:VITE_API_URL/public/invitations/:param', () => {
  const { root, files, cleanup } = fixture({
    'invitations.ts': [
      'const API_BASE_URL = import.meta.env.VITE_API_URL;',
      'export function getInvite(inviteToken: string) {',
      '  return fetch(`${API_BASE_URL}/public/invitations/${encodeURIComponent(inviteToken)}`, { headers: { Accept: "application/json" } });',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'GET', target: 'env:VITE_API_URL/public/invitations/:param', file: 'invitations.ts' },
    ]);
  } finally { cleanup(); }
});

test('fetch(LOG_ENDPOINT, { method: "POST", ... }) con identificador env → POST, target env:VITE_LOG_URL', () => {
  const { root, files, cleanup } = fixture({
    'logger.ts': [
      'const LOG_ENDPOINT = import.meta.env.VITE_LOG_URL;',
      'export function logEvent(headers: Record<string, string>, payload: unknown) {',
      '  return fetch(LOG_ENDPOINT, { method: "POST", headers, body: JSON.stringify(payload) });',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'POST', target: 'env:VITE_LOG_URL', file: 'logger.ts' },
    ]);
  } finally { cleanup(); }
});

test('fetch(url, { method: "POST", ... }) con url parámetro no resoluble → POST, target (dynamic)', () => {
  const { root, files, cleanup } = fixture({
    'plants.ts': [
      'export function stream(url: string) {',
      '  return fetch(url, { method: "POST", headers: { Accept: "text/event-stream" } });',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'POST', target: '(dynamic)', file: 'plants.ts' },
    ]);
  } finally { cleanup(); }
});

test('axios.get("/plants") y axios.post(`/plants/${id}`, body) → GET /plants y POST /plants/:param', () => {
  const { root, files, cleanup } = fixture({
    'client.ts': [
      'import axios from "axios";',
      'export const listPlants = () => axios.get("/plants");',
      'export const createPlant = (id: string, body: unknown) => axios.post(`/plants/${id}`, body);',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'GET', target: '/plants', file: 'client.ts' },
      { method: 'POST', target: '/plants/:param', file: 'client.ts' },
    ]);
  } finally { cleanup(); }
});

test('Java DeviceClient: BASE_URL const + concatenación + .POST(...) → POST, target literal completo', () => {
  const { root, files, cleanup } = fixture({
    'DeviceClient.java': [
      'public class DeviceClient {',
      '  private static final String BASE_URL = "https://api.example.com";',
      '  public String queryDevices(String body) throws Exception {',
      '    HttpRequest request = HttpRequest.newBuilder()',
      '        .uri(URI.create(BASE_URL + "/v4/new-api/queryDeviceList"))',
      '        .header("Content-Type", "application/json")',
      '        .POST(HttpRequest.BodyPublishers.ofString(body))',
      '        .timeout(Duration.ofSeconds(30))',
      '        .build();',
      '    return client.send(request, HttpResponse.BodyHandlers.ofString()).body();',
      '  }',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'POST', target: 'https://api.example.com/v4/new-api/queryDeviceList', file: 'DeviceClient.java' },
    ]);
  } finally { cleanup(); }
});

test('Java WeatherClient: .uri(URI.create(url)).GET() con url parámetro → GET, target (dynamic)', () => {
  const { root, files, cleanup } = fixture({
    'WeatherClient.java': [
      'public class WeatherClient {',
      '  private JsonNode get(String url) throws Exception {',
      '    HttpRequest request = HttpRequest.newBuilder()',
      '        .uri(URI.create(url))',
      '        .GET()',
      '        .build();',
      '    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());',
      '    return mapper.readTree(response.body());',
      '  }',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'GET', target: '(dynamic)', file: 'WeatherClient.java' },
    ]);
  } finally { cleanup(); }
});

test('Java sin HttpRequest: Optional.get()/map.get("key")/list.get(0) → [] (cero falsos positivos)', () => {
  const { root, files, cleanup } = fixture({
    'Utils.java': [
      'public class Utils {',
      '  public String demo(Map<String, String> map, List<Integer> list) {',
      '    Optional<String> x = Optional.empty();',
      '    String a = x.get();',
      '    String b = map.get("key");',
      '    Integer c = list.get(0);',
      '    return a + b + c;',
      '  }',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), []);
  } finally { cleanup(); }
});

test('dos llamadas idénticas (method+target+file) en el mismo archivo → 1 sola entrada (dedupe)', () => {
  const { root, files, cleanup } = fixture({
    'dup.ts': [
      'export function a() { return fetch("/health"); }',
      'export function b() { return fetch("/health"); }',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'GET', target: '/health', file: 'dup.ts' },
    ]);
  } finally { cleanup(); }
});

test('Java RestTemplate: restTemplate.postForObject("https://api.example.com/orders", body, Order.class) → POST, target literal', () => {
  const { root, files, cleanup } = fixture({
    'OrderClient.java': [
      'public class OrderClient {',
      '  public Order createOrder(Object body) {',
      '    return restTemplate.postForObject("https://api.example.com/orders", body, Order.class);',
      '  }',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'POST', target: 'https://api.example.com/orders', file: 'OrderClient.java' },
    ]);
  } finally { cleanup(); }
});

test('Java WebClient: webClient.post().uri("https://api.example.com/orders")... → POST, target literal', () => {
  const { root, files, cleanup } = fixture({
    'OrderWebClient.java': [
      'public class OrderWebClient {',
      '  public Mono<Order> createOrder(Order body) {',
      '    return webClient.post()',
      '        .uri("https://api.example.com/orders")',
      '        .bodyValue(body)',
      '        .retrieve()',
      '        .bodyToMono(Order.class);',
      '  }',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'POST', target: 'https://api.example.com/orders', file: 'OrderWebClient.java' },
    ]);
  } finally { cleanup(); }
});

test('Java OkHttp: new Request.Builder().url("https://api.example.com/orders").post(body).build() → POST, target literal', () => {
  const { root, files, cleanup } = fixture({
    'OrderOkHttpClient.java': [
      'public class OrderOkHttpClient {',
      '  public Response createOrder(RequestBody body) throws Exception {',
      '    Request request = new Request.Builder()',
      '        .url("https://api.example.com/orders")',
      '        .post(body)',
      '        .build();',
      '    return client.newCall(request).execute();',
      '  }',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), [
      { method: 'POST', target: 'https://api.example.com/orders', file: 'OrderOkHttpClient.java' },
    ]);
  } finally { cleanup(); }
});

test('Java código común sin RestTemplate/WebClient/OkHttp: clase con get()/post() propios y Map.get(...) → [] (cero falsos positivos)', () => {
  const { root, files, cleanup } = fixture({
    'Repository.java': [
      'public class Repository {',
      '  private final Map<String, String> cache = new HashMap<>();',
      '  public String get(String key) {',
      '    return cache.get(key);',
      '  }',
      '  public void post(String key, String value) {',
      '    cache.put(key, value);',
      '  }',
      '  public String exchange(String key, String value) {',
      '    String old = cache.get(key);',
      '    cache.put(key, value);',
      '    return old;',
      '  }',
      '}',
    ].join('\n'),
  });
  try {
    assert.deepEqual(extractConsumptions(root, files), []);
  } finally { cleanup(); }
});

test('normalizeRoute("/plants/:id") → "/plants/:param" (convención :param de Fase 1/consumptions)', () => {
  assert.equal(normalizeRoute('/plants/:id'), '/plants/:param');
});

test('normalizeRoute("/api/v1/public/invitations/{token}") → "/api/v1/public/invitations/:param" (convención Javalin/OpenAPI)', () => {
  assert.equal(normalizeRoute('/api/v1/public/invitations/{token}'), '/api/v1/public/invitations/:param');
});

test('normalizeRoute con dos segmentos {xxx} → ambos se normalizan a :param', () => {
  assert.equal(
    normalizeRoute('/api/v1/plants/{plant_id}/invitations/{invitation_id}'),
    '/api/v1/plants/:param/invitations/:param',
  );
});

test('normalizeRoute con prefijo env:VAR y :param ya presente → sin cambios', () => {
  assert.equal(
    normalizeRoute('env:VITE_API_URL/public/invitations/:param'),
    'env:VITE_API_URL/public/invitations/:param',
  );
});

test('normalizeRoute("/plants") sin segmentos dinámicos → sin cambios', () => {
  assert.equal(normalizeRoute('/plants'), '/plants');
});

test('normalizeRoute("(dynamic)") → sin cambios (caso especial de Fase 1)', () => {
  assert.equal(normalizeRoute('(dynamic)'), '(dynamic)');
});
