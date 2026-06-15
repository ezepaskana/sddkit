# Retro — tarea 002: Fase 2 del grafo de impacto cross-sistema (ver REQUISITO-grafo-impacto.md)

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-13.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** cualitativo — sin tooling previo, "¿quién consume X?" se respondía con exploración manual cross-repo (grep/búsqueda en cada repo candidato), minutos y variable según cuántos repos haya que mirar.
- **Resultado medido después:**
  - Se configuró `.sdd/config.json → graph: {driver: "sqlite"}` (default `~/.sddkit/graph.db`) en los 3 repos reales (`sddkit`, `backend-service`, `frontend-app`).
  - `backend-service` y `frontend-app` tenían 6 y 8 checkboxes `- [ ]` pendientes respectivamente en `.sdd/c4/{context,containers,components}.md` (gate de `sdd publish`, criterio 2). Se resolvieron leyendo el código real (2 subagentes en paralelo) — 0 pendientes en los 3 repos.
  - `frontend-app` no tenía `.sdd/config.json` (Fase 1 solo corrió `sdd scan`, no `sdd setup`) — se creó uno mínimo con `graph` configurado.
  - `sdd publish` corrido en los 3 repos → 3/3 OK (`sddkit` sin git → `(sin git)`, `backend-service` → `809edf0`, `frontend-app` → `2dca497`).
  - `time sdd impact GET /api/v1/public/invitations/{token}` desde `sddkit` → **0.411s real** (objetivo <5s ✅). Resultado: `frontend-app [posible] GET env:VITE_API_URL/public/invitations/:param` (`src/services/api/invitations.ts`) — exactamente el caso de validación P6.
  - `sdd impact backend-service` (forma reversa, criterio 7) → 0.455s, lista los 35 endpoints publicados y marca el match `posible` con `frontend-app` en `GET /api/v1/public/invitations/{token}`; el resto "sin consumidores publicados" (incluye `POST /logs`, consistente con que `logger.ts` quedó `(dynamic)` en Fase 1).
  - `sdd context` en `frontend-app` (criterio 8) → `Publicado: 2026-06-13T02:29:41.550Z (2dca497)`.
- **¿Se cumplió lo esperado?:** Sí, ampliamente. <5s era el objetivo; el resultado real (~0.4s) es ~10x más rápido, con la tabla `systems` de solo 3 filas (esperable: SQLite local con 3 filas es prácticamente instantáneo). El caso de validación end-to-end P6 (`backend-service` ↔ `frontend-app`, invitations) matcheó como `posible` tal cual predicho en el análisis crítico.

## Qué anticipó bien la spec y qué no

**Bien:**
- El plan SQLite-primero (10 pasos, recomendación punto 2) se ejecutó completo en una sola tarea, sin necesidad de partirlo — la preocupación del análisis crítico ("si el plan resulta demasiado grande, señalarlo") no se materializó.
- P6 (matching `posible` vía sufijo de ruta normalizada, con el prefijo `env:VAR` stripeado) funcionó exactamente como se diseñó, validado con datos reales de los 2 pilotos.
- `better-sqlite3` Y `mysql2` instalaron limpio en este entorno (Node v20.20.2) — la suite quedó en 70/70 sin ningún `t.skip`, mejor que el peor caso que contemplaba la spec (P4 solo anticipaba "sin servidor MySQL real", no problemas de instalación del paquete).

**No anticipado:**
- `frontend-app` no tenía `.sdd/config.json` (Fase 1 solo corrió `sdd scan --dir=...` sobre ese repo, no `sdd setup` completo). No bloqueó nada — `publish.js`/`impact.js` ya degradaban bien con `cfg=null` — pero `context()` exige `cfg` (`if (!cfg) throw`), así que hubo que crear el archivo a mano para poder medir el criterio 8 ahí. Spec/plan no mencionaban este gap porque Fase 1 no lo dejó documentado.
- Resolver los 14 checkboxes pendientes (6 + 8) en `backend-service`/`frontend-app` fue más trabajo de investigación de código de lo que el paso 10 sugería ("documentar si esto hizo falta") — se resolvió con 2 subagentes sonnet en paralelo, cada uno explorando su repo, sin tocar las secciones `sdd:manual` ni "Dependencias salientes" autogeneradas.
- Gap de arquitectura nuevo (no estaba en P1-P6): el driver `mysql.js` (paso 8) expone `{publishSystem, querySystem, listSystems, close}` como métodos `async` (mysql2/promise es inherentemente asíncrono), pero `wrap()` en `graphstore/index.js` (paso 4, diseñado para `sqlite.js` síncrono) llama a `store.listSystems()`/`store.querySystem()` sin `await`. Para el driver `sqlite` esto es correcto (better-sqlite3 es síncrono); para `mysql` significa que `queryCapability`/`queryImpact`/`querySystem` devolverían una `Promise` sin resolver a quien las consuma (`publish.js`/`impact.js`/`context.js`). `mysql.test.js` prueba `createMysqlStore` de forma aislada (correcto, contrato cumplido) pero la integración completa `mysql` ↔ `publish`/`impact`/`context` queda sin probar — más allá del gap P4 ya documentado (sin servidor MySQL real). Se registra como aprendizaje accionable abajo.

## Desvíos del plan

