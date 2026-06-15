# Spec — tarea 001: Fase 1 del grafo de impacto cross-sistema (ver REQUISITO-gra…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Hoy `sdd find`/`patterns.json → capabilities.endpoints` responde "¿qué expone este repo?" pero no "¿de qué depende este repo?". Sin eso, ni una persona ni un agente puede saber —sin grep manual— a qué sistemas externos llama un repo, lo cual es prerrequisito para todo lo demás del requisito (matching en Fase 2, impacto cross-repo). Fase 1 da valor standalone (un solo repo, sin DB) y deja datos listos para Fase 2.

- **¿Ya existe algo en el repo que lo resuelve total o parcialmente?** Sí, casi toda la infraestructura: `extractEndpoints` (`src/lib/patterns.js`) ya hace exactamente este trabajo para el lado "expuesto" — regex por archivo de código (≤300KB), persistido en `patterns.json → capabilities.endpoints`, consumido por `sdd find`. **No existe** `capabilities.consumptions`, ningún detector de llamadas salientes, ninguna sección de "Dependencias salientes" en `containers.md`, y `find` no busca en consumos. Confirma la nota de la sección 8: es extensión, no invención. `detectPatterns` (mismo archivo) es la otra pieza reutilizable: detecta variantes de un topic por archivo — el mismo esqueleto (lista de `{id, label, re, ext}` + recorrido de `walk(root)`) sirve para los detectores de consumo.

- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Dentro del alcance ya acotado de Fase 1 (que en sí es el 20% del requisito completo), hay un recorte adicional razonable: **priorizar el detector que el piloto puede validar**. Revisé los dos repos piloto (`frontend-app`, `backend-service`):
  - `frontend-app`: usa `fetch(` directo en 3 archivos (`src/lib/api.ts`, `src/lib/logger.ts`, `src/services/api/invitations.ts`) y un 4to en `services/api/plants.ts` (streaming). Cero `axios`.
  - `backend-service`: usa `java.net.http.HttpClient` (`HttpRequest.newBuilder()...uri(...)...send(...)`) en `DeviceClient.java` y `WeatherClient.java`. **Cero** `RestTemplate`, `WebClient` u `OkHttp` en el repo piloto.
  Implementar detectores para RestTemplate/WebClient/OkHttp (que el requisito menciona) sin un caso real para validarlos es trabajo "a ciegas" — no hay forma de medir precisión/recall (la métrica F1 de la sección 6 es justamente "vs los reales, revisión manual"). Propongo: `java.net.http.HttpClient` como detector principal (validado contra el piloto); RestTemplate/WebClient/OkHttp como detectores adicionales de mejor esfuerzo, simples y aislados, pero sin bloquear la tarea si no quedan perfectos (no hay piloto que los ejercite).

- **Supuestos del dev que podrían no ser ciertos:**
  1. *"Un regex tipo `fetch(`/`axios.<verbo>(` va a capturar los consumos reales con buen recall"* — **parcialmente falso en `frontend-app`**. La mayoría de las llamadas reales pasan por un wrapper (`apiFetch(path, token, options)` en `src/lib/api.ts`), y los call-sites (`services/api/plants.ts: apiFetch("/plants", token)`, etc. — ~10+ funciones) **no contienen** `fetch(`/`axios`. Solo la *definición* del wrapper tiene `fetch(url, {...})`, con `url = \`${API_BASE_URL}${path}\`` — ambas partes interpoladas, sin ruta literal que extraer. Detectar wrappers de un nivel de indirección requeriría resolución cross-statement (no es "mismo patrón que `extractEndpoints`", que es regex por línea/contenido sin estado). **No** propongo resolver wrappers en Fase 1 — lo marco como limitación conocida (igual que `extractEndpoints` no cubre todos los estilos de definición de rutas) y candidato a aprendizaje para Fase 2. Lo que SÍ detecta el regex simple en este repo: 4 call-sites `fetch(` (2 con destino resoluble vía `env:VITE_API_URL`/`env:VITE_LOG_URL`, 2 con destino dinámico) — sigue siendo information nueva (baseline 0 → >0).
  2. *"`env:PLANTS_API_URL` es el caso típico"* — el caso real en el frontend es `import.meta.env.VITE_API_URL` (Vite), no `process.env`. En el backend Java piloto, las URLs externas (`https://api.example.com`, `https://api.weather.com/...`) son **constantes literales hardcodeadas**, no env vars — el detector Java en este piloto no necesita resolver env vars para dar valor, aunque convendría soportar `System.getenv(...)`/`@Value("${...}")` por generalidad (patrón común en Spring/Javalin con config por env).
  3. *"Cubrir 4 frameworks Java desde el día 1"* — ver punto anterior: 3 de los 4 no tienen caso de prueba en el piloto.

