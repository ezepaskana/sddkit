---
name: sdd-close
description: Fase de cierre de una tarea SDD. Usar al completar todos los pasos del plan para cosechar aprendizajes al framework, abrir el PR y marcar la tarea como done.
---

# sdd-close — cierre sin fricción

**No hay documento de cierre.** El artefacto de retro y la métrica de impacto se eliminaron en la tarea 021 (BR-086): lo que se escribía ahí y servía de verdad —los aprendizajes— va **directo** a `.sdd/LEARNINGS.md`. El resto era ceremonia: los desvíos ya quedaron anotados en el plan durante la ejecución y los checkboxes cuentan lo hecho.

## Cosechar aprendizajes (BR-086)

Solo lo que supere el umbral **"otro agente tropezaría con esto"**. Si no hubo ninguna sorpresa real, no escribís nada — no es una sección que haya que llenar.

Cada aprendizaje va a su destino:

| Tipo | Destino |
|---|---|
| General, reutilizable | `.sdd/LEARNINGS.md` — bullets ≤ 200 caracteres, tope ~30 entradas (reglas en `references/curado.md`) |
| Convención del equipo | una entrada nueva en `.sdd/catalog.json` |
| Regla de negocio | BR-NNN en `.sdd/domain.md` |
| Decisión de arquitectura | un ADR en `.sdd/decisions/` |
| Estructura del repo | `.sdd/c4/` (diagrama de components al día) |

Si `.sdd/LEARNINGS.md` no existe todavía, crealo antes de escribir el primero.

## Cierre

1. **Chequeá vos** (ya no hay exit code que te frene): todos los checkboxes de `plan.md` marcados, ningún artefacto con un `…` sin reemplazar, bullets de LEARNINGS dentro de los 200 caracteres, y los docs de `.sdd/` al día con lo que cambiaste.
2. `git add` de los aprendizajes y archivos de promoción, commit `[tarea <id>] Cierre: aprendizajes`.
3. `git push -u origin <rama>` y abrí el PR **draft** con el CLI de la forja (`gh pr create --draft`, `glab`, `az repos pr create`); si no hay ninguno instalado, imprimile al dev la URL de comparación y el título. Título `[tarea <id>] <título>`, base según `.sdd/branching.md`.
4. Poné `done` + `updatedAt` en `.sdd/tasks/index.json`.

El PR es donde el dev lee lo que pasó: si algo le falta, te lo dice ahí.

## Additional Resources

- `references/curado.md` — Reglas de curado de LEARNINGS.md.
