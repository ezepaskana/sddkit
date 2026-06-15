# Plan — tarea 001: Fase 1 del grafo de impacto cross-sistema (ver REQUISITO-grafo-impacto.md)

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. El dev debe APROBAR este plan antes de ejecutar.

Estructura de cada paso — el checkbox de la **primera línea** es lo que `sdd task` trackea; el detalle va en sub-ítems indentados:

```markdown
- [ ] **N. Título corto del paso** `[P]` _(rapido)_
  - **Hace:** qué se construye o cambia en este paso
  - **Archivos:** `ruta/uno`, `ruta/dos`
  - **Depende de:** paso M (o —)
  - **Verificación:** cómo se comprueba que quedó bien
```

`[P]` = paralelizable · Nivel de modelo por paso: _(rapido)_ mecánico/boilerplate · _(medio)_ implementación estándar · _(fuerte)_ diseño, lógica compleja, edge cases. Los modelos concretos de cada nivel están en `.sdd/config.json → models`.

## Pasos

- [x] **1. Runner de tests mínimo (`node:test`, cero deps)** `[P]` _(rapido)_
  - **Hace:** agrega `"scripts": {"test": "node --test"}` a `package.json` (Node ≥18 ya requerido por `engines`, `node:test`/`node:assert` son built-in — sin dependencias nuevas, respeta el catálogo). Crea un smoke test `src/version.test.js` que verifica que `VERSION` (de `src/version.js`) es un string no vacío. Este paso existe solo para que los pasos siguientes tengan un `cmd:` de verificación reproducible — no toca nada del grafo de impacto.
  - **Archivos:** `package.json`, `src/version.test.js` (nuevo)
  - **Depende de:** —
  - **Verificación:** cmd: node --test

- [x] **2. Detector JS/TS (`fetch`/`axios`) → `extractConsumptions`** `[P]` _(fuerte)_
  - **Hace:** en `src/lib/patterns.js`, agrega y exporta `extractConsumptions(root, files)` — espejo de `extractEndpoints` (mismo `CODE_EXT`, exclusión `TEST_PATH`, límite 300KB por archivo, recorre `files` ya resuelto por `walk(root)`). En este paso cubre **solo JS/TS**: `fetch(<target>[, <opts>])`, `axios.<verbo>(<target>[, ...])`, `axios(<config>)`. Salida: `{method, target, file}[]`, orden estable, dedupe por `method+target+file` exactos (igual criterio que `extractEndpoints`, BR-010).
    - **Resolución de `target`:** si es literal (`"..."`/`'...'`) se usa tal cual. Si es template literal con `${expr}`: por cada `${expr}`, si `expr` es un identificador simple declarado en el MISMO archivo como `const X = import.meta.env.VAR` o `const X = process.env.VAR` (con o sin `as ...`), reemplazar ese segmento por `env:VAR` (BR-009); en cualquier otro caso (función, member access, identificador no resoluble), reemplazar por `:param` (ADR-0007, P4). Si el target completo queda sin ningún segmento literal ni `env:` (todo dinámico, p.ej. un parámetro de función pasado directo), `target = "(dynamic)"`.
    - **Resolución de `method`:** si hay `method: "<VERBO>"` literal en `<opts>`/`<config>`, usarlo (mayúsculas). Si `<opts>`/`<config>` NO tiene `method:` literal y TAMPOCO contiene un spread (`...algo`), `method = "GET"` (default real de `fetch`/`axios` — inferible, no es adivinar). Si `<opts>`/`<config>` contiene un spread sin `method:` literal visible, `method = null` (puede venir oculto en el spread — P3).
    - Para `axios.<verbo>(...)`, `method` = `<verbo>` en mayúsculas (no aplica la regla de spread).
  - **Tests** (`src/lib/patterns.test.js`, nuevo) — casos basados en los 4 `fetch(` reales de `frontend-app` (análisis crítico de esta spec):
    1. `const API_BASE_URL = import.meta.env.VITE_API_URL as string | undefined; ... fetch(\`${API_BASE_URL}${path}\`, options)` (con `path` parámetro, `options` spreadeado) → `{ method: null, target: "env:VITE_API_URL", file }`.
    2. `const API_BASE_URL = import.meta.env.VITE_API_URL; ... fetch(\`${API_BASE_URL}/public/invitations/${encodeURIComponent(inviteToken)}\`, { headers: {...} })` (sin `method:`, sin spread) → `{ method: "GET", target: "env:VITE_API_URL/public/invitations/:param", file }`.
    3. `const LOG_ENDPOINT = import.meta.env.VITE_LOG_URL; ... fetch(LOG_ENDPOINT, { method: "POST", headers, body: ... })` → `{ method: "POST", target: "env:VITE_LOG_URL", file }`.
    4. `fetch(url, { method: "POST", headers: {...} })` (con `url` parámetro de función, sin declaración resoluble) → `{ method: "POST", target: "(dynamic)", file }`.
    5. `axios.get("/plants")` → `{ method: "GET", target: "/plants", file }`. `axios.post(\`/plants/${id}\`, body)` → `{ method: "POST", target: "/plants/:param", file }`.
    6. Dos llamadas idénticas (`method+target+file`) en el mismo archivo → 1 sola entrada en el resultado (dedupe).
  - **Archivos:** `src/lib/patterns.js`, `src/lib/patterns.test.js` (nuevo)
  - **Depende de:** —
  - **Verificación:** cmd: node --test src/lib/patterns.test.js

