# Plan — tarea 010: Quisiera que esto se resuelva de una manera mucho mas inteli…

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

> La sección de **rama de trabajo** y el Paso 1 (`git checkout -b <rama>`) los genera automáticamente `sdd task plan` desde `.sdd/branching.md`; los pasos que escribas acá se renumeran a partir del Paso 2.

## Rama de trabajo

- **Rama:** `task/010-quisiera-que-esto-se-resuelva-d`
- **Origen:** `main`
- **Destino:** `main`
- **Convención de commits:** Conventional Commits
- **Flujo:** GitHub Flow
- **Patrón:** `task/{numero}-{slug}`

## Pasos

- [x] **1. Crear rama de trabajo** _(rapido)_
  - **Hace:** crear y cambiar a la rama de trabajo de la tarea
  - **Archivos:** —
  - **Depende de:** —
  - **Verificación:** `cmd: git checkout -b task/010-quisiera-que-esto-se-resuelva-d`

- [x] **2. Agregar BR-044 a BR-050 a domain.md** _(rapido)_
  - **Hace:** agregar las 7 reglas de negocio ya redactadas en `spec.md` (criterios 1-7), citando "Fuente: tarea 010".
  - **Archivos:** `.sdd/domain.md`
  - **Depende de:** —
  - **Verificación:** `cmd: grep -Eo "BR-04[4-9]|BR-050" .sdd/domain.md | sort -u | wc -l | grep -q 7`

- [x] **3. ADR 0011 — detección LLM en CI/CD reemplaza extractores regex y driver sqlite** _(medio)_
  - **Hace:** documentar contexto (límites del regex, tarea 010), decisión (LLM headless invocado desde `sdd publish` en CI, scope por diff incremental, salida JSON estricta, único driver soportado `mysql`), proveedor elegido (Anthropic Messages API vía `@anthropic-ai/sdk`, modelo configurable en `.sdd/config.json → llm.model`, default `claude-haiku-4-5-20251001`, `temperature: 0.1`, salida forzada por tool-use/JSON schema), alternativas descartadas (mantener regex, LLM en hook local, mantener sqlite). Marcar `0002-storage-enchufable-sqlite-mysql.md` y `0010-publish-automatico-en-post-commit-para-sqlite.md` con una nota de "Reemplazada por ADR-0011" al inicio, sin borrar su contenido (mismo patrón no destructivo que usó ADR-0010 con ADR-0003).
  - **Archivos:** `.sdd/decisions/0011-deteccion-llm-en-ci-reemplaza-sqlite.md`, `.sdd/decisions/0002-storage-enchufable-sqlite-mysql.md`, `.sdd/decisions/0010-publish-automatico-en-post-commit-para-sqlite.md`
  - **Depende de:** paso 2
  - **Verificación:** manual — el dev revisa el ADR antes de seguir.

- [x] **4. Tests: utilidades puras de detección (diff, validación de schema, merge)** _(medio)_
  - **Hace:** tests de tres funciones nuevas (aún no implementadas) en `src/lib/llmDetect.js`: `diffFilesSince(root, sinceCommit)` (archivos modificados vía `git diff --name-only`, incluye caso `sinceCommit=null` → todos los archivos), `validateDetectionResult(json)` (valida forma `{endpoints:[{method,path,file,confidence}], consumptions:[{method,target,file,confidence}]}`, rechaza campos faltantes/tipos incorrectos), `mergeCapabilities(existing, byFile, touchedFiles)` (reemplaza entradas de los archivos tocados — incluyendo vaciar las de un archivo que ya no tiene llamadas — preserva intactas las de archivos no tocados).
  - **Archivos:** `src/lib/llmDetect.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: npm test -- --test-name-pattern=llmDetect 2>&1 | grep -q "not ok"` _(deben estar en rojo — el módulo todavía no existe)_

- [x] **5. Implementar src/lib/llmDetect.js** _(fuerte)_
  - **Hace:** implementar `diffFilesSince`, `validateDetectionResult`, `mergeCapabilities` para que los tests del paso 3 pasen.
  - **Archivos:** `src/lib/llmDetect.js`
  - **Depende de:** paso 4
  - **Verificación:** `cmd: node --test src/lib/llmDetect.test.js`