- **Riesgos y efectos secundarios:**
  - **Falsos positivos en Java**: regexes anclados a verbos genéricos (`.get(`, `.post(`) son peligrosos en Java —`Optional.get()`, `Map.get(key)`, `List.get(i)` son extremadamente comunes y NO son llamadas HTTP. Hay que anclar los regexes a los identificadores de cliente HTTP específicos (`HttpRequest.newBuilder`/`.send(`, `restTemplate.`, `webClient.`, `OkHttpClient`/`Request.Builder`), nunca a `.get(`/`.post(` sueltos.
  - **Mantenimiento de `containers.md`**: agregar la sección "Dependencias salientes" implica tocar `genContainers` (`src/lib/c4.js`) — `preserveManual` sigue aplicando, pero hay que decidir si la sección nueva es contenido GENERADO (se recalcula en cada `sdd scan` desde `capabilities.consumptions`, como el resto del C2) o manual. Generado es consistente con "espejo del índice de endpoints expuestos" — lo propongo así (pregunta de clarificación P5).
  - **Performance**: ninguno nuevo — reutiliza `walk`/límite de 300KB ya existente en `patterns.js`.
  - Cambio de formato en `patterns.json` (nueva clave `capabilities.consumptions`) — no rompe lectores existentes (es aditivo), pero `sdd find` debe actualizarse para buscar ahí también.

- **¿Qué pasa si NO se hace?** Nada se rompe — sddkit sigue funcionando igual. Pero seguimos sin poder responder "¿a quién impacto?" ni a nivel de un solo repo, y las Fases 2-3 (que consumen `capabilities.consumptions`) quedan bloqueadas — todo el requisito del grafo de impacto queda sin punto de partida.

**Recomendación:** `proceder con cambios` — el enfoque extiende infraestructura real y ya probada (`extractEndpoints`/`patterns.json`/`find`/`detectPatterns`), y el piloto confirma que hay señal real para detectar (aunque parcial). Los cambios que propongo, a validar en clarificación:
1. Detector Java: `java.net.http.HttpClient` como prioridad (validado contra `backend-service`); RestTemplate/WebClient/OkHttp como mejor esfuerzo, sin caso de prueba real.
2. Documentar el límite de recall por wrappers/indirecciones (caso `frontend-app`/`apiFetch`) como limitación conocida de Fase 1, sin intentar resolverlo ahora.
3. Anclar los regexes Java a identificadores de cliente HTTP específicos para evitar falsos positivos masivos con `.get()`/`.post()` genéricos.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: Alcance del detector Java — RestTemplate/WebClient/HttpClient/OkHttp del requisito vs. solo HttpClient (lo que usa el piloto `backend-service`).
  - Respuesta: **HttpClient prioritario, resto mejor esfuerzo.** Se implementa y valida `java.net.http.HttpClient` (caso real del piloto). RestTemplate/WebClient/OkHttp se agregan como detectores simples adicionales (mismo estilo que `ENDPOINT_STYLES`), documentados como "no validados contra un repo real" — no bloquean la tarea si quedan imperfectos.

- [x] P2: Límite de recall por wrapper `apiFetch` en `frontend-app` (los call-sites reales no contienen `fetch(`/`axios`, solo la definición del wrapper con URL dinámica).
  - Respuesta: **Documentar como limitación conocida.** F1 detecta solo llamadas directas (`fetch(`, `axios.<verbo>(`, `axios(`, `HttpClient`/`HttpRequest`, etc.) — sin resolver indirecciones de un nivel. Se documenta explícitamente en spec/README/containers.md como limitación conocida y aprendizaje candidato para Fase 2/3. La métrica F1 se mide sobre lo que el detector simple efectivamente encuentra.

