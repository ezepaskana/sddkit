# Ejemplo: clasificación y artefactos por tipo (el estándar de concisión)

## `simple` — "el output de `sdd doctor` dice 'hoks' en vez de 'hooks'"

Anuncio (una línea): _"Lo trato como `simple` (riesgo bajo): typo en un archivo, lo arreglo con un test que lo fije. Decime si preferís otro tipo."_ → `sdd task type 012 simple`

`nota.md` completa (único artefacto, único gate):

- **Qué entendí:** el reporte de hooks imprime "hoks", con typo.
- **Qué voy a hacer:** corregir el literal en `src/commands/doctor.js`.
- **Cómo se verifica:** `cmd: sdd test`

## `bug` — "`sdd task verify` falla en pasos que sí tienen Verificación"

Anuncio: _"Lo trato como `bug` (riesgo bajo): reproduzco, test rojo, fix. Decime si preferís otro tipo."_ → `sdd task type 013 bug`

`reproduccion.md` (reemplaza a la spec):

1. Escribir un paso cuyos tests estén en sub-lista `a)` / `b)` y correr `sdd task verify 013 2`.
- **Esperado:** ejecuta la verificación del paso. **Observado:** `Error: el paso 2 no tiene línea de Verificación`.
- **Test de regresión:** `task.test.js::stepBlock corta en sub-listas alfabéticas` — falla antes del fix. `cmd: sdd test`

## `refactor` — "extraer el parseo de plan.md a su propio módulo"

Anuncio: _"Lo trato como `refactor` (riesgo alto: `task.js` tiene 6 dependientes): corro `sdd impact`, tests verdes antes y después, sin EARS."_ → `sdd task type 014 refactor --riesgo=alto`

`analysis.md` (extracto — el resto es `N/A` justificado):

- **Problema real:** `task.js` mezcla parseo, comandos y salida; 480 líneas, 3 funciones de parseo duplican el skip de fences.
- **Impacto (`sdd impact src/commands/task.js`):** 6 dependientes, todos internos; sin consumidores externos.
- **Riesgos:** `stepBlock` tiene semántica sutil (LEARNINGS tarea 004) — se mueve tal cual, sin "mejoras" de paso.
- **Métrica:** `N/A: refactor sin cambio de comportamiento observable; el criterio son los 213 tests verdes antes y después.`

## Anti-ejemplo

Clasificar `feature` "por las dudas" un cambio de un archivo: genera analysis + spec + plan para tres líneas de código. Si dudás entre `simple` y otro tipo, no es `simple` — pero tampoco infles: elegí el tipo real y ajustá el **riesgo**.