- [x] **6. Tests: cliente LLM mockeado (retry, timeout, temperatura)** _(medio)_
  - **Hace:** tests de `callDetectionLlm(files, opts)` en `src/lib/llmClient.js` (aún no implementado), mockeando el SDK de Anthropic (inyección de dependencia): reintenta una vez si la respuesta no valida contra `validateDetectionResult`, devuelve `{status:'failed'}` tras agotar reintentos o superar el timeout configurado, pasa `temperature` baja al llamar.
  - **Archivos:** `src/lib/llmClient.test.js`
  - **Depende de:** paso 5
  - **Verificación:** `cmd: npm test -- --test-name-pattern=llmClient 2>&1 | grep -q "not ok"`

- [x] **7. Implementar src/lib/llmClient.js + agregar @anthropic-ai/sdk** _(fuerte)_
  - **Hace:** cliente real sobre `@anthropic-ai/sdk`, salida forzada por tool-use/JSON schema, modelo/temperatura leídos de `.sdd/config.json → llm` (defaults del ADR-0011), API key desde `process.env.ANTHROPIC_API_KEY` (secret de CI). Agregar `@anthropic-ai/sdk` a `package.json → dependencies` (no optional — el flujo de detección solo corre en CI, donde `npm ci` la instala siempre).
  - **Archivos:** `src/lib/llmClient.js`, `package.json`
  - **Depende de:** paso 6
  - **Verificación:** `cmd: node --test src/lib/llmClient.test.js`

- [x] **8. Tests: integración de sdd publish en modo CI (merge, fallback pending, no bloqueante)** _(medio)_
  - **Hace:** tests de `publish()` con `callDetectionLlm` mockeado: (a) éxito → capabilities mergeadas vía `mergeCapabilities` y publicadas; (b) fallo del LLM → entradas de los archivos afectados quedan `status: 'pending'`, el resto del snapshot se publica igual, exit 0; (c) sin señal de CI (`process.env.CI` ausente y sin `--ci`) → no corre detección, comportamiento idéntico al actual.
  - **Archivos:** `src/commands/publish.test.js`
  - **Depende de:** paso 7
  - **Verificación:** `cmd: npm test -- --test-name-pattern=publish 2>&1 | grep -q "not ok"`

- [x] **9. Wire src/commands/publish.js: detección LLM en CI, diff scope, merge, fallback pending** _(fuerte)_
  - **Hace:** cuando `process.env.CI === 'true'` o se pasa `--ci`, antes de leer `patterns.json`: calcula `diffFilesSince(root, últimoCommitHash publicado)`, llama a `callDetectionLlm` con esos archivos, mergea el resultado en `capabilities.endpoints`/`consumptions` vía `mergeCapabilities`, persiste en `.sdd/patterns.json`, y recién ahí publica al graphstore. Si `callDetectionLlm` devuelve `{status:'failed'}`, marca esas entradas `pending` y publica igual (no bloquea el pipeline).
  - **Archivos:** `src/commands/publish.js`
  - **Depende de:** paso 8
  - **Verificación:** `cmd: node --test src/commands/publish.test.js`

- [x] **10. Retirar extractEndpoints/extractConsumptions de patterns.js; scan.js deja de poblarlos** _(medio)_
  - **Hace:** eliminar `extractEndpoints`, `extractConsumptions` y los helpers usados solo por ellas (`resolveTarget`, `envConsts`, `callArgs` de HTTP, `resolveMethod`, extractores Java de consumo/RestTemplate/WebClient/OkHttp) de `src/lib/patterns.js`, conservando `normalizeRoute` (la usa `matching.js`) y los detectores de catálogo no relacionados (`detectPatterns`/`ENDPOINT_STYLES`). `scan.js` deja de llamar a esas funciones y de sobrescribir `capabilities.endpoints`/`consumptions` en `patterns.json` (ese campo ahora lo escribe `publish.js` en CI, paso 8); si ya existe un `patterns.json` con capabilities de una publicación previa, `scan()` las preserva sin tocarlas.
  - **Archivos:** `src/lib/patterns.js`, `src/lib/patterns.test.js`, `src/commands/scan.js`, `src/commands/scan.test.js`
  - **Depende de:** paso 9
  - **Verificación:** `cmd: npm test`

