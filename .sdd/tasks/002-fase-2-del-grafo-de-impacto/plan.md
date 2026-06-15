# Plan — tarea 002: Fase 2 del grafo de impacto cross-sistema (ver REQUISITO-grafo-impacto.md)

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

**Secuenciación (de la spec, "Recomendación" punto 2):** SQLite primero (validable end-to-end con sddkit + los 2 pilotos = 3 sistemas reales), MySQL/docs al final. 10 pasos — más que los 7 de la Fase 1, pero el grueso (1, 2, 7-9) es chico/mecánico; el diseño no trivial se concentra en 3, 4 y 6.

## Pasos

- [x] **1. `optionalDependencies`: `better-sqlite3` + `mysql2`** `[P]` _(rapido)_
  - **Hace:** agrega a `package.json` → `"optionalDependencies": { "better-sqlite3": "^11.0.0", "mysql2": "^3.9.0" }` (ADR-0008, BR-012). `engines.node` queda sin cambios (`>=18`). Corre `npm install` en la raíz del repo.
  - **Resultado a documentar (para los pasos 4 y 8):** si `better-sqlite3` instaló y compiló correctamente en este entorno (verificar con `node -e "await import('better-sqlite3')"` o equivalente). Si NO instaló, los tests "reales" del paso 4 deben saltarse con `t.skip(<motivo>)` citando este resultado (ADR-0008 ya anticipa que la compilación de bindings nativos puede fallar en algunas plataformas) — la rama de degradación (`{ok:false, reason:'missing-dependency'}`) sigue siendo testeable igual (ver paso 4).
  - **Archivos:** `package.json`
  - **Depende de:** —
  - **Verificación:** cmd: npm install

- [x] **2. `normalizeRoute(path)` en `src/lib/patterns.js`** `[P]` _(medio)_
  - **Hace:** agrega y exporta `normalizeRoute(path)`. Reemplaza cualquier segmento de ruta `:xxx` (convención `:param` de Fase 1/consumptions) o `{xxx}` (convención Javalin/OpenAPI de `capabilities.endpoints`) por el placeholder común `:param`. NO toca un eventual prefijo `env:VAR` (eso queda para `matching.js`, paso 3 — P6). Ejemplos:
    - `/plants/:id` → `/plants/:param`
    - `/api/v1/public/invitations/{token}` → `/api/v1/public/invitations/:param`
    - `/api/v1/plants/{plant_id}/invitations/{invitation_id}` → `/api/v1/plants/:param/invitations/:param`
    - `env:VITE_API_URL/public/invitations/:param` → `env:VITE_API_URL/public/invitations/:param` (sin cambios, ya usa `:param`)
    - `/plants` (sin segmentos dinámicos) → `/plants` (sin cambios)
    - `(dynamic)` → `(dynamic)` (sin cambios, caso especial de Fase 1)
  - **Tests** (`src/lib/patterns.test.js`): los 6 ejemplos de arriba como casos `assert.equal`.
  - **Archivos:** `src/lib/patterns.js`, `src/lib/patterns.test.js`
  - **Depende de:** —
  - **Verificación:** cmd: node --test src/lib/patterns.test.js