- [x] **3. Detector Java (`java.net.http.HttpClient`) en `extractConsumptions`** _(fuerte)_
  - **Hace:** extiende `extractConsumptions` (mismo archivo/función del paso 2) para cubrir Java `HttpRequest.newBuilder()...uri(URI.create(<expr>))...{.GET()|.POST(...)|.PUT(...)|.DELETE()|.PATCH(...)|.method("<VERBO>", ...)}...send(...)`.
    - **Resolución de `target` (`<expr>` dentro de `URI.create(...)`):** si `<expr>` es un literal `"https://..."`, usarlo tal cual. Si es `CONST + "literal"` (concatenación) donde `CONST` está declarado en el MISMO archivo como `private/public static final String CONST = "https://...";` (literal), resolver a `<valor de CONST><sufijo literal>`, normalizando segmentos `+ variable +` a `:param` (ADR-0007). Si `<expr>` es un identificador simple NO resoluble a una constante literal en el mismo archivo (p.ej. un parámetro de método, como `url` en `private JsonNode get(String url)`), `target = "(dynamic)"`.
    - **Resolución de `method`:** `.GET()` → `GET`; `.POST(...)`/`.PUT(...)`/`.DELETE()`/`.PATCH(...)` → verbo correspondiente; `.method("<VERBO>", ...)` → `<VERBO>`. Si el bloque `HttpRequest.newBuilder()...build()` no tiene ninguno de estos antes de `.build()`, `method = "GET"` (default real de `HttpRequest.Builder` — inferible).
    - **CRÍTICO (riesgo del análisis crítico):** anclar SIEMPRE la detección a `HttpRequest`/`.uri(`/`.send(` — NUNCA a `.get(`/`.post(` sueltos (en Java son extremadamente comunes para `Optional.get()`, `Map.get(key)`, `List.get(i)` y NO son llamadas HTTP).
  - **Tests** (mismo `src/lib/patterns.test.js`) — casos basados en `DeviceClient.java`/`WeatherClient.java` (análisis crítico):
    1. `private static final String BASE_URL = "https://api.example.com";` + `HttpRequest.newBuilder().uri(URI.create(BASE_URL + "/v4/new-api/queryDeviceList")).header(...).POST(HttpRequest.BodyPublishers.ofString(body)).timeout(...).build()` → `{ method: "POST", target: "https://api.example.com/v4/new-api/queryDeviceList", file }`.
    2. `private JsonNode get(String url) { HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build(); ... }` (`url` es parámetro, sin const resoluble) → `{ method: "GET", target: "(dynamic)", file }`.
    3. Archivo que SOLO contiene `Optional<String> x = Optional.empty(); x.get();`, `map.get("key")`, `list.get(0)` (sin `HttpRequest`) → `extractConsumptions` devuelve `[]` para ese archivo (cero falsos positivos).
  - **Archivos:** `src/lib/patterns.js`, `src/lib/patterns.test.js`
  - **Depende de:** paso 2
  - **Verificación:** cmd: node --test src/lib/patterns.test.js

