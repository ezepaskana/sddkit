# Nota — tarea 012: La etapa de cierre es molesta; mejorarla para que no sea una…

> Tarea de tipo `simple`: este es el ÚNICO artefacto (no hay analysis/spec/plan). Su presupuesto es de **≤ 100 palabras**. Un solo gate: el dev lee esto, da el ok, y recién ahí implementás con tests. `N/A: <motivo>` es válido donde no aplique.
>
> Si durante la ejecución el alcance se complejiza, anuncialo y re-clasificá: `sdd task type 012 <tipo>`.

- **Qué entendí:** el cierre pide al dev cosas que el agente ya sabe; la retro debe ser un subproducto automático, proporcional al tipo.
- **Qué voy a hacer:** retro autogenerada desde datos (desvíos del plan, métrica `cmd:`), cero preguntas al dev; `simple`/`bug` riesgo bajo → 1 línea; `feature`/`refactor` → completa ≤150. Archivos: `skills/sdd-close/SKILL.md`, `skills/sdd-close/templates/retro.md`, `src/commands/task.js` (mensaje del gate).
- **Cómo se verifica:** `cmd: sdd test` + cierre de esta misma tarea con retro de 1 línea sin preguntas.

---
_Aprobación del dev: aprobada (2026-08-01, en chat: "Vamos con el A + B")_
