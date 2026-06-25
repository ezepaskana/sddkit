# Spec — tarea 007: Invertir el orden en sdd-close: la retro (retro.md, LEARNING…

> Estado: borrador. El agente completa este archivo con la spec formal. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como desarrollador usando el flujo SDD, quiero que el PR se cree recién después de completar la retro y cosechar aprendizajes, para que el PR contenga todo y no pueda mergearse incompleto.

**Criterios de aceptación (formato EARS):**

- CUANDO el orquestador invoca sdd-close tras completar todos los pasos, EL SISTEMA DEBE guiar primero la retro completa (retro.md: metrica, desvios, aprendizajes) y la cosecha (LEARNINGS.md, promociones a catalogo/dominio/C4), commitear esos artefactos, y recien entonces hacer push + PR.
- CUANDO el orquestador commitea la retro, EL SISTEMA DEBE incluir retro.md, LEARNINGS.md y cualquier archivo de promocion (domain.md, C4, ADRs) en el mismo commit (o un commit adicional antes del push).
- CUANDO el PR se crea (via `sdd task close` o manualmente), EL SISTEMA DEBE garantizar que el branch ya contiene los commits de retro+learnings, de forma que el PR incluya todo el trabajo de la tarea.

**Reglas de negocio afectadas**: Ninguna BR existente se modifica. BR-041 (creacion de PR en `sdd task close`) sigue vigente — solo cambia el momento en que se invoca dentro del flujo de la skill.

**Fuera de alcance:**

- No se modifica el CLI `sdd task close` (`src/commands/task.js`) — la logica de push-check y PR queda intacta.
- No se agrega logica programatica de ordenamiento — el cambio es instruccional en las skills.
- No se cambia el flujo de sdd-execute ni el protocolo de subagentes.

**Impacto en arquitectura/catalogo:** Ninguno. 2 archivos de skills:
- `skills/sdd-close/SKILL.md` — reordenar: retro primero, push+PR despues
- `skills/sdd-close/examples/retro-ejemplo.md` — actualizar si menciona el orden anterior

---
_Aprobación del dev: aprobada (2026-06-24)_
