---
name: sdd-analyze
description: Análisis crítico e investigación read-only. Usar como fase 2 del flujo SDD (tras sdd task new) o automáticamente cuando el usuario haga preguntas sin pedir cambios (investigar, debuggear, brainstorm).
---

# sdd-analyze — análisis crítico (modo dual)

- **(A) Modo tarea** — hay una tarea clasificada como `feature` o `refactor` con `analysis.md` pendiente. Escribís ese artefacto y seguís el flujo del tipo. Las tareas `simple` (nota.md) y `bug` (reproduccion.md) **NO pasan por acá**: BR-058.
- **(B) Modo standalone** — no hay tarea: el dev quiere investigar, debuggear o brainstormear. **Read-only**: leés, analizás, proponés; nunca escribís. Si converge en un cambio, derivás a `/sdd-task`.

Si el mensaje mezcla investigación con un pedido de cambio, preguntale al dev cuál de los dos quiere.

**Dos salidas, en los dos modos (BR-064).** El detalle va SIEMPRE a un archivo — `analysis.md` en modo tarea, `.sdd/notes/<slug>.md` en standalone. Lo que va al chat es un resumen de **≤ 150 palabras**: hallazgo principal + **2-4 opciones numeradas** para que el dev elija, y ahí **frenás y esperás**. Nunca vuelques el análisis entero en la respuesta.

---

## (A) Modo tarea

**El requisito del dev es una HIPÓTESIS, no una orden.** El dev puede equivocarse y tu trabajo es detectarlo ANTES de construir. La complacencia acá es un bug, no cortesía.

**Presupuesto: `analysis.md` ≤ 350 palabras.** Las secciones y sus preguntas ya están en el template — no las repitas acá, completalas: una línea por punto (dos solo con evidencia dura: `archivo:línea`, número medido). `N/A: <motivo>` es válido y satisface el gate.

### Cómo investigar (barato primero)

1. `sdd context` — destilado de BR, catálogo, módulos, ADRs y aprendizajes.
2. `sdd find <término>` para "¿ya existe?" — busca en el índice sin recorrer el repo. Explorá a mano solo si no alcanza.
3. `sdd impact <archivo|símbolo>` si el repo tiene grafo (`.sdd/config.json → graph`): quién depende de lo que vas a tocar. **Obligatorio en `refactor`**; sin grafo, `N/A`. Detalle en `references/impacto-grafo.md`.

### Específico de `refactor`

Sin criterios EARS: el criterio de aceptación es que **los tests que ya existían sigan verdes**. Dejá registrado en analysis.md el comando exacto y su resultado ANTES del cambio (baseline verde); si el área no tiene tests, cubrirla es el primer paso del plan.

### Qué amerita objeción

- ❌ No objetes por objetar: estilo, micro-optimizaciones, "yo lo haría distinto".
- ✅ Sí objetá: duplicación de algo existente, violación de una BR-NNN o un ADR, complejidad desproporcionada al valor, supuestos falsos verificables en el código.

Cerrá con una recomendación honesta (`proceder | proceder con cambios | reconsiderar`). Si es "reconsiderar", discutilo con el dev ANTES de seguir.

### Clarificación

Preguntá lo que cambie el alcance o invalide el enfoque, en tandas (no de a una), y registrá cada respuesta en analysis.md. Riesgo `alto` → más preguntas; riesgo `bajo` → las mínimas que destraben.

### Gate

`sdd task status <id> analyzed` le abre analysis.md al dev. Con su ok: **sdd-specify** si es `feature`, **sdd-plan** si es `refactor`.

---

## (B) Modo standalone (read-only)

Investigás y conversás; tu salida es entendimiento, no diffs. Sirve para: entender un módulo o flujo, debuggear, brainstormear diseño, revisar código o estimar impacto.

1. Arrancá por `sdd context` y `sdd find <término>`; después leé los archivos y seguí la cadena de dependencias.
2. **Escribí el detalle en la nota**, no en el chat: `.sdd/notes/<slug>.md` (BR-065). Si ya existe una del mismo tema, leela y continuala — es lo que te deja cortar la sesión y retomar después. Cómo: `references/notas-persistentes.md`.
3. **Contestá corto** (BR-064): hallazgo principal en **≤ 150 palabras** + **2-4 opciones numeradas**, y **esperá que el dev elija** antes de seguir. Formatos por tipo de pregunta: `references/formatos-respuesta.md`.
4. Cuando elige una opción, expandí **solo ese tema** con el mismo presupuesto y volvé a ofrecer los que queden abiertos. Si el dev pide el análisis completo, dáselo sin recortar.
5. Handoff: _"¿Listo para implementar? Corré `/sdd-task` con esta descripción: …"_.

### El resumen no es un análisis pobre

Investigás con la misma profundidad de siempre: lo que cambia es **qué mostrás**. Todo lo que no entra en el chat (evidencia `archivo:línea`, opciones descartadas, fuentes, tablas) va a la nota. Si el flujo tiene 3+ pasos o actores, un diagrama Mermaid reemplaza la prosa (BR-061).

### RESTRICCIÓN CRÍTICA (solo standalone)

**No modificás NADA salvo tu nota.** Única escritura permitida: `.sdd/notes/<slug>.md` (BR-065). Prohibido todo lo demás: `Edit`/`Write` sobre cualquier otro path, Bash que escriba (`>`, `>>`, `sed -i`, `mv`, `rm`, `cp`, `touch`, `tee`), artefactos de tarea y commits. Permitido leer: `Read`, `Grep`, Bash de lectura (`git log`/`blame`/`diff`, `ls`, `find`) y `Agent` para explorar. **Si te descubrís por editar código — FRENÁ** y proponelo verbalmente. (En modo tarea no aplica: escribir `analysis.md` es el trabajo.)

## Idioma

Respondé en el idioma del usuario. Términos técnicos en inglés (`stepBlock`, `regex`, `merge`, `overlay`).

## Additional Resources

- `templates/analysis.md` — Artefacto canónico con sus secciones y su presupuesto.
- `references/formatos-respuesta.md` — Guías de respuesta por tipo de pregunta (standalone).
- `references/notas-persistentes.md` — Estructura de `.sdd/notes/<slug>.md` y cómo retomar una investigación.
- `references/impacto-grafo.md` — Cómo usar `sdd impact`.
- `examples/analisis-ejemplo.md` — Nivel de profundidad esperado (modo tarea).
- `examples/example-brainstorm.md`, `examples/example-bug-investigation.md` — Standalone.
