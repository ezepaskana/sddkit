---
name: sdd-task
description: Flujo spec-driven development por tarea con artefactos persistentes. Usar cuando el usuario pida un cambio (crear, implementar, arreglar, mejorar, refactor, "quiero/necesito que X haga Y"). Si hay ambigüedad entre analizar y cambiar, preguntar.
---

# sdd-task — el flujo SDD por tarea

Una tarea es "no trivial" si toca más de un archivo, agrega comportamiento nuevo, o el requisito tiene cualquier ambigüedad. Para esas, NUNCA empieces a codear directo: el flujo deja artefactos en `.sdd/tasks/<id>/` que permiten pausar, retomar en otra sesión y auditar.

## Contexto obligatorio antes de cualquier fase (barato en tokens)

1. **Corré `sdd context`**: es el destilado determinístico de reglas BR, catálogo, módulos, ADRs y aprendizajes — un output corto en vez de leer seis archivos largos. Solo abrí los archivos completos (`.sdd/domain.md`, `.sdd/c4/*`, `.sdd/decisions/*`) cuando el destilado no alcance para la decisión que estás tomando.
2. **NO releas tareas `done`** (`.sdd/tasks/` viejas): su conocimiento útil ya está destilado en LEARNINGS (incluido en `sdd context`).
3. Las reglas BR-NNN y el catálogo del destilado son **vinculantes**; nunca introduzcas variantes nuevas de un topic decidido.

## Las fases (cada una tiene su propia skill — leela al entrar en la fase)

| Fase | Skill | Salida |
|---|---|---|
| 1. Capturar | (este archivo) `sdd task new "<requisito verbatim>"` | requirement.md inmutable |
| 2. Analizar + clarificar | **sdd-analyze** | analysis.md → gate `analyzed` |
| 3. Especificar | **sdd-specify** | spec.md → gate `specified` |
| 4. Planificar | **sdd-plan** | plan.md en pasos chicos → gate de aprobación |
| 5. Ejecutar | **sdd-execute** | pasos via subagentes, checkboxes verificados |
| 6. Cerrar | **sdd-close** | retro.md + cosecha a LEARNINGS/catálogo/docs |

Transversal: **sdd-test** — toda corrida de tests (verificaciones, pre-cierre) usa `sdd test`, nunca comandos razonados a mano.

Estados: `sdd task status <id> <draft|analyzed|specified|planned|in-progress|paused|done>`. Retomar en cualquier sesión: `sdd task show <id>`.

## Disparadores de delegación (cuándo tu contexto se está por contaminar)

No esperes a "sentirte" saturado — estos triggers son objetivos:

| Situación | Acción esperada |
|---|---|
| Vas a leer 4+ archivos para entender un flujo | Delegá la exploración a un subagente (rapido) que te devuelva un resumen |
| El cambio toca 2+ archivos no triviales | Un solo writer (subagente) por paso; nunca dos manos en el mismo archivo |
| Commit/push/PR después de cambios | Review con contexto fresco (subagente) salvo diff trivial de docs |
| Accidente de git/worktree, merge raro, entorno de test confuso | FRENÁ — auditoría con contexto fresco antes de seguir |
| Sesión larga monolítica acumulando complejidad | Pausá la tarea (`sdd task status <id> paused`), replanificá o justificá por qué no |

El objetivo no es ceremonia: es un orquestador responsable con contexto limpio y un solo writer por vez.

## Reglas duras del flujo

- Tres gates de aprobación del dev: analysis, spec y plan. No avances sin el ok explícito.
- No uses --no-verify; el pre-commit corre `sdd validate`.
- Para fixes triviales de un archivo sin ambigüedad podés saltear el flujo de tarea, pero catálogo, dominio y C4 aplican igual.

## Additional Resources

- `examples/flujo-ejemplo.md` — Ejemplo del flujo completo de una tarea SDD, desde el trigger hasta el cierre.
- `references/triggers-delegacion.md` — Triggers de delegación expandidos con ejemplos concretos.
