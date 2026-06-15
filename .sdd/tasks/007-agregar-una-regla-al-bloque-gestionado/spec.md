# Spec — tarea 007: Agregar una regla al bloque gestionado de AGENTS.md (generad…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Hoy el bloque gestionado de AGENTS.md (generado por `buildBlock` en `src/lib/agentsmd.js`, distribuido a Claude Code, Cursor y cualquier lector de AGENTS.md) solo menciona "preguntale al dev" en tres lugares puntuales y acotados: (1) docs de arquitectura sin certeza, (2) convenciones del catálogo con variantes múltiples, (3) un subagente bloqueado dentro de la ejecución de una tarea SDD. Fuera de esos tres casos, no hay un principio general que habilite/obligue al agente a parar y preguntar cuando algo no tiene sentido (p.ej. un requisito que contradice el código, una instrucción que violaría una BR-NNN/ADR, datos faltantes, comportamiento inesperado de un comando). Sin ese principio explícito, un agente puede "completar a ciegas" con una suposición en vez de chequear con el dev.
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** Sí, parcialmente — tres instancias puntuales ya en el bloque gestionado (`src/lib/agentsmd.js`):
  - Arquitectura: *"Lo que no puedas responder con certeza, preguntáselo al dev."*
  - Catálogo: *"preguntale al dev cuál variante usar antes de implementar"*
  - Flujo SDD (paso ejecutar): *"Subagente bloqueado → devuelve la pregunta, el orquestador la resuelve con el dev"*
  Búsqueda en `sdd find pregunt|duda` no encontró ningún principio general transversal — confirma el gap.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí: en vez de una sección nueva extensa o de duplicar la frase en cada sub-sección existente, alcanza con UN párrafo corto y general ("regla cero"), ubicado en un lugar prominente del bloque (p.ej. al inicio, antes de "Arquitectura"), que generalice el principio sin reescribir las tres instancias puntuales (esas siguen aplicando como casos concretos ya cubiertos).
- **Supuestos del dev que podrían no ser ciertos:**
  - Que el bloque gestionado de AGENTS.md es el lugar correcto: parece correcto, porque es justamente el mecanismo "reglas para cualquier agente" del proyecto (header: "Multi-agente (Claude Code, Cursor, cualquier lector de AGENTS.md)").
  - "siempre **puede**/**debe** preguntar": hay un matiz entre habilitar (el agente no debe sentir que preguntar es una falla) y obligar (parar siempre ante cualquier duda, aunque sea menor). Una redacción mal calibrada puede generar fricción excesiva en decisiones donde el buen juicio normal ya alcanza.
- **Riesgos y efectos secundarios:**
  - **Fricción/parálisis**: una regla demasiado amplia ("ante cualquier duda, preguntá") puede chocar con el modo "Auto" del harness (sesgo a seguir trabajando sin parar por aclaraciones menores) y generar interrupciones constantes por decisiones triviales. Mitigación: acotar el texto a incongruencias/contradicciones genuinas (vs. preferencias menores donde el agente puede decidir y seguir).
  - **Solapamiento con texto existente**: si el párrafo nuevo es muy largo, puede sonar redundante con las tres instancias puntuales ya presentes. Mitigación: que sea breve y genérico, sin repetir los casos ya cubiertos.
  - **Mantenimiento**: es texto estático dentro de `buildBlock`, entre los marcadores `<!-- sddkit:begin -->`/`<!-- sddkit:end -->`; no afecta el parsing de `- [ ]` (eso solo se usa en `.sdd/c4/*` y `.sdd/domain.md`, no en AGENTS.md) ni otros comandos. Bajo riesgo técnico.
  - **Tests**: `buildBlock`/`upsertAgentsMd` no tienen test dedicado hoy (ningún test de `init`/`scan`/`setup` verifica contenido textual del bloque). Esta tarea probablemente agrega el primer test de contenido para `agentsmd.js`.
- **¿Qué pasa si NO se hace?** El comportamiento actual se mantiene: las tres reglas puntuales siguen vigentes, pero fuera de esos contextos (p.ej. durante `sdd-analyze`/`sdd-specify`, o en cualquier tarea fuera del flujo SDD) no hay un recordatorio explícito de que ante algo que no cierra, la opción correcta es preguntar al dev en vez de asumir.

**Recomendación:** `proceder con cambios` — agregar un párrafo breve y general (no una sección nueva extensa, no duplicar las tres instancias puntuales), calibrado para incongruencias/dudas genuinas (no decisiones menores), ubicado en un lugar prominente del bloque gestionado de AGENTS.md.

## Preguntas de clarificación