Los 10 pasos se completaron en el orden planeado, sin replanificación ni pasos agregados/removidos. Ajustes menores hechos por el orquestador, dentro del alcance de los pasos correspondientes:

- **Paso 5**: se agregó `stdio: ['ignore', 'pipe', 'ignore']` a `execSync('git rev-parse HEAD', ...)` en `publish.js` — el subagente lo dejó sin esto, lo que imprimía "fatal: not a git repository" a stderr durante los tests en tmpdirs sin git (capturado correctamente por el try/catch, pero ruidoso). Verificado: 58/58 seguía en verde tras el fix.
- **Paso 7**: el subagente implementó el mensaje "sin publicar" como `Publicado: nunca — correr \`sdd publish\``. El criterio 8 / BR-016 especifican literalmente `"Sin publicar — correr \`sdd publish\`"`. El orquestador corrigió el string (y el test correspondiente) para alinear con la spec antes de cerrar la tarea.
- **Tras el paso 10** (no es un paso del plan, pero estaba en "Impacto en arquitectura/catálogo" de la spec refinada): se actualizó manualmente `.sdd/c4/components.md` de `sddkit` para reflejar el nuevo submódulo `src/lib/graphstore/` (4 archivos, sumados a la fila `src/lib`: 10→14) y los 2 comandos nuevos (`publish`, `impact`) en la fila de `src/commands` (10→12). No se corrió `sdd scan` completo (sddkit no es un repo git en este entorno — sin red de seguridad para una regeneración automática); se editó la tabla a mano. Primer intento agregó `src/lib/graphstore` como fila propia → `sdd validate` marcó drift (`componentGroups` agrupa solo un nivel bajo `src/`, no anida `lib/graphstore` aparte) — corregido plegándolo dentro de la fila `src/lib`; `sdd validate` quedó en verde (0 drift). Sin tocar las secciones `❓ VALIDAR`/`sdd:manual` ya resueltas.

## Aprendizajes accionables

- **Gap de arquitectura — `graphstore/index.js::wrap()` asume store síncrono**: `sqlite.js` es síncrono (better-sqlite3); `mysql.js` (paso 8) es asíncrono (mysql2/promise) pero implementa el MISMO contrato `{publishSystem, querySystem, listSystems, close}`. `wrap()` no hace `await` en ningún lado, por lo que con driver `mysql`, `querySystem`/`queryCapability`/`queryImpact` devolverían `Promise` sin resolver a `publish.js`/`impact.js`/`context.js`. Antes de dar soporte real a equipos con MySQL (más allá de los tests unitarios de `mysql.test.js`), `wrap()` y los 3 comandos que llaman a estos métodos necesitan volverse `async`-aware (o el driver sqlite necesita una fachada async equivalente). _(tarea 002)_
- **Repos piloto pueden tener `.sdd/` parcial** (solo `sdd scan`, sin `sdd setup` → falta `.sdd/config.json`): `context()` exige `cfg` y tira si falta; `publish.js`/`impact.js` degradan bien con `cfg=null`. Si una tarea futura necesita `sdd context` en un repo piloto, verificar primero que `.sdd/config.json` exista. _(tarea 002)_
- **Mensajes de usuario citados en EARS/domain.md son contrato literal**: un subagente implementó una variante semánticamente equivalente ("Publicado: nunca" vs "Sin publicar") que no matcheaba el string exacto de BR-016/criterio 8. Al verificar pasos que producen output para el usuario, comparar el string contra la spec/domain.md palabra por palabra, no solo "transmite la misma idea". _(tarea 002)_
- **`sdd impact <sistema>` (forma reversa) imprime una línea "(sin consumidores publicados...)" por CADA endpoint del sistema** — con `backend-service` (35 endpoints, 1 con match) el output es mayormente ruido. Funciona correctamente (criterio 7 cumplido), pero si el catálogo de endpoints de un sistema crece, un flag futuro tipo `--only-matches` mejoraría la legibilidad. No bloqueante — registrado para si Fase 3+ retoma UX de `sdd impact`. _(tarea 002)_

## ¿Algo para el catálogo, el dominio o la arquitectura?

- BR-012 a BR-016 y el glosario ("Match `exacto`/`posible`") ya estaban en `.sdd/domain.md` desde la fase de spec — sin cambios adicionales.
- ADR-0008 (`better-sqlite3` opcional) ya registrado desde el paso 1.
- `.sdd/c4/components.md` de `sddkit` actualizado (módulo `graphstore` + comandos `publish`/`impact`) — ver "Desvíos del plan".
- No surgió ninguna convención nueva con `multipleStyles: true` que requiera `sdd decide`.
- El gap `wrap()` síncrono/asíncrono (ver "Aprendizajes accionables") es candidato a ADR si una Fase futura prioriza soporte de equipo con MySQL — por ahora queda como aprendizaje en `LEARNINGS.md`, no amerita ADR todavía (MySQL sigue sin servidor real para validar, P4).
- `backend-service` y `frontend-app` quedaron con sus C4 (`context.md`/`containers.md`/`components.md`) completos (0 placeholders) y publicados al grafo — pendiente de que esos repos commiteen sus propios cambios de `.sdd/` (incluye el `.sdd/config.json` nuevo de `frontend-app`), fuera del alcance de sddkit.