- [x] P3: Formato de `capabilities.consumptions` en `patterns.json`.
  - Respuesta (propuesta del agente, a confirmar al aprobar la spec): array de objetos `{ method, target, file }`, espejo de `capabilities.endpoints` (`{ method, path, file }`):
    - `method`: `"GET"|"POST"|"PUT"|"DELETE"|"PATCH"` si es inferible del código (verbo axios, `.GET()/.POST(...)` de `HttpRequest.Builder`, `options.method` literal); `null` si no es inferible (p.ej. `fetch(url, options)` con `options` dinámico).
    - `target`: el destino tal como se puede determinar — URL/path normalizado (ver P4), prefijado con `env:NOMBRE_VAR` cuando la base viene de una env var resuelta en el mismo archivo (`import.meta.env.X`, `process.env.X`, `System.getenv("X")`), o la URL externa literal completa si es un host hardcodeado (p.ej. APIs de terceros tipo Device/Weather). Ej.: `env:VITE_API_URL/public/invitations/:param`, `https://api.weather.com/v1/forecast`.
    - `file`: ruta relativa del archivo, igual que en `endpoints`.
  - Orden y dedupe: igual criterio que `extractEndpoints` (orden estable, sin duplicados exactos por `method+target+file`).

- [x] P4: Normalización de segmentos dinámicos de ruta (`${id}`, `+ userId`) a placeholder `:param`.
  - Respuesta: **Normalizar ya en F1**, consistente con ADR-0007 (join keys por método+ruta normalizada). `/plants/${id}` → `/plants/:param`; `BASE_URL + "/users/" + userId` → `:base/users/:param` (o `env:VAR/users/:param` si `BASE_URL` resuelve a una env var) — el detalle exacto de la normalización Java se define en el plan, manteniendo el mismo espíritu: segmentos literales se preservan, segmentos dinámicos se reemplazan por `:param`.

- [x] P5: Mantenimiento de la sección "Dependencias salientes" en `.sdd/c4/containers.md`.
  - Respuesta: **Generada por `sdd scan`**, igual que el resto de C2 (tabla recalculada desde `capabilities.consumptions` en cada scan; la sección `sdd:manual` no se toca).

- [x] P6: Metodología de validación del piloto (métrica F1, sección 6 del requisito).
  - Respuesta (propuesta del agente, a confirmar al aprobar la spec): el paso de cierre del plan corre `sdd scan --dir <ruta-a-backend-service>` y `sdd scan --dir <ruta-a-frontend-app>` (sin requerir que esos repos tengan `.sdd/` configurado — `scan` funciona standalone sobre cualquier path), y se listan los `capabilities.consumptions` resultantes. El dev revisa esa lista a ojo contra lo que sabe que existe (los 4 fetch directos de `frontend-app` + los clientes `HttpClient` de `backend-service`) y completa la retro de la tarea con el conteo detectado vs. esperado (precisión/recall estimados, sin instrumentación automática — la sección 6 ya aclara "estimados a ojo").

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** F1 (sección 6 del requisito) — cantidad de entradas en `capabilities.consumptions` que `sdd scan` detecta en `backend-service` y `frontend-app`, comparada con los consumos salientes reales que el dev conoce (revisión manual); precisión y recall estimados a ojo.

- **Baseline actual:** 0 en ambos repos — la clave `capabilities.consumptions` no existe hoy en `patterns.json`, ni ningún detector la produce.

