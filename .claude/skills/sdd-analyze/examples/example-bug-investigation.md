# Ejemplo: investigación de bug (read-only)

**Prompt del usuario:**

> `/sdd-analyze por qué sdd task verify falla con "no tiene línea de Verificación" en pasos que claramente la tienen?`

---

## Qué está pasando (comportamiento observado)

`sdd task verify <id> <n>` reporta que un paso **no tiene línea de Verificación**, aunque al abrir `plan.md` el paso tiene su `**Verificación:**` bien escrita. El mismo síntoma aparece en `sdd task brief`: el subagente recibe un "Tu paso" cortado a la mitad, sin llegar a los tests ni a la verificación.

No falla en todos los pasos: falla justo en los pasos cuyos tests están descritos como una **sub-lista numerada** (`1.` / `2.` / ...) en vez de guiones (`- `).

## Por qué pasa (causa raíz)

El extractor `stepBlock` (en `src/commands/task.js`), que usan tanto `sdd task verify` como `sdd task brief`, recorta el bloque de un paso siguiendo las líneas indentadas que arrancan con `- ` **o** con `N. ` — regex `/^\s+(-|\d+\.) /`.

El problema: cuando un paso describe sus tests con una **sub-lista numerada**, la extracción se trunca **antes** de llegar a la línea `**Verificación:**`. El bloque queda cortado a mitad de los tests, así que:

- `sdd task verify` no encuentra `Verificación:` → falla con "no tiene línea de Verificación".
- `sdd task brief` entrega al subagente un "Tu paso" incompleto.

Esto está documentado como aprendizaje en `.sdd/LEARNINGS.md` (entrada de la **tarea 004**): el fix fue extender el regex de `stepBlock` para que siga también líneas `N. `. Si el síntoma reaparece, lo más probable es que haya un **nuevo formato de sub-lista** que el regex todavía no contempla (por ejemplo `a)` / `b)`), que vuelve a truncar el bloque antes de la verificación.

## Archivos involucrados

- `src/commands/task.js` → función `stepBlock` (regex `/^\s+(-|\d+\.) /`): el truncado del bloque ocurre acá.
- Consumidores del bloque: los paths de `sdd task verify` y `sdd task brief` dentro del mismo archivo.
- `.sdd/LEARNINGS.md` → entrada de la tarea 004 que describe exactamente este modo de falla y deja la receta para extenderlo.

> Conviene confirmar las líneas exactas con `git blame` sobre `stepBlock` para ver si el regex ya incluye el caso numerado o si una edición posterior lo revirtió.

## Fix sugerido (descrito, no aplicado)

1. Reproducir con un `plan.md` cuyo paso use una sub-lista con el formato sospechoso (p. ej. `a)` / `b)`) y confirmar el truncado.
2. Extender el regex de `stepBlock` para que también siga ese formato de marcador de sub-lista, manteniendo el comportamiento actual para `- ` y `N. `.
3. Agregar un test de regresión con un paso que mezcle sub-listas numeradas/alfabéticas y verificar que `stepBlock` llega hasta `**Verificación:**`.
4. Si el formato nuevo se vuelve común, anotarlo en la entrada de LEARNINGS para la próxima.

*(No edité nada — esto es una propuesta. La aplicación va por `/sdd-task`.)*

## Handoff

> ¿Listo para arreglarlo? Corré `/sdd-task` con esta descripción: "Extender el regex de `stepBlock` en `src/commands/task.js` para que `sdd task verify`/`sdd task brief` no trunquen el bloque del paso cuando los tests se describen con sub-listas \<formato\>, con test de regresión".
