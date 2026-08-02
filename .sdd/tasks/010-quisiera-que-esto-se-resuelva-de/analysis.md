# Analysis — tarea 010: Quisiera que esto se resuelva de una manera mucho mas inteli…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de especificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Hoy, cuando `extractConsumptions`/`resolveTarget` (`src/lib/patterns.js`) no puede resolver estáticamente el target de una llamada `fetch`/`axios` (identificador derivado, wrapper como `logger.ts`, template 100% interpolado), colapsa a la cadena literal `"(dynamic)"`. El dato original se pierde por completo, y `matching.js:16` (BR-014) descarta cualquier target `"(dynamic)"` del matching de impacto. Resultado: el dev ve la fila en la DB pero no tiene ninguna pista de a qué endpoint apunta.

- **¿Ya existe algo en el repo que lo resuelve parcial o totalmente?** Sí, parcial: `resolveTarget`/`envConsts` ya resuelven identificadores asignados DIRECTO a `import.meta.env.X`/`process.env.X` (`env:VAR`, BR-009) y templates con segmentos literales. El gap con wrappers tipo `logger.ts`/`apiFetch` (identificador que viene de una expresión derivada: import de config, desestructuración, retorno de función) está **documentado como límite conocido** en `.sdd/LEARNINGS.md` (tarea 001), con el punto exacto de extensión ya señalado (`resolveTarget`/`envConsts`).

- **¿Alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí. El requisito tal como está escrito ("mucho más inteligente") es ambiguo y puede leerse como pedir inferencia semántica/cross-file/tipo LLM — una reescritura de arquitectura del extractor. Pero el dolor real que reportaste ("no puedo saber qué endpoint consume") se resuelve con dos piezas mucho más chicas y deterministas:
  1. Extender `resolveTarget` a 2-3 patrones adicionales, LOCALES al archivo y estáticamente seguros (ej: `const url = OBJ.PROP` donde `OBJ.PROP` es resoluble a literal/env dentro del mismo archivo; identificador reasignado una sola vez a un literal en el mismo scope).
  2. Para lo que siga sin poder resolverse (la mayoría de los wrappers reales, que arman la URL en runtime con datos que no están en el código), **no perder el dato crudo**: guardar la expresión/identificador original sin resolver (ej. `target: '(dynamic)'` + un campo nuevo `raw` con el texto fuente) para que vos lo leas a ojo en la tabla, sin prometer que matchea nada.
  Esto separa "mejorar recall estático" (bajo riesgo, incremental) de "prometer inteligencia" (alto riesgo, sin límite claro).

- **Supuestos del dev que podrían no ser ciertos:** que existe una forma "mucho más inteligente" de resolver esto en general. La URL real de `logger.ts` probablemente se arma en runtime (config cargada por env, service discovery, etc.) — información que **no existe en el código fuente** y que ningún analizador estático (por más "inteligente" que sea, sin ejecutar el programa) puede reconstruir con certeza. Sin ver el código real de `logger.ts` no puedo confirmar cuánto de tu caso concreto es extensible vs. genuinamente irresoluble.

- **Riesgos y efectos secundarios:** el riesgo principal es de diseño, no de implementación: `matching.js` (BR-014) fue construido deliberadamente para NUNCA adivinar cuando el target es dinámico, y el aprendizaje de tarea 001 remarca "anclar SIEMPRE a un símbolo inequívoco... para evitar falsos positivos" como principio rector del proyecto. Si "más inteligente" termina significando que targets parcialmente resueltos empiecen a dar `posible` en el grafo de impacto, se introduce la clase de falso positivo que el proyecto evitó a propósito hasta ahora (alguien confía en `sdd impact` y el match no es real). Cualquier cambio en la semántica de matching (no solo en extracción) necesitaría su propio ADR, no solo un ajuste de `resolveTarget`.

- **¿Qué pasa si NO se hace?** Nada se rompe — es el comportamiento actual, documentado y con matching seguro (BR-014 sigue intacto). El costo es solo de visibilidad/UX: seguís sin poder identificar a ojo el endpoint real detrás de un `(dynamic)`.