- **Resultado esperado:**
  - **`backend-service`**: ≥4 entradas. 3 en `DeviceClient.java` (`POST`, destino literal completo `https://api.example.com/v4/new-api/<queryDeviceList|queryDeviceInfo|queryHistoricalData>`, totalmente resuelto). 1 en `WeatherClient.java` (`GET`, destino dinámico — el único call-site `HttpRequest.newBuilder().uri(URI.create(url)).GET()` vive en el helper privado `get(String url)`, y `url` llega armado por `String.format(...)` un nivel arriba con `ARCHIVE_URL`/`FORECAST_URL`). Reales conocidos por el dev: 5 (Device 3 + Weather 2: archive/forecast) — el detector colapsa los 2 de Weather en 1 entrada de destino dinámico porque comparten helper (misma clase de limitación que P2, del lado Java). Precisión esperada: alta, sin falsos positivos, si los regexes se anclan a `HttpRequest`/`.uri(`/`.send(` y NUNCA a `.get()`/`.post()` sueltos (riesgo señalado en el análisis crítico). Recall esperado: 4/5 (80%).
  - **`frontend-app`**: 4 entradas — los 4 `fetch(` directos del repo: (1) definición de `apiFetch` en `src/lib/api.ts`, destino parcial `env:VITE_API_URL` + resto dinámico, método no inferible (`null`); (2) `src/lib/logger.ts`, método `POST` literal, destino derivado de `LOG_ENDPOINT` (`env:VITE_LOG_URL` con fallback a `env:VITE_API_URL`); (3) `src/services/api/invitations.ts`, destino totalmente normalizable `env:VITE_API_URL/public/invitations/:param`, método `GET` (sin `method:` explícito → default de `fetch`); (4) `src/services/api/plants.ts` (streaming), método `POST` literal, destino dinámico (parámetro de función). Reales conocidos por el dev: >10 (las funciones de `services/api/*.ts` que llaman a `apiFetch` con rutas literales — pero esos call-sites no contienen `fetch(`/`axios`, están detrás del wrapper). Recall esperado: 4/(>10), bajo — **resultado aceptado**: el valor de F1 acá no es "recall alto" sino pasar de 0 a >0 con información real y útil, documentando la limitación del wrapper (P2, BR-011) como aprendizaje para Fase 2/3.

- **Cómo se mide después:** según P6 — el paso de cierre del plan corre `sdd scan --dir <ruta-a-backend-service>` y `sdd scan --dir <ruta-a-frontend-app>`, se inspecciona `capabilities.consumptions` en el `patterns.json` resultante de cada uno, y se compara contra los conteos de esta sección (detectado vs. esperado, por archivo). El resultado se registra en `retro.md`.

## Spec refinada

**Historia:** Como agente de IA (o dev) que ejecuta el flujo SDD sobre un repo, quiero que `sdd scan` detecte las llamadas HTTP salientes del código y las registre en `capabilities.consumptions` (espejo de `capabilities.endpoints`), para poder responder "¿de qué depende este repo?" sin grep manual — sentando la base de datos que las Fases 2-3 usarán para construir el grafo de impacto cross-sistema.

**Criterios de aceptación (formato EARS):**

- CUANDO se corre `sdd scan` en un repo con archivos de código (`CODE_EXT`, ≤300KB, fuera de `IGNORE_DIRS` y de archivos de test) que contienen llamadas HTTP salientes vía `fetch(`, `axios.<verbo>(`/`axios(`, o (Java) `java.net.http.HttpClient` (`HttpRequest.newBuilder()...send(...)`), EL SISTEMA DEBE registrar cada llamada detectada en `patterns.json → capabilities.consumptions` con el formato `{method, target, file}` acordado en P3 (BR-010).
- CUANDO el destino de una llamada se construye a partir de una variable de entorno resuelta en el mismo archivo (`import.meta.env.X`, `process.env.X`, `System.getenv("X")`), EL SISTEMA DEBE registrar el destino con el prefijo simbólico `env:X` (BR-009), dejando la resolución a un recurso real para la Fase 3.
- CUANDO el destino de una llamada contiene segmentos dinámicos interpolados (`${id}`, concatenación `+ variable`), EL SISTEMA DEBE normalizarlos a `:param`, preservando los segmentos literales (P4, ADR-0007).
- CUANDO el método HTTP no es inferible del código (p.ej. `fetch(url, options)` con `options` dinámico, sin literal `method:`), EL SISTEMA DEBE registrar `method: null` en lugar de adivinar.
- CUANDO se corre `sdd scan`, EL SISTEMA DEBE regenerar la sección "Dependencias salientes" de `.sdd/c4/containers.md` a partir de `capabilities.consumptions` (P5), respetando la marca `sdd:manual` (BR-001).
- CUANDO se corre `sdd find <término>`, EL SISTEMA DEBE buscar también en `capabilities.consumptions`, además de `capabilities.endpoints` (BR-010).
- SI el repo no tiene llamadas HTTP salientes detectables (o no es un repo de código soportado), EL SISTEMA DEBE registrar `capabilities.consumptions: []` sin error, igual que hoy hace `capabilities.endpoints`.
- SI una llamada saliente usa un framework Java no priorizado (RestTemplate/WebClient/OkHttp), EL SISTEMA DEBE intentar detectarla con un detector de mejor esfuerzo (P1), sin garantía de cobertura — limitación documentada (BR-011).