- [x] **3. `src/lib/graphstore/matching.js` — algoritmo de matching `exacto`/`posible` (BR-014)** _(fuerte)_
  - **Hace:** módulo PURO (sin DB, sin imports de `better-sqlite3`/`mysql2`) que implementa el núcleo de `queryImpact`/`queryCapability` operando sobre snapshots de sistemas ya cargados en memoria. Usa `normalizeRoute` del paso 2.
    - **`matchOne(normEndpointPath, normConsumptionTarget)` → `'exacto' | 'posible' | null`:**
      1. Si `normConsumptionTarget === '(dynamic)'` → `null` (sin información, BR-011).
      2. Si `normEndpointPath === normConsumptionTarget` → `'exacto'`.
      3. Si `normConsumptionTarget` empieza con `env:<VAR>` (regex `/^env:[A-Za-z0-9_]+/`): sea `stripped` el resto tras quitar ese prefijo. Si `stripped.length > 0 && normEndpointPath.endsWith(stripped)` → `'posible'`.
      4. Si `normConsumptionTarget` NO empieza con `env:` y `normEndpointPath !== normConsumptionTarget && normEndpointPath.endsWith(normConsumptionTarget)` → `'posible'`.
      5. Caso contrario → `null`.
    - **`matchMethod(queryMethod, consumptionMethod)` → boolean:** `true` si `consumptionMethod == null` (desconocido, BR-011 — no bloquea, pero el resultado nunca puede ser mejor que `posible`, ver abajo) o si `consumptionMethod.toUpperCase() === queryMethod.toUpperCase()`.
    - **`queryCapability(systems, method, normalizedPath)` → `{canonicalName, repoPath, kind:'consumption', method, target, file, publishedAt, confidence}[]`:** itera `systems` (`{canonicalName, repoPath, publishedAt, endpoints, consumptions}[]`), y para cada `consumptions[]` de cada sistema: si `matchMethod(method, c.method)` y `matchOne(normalizedPath, normalizeRoute(c.target))` no es `null` → push con esa `confidence`; si `c.method == null`, la `confidence` resultante es siempre `'posible'` aunque `matchOne` haya dado `'exacto'` (el método es incierto). Resultado ordenado por `confidence` (`exacto` antes que `posible`) y luego por `canonicalName`.
    - **`queryImpact(systems, query)`:**
      - Si `query = { method, path }`: `normalizedPath = normalizeRoute(path)`; devuelve `queryCapability(systems, method, normalizedPath)` (criterios 5/6 — lista vacía si nada matchea).
      - Si `query = { system }`: busca el sistema por `canonicalName`; para cada uno de sus `endpoints[]`, llama `queryCapability(otherSystems, e.method, normalizeRoute(e.path))` (excluyendo al propio sistema de la búsqueda) y agrega `{ endpoint: {method, path}, consumers: [...] }` por cada endpoint (criterio 7). Si el sistema no existe en `systems`, devuelve `null` (el comando `impact` lo traduce a mensaje de error).
  - **Tests** (`src/lib/graphstore/matching.test.js`, nuevo) — usar los datos REALES de Fase 1 (P6):
    1. Caso real validado: `systems = [{canonicalName:'frontend-app', repoPath:'/path/to/projects/frontend-app', publishedAt:'2026-06-13T00:00:00Z', endpoints:[], consumptions:[{method:'GET', target:'env:VITE_API_URL/public/invitations/:param', file:'src/services/api/invitations.ts'}]}]`. `queryImpact(systems, {method:'GET', path:'/api/v1/public/invitations/{token}'})` → 1 resultado, `confidence:'posible'`, `canonicalName:'frontend-app'`, `file:'src/services/api/invitations.ts'`.
    2. Match `exacto`: dos sistemas con la MISMA ruta normalizada sin prefijo `env:` (p.ej. consumo `/api/v1/public/invitations/:param`, mismo método) → `confidence:'exacto'`.
    3. Sin match: `queryImpact(systems, {method:'GET', path:'/no/existe'})` → `[]`.
    4. `consumptions` con `target:'(dynamic)'` → nunca matchea (caso 1 del algoritmo).
    5. `c.method === null` y la ruta matchea `exacto` por path → `confidence:'posible'` (degradado por método incierto).
    6. `queryImpact(systems, {system:'backend-service'})` con `endpoints:[{method:'GET', path:'/api/v1/public/invitations/{token}'}]` y `frontend-app` (consumptions de arriba) en `systems` → 1 entrada en `consumers` con `confidence:'posible'`.
    7. `queryImpact(systems, {system:'no-existe'})` → `null`.
  - **Archivos:** `src/lib/graphstore/matching.js` (nuevo), `src/lib/graphstore/matching.test.js` (nuevo)
  - **Depende de:** paso 2
  - **Verificación:** cmd: node --test src/lib/graphstore/matching.test.js