- [x] **11. Tests: setup/doctor reportan sqlite como no soportado** _(rapido)_
  - **Hace:** tests de que `sdd setup` ya no ofrece/activa `graph.driver: "sqlite"`, y que `sdd doctor` reporta como error cualquier repo con `graph.driver: "sqlite"` configurado, sugiriendo migrar a `mysql` + CI/CD (ver ADR-0011).
  - **Archivos:** `src/commands/setup.test.js`, `src/commands/doctor.test.js`
  - **Depende de:** paso 3
  - **Verificación:** `cmd: npm test -- --test-name-pattern="setup|doctor" 2>&1 | grep -q "not ok"`

- [x] **12. Implementar deprecación de sqlite en setup.js/doctor.js; retirar instalación del hook post-commit en init.js** _(fuerte)_
  - **Hace:** `setup.js` deja de ofrecer/activar `graph.driver: sqlite` (BR-035 supersedida por ADR-0011) — si ya existe configurado, avisa deprecación sin tocarlo (no destructivo); `doctor.js` reporta el error/deprecación del paso 11 y retira el reporte del hook post-commit. `init.js` deja de invocar `installPostCommit` (BR-023 supersedida) — `uninstall.js` NO cambia (sigue limpiando cualquier hook post-commit legacy que ya exista de instalaciones previas, eso sigue siendo útil).
  - **Archivos:** `src/commands/setup.js`, `src/commands/doctor.js`, `src/commands/init.js`, y sus tests (`setup.test.js`, `doctor.test.js`, `init.test.js`)
  - **Depende de:** paso 11
  - **Verificación:** `cmd: npm test`

- [x] **13. Tests: graphstore async-aware (mysql única fuente real, wrap() no espera promises)** _(medio)_
  - **Hace:** tests que confirman el bug conocido (`.sdd/LEARNINGS.md`, tarea 002) y su fix: `createGraphStore` con driver `mysql` + store mockeado (`listSystems`/`querySystem`/`publishSystem`/`close` async, con delay artificial vía `setTimeout`) → `wrap()` debe `await`ear `listSystems()` antes de pasarlo a `queryCapability`/`queryImpact`/`queryInfraImpact` (hoy les pasa una Promise sin resolver, rompe la iteración). Tests de integración en los comandos: `context()`/`impact()`/`publish()` deben esperar (`await`) `querySystem`/`queryImpact`/`queryInfraImpact`/`publishSystem`/`close` antes de continuar — verificable con un mock cuyos métodos resuelven con delay y una aserción de que el resultado ya está disponible / que `close()` no se llama antes de que `publishSystem` resuelva.
  - **Archivos:** `src/lib/graphstore/index.test.js` (nuevo), `src/commands/context.test.js`, `src/commands/impact.test.js`, `src/commands/publish.test.js`
  - **Depende de:** paso 12
  - **Verificación:** deben quedar en rojo (el código todavía no espera las promesas).

- [x] **14. Implementar graphstore async-aware: wrap() + call-sites con await** _(fuerte)_
  - **Hace:** en `src/lib/graphstore/index.js`, `wrap()` vuelve `queryCapability`/`queryImpact`/`queryInfraImpact` funciones `async` que hacen `await store.listSystems()` antes de pasarlo a `matching.js`. En `src/commands/context.js`, `src/commands/impact.js` y `src/commands/publish.js`, agregar `await` a todas las llamadas a `store.querySystem`/`store.queryImpact`/`store.queryInfraImpact`/`store.publishSystem`/`store.close` (incluida la línea `store.querySystem?.(canonicalName)?.commitHash` agregada en el paso 9 → pasa a `(await store.querySystem?.(canonicalName))?.commitHash`). El driver `sqlite` (síncrono, todavía no retirado en este paso) debe seguir funcionando igual (`await` sobre un valor no-Promise es un no-op).
  - **Archivos:** `src/lib/graphstore/index.js`, `src/commands/context.js`, `src/commands/impact.js`, `src/commands/publish.js`
  - **Depende de:** paso 13
  - **Verificación:** `cmd: npm test`

