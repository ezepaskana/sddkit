---
name: sdd-specify
description: Fase de especificación de una tarea SDD. Usar después del análisis (sdd-analyze) para escribir la spec formal con historia, criterios EARS, reglas de negocio y fuera de alcance.
---

# sdd-specify — la spec refinada

**Solo para tareas tipo `feature`** (BR-058). Las otras no llevan spec: `simple` → `nota.md`; `bug` → `reproduccion.md` (el test de regresión ES el criterio de aceptación); `refactor` → `analysis.md` + plan, sin EARS. Si estás acá con otro tipo, volvé al flujo del tipo o re-clasificá.

**Input:** `analysis.md` aprobado. Leelo primero: la spec traduce sus hallazgos y clarificaciones a comportamiento observable, no los repite.

**Presupuesto: `spec.md` ≤ 300 palabras.** Las secciones ya están en `templates/spec.md` — completalas, no las re-expliques.

## Qué hace buena a una spec

- **Un criterio por comportamiento observable**, en EARS (`references/ears.md`): verbos verificables (responder, registrar, excluir), nunca "manejar" o "soportar". Cubrí caso feliz, los bordes que salieron de la clarificación y el error.
- **Riesgo `alto`** → criterios explícitos para error, concurrencia y migración. **Riesgo `bajo`** → los mínimos que definen "terminado".
- **Reglas de negocio por ID** (BR-NNN de `.sdd/domain.md`). Si la tarea introduce una regla nueva, escribila PRIMERO allí con su número y citala acá.
- **Fuera de alcance explícito**: lo que NO se hace es lo que evita el scope creep en la ejecución.
- **Impacto**: módulos de `components.md`, convenciones del catálogo que aplican, si requiere ADR o tocar C4.
- `N/A: <motivo>` es válido en cualquier sección que no aplique y satisface el gate.
- **Diagrama**: solo si REEMPLAZA prosa (3+ actores o pasos con bifurcaciones). Si no, borrá la sección. Si lo incluís, la primera línea del bloque `mermaid` debe declarar el tipo (`flowchart LR`, `sequenceDiagram`, `stateDiagram-v2`) — sin eso el diagrama no renderiza.

## El gate

Pasá la tarea a `specified` en `.sdd/tasks/index.json` y **mostrale spec.md al dev** (cómo: `sdd-task/references/artefactos.md`). Esperá su aprobación en el chat, marcá la línea de aprobación en spec.md y seguí con **sdd-plan**.

## Additional Resources

- `templates/spec.md` — Artefacto canónico con sus secciones y su presupuesto.
- `references/ears.md` — Patrones EARS y reglas de escritura.
- `examples/spec-ejemplo.md` — Spec real dentro del presupuesto.
