# Analysis — tarea 007: Invertir el orden en sdd-close: la retro (retro.md, LEARNING…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de especificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** En la tarea 006 el dev mergeó el PR y eliminó el branch antes de que la retro y LEARNINGS estuvieran commiteados. Causa raíz: sdd-close hace push+PR ANTES de la retro, así que el dev ve un PR "listo" y lo mergea, pero los artefactos de cierre quedan huérfanos.

- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** No. El orden actual en `skills/sdd-close/SKILL.md` es explícito: "Push y Pull Request" va antes de "Retro completa".

- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Esto YA es la alternativa más simple: reordenar secciones en 2 archivos de skill (SKILL.md y ejemplo). Se evaluó PR draft + mark ready, pero agrega complejidad sin eliminar el problema de raíz (nada impide mergear un draft).

- **Supuestos del dev que podrían no ser ciertos:** Ninguno problemático. El reordenamiento es directo y no tiene contraindicaciones.

- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento): Nulo. Solo se reordenan secciones en documentación de skills. El CLI `sdd task close` no cambia.

- **¿Qué pasa si NO se hace?** El bug se repite: en cada tarea futura el dev puede mergear el PR antes de que la retro esté lista, perdiendo artefactos de cierre.

- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (detección) y cómo debería reaccionar el sistema (manejo)?** No aplica: cambio puramente instruccional.

**Recomendación:** `proceder` — Fix directo de un bug de flujo ya verificado en producción (tarea 006). Riesgo cero, alcance mínimo (2 archivos .md).

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: ¿Se evaluaron alternativas? (brainstorm previo en la conversación)
  - Respuesta: Sí. Opción A (invertir orden) elegida por el dev sobre B (draft+ready) y C (dos PRs). A elimina el problema de raíz con cambio mínimo.

## Métrica de impacto

> Si el cambio admite una métrica cuantificable, definila. Si no aplica, declaralo explícitamente — no forzar una métrica artificial.

- **Métrica:** No aplica cuantitativamente. Indicador cualitativo: que la próxima tarea SDD no permita mergear un PR sin retro+learnings incluidos.
- **Baseline actual:** Tarea 006: PR mergeado sin retro ni learnings.
- **Resultado esperado:** PR incluye retro+learnings antes de que el dev lo vea.
- **Cómo se mide después:** Verificar en la próxima tarea que el PR contiene retro.md.

---
_Aprobación del dev: pendiente_
