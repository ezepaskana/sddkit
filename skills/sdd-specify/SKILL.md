---
name: sdd-specify
description: Fase de especificación de una tarea SDD. Usar después del análisis crítico (sdd-analyze) para escribir la spec refinada con criterios EARS y métrica de impacto.
---

# sdd-specify — la spec refinada

Completá la sección "Spec refinada" de spec.md (el template ya está en la carpeta de la tarea; el formato canónico vive en `templates/spec.md` de esta skill):

1. **Historia**: como _(rol)_ quiero _(capacidad)_ para _(beneficio)_.
2. **Criterios de aceptación en formato EARS** — ver `references/ears.md`. Cubrí el caso feliz, los casos borde que salieron de la clarificación y el comportamiento en error.
3. **Reglas de negocio afectadas**: citá por ID (BR-NNN de `.sdd/domain.md`). Si la tarea introduce una regla nueva, agregala allí PRIMERO con su número y citala.
4. **Fuera de alcance**: explícito — lo que NO se hace en esta tarea.
5. **Impacto en arquitectura/catálogo**: módulos de components.md afectados, convenciones que aplican, si requiere ADR.
6. **Métrica de impacto**: qué se mide, baseline actual, resultado esperado, cómo se mide después. **Si no existe el baseline, instrumentar la métrica debe ser el PRIMER paso del plan.** Si no hay métrica cuantificable, declaralo y justificá el impacto cualitativo.

## El gate

Corré `sdd task status <id> specified` — **le abre spec.md al dev en su editor**. Avisale que la tiene abierta, esperá su aprobación en el chat, y marcá la línea de aprobación en spec.md. Recién entonces seguí con la skill **sdd-plan**.
