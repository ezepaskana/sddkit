---
name: sdd-analyze
description: Análisis crítico dual - fase 2 del flujo SDD (dentro de una tarea) o investigación read-only standalone (preguntas puras, brainstorm, debugging). Usar automáticamente cuando el usuario haga preguntas sin pedir cambios, o como fase 2 tras sdd task new.
---

# sdd-analyze — análisis crítico (modo dual)

Esta skill tiene **dos modos** según el contexto:

- **(A) Modo tarea** — sos la fase 2 del flujo SDD: hay una tarea activa creada con `sdd task new` y su `spec.md` está pendiente. Analizás críticamente el requisito, clarificás, escribís en `spec.md` y seguís con `sdd-specify`. Acá SÍ escribís artefactos.
- **(B) Modo standalone** — no hay tarea activa: el dev quiere investigar, debuggear o hacer brainstorm sin pedir un cambio. Investigación **read-only**: leés, analizás, proponés, pero **nunca modificás archivos**. Si la charla converge en un cambio, derivás a `/sdd-task`.

## Detección de modo

Antes de arrancar, decidí en qué modo estás:

1. **¿Hay una tarea activa esperando spec?** Mirá si venís de `sdd task new` o si hay una tarea en estado `new`/`captured` con `spec.md` pendiente en `.sdd/tasks/<id>/`. Si sí → **modo tarea (A)**.
2. **¿El usuario hizo una pregunta pura** ("¿cómo funciona X?", "¿por qué falla?", "¿cómo podríamos?") **sin pedir un cambio y sin tarea activa?** → **modo standalone (B)**.
3. **¿Ambiguo?** Si el mensaje mezcla investigación con un pedido claro de cambio, preguntale al dev si quiere investigar acá (standalone) o arrancar `/sdd-task`.

---

## Modo tarea (fase 2 SDD)

**El requisito del dev es una HIPÓTESIS, no una orden.** El dev puede equivocarse y tu trabajo es detectarlo ANTES de construir. La complacencia acá es un bug, no cortesía.

### Análisis (completar la sección "Análisis crítico" de spec.md)

Arrancá con `sdd context` (destilado) y, para "¿ya existe?", con `sdd find <término>` — busca en el índice de endpoints, módulos, reglas y aprendizajes sin explorar el repo. Solo explorá código a mano si `find` no alcanza. Después respondé:

1. ¿Qué problema real resuelve?
2. ¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?
3. ¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?
4. ¿Qué supuestos trae el dev que podrían no ser ciertos?
5. ¿Riesgos y efectos secundarios? (arquitectura, performance, seguridad, mantenimiento)
6. ¿Qué pasa si NO se hace?
7. Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (logs, métricas, alertas, mensajes de error) y cómo debería reaccionar el sistema (reintento, fallback, mensaje al dev/usuario, degradación)? Si no aplica (sin lógica nueva que pueda fallar), decilo explícitamente.

Cerrá con una **recomendación honesta**: `proceder | proceder con cambios | reconsiderar`. Si es "reconsiderar", presentale tus argumentos al dev antes de seguir — no construyas algo que creés incorrecto sin decirlo. Ver `examples/analisis-ejemplo.md` para el nivel de profundidad esperado.

**¿A quién impacto?** Si `.sdd/config.json` → `graph` está configurado y la tarea menciona un endpoint/ruta/recurso que existe en tu índice (corre `sdd find` o mirá `capabilities.endpoints`), corré `sdd impact <MÉTODO> <ruta>` (o `sdd impact <sistema>` para el sentido inverso) y citá el resultado — es informativo, no bloquea (BR-014). Si la tarea menciona un recurso de infraestructura (bucket, cola, topic, tabla, ARN) y el grafo tiene sistemas con `infraEdges` publicados, `sdd impact <ARN-o-nombre>` también puede responder qué depende de ese recurso (BR-021) — mismo espíritu informativo. Sin grafo, omití este paso (degrada en silencio).

### Clarificación

Preguntale al dev **todo lo que haga falta, sin límite de cantidad**: ambigüedades, casos borde, comportamiento en error, y los supuestos que tu análisis puso en duda. Priorizá las que cambian el alcance o invalidan el enfoque; hacelas en tandas razonables (no de a una). Registrá cada respuesta en spec.md.

### Calibración: qué amerita objeción y qué no

- ❌ NO objetar por objetar: preferencias de estilo, micro-optimizaciones, "yo lo haría distinto".
- ✅ SÍ objetar: duplicación de algo existente, violación de una regla BR-NNN o un ADR, complejidad desproporcionada al valor, supuestos falsos verificables en el código.

Cuando termines: seguí con la skill **sdd-specify**.

---

## Modo standalone (investigación read-only)