- **Detección/manejo si falla en uso real:** no aplica lógica de runtime nueva (esto es análisis estático en `sdd scan`, no código que corre en producción). El "fallo" relevante acá es de calidad del dato: si extendemos `resolveTarget` y se cuela un falso positivo (un target que en realidad no es ese literal), la forma de detectarlo es la misma que ya usa el proyecto — tests de fixtures + validación contra repos piloto reales (mismo patrón que "0 falsos positivos" de tarea 001) antes de dar la extensión por buena.

**Recomendación (versión inicial, superada — ver pivot abajo): proceder con cambios**, acotando a extensión determinista de `resolveTarget` + campo `raw`. El dev la rechazó explícitamente a favor de un enfoque nuevo (ver "Pivot" abajo).

---

## Pivot: detección de inputs/outputs vía agente/LLM (breaking change)

> Mensaje del dev: _"vamos a cambiar completamente el enfoque, aprovechando que ya el dev va a estar trabajando con algún agente, LLM, o similar, vamos a aprovechar esa inteligencia para detectar tanto los inputs como outputs del sistema. Esto es un breaking change."_

Esto no es una extensión de la hipótesis anterior — es una hipótesis distinta (reemplazar el extractor determinista de `endpoints` ("inputs") y `consumptions` ("outputs") por detección agente/LLM). La re-analizo desde cero.

- **¿Qué problema real resuelve?** El mismo dolor de origen, pero generalizado: no solo el caso `(dynamic)` de `consumptions`, sino cualquier límite estructural de un extractor basado en regex/patrones fijos (`src/lib/patterns.js`) — para AMBOS lados del grafo (`extractEndpoints` y `extractConsumptions`).

- **¿Ya existe algo que lo resuelva parcial o totalmente?** Sí, de forma directa: el agente que ya está en la sesión del dev (esta misma conversación) puede leer `logger.ts` y explicarle semánticamente qué consume, sin ningún cambio de código — es literalmente lo que acabamos de hacer en el análisis anterior. Lo que NO existe hoy es la persistencia de ese entendimiento en el grafo (`consumptions`/`endpoints` en la DB) para que `sdd impact` lo consulte sin volver a invocar un agente en cada query.

- **¿Alternativa más simple (80/20)?** Ya se la propuse en la iteración anterior (extender `resolveTarget` + campo `raw`) y la rechazaste a favor de este enfoque. No insisto, pero la dejo como referencia por si la tensión del punto siguiente hace que un enfoque híbrido convenga más que un reemplazo total.

- **Supuestos del dev que podrían no ser ciertos:**
  1. Que un LLM puede resolver targets **genuinamente dinámicos** (URL armada en runtime desde datos que no están en el código fuente: config remota, service discovery, feature flags). Ningún análisis estático —con o sin LLM— puede reconstruir un valor que solo existe en tiempo de ejecución. La ganancia real de un LLM es semántica sobre CÓDIGO (seguir wrappers, imports, config cross-file, entender intención), no adivinar datos inexistentes. Esto acota el techo de mejora aunque el enfoque cambie por completo.
  2. Que "aprovechar el agente que ya está trabajando" es gratis/sin fricción de diseño. En la práctica hay que decidir CUÁNDO corre esta detección — y eso choca con una decisión de arquitectura ya aceptada (punto siguiente).

- **Riesgos y efectos secundarios — el punto central de esta revisión:** Hoy, para `graph.driver === "sqlite"` (el driver de este mismo repo), **cada commit dispara automáticamente** `sdd publish --hook` → `sdd scan` interno, vía un hook post-commit (**BR-023**, **ADR-0010**), diseñado explícitamente para ser silencioso, rápido, 100% local y determinista (BR-024/025/026; ADR-0003/BR-013 asumen que el mismo commit hash siempre produce el mismo snapshot). Un extractor que depende de un agente/LLM no puede correr ahí sin romper esas garantías:
  - **Velocidad**: un agente no es instantáneo; un git hook que hoy corre en milisegundos pasaría a segundos/minutos, o a depender de red.
  - **Determinismo**: el mismo commit podría producir `endpoints`/`consumptions` distintos entre corridas — invalida el supuesto "hash de commit = snapshot estable" que sostiene la detección de staleness (ADR-0003).
  - **Disponibilidad sin interacción**: no hay un agente interactivo disponible dentro de un git hook no-TTY; si se llamara a una API de LLM directo, se necesitarían credenciales/costo/red en una ruta que hoy no depende de nada externo.
  - **Superficie de datos**: mandar código fuente a un LLM en cada commit (si fuera vía API) es una exposición de datos nueva, no cubierta por ningún ADR existente.
  Nada de esto invalida la idea — pero confirma que es correcto llamarla "breaking change": rompe supuestos de ADR-0010/BR-023, no solo la firma de una función. Necesita reconciliarse explícitamente (probablemente con un ADR nuevo) antes de tocar código.