- [x] **15. Retirar driver sqlite del graphstore** _(medio)_
  - **Hace:** `src/lib/graphstore/index.js` deja de reconocer `driver: "sqlite"` (reporta "no soportado, ver ADR-0011" en vez de crear el store); eliminar `src/lib/graphstore/sqlite.js` y `sqlite.test.js`; quitar `better-sqlite3` de `optionalDependencies` en `package.json`. Quitar también el comentario "⚠️ EXPERIMENTAL... usar sqlite en producción" de `index.js` (ya no aplica — mysql es el único driver, y quedó async-aware por el paso 14).
  - **Archivos:** `src/lib/graphstore/index.js`, `src/lib/graphstore/sqlite.js` (eliminar), `src/lib/graphstore/sqlite.test.js` (eliminar), `package.json`
  - **Depende de:** paso 14
  - **Verificación:** `cmd: npm test`

- [x] **16. Migrar fixtures de publish.test.js de sqlite a mysql (hallazgo del paso 15)** _(medio)_
  - **Hace:** el paso 15 retiró el driver sqlite del graphstore; 8 tests de `publish.test.js` que usaban fixtures `{graph:{driver:'sqlite',...}}` para ejercitar el flujo real de publish (no solo `--hook`) quedaron rotos (`unsupported-driver`). Migrar esos fixtures a `driver:'mysql'` con un pool falso inyectado (agregar `deps` como 2do argumento de `createGraphStore(cfg, deps)` en la llamada de `publish.js`, hoy `createGraphStore(cfg)` sin pasar `deps`), usando un fake pool en memoria simple (interpreta `INSERT ... ON DUPLICATE KEY UPDATE` como upsert por `canonical_name`, `SELECT * FROM systems WHERE canonical_name = ?` como lookup, `SELECT * FROM systems` como listado completo, `CREATE TABLE`/`ALTER TABLE`/`information_schema` como no-ops) — mirá `src/lib/graphstore/mysql.js` para las queries exactas a interpretar.
  - **Archivos:** `src/commands/publish.js` (pasar `deps` a `createGraphStore`), `src/commands/publish.test.js`
  - **Depende de:** paso 15
  - **Verificación:** `cmd: npm test`

- [x] **17. Retirar el modo `--hook` de publish.js (hallazgo del paso 16: queda muerto tras deprecar sqlite)** _(medio)_
  - **Hace:** con sqlite retirado, `flags.hook && (!cfg || cfg.graph?.driver !== 'sqlite' || ...)` es SIEMPRE verdadero en la práctica — `--hook` ya no puede publicar nunca (BR-024/025/026 quedan inalcanzables, no solo BR-023). Los 4 tests `publish --hook: ...` de `publish.test.js` que dependían de un store `sqlite` real ahora hacen `t.skip` SIEMPRE (guard `store.ok===false` dispara siempre) — quedan permanentemente en skip, no testean nada. Retirar el bloque `if (flags.hook && ...)` y los 2 `console.log` con rama `flags.hook` de `publish.js`; retirar/actualizar esos 4 tests en `publish.test.js` (el de "driver !== sqlite (mysql) → sin logs" puede adaptarse a comportamiento genérico sin `--hook`, los otros 3 dependen de sqlite real y no tienen equivalente — eliminarlos, documentando en el commit que BR-023/024/025/026 quedan supersedidas por ADR-0011).
  - **Archivos:** `src/commands/publish.js`, `src/commands/publish.test.js`
  - **Depende de:** paso 16
  - **Verificación:** `cmd: npm test`