Entrás en **modo investigación**: leés código, analizás, proponés opciones y debatís con el dev — pero **nunca modificás archivos**. Tu salida es entendimiento y conversación, no diffs ni artefactos. Si la charla converge en un cambio, derivás a `/sdd-task`; vos no construís.

### Cuándo usar

Escenarios ideales:

1. **Entender un módulo o flujo**: "¿cómo funciona `sdd task verify`?", "explicame el flujo de sync".
2. **Debuggear un comportamiento inesperado**: "¿por qué falla X?", "esto debería pasar y no pasa".
3. **Brainstorm de diseño**: "¿cómo podríamos hacer que las skills se actualicen solas?".
4. **Revisar código existente**: "¿este enfoque está bien?", "¿hay riesgos en este patrón?".
5. **Análisis de impacto**: "¿qué pasa si cambiamos la firma de `stepBlock`?".
6. **Preguntas abiertas del codebase**: cualquier "¿?" sobre cómo está armado el sistema, sin pedido de cambio.

### Cómo investigar

1. **Leé el contexto del proyecto** con `sdd context` — destilado determinístico (módulos, reglas, convenciones, aprendizajes). Es el punto de partida más barato; evita explorar el repo a ciegas. Para "¿ya existe?" o "¿dónde está X?", usá `sdd find <término>` — busca en el índice de endpoints, módulos, reglas y aprendizajes sin recorrer el repo a mano.

2. **Entendé la pregunta** y categorizala en uno de 5 tipos:
   - **Bug/comportamiento**: algo está roto o es inesperado → foco en trazar el issue.
   - **Comprensión**: cómo funciona X → foco en leer y explicar.
   - **Brainstorm**: cómo podríamos hacer X → foco en opciones y tradeoffs.
   - **Revisión**: ¿este código está bien? → foco en patrones, gaps, riesgos.
   - **Análisis de impacto**: qué pasa si cambiamos X → foco en dependientes y efectos secundarios.

3. **Investigación profunda** — leé todos los archivos fuente, tests y docs relevantes. Seguí la cadena de dependencias (quién llama a quién, qué importa qué). Usá `Read`, `Grep` y `Bash` en modo **read-only** (`git log`, `git blame`, `git diff`, `ls`, `find`).

4. **Estructurá el análisis según el tipo de pregunta**. Cada tipo tiene un formato propio (resumen breve acá; detalle completo en `references/formatos-respuesta.md`):
   - **Bug**: comportamiento observado → causa raíz → archivos/líneas → fix sugerido (descrito, no aplicado).
   - **Comprensión**: explicación de alto nivel → flujo paso a paso → archivos clave.
   - **Brainstorm**: contexto actual → 2-4 opciones con pros/cons → recomendación → pregunta de cierre.
   - **Revisión**: qué está bien → qué preocupa (gaps/riesgos) → sugerencias priorizadas.
   - **Impacto**: qué cambia → quién depende → efectos secundarios → riesgo neto.

5. **Entrá en discusión** — quedate en modo conversación. Presentá hallazgos, escuchá objeciones del dev, refiná. No cierres con un cambio; cerrá con entendimiento compartido o una decisión.

6. **Handoff a implementación** — cuando el dev decide actuar, sugerí:
   > ¿Listo para implementar? Corré `/sdd-task` con esta descripción: ...

### RESTRICCIÓN CRÍTICA (solo modo standalone)

**En modo standalone estás en modo read-only. No modificás NADA.**

- **NO** uses la herramienta **Edit**.
- **NO** uses la herramienta **Write**.
- **NO** uses **Bash** para escribir, agregar, mover o borrar archivos (nada de `>`, `>>`, `sed -i`, `mv`, `rm`, `cp`, `touch`, `tee`).
- **NO** crees stories, plans, specs ni ningún artefacto.
- **NO** hagas commits.
- **Únicas herramientas permitidas**: `Read`, `Grep`, `Bash` (solo lectura: `git log`, `git blame`, `git diff`, `ls`, `find`), `Agent` (solo para exploración).

**Si te descubrís a punto de editar un archivo — FRENÁ. Presentá tu sugerencia verbalmente.**

(Esta restricción NO aplica en modo tarea, donde escribir en `spec.md` es parte del trabajo.)

---

## Idioma

Respondé en el mismo idioma que usó el usuario. Términos técnicos en inglés (no traduzcas `stepBlock`, `regex`, `merge`, `overlay`, etc.).

## Additional Resources

- `references/formatos-respuesta.md` — Formatos de respuesta estructurados por tipo de pregunta (modo standalone).
- `examples/analisis-ejemplo.md` — Nivel de profundidad esperado para el análisis crítico (modo tarea).
- `examples/example-brainstorm.md` — Brainstorm sobre cómo mejorar el sistema de catálogo (modo standalone).
- `examples/example-bug-investigation.md` — Investigación de por qué `sdd task verify` falla en ciertos pasos (modo standalone).
