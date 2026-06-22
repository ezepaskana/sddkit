# Spec — tarea 003: Implementar las 3 propuestas de mejora de alta prioridad par…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** `sdd-analyze` tiene doble responsabilidad: (a) investigación read-only cuando el usuario solo pregunta y (b) fase de análisis dentro del flujo SDD. Esto mezcla dos casos de uso con restricciones distintas (uno no debe escribir, el otro sí genera artefactos). Las skills carecen de ejemplos concretos en la mayoría de los casos y no siguen progressive disclosure (aunque ninguna supera las 771 words, hay skills que se beneficiarían de tener references/ y examples/ separados). No existe meta-skill para mejorar skills iterativamente.
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** Parcialmente. `sdd-analyze` ya cubre investigación, pero sin restricción de no-escritura ni categorización por tipo de pregunta. Ya existen `examples/` en sdd-analyze y sdd-plan, y `references/` en sdd-specify, sdd-execute, sdd-close y sdd-test. No hay nada parecido a sdd-improve-skill.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí, parcialmente. La propuesta (2) de progressive disclosure tiene poco sentido como reestructuración general: las skills de sddkit son compactas (236-771 words cada una, total 3578 words), MUY por debajo del umbral de 1800 words que Anthropic sugiere como máximo. Ya tienen references/ donde tiene sentido. Lo que realmente falta son **ejemplos concretos** en las skills que no los tienen. Propongo reducir la propuesta (2) a solo agregar examples/ donde faltan, sin reestructurar SKILL.md que ya son lean.
- **Supuestos del dev que podrían no ser ciertos:** (a) Que progressive disclosure es necesario — nuestras skills YA son lean, a diferencia de sdd-exampl cuyos SKILL.md son mucho más largos. (b) Que sdd-improve-skill se usaría frecuentemente — es útil para dogfooding pero su valor es puntual, no recurrente; una vez que las skills están bien, la meta-skill se usa rara vez.
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento): Riesgo bajo. Los cambios son solo archivos markdown en `skills/`. El drift entre `skills/` y `.claude/skills/` ya es un problema conocido (LEARNINGS); al agregar más archivos, hay más superficie de drift si no se corre `sdd sync` o equivalente. No hay impacto en código runtime.
- **¿Qué pasa si NO se hace?** sdd-analyze sigue siendo dual-purpose (funciona pero es conceptualmente impuro). Las skills sin ejemplos producen output menos consistente (especialmente sdd-specify, sdd-execute, sdd-close). No hay forma guiada de mejorar skills.
- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (detección) y cómo debería reaccionar el sistema (manejo)?** No aplica: son archivos markdown (skills e instrucciones para el agente). No hay lógica nueva que pueda fallar en runtime. El riesgo es que los archivos sean de baja calidad, lo cual se detecta en uso y se itera.

**Recomendación:** `proceder con cambios` — Las propuestas (1) y (3) son válidas tal cual. La propuesta (2) debe reducirse: no hace falta reestructurar SKILL.md (ya son lean) sino solo agregar ejemplos concretos donde faltan (sdd-specify, sdd-execute, sdd-close, sdd-task). También recortar sdd-improve-skill al mínimo viable: un checklist inline, no un framework complejo.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: sdd-think: invocable solo manual o tambien auto-trigger para preguntas (reemplazando sdd-analyze)?
  - Respuesta: **Ambas (manual + auto)**. sdd-think se dispara automatico para preguntas puras Y se puede invocar manual. sdd-analyze queda exclusivo del flujo SDD (fase 2, nunca se dispara solo).
- [x] P2: Progressive disclosure: solo agregar examples/ donde faltan, o tambien agregar references/ nuevos aunque las skills sean cortas?
  - Respuesta: **Examples/ + references/ nuevos**. Agregar ejemplos Y extraer secciones a references/ donde tenga sentido.
- [x] P3: sdd-improve-skill: meta-skill completa (estilo sdd-exampl) o minima (checklist)?
  - Respuesta: **Completa (estilo sdd-exampl)**. Evaluacion por categorias, report tabular, propuesta de mejoras, aplicacion guiada paso a paso.