- [x] **18. Actualizar README.md y C4 (containers.md/context.md)** _(rapido)_
  - **Hace:** reescribir la sección de grafo/sqlite de `README.md` (hoy líneas ~74-136) para reflejar CI/CD-only + detección LLM; agregar a `.sdd/c4/containers.md` el componente de detección LLM y a `.sdd/c4/context.md` la integración externa con el proveedor de LLM.
  - **Archivos:** `README.md`, `.sdd/c4/containers.md`, `.sdd/c4/context.md`
  - **Depende de:** paso 17
  - **Verificación:** manual — el dev confirma que no queda ninguna referencia activa a `sqlite` como opción soportada.

- [x] **19. Migrar el propio grafo de sddkit y agregar el step de publish a su CI** _(fuerte)_
  - **Hace:** actualizar `.sdd/config.json` de este repo (retirar `graph.driver: sqlite`); agregar un step a `.github/workflows/ci.yml` que corra `sdd publish` en push a `main`. El dev confirmó (chat) que todavía no tiene una instancia MySQL persistente — se retiró `graph` de `.sdd/config.json` (queda sin configurar) y NO se agregó el step de CI. `sdd doctor` confirma: sin mensaje de sqlite deprecado, sin mensaje de mysql/CI (estado "sin publicar — requiere CI/CD", BR-050 — válido, no roto). Pendiente para cuando el dev tenga la infra: configurar `graph.driver:mysql` + el step en `.github/workflows/ci.yml`.
  - **Archivos:** `.sdd/config.json`, `.github/workflows/ci.yml`
  - **Depende de:** paso 18
  - **Verificación:** manual — `sdd doctor` no reporta `sqlite` deprecado en este repo.

---

## Parte B (Pivot 2 — reemplaza el mecanismo de detección de los pasos 4-9)

> Los pasos 1-3 y 10-19 (branch, BR/ADR base, retiro de sqlite, fix async de mysql, setup/doctor, README/C4, self-migration) siguen vigentes tal cual — son ortogonales al mecanismo de detección y no se re-ejecutan. Los pasos 4-9 (JSON en CI) quedan **supersedidos** por los pasos de acá abajo: el LLM ahora escribe texto en 2 archivos Markdown existentes desde el **pre-commit**, y la CI parsea eso (sin LLM) para poblar 4 tablas nuevas.

- [x] **20. BR-051 a BR-056 en domain.md + marcar BR-044-048 supersedidas** _(rapido)_
  - **Hace:** agregar las 6 reglas nuevas de `spec.md` (criterios 1-6), citando "Fuente: tarea 010 (Pivot 2)". Agregar una nota inline en BR-044 a BR-048 existentes: "⚠️ Supersedida por BR-051-056 (Pivot 2, mecanismo pre-commit) — se conserva el texto original sin editar, ver spec.md".
  - **Archivos:** `.sdd/domain.md`
  - **Depende de:** —
  - **Verificación:** `cmd: grep -c "BR-05[1-6]" .sdd/domain.md | grep -q 6`

- [x] **21. ADR-0012: LLM en pre-commit + parseo determinístico en CI (reemplaza el mecanismo de ADR-0011)** _(medio)_
  - **Hace:** documentar contexto (por qué el mecanismo CI-JSON del ADR-0011 se reemplaza: el dev quiere que el LLM enriquezca texto legible por humanos en cada commit, no solo JSON en CI), decisión (LLM en pre-commit no bloqueante escribe Inputs/Outputs en `components.md` y Casos de uso en `domain.md`; CI parsea esas secciones determinísticamente — sin LLM — y puebla 4 tablas relacionadas por `canonicalName`, con metadata de autoría vía `git blame`), alternativas descartadas (mantener JSON-en-CI del ADR-0011: no cubre colas/jobs/storage/entidades/casos de uso; LLM en CI en vez de pre-commit: pierde la actualización inmediata en cada commit que pidió el dev). Marcar `0011-deteccion-llm-en-ci-reemplaza-sqlite.md` con nota "Mecanismo de detección reemplazado por ADR-0012 (Pivot 2) — las decisiones sobre sqlite/mysql async-aware siguen vigentes".
  - **Archivos:** `.sdd/decisions/0012-llm-pre-commit-mas-parseo-ci.md`, `.sdd/decisions/0011-deteccion-llm-en-ci-reemplaza-sqlite.md`
  - **Depende de:** paso 20
  - **Verificación:** manual — el dev revisa el ADR.

