# Spec — tarea 009: en la fase de analisis del flujo sdd es importante que quede…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Hoy `sdd-analyze/SKILL.md` no obliga a preguntar, para la funcionalidad PROPUESTA, "si esto falla en uso real, ¿cómo nos enteramos (detección) y cómo debería reaccionar el sistema (respuesta)?". Solo aparece de paso dentro de "Clarificación" ("comportamiento en error", línea 27), mezclado con ambigüedades y casos borde, sin separar detección de reacción. Riesgo concreto para sddkit: varias BR existentes (BR-024, BR-025) ya consagran "degradar en silencio, exit 0" como diseño deliberado — si la fase de análisis no obliga a pensar "¿cómo nos enteramos?", los modos de falla de funcionalidades NUEVAS pueden quedar igual de invisibles sin que nadie lo haya decidido a propósito.
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** Parcialmente. (1) `sdd-analyze/SKILL.md:27` menciona "comportamiento en error" como un ítem más de la lista de clarificación, sin estructura. (2) `spec.md` → "Spec refinada → Criterios EARS" ya tiene la línea `SI (condición de error), EL SISTEMA DEBE (manejo)` — cubre la REACCIÓN formal, pero llega al final del flujo (cuando el enfoque ya está decidido) y no menciona DETECCIÓN/observabilidad (logs, métricas, alertas). Ninguna de las 6 preguntas numeradas de "Análisis" cubre esto; la #5 ("Riesgos y efectos secundarios") es sobre riesgos de CONSTRUIR, no sobre el comportamiento en falla de lo construido. `sdd find "error"` y `sdd find "observabilidad"` no devuelven BRs ni aprendizajes relacionados — confirmado gap.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí: no requiere sección nueva ni proceso nuevo. (a) agregar una pregunta explícita (7ma) al bloque "Análisis" de `sdd-analyze/SKILL.md` que separe DETECCIÓN ("¿cómo nos enteraríamos?") de REACCIÓN ("¿cómo debería responder el sistema?"), condicionada con "si aplica" para no inflar tareas sin lógica nueva (docs, configs, renames); (b) espejar esa pregunta como bullet en "Análisis crítico" de `skills/sdd-specify/templates/spec.md`; (c) actualizar `examples/analisis-ejemplo.md` para fijar el nivel de profundidad esperado. Edición de markdown en ambas copias (`skills/` y `.claude/skills/`), sin tocar código ni tests.
- **Supuestos del dev que podrían no ser ciertos:** (1) Que esto aplica a TODA tarea — en la práctica varias tareas de sddkit son cambios de CLI/config sin modos de falla nuevos relevantes (p.ej. renombrar un campo, agregar una línea a un doc); por eso conviene frasear la pregunta como condicional ("si aplica") para no volverla burocracia vacía. (2) Que el gap es total — en realidad ya existe la línea EARS de "condición de error"; el cambio es de ÉNFASIS y ESTRUCTURA (adelantarlo a la fase de análisis, separar detección de reacción), no de crear algo desde cero.
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento): (1) Duplicación entre la nueva pregunta de "Análisis crítico" y la línea EARS existente — mitigar con una frase puente: el análisis IDENTIFICA el modo de falla/detección/reacción a alto nivel, el EARS lo FORMALIZA como criterio testeable. (2) Drift entre las dos copias de skills (`skills/` vs `.claude/skills/`, aprendizaje de tarea 003) — hay que tocar y diffear ambas al cerrar. (3) Es prospectivo: no reabre las tareas 001-008 ya cerradas, solo aplica a specs futuras (009+).
- **¿Qué pasa si NO se hace?** El framework sigue dependiendo de que el agente "se acuerde" de preguntar por comportamiento en error dentro de una lista genérica de clarificación, sin distinguir detección de reacción. Mayor probabilidad de que specs futuras lleguen a "Spec refinada" sin haber pensado cómo se DETECTA una falla en producción — especialmente riesgoso en un proyecto donde "degradar en silencio" ya es un patrón aceptado y donde hoy no existe ninguna BR ni aprendizaje sobre observabilidad.

**Recomendación:** `proceder con cambios` — el cambio cierra un gap real y es de bajo costo (edición de 2-3 archivos markdown en sus dos copias), pero acoto el alcance: nueva pregunta condicional ("si aplica") en `sdd-analyze/SKILL.md`, bullet espejo en `sdd-specify/templates/spec.md`, distinguiendo explícitamente DETECCIÓN vs REACCIÓN y conectándola con la línea EARS existente (sin duplicarla). Ver preguntas de clarificación para fijar redacción exacta y alcance fino.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: ¿Qué alcance debería tener el cambio (qué archivos tocar)?
  - Respuesta: "Lo anterior + ejemplo" — tocar `sdd-analyze/SKILL.md` (pregunta 7 nueva), `sdd-specify/templates/spec.md` (bullet espejo en Análisis crítico) y `sdd-analyze/examples/analisis-ejemplo.md` (respuesta de muestra), en ambas copias (`skills/` y `.claude/skills/`).
- [x] P2: La línea EARS `SI (condición de error), EL SISTEMA DEBE (manejo)` — ¿la tocamos para separar detección de reacción?
  - Respuesta: Dejarla como está. El análisis crítico deja explícito en prosa qué se detecta y cómo se reacciona; el criterio EARS sigue siendo "manejo" genérico.
