# Retro — tarea 001: Fase 1 del grafo de impacto cross-sistema (ver REQUISITO-grafo-impacto.md)

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-12.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** `capabilities.consumptions` no existía (0 entradas en cualquier repo, campo inexistente en `patterns.json`).
- **Resultado medido después:**
  - `backend-service`: `sdd scan --dir=/path/to/projects/backend-service` → 4 entradas en `capabilities.consumptions` (3 `DeviceClient` `POST` con destino literal completo + 1 `WeatherClient` `GET` con destino `(dynamic)`), reflejadas en `.sdd/c4/containers.md` → "## Dependencias salientes". Precisión 100% (cero falsos positivos sobre `Optional.get()`/`Map.get()`/`List.get()`). Recall 4/5 (80%) — los 2 endpoints de Weather (archive/forecast) comparten el helper `get(String url)` y colapsan en 1 entrada `(dynamic)`, exactamente como predijo el análisis crítico.
  - `frontend-app`: `sdd scan --dir=/path/to/projects/frontend-app` → 4 entradas en `capabilities.consumptions`, una por cada archivo esperado (`api.ts`, `logger.ts`, `invitations.ts`, `plants.ts`), reflejadas en "## Dependencias salientes". Coincidencia 100% en cantidad y ubicación con lo esperado. Reales conocidos >10 (wrapper `apiFetch`) — no detectados, tal como anticipaba BR-011/P2 (fuera de alcance de Fase 1).
- **¿Se cumplió lo esperado?:** Sí. Ambos repos pasaron de 0 a exactamente la cantidad de entradas predicha en spec.md (≥4 y 4 respectivamente), con precisión 100% y sin falsos positivos. El recall parcial (80% en backend, bajo en frontend por el wrapper) es el comportamiento documentado como esperado por BR-011, no una desviación.

## Qué anticipó bien la spec y qué no

**Bien:**
- El conteo exacto para ambos repos piloto (4 y 4) coincidió con lo predicho.
- La colisión de los 2 endpoints de Weather en 1 entrada `(dynamic)` (mismo helper `get(String url)`) ocurrió tal cual se anticipó.
- El wrapper `apiFetch` de `frontend-app` quedó fuera del recall, tal cual anticipaba BR-011/P2.
- El anclaje estricto a `HttpRequest`/`.uri(`/`.send(` (y a `restTemplate`/`webClient`/`Request.Builder` para los detectores de mejor esfuerzo) evitó el riesgo señalado en el análisis crítico de confundir `Optional.get()`/`Map.get()`/`List.get()`/métodos `get`/`post` propios con llamadas HTTP — 0 falsos positivos en los 19+ fixtures de test y en los 2 repos piloto.

**No anticipado (matiz nuevo, no un bug):**
- En `api.ts` y `logger.ts` el target salió `(dynamic)` en vez de un `env:VITE_API_URL`/`env:VITE_LOG_URL` (parcial o con fallback) como sugería implícitamente el espíritu de BR-009:
  - `api.ts`: el target es un template 100% interpolado (`` `${API_BASE_URL}${path}` ``, sin ningún segmento literal) → cae en la regla "todo dinámico → `(dynamic)`" definida en el paso 2, que tiene prioridad sobre la resolución `env:` cuando no hay texto literal de anclaje.
  - `logger.ts`: `LOG_ENDPOINT` no es una asignación directa simple de `import.meta.env.X`/`process.env.X` (la forma que cubre `envConsts`), sino el resultado de una expresión con ternarios anidados → no se reconoce como env-const.
  
  Es coherente con BR-011 ("mejor esfuerzo, sin garantía de cobertura total") pero es un punto concreto y no documentado explícitamente en P2-P6 — se registra como aprendizaje abajo.

## Desvíos del plan

Ninguno — los 7 pasos se completaron en el orden planeado, sin replanificación ni pasos agregados/removidos.

Observación no bloqueante (paso 1): `node --test` con el patrón recursivo default también recoge `src/commands/test.js` (un comando CLI, no un archivo de test) como "test" vacío que pasa trivialmente (0 assertions) porque su nombre coincide con `**/test.js`. No afecta el resultado (la suite sigue en verde, 20/20), pero infla el conteo de tests reportado en 1. Se documenta como gotcha abajo.

## Aprendizajes accionables

- **`node --test` recoge `src/commands/test.js` como test vacío**: cualquier archivo llamado exactamente `test.js` bajo `src/` coincide con el patrón recursivo default de `node --test` y se ejecuta como suite vacía (0 assertions, "ok"). No rompe nada, pero si se agrega un comando `sdd test` real en el futuro, considerar excluirlo (`--test-name-pattern` o ajustar el patrón de `package.json`) para que el conteo de tests sea exacto.
- **Resolución `env:NOMBRE_VAR` (BR-009) en targets JS/TS — límites concretos**: hoy cubre (a) un identificador simple asignado directamente a `import.meta.env.X`/`process.env.X` usado como ÚNICO segmento de un template seguido de texto literal (→ `env:X/resto/:param`), y (b) ese mismo identificador pasado directo como target. NO cubre: (1) templates 100% interpolados sin ningún segmento literal (`` `${A}${B}` `` → cae en `(dynamic)` aunque `A` sea resoluble a `env:`), ni (2) identificadores cuyo valor viene de una expresión derivada (ternarios, concatenaciones intermedias) en vez de asignación directa. Si Fase 2/3 quiere mejorar el recall sobre wrappers tipo `apiFetch`/`logger`, este es el punto exacto a extender en `resolveTarget`/`envConsts` de `src/lib/patterns.js`.
- **Anclar detectores de "llamada HTTP por nombre de método genérico" a un identificador/clase de framework inequívoco**: el detector Java ancla SIEMPRE a `HttpRequest`/`.uri(`/`.send(` (o a `restTemplate`/`webClient`/`new Request.Builder()` para los detectores de mejor esfuerzo) — esto evitó 100% de falsos positivos sobre `Optional.get()`/`Map.get()`/`List.get()`/métodos `get`/`post`/`exchange` propios de clases de dominio, tanto en los fixtures de test como en los 2 repos piloto. Replicar este patrón (anclar a un símbolo de framework, nunca a un verbo de método suelto) para cualquier detector heurístico futuro.

## ¿Algo para el catálogo, el dominio o la arquitectura?

- BR-010 y BR-011 ya quedaron registradas en `.sdd/domain.md` durante la Fase 1 (citando esta tarea como fuente).
- ADRs 0001 a 0007 ya registrados en `.sdd/decisions/` durante la Fase 1, cubriendo las "Decisiones ya tomadas" de la sección 5 del requisito.
- No surgió ninguna convención nueva con `multipleStyles: true` que requiera `sdd decide`.
- Único cambio estructural en C4: la nueva sección "## Dependencias salientes" en `containers.md`, generada automáticamente por `sdd scan` dentro de la porción regenerable (BR-001/P5) — no requiere acción manual adicional.
- No quedaron preguntas recurrentes nuevas para promover a los docs.
