# ADR 0004 — `sdd impact` es advertencia, no gate

- **Fecha:** 2026-06-12 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/001

## Contexto

`sdd impact <ruta|sistema|recurso>` (Fase 2) reporta quién consume/depende de algo según el grafo. La calidad de ese reporte depende de heurísticas (detección de consumos por regex, matching método+ruta normalizada, resolución de destinos simbólicos `env:*`) que recién en Fase 3 quedan más completas. Había que decidir si ese reporte puede bloquear commits/pipelines o es solo informativo.

## Decisión

`sdd impact` **advierte**, no es gate: informa impacto probable pero no falla builds, no bloquea commits ni PRs. La confianza para convertirlo en un gate (si alguna vez se hace) se gana con uso real, no se asume de entrada.

## Alternativas consideradas

- **Gate duro desde v1** (fallar CI/commit si se detecta impacto sin ack): descartado — alto riesgo de falsos positivos/negativos mientras el matching es heurístico y los destinos `env:*` no están resueltos hasta Fase 3; un gate ruidoso entrena a los devs a ignorarlo o bypassearlo.
- **No reportar nada** (solo documentación pasiva): descartado — no cumple el objetivo central del requisito ("¿a quién impacto si toco esto?" en segundos).

## Consecuencias

- El valor de Fase 2 depende de que los devs lean y confíen voluntariamente en el reporte de `sdd impact` durante el análisis de sus tareas SDD (integración con `sdd-analyze`).
- Queda como deuda/pendiente evaluar a futuro un modo `--strict` opt-in una vez que la calidad de datos del grafo esté validada con uso real — explícitamente fuera de alcance de Fases 1-3 (ver sección 4 del requisito).
