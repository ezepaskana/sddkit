---
name: sdd-close
description: Fase de cierre de una tarea SDD. Usar al completar todos los pasos del plan para autogenerar la retro, medir la métrica y cosechar aprendizajes al framework.
---

# sdd-close — cierre sin fricción

**La retro la AUTOGENERÁS vos, con datos que ya tenés. Cero preguntas al dev**: los desvíos ya quedaron registrados en el plan/nota durante la ejecución, la métrica se mide con su `cmd:`, y los checkboxes cuentan el resto. El dev la lee recién en el PR — si le falta algo, te lo dice ahí. `sdd task status <id> done` exige `retro.md` (formato en `templates/retro.md`).

## Retro proporcional al tipo

- **`simple` / `bug` riesgo bajo → 1 línea autogenerada.** Qué se hizo + cómo se verificó. Aprendizajes solo si hubo una sorpresa real; si no, nada (ni siquiera N/A).
- **`feature` / `refactor` (o riesgo alto) → retro completa, ≤ 150 palabras:**
  1. **Métrica vs baseline**: medí el "después" con el `cmd:` definido y compará contra analysis.md. Resultado negativo también es aprendizaje. Sin métrica: `N/A: <motivo>` (en `refactor`: "mismos tests verdes antes y después").
  2. **Desvíos**: copiá/condensá los ya registrados en plan.md — no los re-descubras.
  3. **Aprendizajes accionables**, solo los que superen el umbral "otro agente tropezaría con esto", cada uno a su destino: general → `.sdd/LEARNINGS.md` (≤ 200 chars, tope ~30, reglas en `references/curado.md`) · convención → `sdd decide` · regla → BR-NNN en `.sdd/domain.md` · arquitectura → ADR · estructura → `.sdd/c4/` (diagrama de components al día).

`N/A: <motivo>` satisface el gate; un `…` sin reemplazar no.

## Cierre

1. Verificá `sdd validate` en verde.
2. `git add` de la retro + archivos de promoción, commit `[tarea <id>] Cierre: retro + aprendizajes`.
3. `sdd task close <id>` → push + PR draft (GitHub/Azure/GitLab; sin CLI imprime instrucciones). Título `[tarea <id>] <título>`, base según `.sdd/branching.md`.
4. `sdd task status <id> done`.

## Additional Resources

- `templates/retro.md` — Artefacto canónico y su presupuesto.
- `references/curado.md` — Reglas de curado de LEARNINGS.md.
- `examples/retro-ejemplo.md` — Retro real dentro del presupuesto.