- [x] P3: ¿Qué redacción para la nueva pregunta 7 del bloque "Análisis" de sdd-analyze?
  - Respuesta: Versión larga, en línea con las preguntas 1-6: "7. Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (logs, métricas, alertas, mensajes de error) y cómo debería reaccionar el sistema (reintento, fallback, mensaje al dev/usuario, degradación)? Si no aplica (sin lógica nueva que pueda fallar), decilo explícitamente."

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** presencia y consistencia del texto de la nueva pregunta 7 ("detección + reacción ante falla") en las cuatro ubicaciones: `skills/sdd-analyze/SKILL.md`, `.claude/skills/sdd-analyze/SKILL.md`, `skills/sdd-specify/templates/spec.md`, `.claude/skills/sdd-specify/templates/spec.md`; más la respuesta de muestra en `skills/sdd-analyze/examples/analisis-ejemplo.md` y `.claude/skills/sdd-analyze/examples/analisis-ejemplo.md`.
- **Baseline actual:** 0% — confirmado por `grep -rn "error\|falla\|observab\|alerta"` sobre los SKILL.md/templates: hoy no existe ninguna pregunta numerada que separe detección de reacción (solo la mención de paso "comportamiento en error" en `sdd-analyze/SKILL.md:27` y la línea EARS genérica "SI condición de error... manejo" en `spec.md:43`, que no se tocan — ver P2).
- **Resultado esperado:** 100% — el texto de la pregunta 7 aparece, idéntico, en ambas copias de `sdd-analyze/SKILL.md` y como bullet espejo en ambas copias de `spec.md`; `analisis-ejemplo.md` (ambas copias) incluye una respuesta de muestra nueva.
- **Cómo se mide después:** `diff` entre `skills/<skill>/...` y `.claude/skills/<skill>/...` para las 3 rutas tocadas (debe ser vacío, sin drift — aprendizaje tarea 003); `grep` confirma la presencia del texto exacto de la pregunta 7 en los 4 archivos correspondientes.

_Impacto cualitativo (no medible hoy):_ a partir de la tarea 010, toda spec nueva deberá responder explícitamente, para la funcionalidad propuesta, cómo se detectaría una falla y cómo debería reaccionar el sistema (o declarar "no aplica") — reduciendo el riesgo de que un fallo de una funcionalidad nueva quede tan silencioso como los degradados-a-propósito (BR-024/025) sin que nadie lo haya decidido así.

## Spec refinada

**Historia:** Como agente que ejecuta la fase de análisis de una tarea SDD (`sdd-analyze`), quiero una pregunta explícita y obligatoria sobre detección y reacción ante fallas de la funcionalidad propuesta, para que la spec resultante no llegue a "Spec refinada" sin haber pensado cómo se detectaría un error en uso real y cómo debería responder el sistema.

**Criterios de aceptación (formato EARS):**

- CUANDO un agente ejecute el bloque "Análisis" de la skill `sdd-analyze` para cualquier tarea, EL SISTEMA DEBE presentar una séptima pregunta (después de "¿Qué pasa si NO se hace?") con el texto: *"7. Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (logs, métricas, alertas, mensajes de error) y cómo debería reaccionar el sistema (reintento, fallback, mensaje al dev/usuario, degradación)? Si no aplica (sin lógica nueva que pueda fallar), decilo explícitamente."*
- CUANDO un agente complete la sección "Análisis crítico" de `spec.md` (template de `sdd-specify`), EL SISTEMA DEBE incluir un bullet espejo de esa misma pregunta (detección + reacción ante falla, o "no aplica" justificado).
- CUANDO se consulte `sdd-analyze/examples/analisis-ejemplo.md`, EL SISTEMA DEBE incluir una respuesta de muestra a la pregunta 7 con el mismo nivel de profundidad concreta que las otras 6 (detección concreta + reacción concreta, no genérica).
- SI tras este cambio las copias `skills/sdd-analyze`, `skills/sdd-specify` (y sus pares en `.claude/skills/`) quedan con contenido distinto en los archivos tocados, EL SISTEMA (la tarea, antes de cerrarse) DEBE dejarlas idénticas — sin drift, mismo criterio que BR-032/aprendizaje de tarea 003.
- La línea EARS existente `SI (condición de error), EL SISTEMA DEBE (manejo)` en `spec.md` y `references/ears.md` NO se modifica (P2): el "manejo" sigue siendo genérico y puede incluir registrar/loggear cuando el análisis crítico ya lo dejó explícito.

**Reglas de negocio afectadas:** Ninguna BR nueva — este cambio no altera el comportamiento del CLI (`src/`), solo el contenido de las skills `sdd-analyze`/`sdd-specify` que se distribuyen vía `installSkills`. BR-032 (mirror real al sincronizar, sin drift entre copias) sigue aplicando sin cambios y es el criterio de "listo" para las dos copias.

**Fuera de alcance:**

- No se modifica la línea EARS "SI condición de error... manejo" ni `references/ears.md` (P2: se deja como está).
- No se reabren ni se completan retroactivamente las secciones "Análisis crítico" de las tareas 001-008 ya cerradas — el cambio es prospectivo (aplica desde la tarea 010 en adelante).
- No se tocan otras skills (`sdd-task`, `sdd-plan`, `sdd-execute`, `sdd-close`, `sdd-test`, `sdd-bootstrap`).
- No se agrega código ni tests automatizados nuevos (`src/`, `*.test.js`) — es contenido de skills (markdown).

**Impacto en arquitectura/catálogo:** Ninguno en `src/`/`components.md` — el cambio vive enteramente en `skills/sdd-analyze/{SKILL.md,examples/analisis-ejemplo.md}` y `skills/sdd-specify/templates/spec.md`, con sus copias espejo en `.claude/skills/`. No requiere ADR (contenido de instrucciones para agentes, no arquitectura del sistema).

---
_Aprobación del dev: aprobado 2026-06-15_
