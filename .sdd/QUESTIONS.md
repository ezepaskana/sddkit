# Preguntas pendientes del proyecto

> Regenerado a mano en la tarea 020 (2026-08-11). **Agente:** intentá responder estas preguntas en este orden de fuentes: 1) la documentación existente listada abajo, 2) el código, 3) preguntándole al dev. Al responder una, escribí la respuesta en su archivo de origen (indicado al final de cada línea) y marcá el checkbox allí — este archivo se regenera desde esos docs.

## Fuentes de documentación existente (leelas primero)

- `README.md`
- `.sdd/decisions/` (ADRs — 0015 y 0016 explican la forma actual del repo)

## Preguntas abiertas (4)

- [ ] ¿Las 7 skills son la partición correcta del flujo, o hay una que siempre se lee junto con otra?  _(en .sdd/c4/components.md)_
- [ ] ¿Falta algún contenedor que no se deduce del repo (workers, crons, lambdas)?  _(en .sdd/c4/containers.md)_
- [ ] ¿El glosario cubre los términos que un dev nuevo malinterpretaría?  _(en .sdd/domain.md)_
- [ ] ¿Las reglas de negocio listadas son todas las vigentes? ¿Falta alguna que hoy solo vive en la cabeza de alguien?  _(en .sdd/domain.md)_

## Resueltas en la tarea 020

- Actores y sistemas externos (`.sdd/c4/context.md`): respondidas — el dev con Claude Code y la forja del repo; sin integraciones en runtime.
- Rol del módulo `(raíz)` y responsabilidad de los contenedores: ya no aplican — el repo dejó de tener código (ADR-0016).
- Preguntas de las capas `commands` y `lib`: retiradas — esas capas eran `src/commands` y `src/lib`, borradas en esta tarea. Sus rules en `.claude/rules/` quedaron muertas (BR-076).
