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

Decidí **tipo** (`simple | bug | feature | refactor`) y **riesgo** (`bajo | alto`), anuncialo en **UNA línea**, registralo en el índice y creá SOLO los artefactos de ese tipo.

> Ejemplo de anuncio: _"Lo trato como `bug` (riesgo bajo): reproduzco, test rojo, fix. Decime si preferís otro tipo."_

| Tipo | Señal | Riesgo `alto` si… |
|---|---|---|
| `simple` | un archivo, sin ambigüedad, sin comportamiento nuevo | (si dudás, no es simple) |
| `bug` | algo ya existe y no hace lo que debería | toca datos, seguridad, o el fix no es local |
| `feature` | comportamiento nuevo, o el requisito tiene ambigüedad | contrato público, migración, dependencia nueva |
| `refactor` | mismo comportamiento, distinta forma | toca módulos con muchos dependientes |

## 3. Flujo por tipo (BR-058)

| Tipo | Artefactos | Flujo | Gates |
|---|---|---|---|
| `simple` | `nota.md` | qué entendí + qué hago → implementar con tests | 1: el dev aprueba la nota (muy pocas palabras) |
| `bug` | `reproduccion.md`, `plan.md` | reproducir → **test rojo** que lo captura → fix → test verde | reproducción + plan |
| `refactor` | `analysis.md`, `plan.md` | mapear dependientes → **tests verdes ANTES** → cambio → los mismos tests verdes después | analysis + plan |
| `feature` | `analysis.md`, `spec.md`, `plan.md` | **sdd-analyze** → **sdd-specify** → **sdd-plan** → **sdd-execute** | analysis + spec + plan |

- `bug`: el test de regresión **reemplaza la spec** — no escribas `spec.md`.
- `refactor`: sin criterios EARS; el criterio de aceptación es "los tests que ya existían siguen verdes".
- **Riesgo `alto`**: no recortes profundidad — clarificá más, pasos más chicos, verificación ejecutable en todos. **Riesgo `bajo`**: una línea por punto alcanza.
- Ejecución y cierre son iguales para todos los tipos: **sdd-execute** y **sdd-close**.

## 4. Re-clasificar cuando el alcance muta

Si una `simple` se complejiza (o una `feature` resulta trivial): **anuncialo en una línea**, actualizá `tipo` en el índice y creá los artefactos faltantes **sin pisar ni borrar lo hecho**. El dev puede corregir tipo o riesgo cuando quiera: aceptá la corrección sin fricción y seguí el flujo nuevo.

## Concisión y gates (BR-059, BR-061)

- Cada template declara **su** presupuesto en el encabezado: respetalo. No lo compenses con prosa fuera de las secciones.
- `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique, y **satisface el gate**. Lo que no lo satisface es dejar un `…` sin reemplazar.
- Diagrama Mermaid **solo si reemplaza prosa** (3+ actores, o pasos con bifurcaciones); si el flujo se explica en dos líneas, no hay diagrama.
- Gate = el dev aprueba en el chat después de que le mostrás el archivo. No avances sin el ok explícito. **Nadie te va a frenar si te lo salteás: el gate sos vos.**

## Reglas duras

- Estados y transiciones: `references/artefactos.md`. Actualizá `updatedAt` en cada una.
- Tests: usá el comando de test del repo. Si no lo sabés, deducilo una vez y **registralo en `.sdd/config.json`** para no volver a deducirlo.
- No uses `--no-verify` para saltear los hooks del repo.
- Un solo writer por archivo; delegá según los triggers de `references/triggers-delegacion.md` (leer 4+ archivos, cambio en 2+ archivos no triviales, review antes de commit/PR, accidente de git, sesión larga).

## Additional Resources

- `references/artefactos.md` — **Formato canónico**: índice, ids, slugs, templates, estados y gates. Fuente única.
- `examples/tipos-ejemplo.md` — Clasificación y artefactos reales de los tipos `simple`, `bug` y `refactor`.
- `examples/flujo-ejemplo.md` — Flujo completo de una tarea `feature`, del trigger al cierre.
- `references/triggers-delegacion.md` — Triggers de delegación con ejemplos concretos.
- `templates/nota.md`, `templates/reproduccion.md` — Artefactos de los tipos `simple` y `bug`.