## Métrica de impacto

No hay metrica cuantificable directa: los cambios son archivos markdown (instrucciones para agentes) sin logica runtime. Impacto cualitativo esperado: mayor consistencia de output en skills que hoy carecen de ejemplos concretos, separacion clara entre investigacion pura y flujo SDD, y capacidad de mejorar skills iterativamente via meta-skill.

## Spec refinada

**Historia:** Como mantenedor de sddkit quiero skills mejor estructuradas (con ejemplos, references, categorias de investigacion y auto-mejora) para que los agentes produzcan output mas consistente y el framework se auto-mejore.

**Criterios de aceptacion (formato EARS):**

### Propuesta 1: sdd-think (skill read-only dedicada)

- CUANDO el usuario invoque `/sdd-think` o haga una pregunta pura (sin pedir cambio), EL SISTEMA DEBE activar la skill sdd-think que investiga sin modificar archivos.
- EL SISTEMA DEBE prohibir explicitamente el uso de Edit, Write y Bash destructivo dentro de sdd-think.
- EL SISTEMA DEBE categorizar la pregunta en uno de 5 tipos (bug/behavior, understanding, brainstorm, review, impact analysis) y usar un formato de respuesta estructurado distinto para cada tipo.
- CUANDO sdd-think termine su investigacion, EL SISTEMA DEBE sugerir al usuario correr `/sdd-task` con una descripcion concreta si decide implementar.
- EL SISTEMA DEBE actualizar AGENTS.md para que las preguntas puras disparen sdd-think (no sdd-analyze). sdd-analyze queda exclusivamente como fase 2 del flujo SDD de tarea.
- EL SISTEMA DEBE incluir al menos 2 ejemplos concretos en `examples/` (un brainstorm y una investigacion de bug).

### Propuesta 2: Progressive disclosure (references/ + examples/)

- CUANDO una skill no tenga `examples/` con al menos 1 ejemplo concreto de output, EL SISTEMA DEBE crear el directorio y agregar ejemplos realistas basados en uso real del proyecto.
- Skills que necesitan examples/: sdd-specify, sdd-execute, sdd-close, sdd-task.
- CUANDO una skill tenga secciones de conocimiento especializado que puedan beneficiarse de estar en archivo separado, EL SISTEMA DEBE extraerlas a `references/`.
- EL SISTEMA DEBE sincronizar los cambios en `skills/` con `.claude/skills/` (o documentar que `sdd sync` lo hara).

### Propuesta 3: sdd-improve-skill (meta-skill completa)

- CUANDO el usuario invoque `/sdd-improve-skill`, EL SISTEMA DEBE evaluar la skill target contra 6 categorias: (1) Frontmatter & Trigger, (2) Progressive Disclosure, (3) Directory Completeness, (4) Content Quality, (5) Examples & Resources, (6) Robustness.
- EL SISTEMA DEBE presentar un reporte tabular con status PASS/IMPROVE/MISSING por categoria.
- EL SISTEMA DEBE proponer mejoras concretas priorizadas por impacto (High/Medium/Low).
- EL SISTEMA DEBE preguntar al usuario cuales mejoras aplicar antes de modificar archivos.
- EL SISTEMA DEBE incluir un checklist de best practices como `references/skill-creator-checklist.md`.

**Reglas de negocio afectadas:** Ninguna BR existente. No se crean BRs nuevas (son skills markdown, no logica de negocio).

**Fuera de alcance:**

- Cambios al CLI de sddkit (ningun .js/.mjs modificado)
- Integraciones Jira/Figma MCP
- Output Protocol estandarizado (propuesta 7, baja prioridad)
- Auto-transicion de fases en sdd-task (propuesta 5, media prioridad)
- Modificar la logica de `sdd-analyze` mas alla de ajustar su description para que no se dispare sola

**Impacto en arquitectura/catalogo:** No requiere cambios en C4 ni ADR. Solo se agregan archivos markdown en `skills/`. El drift skills/ vs .claude/skills/ se maneja con el sync existente.

---
_Aprobacion del dev: APROBADA (2026-06-22)_