- [x] **4. Detectores Java de mejor esfuerzo: RestTemplate / WebClient / OkHttp** _(medio)_
  - **Hace:** extiende `extractConsumptions` con detectores adicionales, simples, para `RestTemplate` (`restTemplate.getForObject(<url>, ...)`, `.postForObject(<url>, ...)`, `.exchange(<url>, HttpMethod.<VERBO>, ...)` → method del verbo/`HttpMethod`), `WebClient` (`webClient.get().uri(<url>)`/`.post().uri(<url>)`/etc → method del verbo antes de `.uri(`) y `OkHttp` (`new Request.Builder().url(<url>)` + `.get()`/`.post(<body>)`/etc, default `GET` si no hay verbo explícito — comportamiento real de `Request.Builder`). `<url>` se resuelve con el MISMO criterio del paso 3 (literal / `CONST + "literal"` / `(dynamic)`).
    - **P1 (ya acordado):** estos detectores son de **mejor esfuerzo** — no hay caso real en los repos piloto para validarlos. Alcanza con que (a) no crasheen, (b) no generen falsos positivos obvios sobre código común, (c) detecten el caso literal simple de cada framework en un fixture mínimo.
  - **Tests** (mismo `src/lib/patterns.test.js`) — un fixture mínimo por framework (literal `<url>` simple, verbo explícito) que produzca exactamente 1 entrada con `method`/`target` correctos; y un fixture "código común" (p.ej. una clase con métodos `get`/`post` propios sin relación a HTTP) que produzca `[]`.
  - **Archivos:** `src/lib/patterns.js`, `src/lib/patterns.test.js`
  - **Depende de:** paso 3
  - **Verificación:** cmd: node --test src/lib/patterns.test.js

- [x] **5. `sdd scan`: persistir `capabilities.consumptions` + sección "Dependencias salientes" en `containers.md`** _(medio)_
  - **Hace:**
    - En `src/commands/scan.js`: importar `extractConsumptions` desde `../lib/patterns.js` y agregar `consumptions: extractConsumptions(root, files)` al objeto `capabilities` que se persiste en `patterns.json` (junto a `endpoints`, BR-010).
    - En `src/lib/c4.js`: cambiar la firma de `genContainers(stack, containers, date)` a `genContainers(stack, containers, consumptions, date)`. Agregar una sección nueva `## Dependencias salientes` (entre el diagrama mermaid y `## ❓ VALIDAR con el equipo`) con una tabla `| Método | Destino | Archivo |` a partir de `consumptions` (`{method, target, file}[]`); si `consumptions` está vacío, escribir `_Sin dependencias salientes detectadas._`. Esta sección es **generada** (recalculada en cada `sdd scan`, P5) — sigue dentro de la porción que `preserveManual`/`MANUAL_MARK` (BR-001) reemplaza en cada regeneración, sin tocar la sección manual del equipo.
    - Actualizar el call site en `scan.js` (`genContainers(stack, containers, date)` → `genContainers(stack, containers, capabilities.consumptions, date)`).
  - **Tests:**
    - Unit en `src/lib/c4.test.js` (nuevo): `genContainers(stack, containers, consumptions, date)` con un `consumptions` de 2 entradas → el markdown resultante contiene `## Dependencias salientes` y ambas filas; con `consumptions = []` → contiene `_Sin dependencias salientes detectadas._`.
    - Integración en `src/commands/scan.test.js` (nuevo): crear un directorio temporal (`fs.mkdtempSync`) con 1-2 archivos fuente mínimos (reusar un fixture del paso 2 o 3, p.ej. un `.ts` con un `fetch("/plants")`), correr `await scan(tmpDir, { quiet: true })`, y verificar que `tmpDir/.sdd/patterns.json` tiene `capabilities.consumptions` con la entrada esperada y que `tmpDir/.sdd/c4/containers.md` contiene `## Dependencias salientes` con esa entrada. Si `scan` necesita un mínimo adicional (p.ej. `package.json`) para no fallar en un repo sintético, agregarlo al fixture — no mockear `scan`.
  - **Archivos:** `src/commands/scan.js`, `src/lib/c4.js`, `src/lib/c4.test.js` (nuevo), `src/commands/scan.test.js` (nuevo)
  - **Depende de:** paso 4
  - **Verificación:** cmd: node --test