**Reglas de negocio afectadas:** BR-001 (marca `sdd:manual` en `containers.md`), BR-009, BR-010, BR-011 (estas tres últimas agregadas a `.sdd/domain.md` en esta misma tarea).

**Fuera de alcance:**

- Resolución de wrappers/indirecciones de un nivel (p.ej. `apiFetch` en `frontend-app`, helper `get(url)` en `WeatherClient.java`) — limitación conocida (P2, BR-011), candidata a aprendizaje para Fase 2/3.
- Detectores Java para RestTemplate/WebClient/OkHttp como prioridad — se agregan de mejor esfuerzo (P1), sin validación contra un repo real.
- gRPC, GraphQL, websockets (sección 4 del requisito — fuera de alcance del proyecto completo).
- Resolución de destinos `env:NOMBRE_VAR` a recursos reales de infraestructura — corresponde al scanner de Terraform (Fase 3, ADR-0005, ADR-0006).
- `sdd publish`, `sdd impact`, storage enchufable del grafo central, tabla `systems`, matching endpoints↔consumos por método+ruta — todo Fase 2 (ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007).
- Scanner de Terraform y aristas de infraestructura — Fase 3 (ADR-0005, ADR-0006).
- UI/visualización del grafo (sección 4 del requisito).

**Impacto en arquitectura/catálogo:**

- `src/lib/patterns.js` — nuevo extractor de consumos (mismo patrón que `ENDPOINT_STYLES`/`ROUTE_RES`/`extractEndpoints`: detectores `{id, label, re, ext}` + recorrido de `walk(root)`), produciendo `{method, target, file}[]` con normalización de rutas (ADR-0007) y prefijo `env:` (BR-009).
- `src/commands/scan.js` — invoca el nuevo extractor, persiste `capabilities.consumptions` en `patterns.json`, y pasa los datos a `genContainers` para regenerar "Dependencias salientes".
- `src/lib/c4.js` (`genContainers`) — nueva sección "Dependencias salientes" en `containers.md`, generada (no manual, P5), recalculada en cada `sdd scan` respetando `sdd:manual` (BR-001).
- `src/commands/context.js` (`find`) — extiende la búsqueda a `capabilities.consumptions` además de `capabilities.endpoints` (BR-010).
- `.sdd/domain.md` — agrega BR-010 y BR-011 (hecho en esta tarea, junto con BR-009 ya existente).
- ADRs citados: ADR-0007 es el más directamente aplicable a Fase 1 (normalización de rutas para join keys futuras, P4); ADR-0001 a ADR-0006 enmarcan el resto del requisito (proyección, storage enchufable, publish desde CI, `impact` como advertencia, Terraform via `terraform show -json`, aristas `potencial`) — se citan para dejar explícito que Fase 1 es consistente con ellos, aunque su implementación corresponda a Fases 2-3.
- No requiere cambios a `.sdd/c4/context.md` ni a `.sdd/c4/components.md` (los containers/componentes no cambian, solo su contenido generado); `containers.md` sí cambia (nueva sección "Dependencias salientes").

---
_Aprobación del dev: **aprobada** (2026-06-12)_