- [x] **4. `src/lib/graphstore/sqlite.js` + `src/lib/graphstore/index.js` (factory, config, degradación)** _(fuerte)_
  - **Hace:**
    - **`sqlite.js`** exporta `createSqliteStore(config, { importSqlite } = {})` donde `importSqlite` default es `() => import('better-sqlite3')` (inyectable para tests). Resuelve la ruta del archivo (`config.sqlite?.path` o default `~/.sddkit/graph.db` vía `os.homedir()`), crea el directorio padre si falta (`mkdirSync(..., {recursive:true})`), abre la DB y asegura el schema:
      ```sql
      CREATE TABLE IF NOT EXISTS systems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canonical_name TEXT UNIQUE NOT NULL,
        repo_path TEXT NOT NULL,
        c1 TEXT,
        endpoints TEXT NOT NULL DEFAULT '[]',
        consumptions TEXT NOT NULL DEFAULT '[]',
        commit_hash TEXT,
        published_at TEXT NOT NULL
      )
      ```
      Devuelve `{ publishSystem, querySystem, listSystems, close }`:
      - `publishSystem({canonicalName, repoPath, c1, endpoints, consumptions, commitHash, publishedAt})` → upsert por `canonical_name` (`INSERT ... ON CONFLICT(canonical_name) DO UPDATE SET ...`, criterio 10/BR-013); `endpoints`/`consumptions` se guardan con `JSON.stringify`.
      - `querySystem(canonicalName)` → fila con `endpoints`/`consumptions`/`c1` parseados (`JSON.parse`) o `null`.
      - `listSystems()` → todas las filas, mismo parseo (insumo de `matching.js`).
      - `close()` → cierra el handle (`db.close()`).
    - **`index.js`** exporta `createGraphStore(cfg, deps = {})` (`cfg` = `.sdd/config.json` parseado completo; `deps` para inyección en tests):
      - Si `!cfg?.graph?.driver` → `{ ok:false, reason:'not-configured' }` (BR-012, criterio 3).
      - Si `cfg.graph.driver === 'sqlite'`: intenta `createSqliteStore(cfg.graph, deps)`. Si el `import('better-sqlite3')` interno falla (módulo no instalado o falla de bindings) → `{ ok:false, reason:'missing-dependency', install:'npm i better-sqlite3' }` (criterio 4, ADR-0008).
      - Si `cfg.graph.driver === 'mysql'`: delega en `mysql.js` (paso 8) — si aún no existe (orden de ejecución), dejar un `TODO` o importarlo igual (el paso 8 lo crea; este paso puede dejar el branch `mysql` devolviendo `{ok:false, reason:'missing-dependency', install:'npm i mysql2'}` como placeholder si `mysql.js` no existe todavía, y el paso 8 lo completa).
      - Si `ok !== false`: envuelve el store de bajo nivel con `queryCapability(method, normalizedPath)` y `queryImpact(query)` (paso 3, vía `listSystems()`), más `publishSystem`/`querySystem`/`close` delegados — exponiendo la interfaz única `{ publishSystem, querySystem, queryImpact, queryCapability, close, ok:true }` (BR-012).
  - **Tests** (`src/lib/graphstore/sqlite.test.js`, nuevo): usar `fs.mkdtempSync` para una DB temporal (`config = {driver:'sqlite', sqlite:{path: tmpFile}}`).
    - Si `better-sqlite3` está disponible (resultado del paso 1): `publishSystem` dos veces con el mismo `canonicalName` (datos distintos) → `querySystem` devuelve la versión MÁS RECIENTE, una sola fila en `listSystems()` (upsert, no duplica). `createGraphStore({graph:{}})` → `{ok:false, reason:'not-configured'}`. `queryImpact` end-to-end: `publishSystem` con los datos reales de `backend-service` (endpoint `GET /api/v1/public/invitations/{token}`) y `frontend-app` (consumption del paso 3, caso 1), luego `createGraphStore(...).queryImpact({method:'GET', path:'/api/v1/public/invitations/{token}'})` → 1 resultado `confidence:'posible'`.
    - Si NO está disponible: `t.skip('better-sqlite3 no instalado en este entorno — ver ADR-0008')` para los tests que abren una DB real, PERO el test de `{ok:false, reason:'missing-dependency'}` corre siempre (es justamente lo que pasa si el import falla) y el de `{ok:false, reason:'not-configured'}` no depende de la DB.
  - **Archivos:** `src/lib/graphstore/sqlite.js` (nuevo), `src/lib/graphstore/index.js` (nuevo), `src/lib/graphstore/sqlite.test.js` (nuevo)
  - **Depende de:** pasos 1, 3
  - **Verificación:** cmd: node --test src/lib/graphstore/

