# Retro — tarea 017: respuesta corta con opciones + detalle en archivo

> Autogenerada al cerrar. Creada el 2026-08-02.

## Métrica vs baseline

- **Baseline (de analysis.md) → resultado medido:** ~1.100 palabras en el análisis que motivó la tarea → 50-90 palabras por turno en esta misma sesión, con opciones en cada gate.
- **¿Se cumplió lo esperado?:** sí, por debajo del objetivo de ≤ 150. Falta la prueba real: el primer `/sdd-analyze` standalone con la skill nueva.

## Desvíos del plan

El plan apuntaba a `.claude/skills/sdd-analyze/` (copia instalada) en vez de `skills/` (fuente del paquete, `PKG_SKILLS` en `src/lib/skills.js:7`). Se detectó en el paso 8 y se replicó a ambas; el plan quedó corregido. Sin este ajuste, el próximo `sdd sync` habría borrado los cambios (BR-032, mirror real).

## Aprendizajes accionables

- A `.sdd/LEARNINGS.md`: editar skills en `.claude/skills/` no sirve — la fuente es `skills/`.
- BR-064/065/066 ya escritas en `.sdd/domain.md` antes de la spec.
- Sin ADR ni cambios de C4: no toca estructura.
