---
name: sdd-task
description: Flujo spec-driven development por tarea con artefactos persistentes. Usar cuando el usuario pida un cambio (crear, implementar, arreglar, mejorar, refactor, "quiero/necesito que X haga Y"). Si hay ambigüedad entre analizar y cambiar, preguntar.
---

# sdd-task — flujo SDD adaptativo por tipo

El flujo se adapta al **tipo** de tarea: solo se recorren las fases (y se crean los artefactos) que ese tipo amerita. Todo queda en `.sdd/tasks/<id>/` para pausar, retomar en otra sesión y auditar.

**No hay CLI.** Los artefactos los escribís vos; el formato canónico (índice, ids, slugs, templates, estados) está en `references/artefactos.md`. Leelo antes de crear o modificar cualquier artefacto — que las tareas sean auditables entre sesiones depende de que ese formato no se improvise.

## 0. Contexto, antes de cualquier fase

- Leé `.sdd/LEARNINGS.md` primero (si existe), después `.sdd/domain.md` (reglas BR), `.sdd/catalog.json` y `.sdd/c4/components.md`. Los diagramas Mermaid de esos docs son contenido de primera clase: miralos, no los saltees.
- **NO releas tareas `done`**: lo útil ya está destilado en LEARNINGS.
- Las BR-NNN y el catálogo son **vinculantes**: nunca introduzcas una variante nueva de un topic ya decidido.

## 1. Capturar (siempre)

Creá `.sdd/tasks/<id>-<slug>/requirement.md` con el requisito **verbatim** del dev y agregá la entrada al índice en estado `draft`. Cómo, exactamente: `references/artefactos.md`.

Ese archivo es inmutable: el refinamiento va en los artefactos del tipo, nunca acá.

## 2. Clasificar (siempre) — BR-057

Decidí **tipo** (`simple | bug | feature | refactor`) y **riesgo** (`bajo | alto`), anuncialo en **UNA línea** y registralo en el índice.

> Ejemplo de anuncio: _"Lo trato como `bug` (riesgo bajo): reproduzco, test rojo, fix. Decime si preferís otro tipo."_

| Tipo | Señal | Riesgo `alto` si… |
|---|---|---|
| `simple` | un archivo, sin ambigüedad, sin comportamiento nuevo | (si dudás, no es simple) |
| `bug` | algo ya existe y no hace lo que debería | toca datos, seguridad, o el fix no es local |
| `feature` | comportamiento nuevo, o el requisito tiene ambigüedad | contrato público, migración, dependencia nueva |
| `refactor` | mismo comportamiento, distinta forma | toca módulos con muchos dependientes |

**Si las señales son ambiguas o contradictorias, no adivines: preguntá.** Cuando el pedido admite lecturas de tamaño muy distinto, o el tipo aparente choca con el alcance real, pedile al dev su expectativa —tipo, tamaño, hasta dónde profundizar— **antes** de clasificar. Su respuesta fija la profundidad de todos los artefactos, no solo cuáles se crean. Si las señales son claras, clasificá y seguí: la pregunta es para la duda genuina, no un trámite de cada tarea.

## 3. Un solo camino, más profundo según el riesgo (BR-058)

| Riesgo | Artefactos | Gates |
|---|---|---|
| `bajo` | `analysis.md` → `plan.md` | analysis + plan |
| `alto` | `analysis.md` → `spec.md` → `design.md` + `plan.md` | analysis + spec + plan |

No hay formatos especiales por tipo — el tipo decide el **contenido**, no la lista de archivos:

- `bug`: la reproducción (pasos, esperado vs observado) va en el `analysis.md`, y el **test de regresión es el primer paso del plan** — rojo antes del fix, verde después. Reemplaza a los criterios de aceptación.
- `refactor`: la corrida verde de baseline es el primer paso y la misma corrida cierra el último. El criterio es "los tests que ya existían siguen verdes".
- `simple`: el plan tiene uno o dos pasos, pero se escribe igual.
- **Riesgo `alto`**: no recortes profundidad — más clarificación, pasos más chicos, verificación ejecutable en todos.
- Ejecución y cierre son iguales para todos: **sdd-execute** y **sdd-close**.

## 4. Re-clasificar cuando el alcance muta

Si una `simple` se complejiza (o una `feature` resulta trivial): **anuncialo en una línea**, actualizá `tipo` en el índice y creá los artefactos faltantes **sin pisar ni borrar lo hecho**. El dev puede corregir tipo o riesgo cuando quiera: aceptá la corrección sin fricción y seguí el flujo nuevo.

## Concisión y gates (BR-059, BR-061, BR-082)

- Cada template declara **su tope en líneas** (45): respetalo. No lo compenses con prosa fuera de las secciones.
- Si un artefacto no entra, la tarea es demasiado grande: decilo y proponé partirla (BR-083). No lo aceptes en silencio.
- `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique, y **satisface el gate**. Lo que no lo satisface es dejar un `…` sin reemplazar.
- Diagrama Mermaid **solo si reemplaza prosa** (3+ actores, o pasos con bifurcaciones); si el flujo se explica en dos líneas, no hay diagrama.
- Gate = el dev aprueba en el chat después de que le **volcás el artefacto en la terminal** (nunca abriendo una app externa — `references/artefactos.md`). No avances sin el ok explícito. **Nadie te va a frenar si te lo salteás: el gate sos vos.**

## Reglas duras

- Estados y transiciones: `references/artefactos.md`. Actualizá `updatedAt` en cada una.
- Tests: usá el comando de test del repo. Si no lo sabés, deducilo una vez y **registralo en `.sdd/config.json`** para no volver a deducirlo.
- No uses `--no-verify` para saltear los hooks del repo.
- Un solo writer por archivo; delegá según los triggers de `references/triggers-delegacion.md` (leer 4+ archivos, cambio en 2+ archivos no triviales, review antes de commit/PR, accidente de git, sesión larga).

## Additional Resources

- `references/artefactos.md` — **Formato canónico**: índice, ids, slugs, templates, estados y gates. Fuente única.
- `references/estructura-c4.md` — **Documentación de arquitectura**: formato máquina, índice vs detalle por módulo, y la frontera entre rule de capa y `CLAUDE.md` de módulo. Leelo antes de escribir o actualizar cualquier archivo de `.sdd/c4/`, una rule de capa o un `CLAUDE.md` de módulo.
- `examples/tipos-ejemplo.md` — Clasificación y artefactos reales de los tipos `simple`, `bug` y `refactor`.
- `examples/flujo-ejemplo.md` — Flujo completo de una tarea `feature`, del trigger al cierre.
- `references/triggers-delegacion.md` — Triggers de delegación con ejemplos concretos.
- Los templates viven en las skills de cada fase (`sdd-analyze`, `sdd-specify`, `sdd-plan`); las rutas están en `references/artefactos.md`.
