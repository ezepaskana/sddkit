# Design — tarea 021

> Detalle técnico del plan: qué se toca y en qué orden. Solo lo escribe una tarea de riesgo alto.

## Impacto en arquitectura y catálogo

El cambio es de **contenido**, no de estructura: no aparecen módulos nuevos en `.sdd/c4/components.md`. Toca las 6 skills y sus templates, más `.sdd/domain.md`, el bloque gestionado de `CLAUDE.md` y `hooks/`.

Una decisión aceptada se matiza: la tarea 020 declaró que el plugin no depende de ninguna runtime (ADR-0016, BR-079). termaid es Python, así que entra como **dependencia opcional con degradación** — necesita ADR-0017, no una corrección silenciosa.

## Archivos por área

| Área | Archivos |
|---|---|
| Reglas | `.sdd/domain.md` (BR-063 reescrita; BR-058/059 actualizadas; BR nuevas de artefactos, topes y termaid), `.sdd/decisions/0017-*.md` |
| Templates | nuevos: `sdd-analyze/templates/analysis.md`, `sdd-specify/templates/spec.md`, `sdd-plan/templates/plan.md`, `sdd-plan/templates/design.md` · borrar: `sdd-task/templates/nota.md`, `sdd-task/templates/reproduccion.md`, `sdd-close/templates/retro.md` |
| Skills | `sdd-task/SKILL.md` + `references/artefactos.md`, `sdd-analyze`, `sdd-specify`, `sdd-plan`, `sdd-execute`, `sdd-close` |
| Presentación | `references/artefactos.md` (volcado en terminal + termaid), bloque de `CLAUDE.md`, `.sdd/config.json` |
| Arranque | `hooks/hooks.json`, `hooks/termaid.md` (nuevo) |
| Docs | `README.md`, `.sdd/c4/components.md` |

## Dependencias entre pasos

- Las reglas van **primero**: las skills las citan por ID, y escribir la skill antes obliga a volver.
- Los templates son independientes entre sí (paralelizables), pero cada skill depende de su template.
- `artefactos.md` es el cuello de botella: define formato canónico, estados, gates, volcado y termaid. Lo tocan cuatro pasos, así que se escribe de una sola vez.
- La documentación al dev va al final: describe el estado final, no el intermedio.

## Riesgo de auto-modificación

Esta tarea reescribe las skills que la están ejecutando. Los cambios recién aplican en una sesión nueva, así que el flujo de esta misma tarea sigue con las reglas viejas hasta terminar — y su `plan.md` queda escrito en el formato nuevo aunque la skill que lo generó era la vieja.

## Rama de trabajo

Se continúa en `task/019-vamos-a-actualizar-esto-ya-que` por decisión del dev (2026-08-14): la 020 se commitea primero como punto de retorno y la 021 sigue en la misma rama, con un único PR para las dos. Motivo: la prueba end-to-end de la 020 (su paso 11) no tiene sentido hasta que la 021 termine de rediseñar el flujo. **No** se abre rama nueva ni se inserta un Paso 1 de `git checkout -b`.