- [x] **6. `sdd find` busca también en `capabilities.consumptions`** `[P]` _(rapido)_
  - **Hace:** en `src/commands/context.js`, en `find(root, pos)`, agrega un loop análogo al de `capabilities.endpoints` (líneas ~68-72) que recorra `pj?.capabilities?.consumptions || []` y, si `${c.method} ${c.target} ${c.file}` (en minúsculas) incluye `q`, agregue un hit con formato `consumo   <method> <target>  (<file>)` (usar `?` si `method` es `null`).
  - **Tests** (`src/commands/context.test.js`, nuevo): crear un fixture `src/commands/__fixtures__/sample-repo/.sdd/patterns.json` con un `capabilities.endpoints` y un `capabilities.consumptions` de ejemplo (p.ej. `{ method: "POST", target: "https://api.example.com/v4/new-api/queryDeviceList", file: "..." }`). Llamar `find(fixtureRoot, ["queryDeviceList"])` capturando `console.log` (reasignar temporalmente y restaurar en `finally`) y verificar que algún hit empieza con `consumo` y contiene `queryDeviceList`.
  - **Archivos:** `src/commands/context.js`, `src/commands/context.test.js` (nuevo), `src/commands/__fixtures__/sample-repo/.sdd/patterns.json` (nuevo)
  - **Depende de:** paso 4
  - **Verificación:** cmd: node --test src/commands/context.test.js

- [x] **7. Validación F1 contra los repos piloto + registro para retro** _(medio)_
  - **Hace:** según P6 — correr `sdd scan --dir=/path/to/projects/backend-service` y `sdd scan --dir=/path/to/projects/frontend-app` (esto crea/actualiza `.sdd/` en cada repo piloto — esperado, ambos quedan sin `.sdd/` previo). Inspeccionar `capabilities.consumptions` en `.sdd/patterns.json` y la sección "Dependencias salientes" en `.sdd/c4/containers.md` de cada repo. Comparar contra lo esperado en la sección "Métrica de impacto" de `spec.md`:
    - `backend-service`: esperado ≥4 (3 `DeviceClient` POST con destino literal completo + 1 `WeatherClient` GET con destino `(dynamic)`); reales conocidos = 5.
    - `frontend-app`: esperado 4 (los 4 `fetch(` directos: `api.ts`, `logger.ts`, `invitations.ts`, `plants.ts` streaming); reales conocidos >10 (limitación del wrapper `apiFetch`, BR-011).
    - Anotar detectado vs. esperado por archivo (precisión/recall a ojo) — este resultado es el insumo de `retro.md` (sección "Resultado de la métrica").
  - **Archivos:** ninguno del código de sddkit (los cambios quedan en `.sdd/` de los repos piloto, fuera de este repo).
  - **Depende de:** pasos 5, 6
  - **Verificación:** manual — el dev revisa el `capabilities.consumptions`/"Dependencias salientes" de cada piloto contra la lista de arriba y vuelca el resultado (conteos reales) en `retro.md` al cerrar la tarea.

---

_Aprobación del dev: **aprobado** (2026-06-12)_
