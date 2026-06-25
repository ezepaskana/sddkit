# Retro -- tarea 007: Invertir el orden en sdd-close

> Creada el 2026-06-25.

## Resultado de la metrica de impacto

- **Baseline (de analysis.md):** Tarea 006: PR mergeado y branch eliminado antes de que retro+LEARNINGS estuvieran commiteados.
- **Resultado medido despues:** El flujo ahora es retro → commit → push → PR. El PR no existe hasta que la retro esta commiteada. Verificado en esta misma tarea (la 007 usa el flujo corregido).
- **Se cumplio lo esperado:** Si.

## Que anticipo bien la spec y que no

- **Bien:** El alcance fue exacto: 1 archivo de skill, reordenar secciones. Sin sorpresas.
- **Bien:** El ejemplo de retro (`retro-ejemplo.md`) no necesito cambios — no mencionaba el orden push/PR vs retro.

## Desvios del plan

- **Paso 1 (rama):** Requirio stash porque habia cambios locales de la tarea 006 (index.json, etc). Resuelto sin drama.
- **Sin otros desvios.**

## Aprendizajes accionables

- **El PR es el ultimo artefacto, no el primero:** si el flujo crea el PR antes de que todo este listo, el dev lo mergea y quedan archivos huerfanos. Regla: cualquier artefacto que el dev pueda "cerrar" (PR, issue, deploy) debe crearse solo cuando TODO el trabajo previo esta commiteado. Aplica a futuros flujos que agreguen pasos post-ejecucion.

## Algo para el catalogo, el dominio o la arquitectura?

- No se requieren nuevas BRs, ADRs ni cambios en C4.