- **¿Qué pasa si NO se hace?** El grafo sigue actualizándose automático y rápido en cada commit (el valor real que buscó ADR-0010), pero con el recall limitado de hoy sobre targets dinámicos y patrones no anticipados por el regex.

- **Detección/manejo si falla en uso real:** si el agente/LLM no está disponible, tarda, o da un resultado ambiguo durante el momento en que corre la detección, hace falta un fallback explícito — probablemente degradar en silencio al extractor determinista actual (mismo patrón que ya usa BR-025 para otros casos), para no dejar el grafo vacío ni bloquear el flujo del dev.

**Recomendación final: proceder con cambios**, con el alcance ya acotado tras las dos tandas de clarificación: detección vía LLM en modo headless, disparada por CI/CD al mergear a `main` (no por commit, no por hook local), acotada a los archivos modificados desde el último commit publicado (diff incremental), con salida JSON estructurada. El driver `sqlite`/hook local queda deprecado — CI/CD pasa a ser requisito del proyecto. Esto reemplaza ADR-0001 (parcialmente, en cuanto a "proyección determinista") y supersede ADR-0002/ADR-0010 enteros — corresponde documentarlo en un ADR nuevo (P5: sí) antes/junto con la spec.

## Preguntas de clarificación

- [x] P1: ¿"Inputs" y "outputs" del sistema equivalen a `endpoints` (lo que expone) y `consumptions` (lo que consume), respectivamente?
  - Respuesta: asumido confirmado (no objetado) — `endpoints` = inputs, `consumptions` = outputs.
- [x] P2: ¿CUÁNDO debe correr esta detección inteligente?
  - Respuesta: **(a) Lo reemplaza** — reemplaza el extractor actual DENTRO de `sdd scan`, incluido el hook post-commit automático (BR-023).
- [x] P3: "Breaking change" — ¿qué es lo que se rompe a propósito?
  - Respuesta: **el pipeline entero** (formato de datos, matching BR-014, y el pipeline automático de scan/publish — las tres cosas).
- [x] P4: Si el agente/LLM no está disponible al momento de correr (hook automático sin agente), ¿qué hace el sistema?
  - Respuesta: **(c) marcar como "pendiente de analizar"**.
- [x] P5: ¿Documentamos un ADR nuevo como parte de esta tarea?
  - Respuesta: **sí**.

### Segunda tanda — mecanismo concreto (deriva de las respuestas anteriores)

Con P2=reemplaza + P4=pendiente-de-analizar, la consecuencia práctica es fuerte y quiero confirmarla explícitamente antes de especificar: el hook post-commit (BR-023) corre en un proceso git no interactivo, **sin agente disponible**, siempre. Si el extractor determinista desaparece y no hay agente ahí, TODO commit hecho fuera de una sesión de agente activa (fix manual, commit de otra herramienta, o incluso un commit hecho por vos en la propia sesión de agente si el hook no puede invocarlo) va a marcar sus `endpoints`/`consumptions` como "pendiente de analizar" — no una excepción rara, sino el camino más común. Esto niega en la práctica el beneficio central de ADR-0010 ("grafo siempre fresco en cada commit, sin que el dev tenga que acordarse de nada") específicamente para `endpoints`/`consumptions`, aunque el resto del snapshot (C1/C4, catálogo) siga actualizándose normal.

- [x] P6: ¿Dónde vive el paso real de detección LLM?
  - Respuesta: **exclusivamente en CI/CD** — sin hook local, sin modo "sesión de agente interactiva". El dev solista sin CI propio del equipo debe correr su propio pipeline (ej. Jenkins en una VM); no es responsabilidad de sddkit correrlo local. Se cae el diseño de hook `post-commit`/`post-merge` local explorado antes (ya no aplica).