- [x] **5. `sdd publish` — gate de calidad + upsert (BR-013)** _(medio)_
  - **Hace:** nuevo `src/commands/publish.js`, exporta `publish(root, flags)`:
    - **Gate de calidad:** lee `.sdd/c4/{context,containers,components}.md`; si alguno contiene `- [ ] ` bajo su sección `## ❓ VALIDAR con el equipo`, rechaza listando archivo(s) + cantidad de checkboxes pendientes (criterio 2) y no llama al graphstore.
    - **`canonicalName`:** de `context.md` vía `/\*\*Sistema:\*\*\s*(.+)/` (mismo formato que ya usa el repo, p.ej. `**Sistema:** sddkit`).
    - **`repoPath`:** `root` (absoluto).
    - **`c1`:** contenido completo de `.sdd/c4/containers.md`.
    - **`endpoints`/`consumptions`:** de `.sdd/patterns.json → capabilities`.
    - **`commitHash`:** `git rev-parse HEAD` (`execSync`, `cwd: root`; si falla — repo sin git — `commitHash = null`, no es fatal).
    - **`publishedAt`:** `new Date().toISOString()`.
    - `createGraphStore(readJSON('.sdd/config.json'))`: si `ok:false` → imprime el mensaje correspondiente (`reason==='not-configured'` → instrucciones mínimas de `.sdd/config.json → graph`; `reason==='missing-dependency'` → `install`) y termina sin error fatal del resto del CLI (criterios 3/4).
    - Si `ok:true`: `publishSystem(...)`, imprime confirmación (`canonicalName`, `publishedAt`, `commitHash` corto).
    - Registra el comando en `bin/sdd.js` (import + dispatch `else if (cmd === 'publish') await publish(root, flags);`) y en el `HELP`.
  - **Tests** (`src/commands/publish.test.js`, nuevo): 2 fixtures en `fs.mkdtempSync` —
    1. Repo con un `- [ ] ` pendiente en `containers.md` → `publish` rechaza, no crea/modifica la DB (verificar que el archivo sqlite temporal no tiene la fila o no se creó).
    2. Repo sin pendientes, con `.sdd/config.json → graph.driver:'sqlite'` apuntando a una DB temporal, `.sdd/patterns.json` con `capabilities.endpoints`/`consumptions` mínimos, `context.md` con `**Sistema:** test-system` → `publish` corre OK y `querySystem('test-system')` (vía `createGraphStore`) devuelve la fila publicada.
    - Si `better-sqlite3` no está disponible (paso 1), el caso 2 usa `t.skip(...)` con el mismo motivo documentado; el caso 1 (gate) no depende de la DB y corre siempre.
  - **Archivos:** `src/commands/publish.js` (nuevo), `src/commands/publish.test.js` (nuevo), `bin/sdd.js`
  - **Depende de:** paso 4
  - **Verificación:** cmd: node --test src/commands/publish.test.js

- [x] **6. `sdd impact <método> <ruta> | <sistema>` (BR-014)** _(fuerte)_
  - **Hace:** nuevo `src/commands/impact.js`, exporta `impact(root, pos, flags)`:
    - Parsea `pos`: si `pos[0]` es uno de `GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS` (case-insensitive) y hay un `pos[1]`, es la forma `{method, path}` (criterios 5/6); si no, `pos[0]` es un nombre de sistema, forma `{system}` (criterio 7). Si `pos` está vacío → error de uso.
    - `createGraphStore(readJSON('.sdd/config.json'))`: degradación igual que `publish` (`not-configured`/`missing-dependency`, criterios 3/4).
    - Si `ok:true`: `listSystems()` → `queryImpact(systems, query)`.
      - Forma `{method, path}`: si resultado vacío → imprime "sin consumidores publicados hasta la fecha" (criterio 6) citando la ruta normalizada consultada. Si no vacío → por cada match imprime `canonicalName`, `confidence` (`exacto`/`posible`), `method target` original, `file`, `repoPath`, `publishedAt` (criterio 5).
      - Forma `{system}`: si `queryImpact` devuelve `null` → error "sistema '<nombre>' no encontrado — ¿está publicado?". Si no, por cada `{endpoint, consumers}` imprime el endpoint y, si `consumers` no está vacío, lista cada consumidor (mismo formato que arriba); si está vacío, "sin consumidores publicados" para ese endpoint.
    - Registra el comando en `bin/sdd.js` (import + dispatch `else if (cmd === 'impact') await impact(root, pos, flags);`) y en el `HELP`.
  - **Tests** (`src/commands/impact.test.js`, nuevo): fixture con DB sqlite temporal (o `t.skip` si `better-sqlite3` no disponible) seedeada vía `createGraphStore(...).publishSystem(...)` con AL MENOS los dos sistemas reales del paso 3 (`backend-service` con el endpoint invitations, `frontend-app` con la consumption invitations) + un tercer sistema sin relación:
    1. `impact(root, ['GET', '/api/v1/public/invitations/{token}'], {})` → output incluye `frontend-app`, `posible`, `src/services/api/invitations.ts`.
    2. `impact(root, ['GET', '/ruta/sin/consumidores'], {})` → output incluye "sin consumidores publicados hasta la fecha".
    3. `impact(root, ['backend-service'], {})` → output incluye el endpoint invitations y `frontend-app` como consumidor `posible`.
    4. `impact(root, ['no-existe'], {})` → mensaje de sistema no encontrado.
    5. Sin `.sdd/config.json → graph` → mensaje "grafo no configurado" (criterio 3), sin lanzar excepción.
  - **Archivos:** `src/commands/impact.js` (nuevo), `src/commands/impact.test.js` (nuevo), `bin/sdd.js`
  - **Depende de:** paso 4
  - **Verificación:** cmd: node --test src/commands/impact.test.js