- [x] P1: ¿Qué matiz priorizamos — "puede" (habilitación) o "debe" (obligación)?
  - Respuesta: Combinación calibrada — habilita explícitamente preguntar Y obliga a hacerlo ante incongruencias/contradicciones genuinas, aclarando que no aplica a decisiones menores resolubles con buen juicio normal.
- [x] P2: ¿Dónde ubicamos el párrafo dentro del bloque gestionado?
  - Respuesta: Al inicio, como "regla cero" — nueva sección antes de "## Arquitectura", aplicable a cualquier situación (dentro o fuera del flujo SDD).
- [x] P3: ¿El párrafo incluye ejemplos concretos de "incongruencia/cosa sin sentido" o queda genérico?
  - Respuesta: Con 2-3 ejemplos concretos.
- [x] P4: ¿La métrica puede ser "el bloque generado contiene el texto exacto, verificado por test" (patrón BR-016)?
  - Respuesta: Sí.

## Métrica de impacto

- **Métrica:** presencia del párrafo exacto de la nueva "regla cero" en el bloque generado por `buildBlock`/`upsertAgentsMd`.
- **Baseline actual:** 0% — el texto no existe hoy en ningún AGENTS.md generado (confirmado: `sdd find pregunt|duda` no encuentra un principio general transversal).
- **Resultado esperado:** 100% — el texto aparece, como primera sección del bloque (antes de "## Arquitectura"), en todo AGENTS.md generado o regenerado vía `sdd init`/`sdd scan`/`sdd setup`/`sdd decide`.
- **Cómo se mide después:** test nuevo (`src/lib/agentsmd.test.js`) que llama a `buildBlock(...)` y verifica `result.includes(<texto exacto de la nueva sección>)` y que aparece antes de `## Arquitectura`; además, smoke manual: correr `sdd scan` en este repo y confirmar que `AGENTS.md` queda con la nueva sección al inicio del bloque gestionado.

## Spec refinada

**Historia:** Como desarrollador que instala sddkit en mi repo, quiero que el bloque gestionado de AGENTS.md incluya un principio general y prominente que habilite y, ante incongruencias genuinas, obligue al agente a preguntarme antes de asumir, para reducir el riesgo de que avance con una interpretación equivocada cuando algo no tiene sentido.

**Criterios de aceptación (formato EARS):**

- CUANDO se genera o regenera el bloque gestionado de AGENTS.md (vía `sdd init`, `sdd scan`, `sdd setup` o `sdd decide`, a través de `buildBlock`/`upsertAgentsMd`), EL SISTEMA DEBE incluir, como **primera sección del bloque** (antes de `## Arquitectura (modelo C4 vivo)`), una sección titulada `## Ante dudas o incongruencias: preguntale al dev` con el siguiente contenido (texto exacto, contrato):

  > Preguntar no es una falla — es la respuesta correcta cuando algo no cierra. Si encontrás un requisito que contradice el código existente, una instrucción que violaría una convención del catálogo o una regla de negocio/ADR ya documentada, información que falta o es ambigua, o cualquier otra cosa que simplemente no tiene sentido, **frená y preguntale al dev antes de seguir** — no avances con una suposición. Las decisiones menores que el buen juicio normal resuelve no necesitan esto: esas resolvélas vos y seguí.

- SI el bloque gestionado ya existe con marcadores `<!-- sddkit:begin -->`/`<!-- sddkit:end -->`, EL SISTEMA DEBE reemplazar el bloque completo (comportamiento ya existente de `upsertAgentsMd`), de modo que la nueva sección quede incluida sin pasos adicionales del dev.

**Reglas de negocio afectadas:** Nueva **BR-036** (agregar a `.sdd/domain.md` en este mismo cambio, citando esta tarea como fuente).

**Fuera de alcance:**

- No se modifican las tres menciones puntuales ya existentes ("Lo que no puedas responder con certeza...", "preguntale al dev cuál variante...", "Subagente bloqueado..."): siguen vigentes como casos concretos ya cubiertos por el principio general.
- No se agrega lógica nueva a `init`/`scan`/`setup`/`decide`: el cambio vive enteramente en el texto estático de `buildBlock` (`src/lib/agentsmd.js`).
- No se traduce ni se generan variantes por stack/lenguaje del repo destino.

**Impacto en arquitectura/catálogo:** Módulo `src/lib/agentsmd.js` (ya documentado en `components.md` como responsable del bloque gestionado — sin cambio estructural). No introduce convenciones nuevas del catálogo. No requiere ADR (cambio de contenido textual de las reglas para agentes, no de arquitectura del sistema).

---
_Aprobación del dev: aprobado 2026-06-15_
