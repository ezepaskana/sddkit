---
name: sdd-specify
description: Fase de especificación de una tarea SDD. Usar después del análisis (sdd-analyze) para escribir la spec formal con historia, criterios EARS, reglas de negocio y fuera de alcance.
---

# sdd-specify — la spec refinada

**Solo para tareas de riesgo `alto`** (BR-058). Si el riesgo es `bajo`, no hay spec: los criterios de aceptación van dentro del plan y pasás directo a **sdd-plan**. Si estás acá con riesgo bajo, volvé — o re-clasificá si el alcance mutó.

**Input:** `analysis.md` aprobado. **La spec lo CONTINÚA, no lo repite**: no reescribas el entendimiento ni los huecos ya respondidos. Su contenido propio es el contrato — qué tiene que ser cierto para decir que esto terminó.

**Tope: `spec.md` ≤ 45 líneas** (BR-082). Las secciones ya están en `templates/spec.md` — completalas, no las re-expliques.

## Qué hace buena a una spec

- **Criterios numerados** (`CA-1`, `CA-2`…): el número es lo que permite citarlos desde un paso del plan o desde un test. Sin numerar, el contrato no se puede referenciar.
- **Un criterio por comportamiento observable**, en EARS (`references/ears.md`): verbos verificables (responder, registrar, excluir), nunca "manejar" o "soportar". Cubrí caso feliz, los bordes que salieron de los huecos y el error.
- **Nada de implementación**: acá va el **qué**. Librerías, módulos y arquitectura son el **cómo** y viven en `design.md`.
- **Reglas de negocio por ID** (BR-NNN de `.sdd/domain.md`). Si la tarea introduce una regla nueva, escribila PRIMERO allí con su número y citala acá.
- **Supuestos declarados**: los defaults que elegiste sin preguntar, tras agotar el tope de 5 huecos (BR-084). Declararlos es lo que le permite al dev corregirte barato.
- **Fuera de alcance explícito**: lo que NO se hace es lo que evita el scope creep en la ejecución.
- `N/A: <motivo>` es válido en cualquier sección que no aplique y satisface el gate.
- **Sin diagrama**: el diagrama vive en el `analysis.md`. Si necesitás uno acá, es señal de que el entendimiento quedó incompleto — volvé al analysis.

## El gate

Pasá la tarea a `specified` en `.sdd/tasks/index.json` y **volcá spec.md en la terminal** (cómo: `sdd-task/references/artefactos.md`). Esperá su aprobación en el chat, marcá la línea de aprobación en spec.md y seguí con **sdd-plan**.

## Additional Resources

- `templates/spec.md` — Artefacto canónico con sus secciones y su presupuesto.
- `references/ears.md` — Patrones EARS y reglas de escritura.
- `examples/spec-ejemplo.md` — Spec real dentro del presupuesto.