- [x] **7. `sdd context` muestra estado de publicación (BR-016, criterio 8)** `[P]` _(medio)_
  - **Hace:** en `src/commands/context.js`, dentro de `context(root)`: si `.sdd/config.json → graph.driver` está configurado, extrae `canonicalName` de `context.md` (misma regex del paso 5), `createGraphStore(cfg)`, y si `ok:true`, `querySystem(canonicalName)`:
    - Si existe → agrega línea `Publicado: <publishedAt> (<commitHash corto, 7 chars>)`.
    - Si no existe (nunca publicado) → agrega línea `Publicado: nunca — correr \`sdd publish\``.
    - Si `graph` no está configurado o `createGraphStore` devuelve `ok:false` → no agrega nada (degradación silenciosa, sin afectar el resto del output — BR-012).
  - **Tests** (`src/commands/context.test.js`, extender): nuevo fixture (`fs.mkdtempSync` o directorio nuevo bajo `__fixtures__`) con `.sdd/config.json → graph` apuntando a una DB sqlite temporal:
    1. Sistema publicado (seed vía `createGraphStore(...).publishSystem(...)`) → `context(root)` imprime una línea que empieza con `Publicado: ` y contiene el hash corto.
    2. Sistema NO publicado (DB vacía) → línea `Publicado: nunca — correr \`sdd publish\``.
    3. Sin `graph` en config (fixture `sample-repo` existente) → el output NO contiene la palabra `Publicado:`.
    - Si `better-sqlite3` no disponible, casos 1-2 con `t.skip(...)`; caso 3 corre siempre.
  - **Archivos:** `src/commands/context.js`, `src/commands/context.test.js`
  - **Depende de:** paso 4
  - **Verificación:** cmd: node --test src/commands/context.test.js

- [x] **8. `src/lib/graphstore/mysql.js` — driver MySQL (BR-012, BR-015, sin servidor real — P4)** `[P]` _(medio)_
  - **Hace:** exporta `createMysqlStore(config, { createPool } = {})`, mismo contrato `{ publishSystem, querySystem, listSystems, close }` que `sqlite.js`.
    - Lee la connection string de `process.env[config.mysql.urlEnv]` (BR-015). Si `config.mysql?.urlEnv` falta o `process.env[...]` no está seteado → devuelve `{ok:false, reason:'missing-env', envVar: config.mysql?.urlEnv}` (criterio 11) — NO expone el nombre de la env var en logs más allá de decir cuál falta configurar, y nunca su valor.
    - `createPool` default `() => import('mysql2/promise').then(m => m.createPool(connectionString))` (inyectable).
    - Schema equivalente (MySQL): `CREATE TABLE IF NOT EXISTS systems (id INT AUTO_INCREMENT PRIMARY KEY, canonical_name VARCHAR(255) UNIQUE NOT NULL, repo_path TEXT, c1 LONGTEXT, endpoints LONGTEXT, consumptions LONGTEXT, commit_hash VARCHAR(64), published_at VARCHAR(32))`.
    - `publishSystem` vía `INSERT INTO systems (...) VALUES (...) ON DUPLICATE KEY UPDATE ...` (upsert por `canonical_name`, criterio 10).
    - Completa en `src/lib/graphstore/index.js` (paso 4) el branch `cfg.graph.driver === 'mysql'`: si `createMysqlStore` devuelve `ok:false` (por `missing-env` o por fallo de `import('mysql2/promise')`, `reason:'missing-dependency'`), propaga igual que el branch sqlite.
  - **Tests** (`src/lib/graphstore/mysql.test.js`, nuevo) — SIN servidor MySQL real (gap documentado, P4): inyectar `createPool` con un stub que implementa `{execute: (sql, params) => {...registra llamadas...; return [[]]}, end: () => {}}`.
    1. `config.mysql.urlEnv` no seteado en `process.env` → `{ok:false, reason:'missing-env', envVar:'...'}`, sin llamar a `createPool`.
    2. Con `process.env.<VAR>` seteado y `createPool` stub: `publishSystem(...)` → el stub recibió un `execute` cuyo SQL contiene `INSERT INTO systems` y `ON DUPLICATE KEY UPDATE`.
    3. `querySystem(canonicalName)` → el stub recibió un `execute` con `SELECT` y `WHERE canonical_name = ?`; si el stub devuelve `[[]]` (sin filas) → `querySystem` devuelve `null`.
  - **Archivos:** `src/lib/graphstore/mysql.js` (nuevo), `src/lib/graphstore/mysql.test.js` (nuevo), `src/lib/graphstore/index.js`
  - **Depende de:** paso 4
  - **Verificación:** cmd: node --test src/lib/graphstore/mysql.test.js