- [x] **22. Tests: livingDocs.js (leer/reemplazar una sección Markdown, preservar el resto)** _(medio)_
  - **Hace:** tests de `readSection(content, heading)` (devuelve el texto de la sección `## <heading>` hasta el próximo `##`/EOF, o `null` si no existe) y `replaceSection(content, heading, newBody)` (reemplaza SOLO esa sección, la crea al final si no existía, preserva byte-a-byte el resto del archivo — mismo espíritu que `preserveManual`/BR-037 ya usado en `src/lib/c4.js`, pero granular por sección en vez de por archivo completo). Casos: sección al medio del archivo, sección al final, sección inexistente (crear), heading con mayúsculas/tildes, contenido con code fences que contienen `##` (no debe confundir el parser).
  - **Archivos:** `src/lib/livingDocs.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: npm test -- --test-name-pattern=livingDocs 2>&1 | grep -q "not ok"` _(rojo — módulo no existe)_

- [x] **23. Implementar src/lib/livingDocs.js** _(fuerte)_
  - **Hace:** implementar `readSection`/`replaceSection` para que los tests del paso 22 pasen.
  - **Archivos:** `src/lib/livingDocs.js`
  - **Depende de:** paso 22
  - **Verificación:** `cmd: node --test src/lib/livingDocs.test.js`

- [x] **24. Tests: generateSection (LLM produce texto Markdown de una categoría) en llmClient.js** _(medio)_
  - **Hace:** reescribir el contrato de `src/lib/llmClient.js`: retirar `callDetectionLlm`/salida JSON (Pivot 1, ya no aplica) y testear `generateSection(category, files, opts)` — `category` es uno de `'inputs'|'outputs'|'entidades'|'casos_de_uso'`, `files` son `{path, content}` de los archivos tocados, devuelve `{status:'ok', markdown: '<lista de bullets>'}` o `{status:'failed', reason}` (mismo mecanismo de retry/timeout ya validado en el Pivot 1: reusalo, solo cambia qué se le pide al LLM y la forma de la respuesta esperada — ya no valida contra un JSON schema, valida que la respuesta no esté vacía y sea texto Markdown de lista). Mock del cliente igual que antes (inyección de dependencia, sin `@anthropic-ai/sdk` real en el test).
  - **Archivos:** `src/lib/llmClient.test.js` (reescribir los tests de `callDetectionLlm` por los de `generateSection`)
  - **Depende de:** paso 23
  - **Verificación:** deben quedar en rojo.

- [x] **25. Implementar generateSection en llmClient.js; retirar validateDetectionResult/mergeCapabilities de llmDetect.js (ya no aplican)** _(fuerte)_
  - **Hace:** implementar `generateSection` para que los tests del paso 24 pasen (prompt: "dado este código, listá en Markdown — un bullet por ítem — los `<category>` que expone/usa/consume"). En `src/lib/llmDetect.js`, retirar `validateDetectionResult`/`mergeCapabilities` (eran específicos del schema JSON del Pivot 1, ya no aplican al nuevo formato de texto) — conservar `diffFilesSince` (sigue sirviendo para scoping en otros contextos). Actualizar/retirar los tests correspondientes en `llmDetect.test.js`.
  - **Archivos:** `src/lib/llmClient.js`, `src/lib/llmDetect.js`, `src/lib/llmDetect.test.js`
  - **Depende de:** paso 24
  - **Verificación:** `cmd: npm test`

