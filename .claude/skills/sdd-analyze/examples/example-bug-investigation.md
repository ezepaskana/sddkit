# Ejemplo: investigación de bug (standalone, read-only)

> `/sdd-analyze ¿por qué sdd task verify falla con "no tiene línea de Verificación" en pasos que claramente la tienen?`

## Qué está pasando

`sdd task verify <id> <n>` reporta que el paso no tiene línea de Verificación aunque `plan.md` la tiene bien escrita. Mismo síntoma en `sdd task brief`: el subagente recibe un "Tu paso" cortado a la mitad. No falla en todos: solo en los pasos cuyos sub-ítems usan un marcador de lista que el extractor no contempla.

## Por qué pasa (causa raíz)

`stepBlock` (`src/commands/task.js`) recorta el bloque siguiendo líneas indentadas que arranquen con `- ` o `N. ` — regex `/^\s+(-|\d+\.) /`. Con cualquier otro marcador (p. ej. `a)` / `b)`) el bloque se **trunca antes** de llegar a `**Verificación:**`, así que:

- `sdd task verify` no la encuentra → falla.
- `sdd task brief` entrega un paso incompleto al subagente.

`.sdd/LEARNINGS.md` (tarea 004) ya documenta este modo de falla: el fix de entonces fue extender el regex para `N. `. La reaparición sugiere un formato nuevo de sub-lista.

## Archivos

- `src/commands/task.js` → `stepBlock` (el truncado ocurre acá) y sus dos consumidores, `verify` y `brief`.
- `.sdd/LEARNINGS.md` → entrada de la tarea 004 con la receta.

## Fix sugerido (descrito, no aplicado)

1. Reproducir con un `plan.md` cuyo paso use el marcador sospechoso.
2. Extender el regex de `stepBlock` a ese formato, conservando `- ` y `N. `.
3. Test de regresión con sub-listas mezcladas que verifique que el bloque llega hasta `**Verificación:**`.

> ¿Listo para arreglarlo? Corré `/sdd-task` con: "que `stepBlock` no trunque el paso cuando los sub-ítems usan \<formato\>, con test de regresión". Es un `bug`: reproducción + test rojo + fix.
