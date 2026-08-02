# ADR 0013 — sddkit apunta solo a Claude (Claude-only)

- **Fecha:** 2026-08-01 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/011

## Contexto

sddkit generaba un bloque gestionado en `AGENTS.md` (formato genérico multi-agente) más una regla aparte para Cursor (`src/templates.js`), pensado para servir a cualquier agente lector. En la práctica el único agente usado es Claude, y mantener generalidad multi-agente cuesta peso de documento (contrato más largo, prosa genérica) sin beneficio real. El dev pidió simplificar a un único target.

## Decisión

- Reemplaza el soporte multi-agente: ya no se genera `AGENTS.md` genérico ni la regla de Cursor.
- El bloque gestionado pasa a vivir en `CLAUDE.md` (`init`/`scan`/`setup`/`decide`), con progressive disclosure: detalle en las skills, no en el bloque.
- Si existe un bloque gestionado previo en `AGENTS.md`, el sistema lo migra a `CLAUDE.md` y lo limpia de `AGENTS.md`.
- `src/templates.js` (regla de Cursor) se elimina; no se genera prosa multi-agente en ningún artefacto.
- BR-060 es la regla vinculante de esta decisión.

## Consecuencias

- Menos superficie de mantenimiento: un solo formato de bloque gestionado, un solo archivo destino.
- Repos que dependían de la regla de Cursor pierden ese soporte sin reemplazo (fuera de alcance de la tarea 011).
- Docs vivos de este mismo repo se migran como demostración (CLAUDE.md, no AGENTS.md); tareas y ADRs viejos no se reescriben.
