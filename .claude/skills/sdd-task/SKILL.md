---
name: sdd-task
description: Flujo spec-driven development por tarea con artefactos persistentes. Usar cuando el usuario pida un cambio (crear, implementar, arreglar, mejorar, refactor, "quiero/necesito que X haga Y"). Si hay ambigüedad entre analizar y cambiar, preguntar.
---

# sdd-task — flujo SDD adaptativo por tipo

El flujo se adapta al **tipo** de tarea: solo se recorren las fases (y se crean los artefactos) que ese tipo amerita. Todo queda en `.sdd/tasks/<id>/` para pausar, retomar en otra sesión y auditar.

## 0. Contexto, antes de cualquier fase

- Corré `sdd context`: destilado determinístico (reglas BR, catálogo, módulos, ADRs, aprendizajes, diagramas). Abrí `.sdd/domain.md`, `.sdd/c4/*` o `.sdd/decisions/*` completos solo si el destilado no alcanza.
- **NO releas tareas `done`**: lo útil ya está destilado en LEARNINGS.
- Las BR-NNN y el catálogo son **vinculantes**: nunca introduzcas una variante nueva de un topic ya decidido.

## 1. Capturar (siempre)

```bash
sdd task new "<requisito verbatim del dev>"
```

Crea `requirement.md` (inmutable) y nada más. El refinamiento va en los artefactos del tipo.

## 2. Clasificar (siempre) — BR-057

Decidí **tipo** (`simple | bug | feature | refactor`) y **riesgo** (`bajo | alto`), anuncialo en **UNA línea** y registralo:

```bash
sdd task type <id> <tipo> [--riesgo=alto]     # crea SOLO los artefactos de ese tipo
```

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
| `refactor` | `analysis.md`, `plan.md` | `sdd impact` (si hay grafo) → **tests verdes ANTES** → cambio → los mismos tests verdes después | analysis + plan |
| `feature` | `analysis.md`, `spec.md`, `plan.md` | **sdd-analyze** → **sdd-specify** → **sdd-plan** → **sdd-execute** | analysis + spec + plan |

- `bug`: el test de regresión **reemplaza la spec** — no escribas `spec.md`.
- `refactor`: sin criterios EARS; el criterio de aceptación es "los tests que ya existían siguen verdes".
- **Riesgo `alto`**: no recortes profundidad — clarificá más, pasos más chicos, verificación ejecutable en todos. **Riesgo `bajo`**: una línea por punto alcanza.
- Ejecución y cierre son iguales para todos los tipos: **sdd-execute** y **sdd-close**.

## 4. Re-clasificar cuando el alcance muta

Si una `simple` se complejiza (o una `feature` resulta trivial): **anuncialo en una línea** y corré `sdd task type <id> <tipo nuevo>`. Se crean los artefactos faltantes sin pisar ni borrar lo hecho. El dev puede corregir tipo o riesgo cuando quiera: aceptá la corrección sin fricción y seguí el flujo nuevo.

## Concisión y gates (BR-059, BR-061)

- Cada template declara **su** presupuesto en el encabezado: respetalo. No lo compenses con prosa fuera de las secciones.
- `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique, y **satisface el gate**. Lo que no lo satisface es dejar un `…` sin reemplazar.
- Diagrama Mermaid **solo si reemplaza prosa** (3+ actores, o pasos con bifurcaciones); si el flujo se explica en dos líneas, no hay diagrama.
- Gate = el dev aprueba en el chat después de que `sdd task status <id> <estado>` le abre el archivo. No avances sin el ok explícito.

## Reglas duras

- Estados: `sdd task status <id> <draft|analyzed|specified|planned|in-progress|paused|done>`. Retomar en cualquier sesión: `sdd task show <id>`.
- Tests: siempre con la skill **sdd-test** (`sdd test`), nunca comandos razonados a mano.
- No uses `--no-verify`; el pre-commit corre `sdd validate`.
- Un solo writer por archivo; delegá según los triggers de `references/triggers-delegacion.md` (leer 4+ archivos, cambio en 2+ archivos no triviales, review antes de commit/PR, accidente de git, sesión larga).

## Additional Resources

- `examples/tipos-ejemplo.md` — Clasificación y artefactos reales de los tipos `simple`, `bug` y `refactor`.
- `examples/flujo-ejemplo.md` — Flujo completo de una tarea `feature`, del trigger al cierre.
- `references/triggers-delegacion.md` — Triggers de delegación con ejemplos concretos.
- `templates/nota.md`, `templates/reproduccion.md` — Artefactos de los tipos `simple` y `bug`.
