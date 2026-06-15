# Retro — tarea 009: detección y reacción ante fallas en sdd-analyze

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-15.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** 0% — el texto de la pregunta 7 (detección + reacción ante fallas) no existía en ninguna de las 6 ubicaciones objetivo (`sdd-analyze/SKILL.md`, `sdd-specify/templates/spec.md`, `analisis-ejemplo.md`, cada uno en `skills/` y `.claude/skills/`).
- **Resultado medido después:** 100% — `diff` entre `skills/...` y `.claude/skills/...` da vacío para los 3 archivos tocados (sin drift, BR-032) y `grep` confirma el texto de la pregunta 7 en `sdd-analyze/SKILL.md` (punto 7 del bloque "Análisis"), el bullet espejo en `spec.md` (sección "Análisis crítico") y la respuesta de muestra ("Pregunta 7") en `analisis-ejemplo.md`.
- **¿Se cumplió lo esperado?:** Sí, 100% en las 6 ubicaciones. El impacto cualitativo (specs futuras desde la tarea 010 responden explícitamente detección + reacción, o "no aplica") solo se podrá confirmar revisando las próximas specs.

## Qué anticipó bien la spec y qué no

- **Bien:** el alcance (3 archivos × 2 copias), la redacción exacta de la pregunta 7 (acordada con el dev en clarificación, P3) y el patrón de verificación `diff && grep` por archivo-par. Los 3 pasos `[P]` corrieron en paralelo sin bloqueos ni preguntas de vuelta de los subagentes.
- **No anticipado:** el formato `` `cmd: diff ... && grep ...` `` (línea de Verificación envuelta en backticks) hace que `sdd task verify` caiga SIEMPRE en modo "manual" (exit 3) en vez de ejecutar el comando literal — ver "Aprendizajes accionables".

## Desvíos del plan

Ninguno en el contenido. El único desvío fue de *herramienta*: `sdd task verify 009 {1,2,3}` devolvió "verificación manual" para los 3 pasos (exit 3) en vez de ejecutar el `cmd:` y devolver su exit code. El orquestador corrió los 3 comandos `diff && grep` manualmente — los 3 dieron verde — y marcó los checkboxes con esa evidencia.

## Aprendizajes accionables

- **Una línea `Verificación:` envuelta en backticks (`` `cmd: ...` ``) NUNCA se ejecuta como `cmd:` en `sdd task verify`**: el regex de `task.js` (`/Verificación:\*{0,2}\s*(.+)$/m`) captura el backtick inicial, así que `v.startsWith('cmd:')` es falso y cae a "verificación manual" (exit 3) aunque el contenido sea un comando perfectamente ejecutable. Este patrón (`` `cmd: ...` ``) ya se usó en los planes de las tareas 006, 007, 008 y 009 — en los 4 casos `sdd task verify` degradó a manual sin que nadie lo notara como bug (el orquestador corrió el comando a mano igual). Dos arreglos posibles: (a) en `task.js`, hacer `v.replace(/^`+|`+$/g, '')` antes de chequear `startsWith('cmd:')`; o (b) en `sdd-plan`, escribir `Verificación: cmd: ...` SIN backticks alrededor de todo el `cmd:` (los backticks van solo en fragmentos de código dentro del comando, no rodeando `cmd:` completo). Pendiente: el dev decide si vale un fix rápido a `task.js` o si basta con cambiar la convención de `sdd-plan`. _(tarea 009)_

## ¿Algo para el catálogo, el dominio o la arquitectura?

Nada — sin convención nueva (no aplica `sdd decide`), sin BR nueva (confirmado en spec.md: el cambio es contenido de skills, no comportamiento del CLI), sin ADR, sin cambio estructural en `.sdd/c4/`. El propio cambio de esta tarea (pregunta 7 en `sdd-analyze` + bullet espejo en `spec.md`) ya es la "promoción" — queda vigente para toda tarea desde la 010.
