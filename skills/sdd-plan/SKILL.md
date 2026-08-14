---
name: sdd-plan
description: Fase de planificación de una tarea SDD. Usar después de la aprobación de la spec (sdd-specify) para descomponer en pasos chicos verificables con nivel de modelo.
---

# sdd-plan — el plan en pasos chicos

Aplica a `feature` (después de la spec), `bug` (después de la reproducción) y `refactor` (después del análisis). Las tareas `simple` **no llevan plan**: su `nota.md` ya dice qué se hace y cómo se verifica.

Completá `plan.md` de la tarea (formato canónico: `templates/plan.md`).

**Presupuesto: máximo 3 sub-ítems por paso** (`Hace` con archivos, `Depende de` solo si existe, `Verificación`). Sin prosa extra: lo que no entra en esos tres sub-ítems va en la spec o no va.

## Reglas de descomposición

1. **Chico**: verificable por sí solo y completable en una sesión corta. Si no podés escribir su verificación en una línea, partilo.
2. **Verificación ejecutable siempre que se pueda**: `Verificación: cmd: <comando>` (`cmd: npm test -- facturas`, `cmd: grep -q "X" src/archivo.js`). El orquestador la corre **literal** antes de marcar el checkbox — exit code = verdad, cero razonamiento. Prosa solo si requiere juicio humano o visual.
3. **Tests primero**: el paso que escribe los tests de un comportamiento va ANTES del que lo implementa (rojo → verde). En `bug`, el test rojo que reproduce el defecto es un paso propio. En `refactor`, el primer paso deja registrada la corrida verde de baseline.
4. **Archivos explícitos** por paso: rutas exactas, nunca "varios archivos". Un solo writer por archivo.
5. **Nivel de modelo**: `(rapido)` mecánico/boilerplate/renames · `(medio)` implementación estándar · `(fuerte)` diseño, lógica compleja, edge cases. Mapean a `.sdd/config.json → models`.
6. **Métrica**: si analysis.md no tenía baseline, el primer paso la instrumenta.
7. `[P]` marca los pasos paralelizables (sin dependencias cruzadas ni archivos compartidos).
8. **Diagrama de dependencias**: opcional y solo si REEMPLAZA prosa (3+ pasos con dependencias cruzadas o paralelismo no obvio). Orden lineal → sin diagrama.

Riesgo `alto` → pasos más chicos y verificación `cmd:` en todos. Riesgo `bajo` → no infles el plan con pasos ceremoniales.

## Branching

Todo plan abre con una sección `## Rama de trabajo` y un **Paso 1 bloqueante** con el `git checkout -b <rama>` correspondiente; los pasos del trabajo real arrancan en el 2.

El nombre de la rama y la base salen de `.sdd/branching.md`. Si ese archivo no existe, usá los defaults del repo (rama base = la rama por defecto de git, nombre = `task/<id>-<slug>`) y **dejá el aviso en el plan** de que la política no está definida.

## El gate

Pasá la tarea a `planned` en `.sdd/tasks/index.json` y **mostrale plan.md al dev** (cómo: `sdd-task/references/artefactos.md`). Con su ok: estado `in-progress` y seguí con **sdd-execute**.

## Additional Resources

- `templates/plan.md` — Artefacto canónico: estructura de cada paso y su presupuesto.
- `examples/plan-ejemplo.md` — Pasos bien descompuestos + anti-ejemplo.