- [x] **9. Documentación: `sdd-analyze` (paso "¿a quién impacto?") + snippet CI para `sdd publish`** `[P]` _(rapido)_
  - **Hace:**
    - `skills/sdd-analyze/SKILL.md`: agrega un paso "¿A quién impacto?" en la sección de análisis crítico — si `.sdd/config.json → graph` está configurado y la spec/tarea menciona una ruta/endpoint/recurso presente en `capabilities.endpoints`/`capabilities.consumptions`, correr `sdd impact <método> <ruta>` y citar el resultado (advertencia, no bloquea — BR-014/BR-016, criterio 9). Si el grafo no está configurado, omitir el paso sin mencionarlo (degradación silenciosa).
    - `README.md`: agrega una sección breve "Grafo de impacto" con: cómo configurar `.sdd/config.json → graph` (driver `sqlite`/`mysql`, `sqlite.path` default `~/.sddkit/graph.db`, `mysql.urlEnv`), y un snippet de GitHub Actions documentado (ADR-0003) que corre `sdd publish` en push a `main` — solo documentación, sin aplicar a CI real de ningún repo (fuera de alcance).
  - **Archivos:** `skills/sdd-analyze/SKILL.md`, `README.md`
  - **Depende de:** pasos 5, 6
  - **Verificación:** manual — revisión de legibilidad; no requiere `node --test`.

- [x] **10. Validación F2 end-to-end contra los 3 sistemas reales + registro para retro** _(medio)_
  - **Hace:** según la sección "Métrica de impacto" de la spec:
    1. En `sddkit`, `backend-service` y `frontend-app`, configurar `.sdd/config.json → graph: {driver:'sqlite', sqlite:{path:'~/.sddkit/graph.db'}}` (o el default si ya aplica sin configurar nada).
    2. Para cada uno de los 3 repos: si `sdd publish` rechaza por el gate (checkboxes `- [ ]` pendientes en C4), resolverlos primero (completar con info real, igual que en Fase 1) — documentar si esto hizo falta.
    3. Correr `sdd publish` en los 3 repos.
    4. Desde `sddkit` (o cualquiera), correr `time sdd impact GET /api/v1/public/invitations/{token}` y verificar: (a) tiempo de respuesta <5s (criterio de la métrica F2), (b) el resultado incluye `frontend-app` / `src/services/api/invitations.ts` con `confidence: posible`.
    5. Opcionalmente, `sdd impact backend-service` (forma reversa, criterio 7) y `sdd context` en `frontend-app` (criterio 8, debe mostrar `Publicado: ...`).
    6. Anotar tiempos y resultados — insumo de `retro.md` (sección "Resultado de la métrica").
  - **Archivos:** ninguno del código de sddkit (cambios en `.sdd/` de los 3 repos, igual que el paso 7 de la Fase 1).
  - **Depende de:** pasos 5, 6, 7
  - **Verificación:** manual — el dev revisa la salida de `sdd impact` y el tiempo medido contra el objetivo <5s, y vuelca el resultado en `retro.md` al cerrar la tarea.

---

_Aprobación del dev: aprobado (2026-06-13)_
