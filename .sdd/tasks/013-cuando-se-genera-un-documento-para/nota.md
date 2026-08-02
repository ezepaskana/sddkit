# Nota — tarea 013: Cuando se genera un documento para que el dev lo lea se abre…

> Tarea de tipo `simple`: este es el ÚNICO artefacto (no hay analysis/spec/plan). Su presupuesto es de **≤ 100 palabras**. Un solo gate: el dev lee esto, da el ok, y recién ahí implementás con tests. `N/A: <motivo>` es válido donde no aplique.
>
> Si durante la ejecución el alcance se complejiza, anuncialo y re-clasificá: `sdd task type 013 <tipo>`.

- **Qué entendí:** los docs que sddkit abre para el dev usan la app por defecto del SO; el dev quiere elegir la herramienta.
- **Qué voy a hacer:** nueva config `.sdd/config.json → ui.opener` (comando, ej. "code", "subl", "open -a TextEdit"): si está seteada, `openFile` ejecuta `<opener> "<archivo>"`; si no, comportamiento actual. Archivos: `src/lib/open.js`, `src/lib/open.test.js` (nuevo), callers que pasan root.
- **Cómo se verifica:** `cmd: node --test --test-reporter=tap src/lib/open.test.js` + suite completa.

---
_Aprobación del dev: aprobada (2026-08-01, en chat)_