- [x] **26. Tests: parseSectionItems (bullets → items con línea de origen) y blameLine (git blame por línea)** _(medio)_
  - **Hace:** `parseSectionItems(content, heading)` devuelve `[{text, line}]` — un item por bullet (`- ...`) de la sección, con el número de línea (1-indexed) en el archivo completo. `blameLine(root, file, line)` corre `git blame -L <line>,<line> --porcelain <file>` y devuelve `{author, date, commitHash}` de esa línea (repo git temporal real para el test, mismo patrón que `e2e.test.js`/`llmDetect.test.js`).
  - **Archivos:** `src/lib/livingDocs.test.js` (agregar `parseSectionItems`), `src/lib/gitBlame.test.js` (nuevo, para `blameLine`)
  - **Depende de:** paso 25
  - **Verificación:** deben quedar en rojo.

- [x] **27. Implementar parseSectionItems (livingDocs.js) y blameLine (src/lib/gitBlame.js)** _(fuerte)_
  - **Hace:** implementar ambas funciones para que los tests del paso 26 pasen.
  - **Archivos:** `src/lib/livingDocs.js`, `src/lib/gitBlame.js`
  - **Depende de:** paso 26
  - **Verificación:** `cmd: npm test`

- [x] **28. Tests: comando `sdd docs` (pre-commit, no bloqueante, corre siempre)** _(medio)_
  - **Hace:** tests de un nuevo comando `docs(root, flags)`: calcula archivos STAGEADOS del commit (`git diff --cached --name-only` — NO el diff-desde-último-publish de CI, es el scope del commit local en curso), lee su contenido, llama a `generateSection` una vez por categoría (`inputs`, `outputs` sobre `.sdd/c4/components.md`; `casos_de_uso` sobre `.sdd/domain.md`), y usa `replaceSection` para escribir el resultado — SIEMPRE corre (BR-051, sin filtrar relevancia). Si `generateSection` falla para alguna categoría, esa sección queda como estaba (última versión válida), se loguea una advertencia, y `docs()` NO tira (BR-053, no bloqueante) ni afecta a las otras categorías.
  - **Archivos:** `src/commands/docs.test.js`
  - **Depende de:** paso 27
  - **Verificación:** deben quedar en rojo (comando no existe).

- [x] **29. Implementar src/commands/docs.js** _(fuerte)_
  - **Hace:** implementar `docs(root, flags)` para que los tests del paso 28 pasen. Registrar el comando en `bin/sdd.js` (`sdd docs`, con flag `--hook` para el modo silencioso desde el pre-commit, análogo a como otros comandos ya distinguen modo hook).
  - **Archivos:** `src/commands/docs.js`, `bin/sdd.js`
  - **Depende de:** paso 28
  - **Verificación:** `cmd: node --test src/commands/docs.test.js`

- [x] **30. Tests + impl: instalar `sdd docs --hook` en el pre-commit (setup.js/init.js)** _(medio)_
  - **Hace:** el pre-commit instalado por `installPreCommit` (`src/lib/hooks.js`) hoy corre `sdd validate`. Agregarle una línea `sdd docs --hook || true` (no bloqueante, mismo patrón `|| true` que ya usa el post-commit retirado) DESPUÉS de `sdd validate`. Test: `installPreCommit` genera un hook que incluye ambos comandos; `sdd validate` sigue siendo bloqueante (su exit code sí importa), `sdd docs --hook` no.
  - **Archivos:** `src/lib/hooks.js`, `src/lib/hooks.test.js`
  - **Depende de:** paso 29
  - **Verificación:** `cmd: npm test`

- [x] **31. Tests: schema mysql con 4 tablas nuevas (inputs/outputs/entidades/casos_de_uso)** _(medio)_
  - **Hace:** tests de `createMysqlStore` con el schema ampliado: 4 tablas nuevas (`inputs`, `outputs`, `entidades`, `casos_de_uso`), cada una con columnas `canonical_name` (FK lógica a `systems`), `text`, `added_by`, `added_at`, `commit_hash`; y un método nuevo `upsertLivingDocs(canonicalName, {inputs, outputs, entidades, casosDeUso})` que reemplaza las filas de esas 4 tablas para ese sistema (delete+insert o upsert, tu elección, con un pool mockeado como ya se hace en `mysql.test.js`).
  - **Archivos:** `src/lib/graphstore/mysql.test.js`
  - **Depende de:** paso 30
  - **Verificación:** deben quedar en rojo.