- [x] P7: Trigger de la actualización.
  - Respuesta: **al mergear a la rama principal** (push/merge a main vía CI), consistente con ADR-0003, ya no "cada commit". No hace falta el estado "pendiente de analizar" como caso normal — CI SIEMPRE puede invocar el LLM (tiene red y puede tener credenciales via secret); "pendiente" queda solo como fallback de error (LLM no disponible/rate-limit/timeout durante esa corrida de CI), no como resultado esperado de un commit fuera del flujo SDD.
- [x] P8 (implícita en P6/P7): commits fuera del flujo SDD.
  - Respuesta: **dejan de ser un caso especial** — CI no distingue cómo se escribió el código, solo qué archivos cambiaron en ese merge a main. Se resuelven igual que cualquier otro merge.
- [x] Decisión adicional: **el driver `sqlite` (ADR-0002/ADR-0010, perfil local sin CI) se deprecia por completo**, no solo para esta feature. sddkit pasa a requerir CI/CD (mínimo un driver tipo `mysql`/compartido) como perfil soportado. Esto implica superseder ADR-0002 (dual-storage) y ADR-0010 (hook post-commit) enteros, no solo ajustarlos.
- [x] P9: ¿Te importa el determinismo del resultado del LLM?
  - Respuesta: **JSON estricto está bien** — output estructurado (schema fijo) + baja temperatura como mitigación de no-determinismo.

### Consecuencia a marcar fuerte: sddkit se auto-afecta

`.sdd/config.json` de ESTE repo tiene `graph.driver: "sqlite"` hoy. Deprecar sqlite del todo significa que sddkit mismo necesita migrar su propio grafo a un driver con CI antes (o como parte) de esta tarea, o quedar temporalmente sin grafo propio. Lo marco para que quede explícito en la spec/plan, no es un efecto secundario menor.

---

## Pivot 2: 4 archivos vivos (inputs/outputs/entidades/casos de uso) completados por LLM en pre-commit

> Mensaje del dev: 4 archivos, independientes del lenguaje — Inputs (endpoints, colas, jobs), Outputs (clientes HTTP salientes, S3/FTP, colas, DBs), Entidades, Casos de uso. Se completan vía LLM en el **pre-commit**. Luego CI/CD los parsea para poblar una DB con metadata (quién, cuándo, commit); otra herramienta explota esa DB para graficar relaciones o comentar impacto en PRs.

Otra hipótesis distinta, no una extensión — cambia DÓNDE corre el LLM (pre-commit local, no CI) y AMPLÍA el alcance (más allá de HTTP: colas, jobs, storage, DBs, entidades, casos de uso).

- **¿Qué problema real resuelve?** Cubre I/O real que HTTP-only nunca capturó (colas, jobs, S3/FTP, DBs) más una capa de negocio (entidades, casos de uso) que hoy no existe como doc de primera clase. Con eso, un tool downstream puede construir un grafo de impacto más rico y comentar en PRs antes de mergear.

- **¿Ya existe algo?** Sí — confirmado con el dev: `.sdd/domain.md` ya tiene "Entidades principales" y `.sdd/c4/components.md` ya documenta módulos/rol, con el mismo patrón "esqueleto generado una vez + preservado manualmente" (BR-037). **Se extienden, no se reemplazan** (respuesta del dev). Falta como sección nueva: Inputs, Casos de uso; Outputs se amplía desde `consumptions` (hoy solo HTTP) a cualquier I/O.

- **¿Alternativa más simple (80/20)?** La estructura de archivos NO es lo nuevo — ya existe el patrón (esqueleto + preservado) para C4/domain.md, reusarlo tal cual para las secciones nuevas es lo simple. Lo genuinamente nuevo es el TRIGGER: hoy el esqueleto se genera una vez (`sdd scan`) y lo completa un agente a mano; ahora se pide que un LLM lo mantenga sincronizado automáticamente en cada commit, sin intervención del dev.

- **Supuestos del dev que podrían no ser ciertos:**
  1. "Siempre actualizados" es aspiracional, no garantizado: con pre-commit no-bloqueante (ya decidido) + posible falla de red/API-key/rate-limit, en la práctica es "actualizado cuando el LLM respondió a tiempo" — hay que comunicar esa expectativa realista, no prometer 100%.
  2. Correr "siempre, en cada commit" (decisión del dev, sin filtrar por relevancia) significa que un commit que solo toca un README o un test igual dispara una llamada LLM. Es una decisión válida, pero el costo/latencia por commit se multiplica por cada dev del equipo sin excepción.

