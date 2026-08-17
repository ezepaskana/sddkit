---
name: sdd-plan
description: Fase de planificación de una tarea SDD. Usar después de la aprobación de la spec (sdd-specify) para descomponer en pasos chicos verificables con nivel de modelo.
---

# sdd-plan — el plan en pasos chicos

Aplica a **todas** las tareas (BR-058): después de la spec si el riesgo es `alto`, directo después del analysis si no. Una tarea `simple` también lleva plan — de uno o dos pasos.

**El plan es una LISTA, no un documento** (BR-085): una línea por paso, con su verificación. **Tope: 45 líneas** (BR-082). Si no entra, la tarea es demasiado grande: decilo y proponé partirla (BR-083).

**Riesgo `alto` → escribí también `design.md`** (`templates/design.md`): impacto en arquitectura y catálogo, archivos por área, dependencias entre pasos y riesgos de la ejecución. Es lo que sacamos del plan para que el plan entre en pantalla. Riesgo `bajo` → no hay design, y los criterios de aceptación van dentro del plan porque tampoco hubo spec.

## Reglas de descomposición

1. **Chico**: verificable por sí solo y completable en una sesión corta. Si no podés escribir su verificación en una línea, partilo.
2. **Verificación ejecutable siempre que se pueda**: `Verificación: cmd: <comando>` (`cmd: npm test -- facturas`, `cmd: grep -q "X" src/archivo.js`). El orquestador la corre **literal** antes de marcar el checkbox — exit code = verdad, cero razonamiento. Prosa solo si requiere juicio humano o visual.
3. **Tests primero**: el paso que escribe los tests de un comportamiento va ANTES del que lo implementa (rojo → verde). En `bug`, el test rojo que reproduce el defecto es un paso propio. En `refactor`, el primer paso deja registrada la corrida verde de baseline.
4. **Archivos**: nombralos en la línea del paso si son uno o dos; si son más, van en `design.md`. Un solo writer por archivo.
5. **Nivel de modelo**: `(rapido)` mecánico/boilerplate/renames · `(medio)` implementación estándar · `(fuerte)` diseño, lógica compleja, edge cases. Mapean a `.sdd/config.json → models`. Anotalo solo cuando no sea el obvio para ese paso.
6. `[P]` marca los pasos paralelizables (sin dependencias cruzadas ni archivos compartidos).
7. **Sin diagrama**: si las dependencias entre pasos necesitan un dibujo, van en `design.md`.

Riesgo `alto` → pasos más chicos y verificación `cmd:` en todos. Riesgo `bajo` → no infles el plan con pasos ceremoniales.

## Branching

El **Paso 1 es el `git checkout -b <rama>`** correspondiente, y los pasos del trabajo real arrancan en el 2. La rama y su base salen de `.sdd/branching.md`; con `design.md`, la sección `## Rama de trabajo` va ahí. Si `.sdd/branching.md` no existe, usá los defaults del repo (base = la rama por defecto de git, nombre = `task/<id>-<slug>`) y **dejá el aviso** de que la política no está definida.

## El gate

Pasá la tarea a `planned` en `.sdd/tasks/index.json` y **volcá plan.md en la terminal** (cómo: `sdd-task/references/artefactos.md`). Con su ok: estado `in-progress` y seguí con **sdd-execute**.

## Additional Resources

- `templates/plan.md` — Artefacto canónico: la lista de pasos y su tope.
- `templates/design.md` — Detalle técnico, solo en riesgo alto.
- `examples/plan-ejemplo.md` — Pasos bien descompuestos + anti-ejemplo.