- [x] **32. Implementar el schema de 4 tablas + upsertLivingDocs en mysql.js** _(fuerte)_
  - **Hace:** implementar el `CREATE TABLE IF NOT EXISTS` de las 4 tablas nuevas (migración idempotente, mismo patrón que la migración de `infra_resources`/`infra_edges` ya existente) y `upsertLivingDocs` para que los tests del paso 31 pasen.
  - **Archivos:** `src/lib/graphstore/mysql.js`
  - **Depende de:** paso 31
  - **Verificación:** `cmd: node --test src/lib/graphstore/mysql.test.js`

- [x] **33. Tests: publish.js --ci parsea Markdown determinísticamente y puebla las 4 tablas (retira el bloque JSON del Pivot 1)** _(medio)_
  - **Hace:** retirar del contrato de `publish()` el bloque `isCiRun`/`callDetectionLlm`/`mergeCapabilities`/`markTouchedAsPending` (Pivot 1, superseded). Nuevo comportamiento en modo `--ci`: lee `components.md`/`domain.md` del commit siendo publicado, usa `parseSectionItems` sobre Inputs/Outputs/Casos de uso (+ Entidades de `domain.md`, que ya existe), usa `blameLine` por cada item para la metadata de autoría, y llama a `store.upsertLivingDocs(canonicalName, {...})`. Tests con mocks de `parseSectionItems`/`blameLine`/`upsertLivingDocs` inyectados vía `deps`.
  - **Archivos:** `src/commands/publish.test.js`
  - **Depende de:** paso 32
  - **Verificación:** deben quedar en rojo.

- [x] **34. Implementar el wiring de publish.js --ci (parseo + blame + upsertLivingDocs)** _(fuerte)_
  - **Hace:** implementar el bloque descrito en el paso 33 para que sus tests pasen. Eliminar del archivo cualquier import/código muerto del Pivot 1 (`diffFilesSince`/`mergeCapabilities` en `publish.js` si ya no se usan ahí — `diffFilesSince` puede seguir viviendo en `llmDetect.js` para otros usos, solo se retira su uso EN publish.js si ya no aplica).
  - **Archivos:** `src/commands/publish.js`
  - **Depende de:** paso 33
  - **Verificación:** `cmd: npm test`

- [x] **35. Actualizar README.md y C4 (Pivot 2: reemplaza lo escrito sobre "detección LLM en CI")** _(rapido)_
  - **Hace:** reescribir la sección de README que hoy describe "detección de endpoints/consumptions vía LLM en CI" (agregada en el paso 18 de la Parte A) para reflejar el mecanismo real: LLM en pre-commit (siempre, no bloqueante) completa Inputs/Outputs/Casos de uso; CI parsea determinísticamente y puebla 4 tablas con metadata de autoría vía git blame. Actualizar `.sdd/c4/containers.md`/`context.md` si hace falta (el componente "Detección LLM en CI" del paso 18 pasa a ser "LLM en pre-commit" + "parser Markdown en CI").
  - **Archivos:** `README.md`, `.sdd/c4/containers.md`, `.sdd/c4/context.md`
  - **Depende de:** paso 34
  - **Verificación:** manual.

---

_Aprobación del dev: Parte A aprobada 2026-07-27. Parte B aprobada 2026-07-29._

---

## Cancelación (2026-09-03)

Esta tarea queda `cancelled`. Todos sus pasos estaban marcados como hechos, pero el trabajo que describen ya no existe: el plan opera sobre el CLI de sddkit (`src/lib/llmDetect.js`, `src/commands/publish.js --ci`, el storage sqlite/mysql), y la tarea 020 eliminó todo el código del repo al convertir sddkit en un plugin de Claude (ADR-0016 — `.sdd/decisions/0016-sddkit-como-plugin-de-claude.md`).

No hay nada pendiente que completar ni que revertir: se cancela para que el índice no la muestre como trabajo en pausa. Las reglas de negocio y los ADRs que la tarea dejó en `.sdd/` siguen vigentes salvo donde ADR-0016 los reemplace.