- **Riesgos:**
  - **Credenciales distribuidas**: cada dev necesita `ANTHROPIC_API_KEY` local (vs. 1 secret de CI en el diseño anterior) — superficie de filtración mayor.
  - **Costo**: N commits × N devs × 1 llamada LLM cada uno, sin excepción — vale estimarlo antes de escalar a un equipo grande.
  - **No-determinismo en texto libre**: dos devs tocando código similar pueden generar redacciones distintas en los mismos archivos Markdown → diffs ruidosos/conflictos de merge en esos 4 archivos.
  - **Confiabilidad para la DB downstream**: si el pre-commit degrada en silencio (ya decidido), la CI que puebla la DB debería poder detectar "estos archivos no se actualizaron en este commit" (comparar hash/fecha) en vez de asumir que siempre reflejan el HEAD exacto.

- **¿Qué pasa si NO se hace?** El diseño CI-only de este mismo task (ya construido y probado: retiro de sqlite, LLM en `sdd publish --ci`, fix async de mysql) sigue funcionando para HTTP endpoints/consumptions. Se pierde cobertura de colas/jobs/storage/DBs/entidades/casos de uso y el enriquecimiento "quién/cuándo/commit" para el grafo/bot de PR.

- **Detección/manejo de fallos:** ya decidido — no bloqueante. Si el LLM falla en el pre-commit, log de warning, los 4 archivos quedan en su última versión buena, el commit sigue.

**Recomendación: proceder con cambios**, con el mecanismo ya acotado: extiende C4/domain.md (mismo patrón esqueleto+preservado), LLM en pre-commit no bloqueante, corre siempre (sin filtrar por relevancia), conserva íntegro el trabajo ya hecho de sqlite/mysql-async/setup-doctor de este mismo task (confirmado por el dev — es ortogonal).

### Preguntas de clarificación (Pivot 2)

- [x] ¿Los 4 archivos extienden C4/domain.md o son archivos nuevos separados?
  - Respuesta: **extienden lo existente** (mismo patrón esqueleto+preservado).
- [x] ¿El pre-commit bloquea el commit si el LLM falla?
  - Respuesta: **no bloquea** — degrada en silencio/warning.
- [x] ¿Corre siempre o solo si hay diff relevante?
  - Respuesta: **siempre, en cada commit**, sin filtrar por relevancia.
- [x] ¿Qué pasa con sqlite/mysql-async/setup-doctor ya hecho en este task?
  - Respuesta: **se mantiene**, es ortogonal.
- [x] ¿Dónde vive "quién agregó / cuándo / en qué commit"?
  - Respuesta: **la CI lo calcula sola** (git blame/commit metadata al parsear) — el LLM en pre-commit solo escribe contenido, no metadata.
- [x] ¿Misma DB/graphstore o una nueva?
  - Respuesta: **mismo graphstore mysql**, pero **cada archivo (inputs/outputs/entidades/casos de uso) es una tabla separada**, relacionable por sistema (`canonicalName`) u otra clave — no un blob único.
- [x] ¿Grafo/PR-bot en esta tarea?
  - Respuesta: **fuera de alcance** — motivación futura, tarea aparte.
- [x] ¿Dónde van Inputs/Casos de uso?
  - Respuesta: **secciones nuevas en `components.md`/`domain.md`** (Outputs amplía `consumptions` ya existente; Entidades ya existe en `domain.md`).

## Métrica de impacto

- **Métrica:** pendiente de definir hasta resolver P1-P3 (el alcance real del cambio determina qué medir: % de `(dynamic)` resuelto, cantidad de endpoints/consumptions nuevos detectados que el regex no veía, o ambos).
- **Baseline actual:** a medir en tu repo real antes de implementar (no en sddkit — ver nota de LEARNINGS: los endpoints/consumptions de este repo son strings de regex de los propios detectores, no llamadas HTTP reales).
- **Resultado esperado:** a definir junto con la métrica.
- **Cómo se mide después:** misma query sobre la tabla `endpoints`/`consumptions` del graphstore, antes/después, sobre el mismo repo real.

---
_Aprobación del dev: Pivot 1 aprobado 2026-07-27. Pivot 2 aprobado 2026-07-29 (4 preguntas resueltas)._
