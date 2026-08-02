# Nota — tarea 014: El mensaje de sdd sync dice 'ya estás al día' comparando sol…

> Tarea de tipo `simple`: este es el ÚNICO artefacto (no hay analysis/spec/plan). Su presupuesto es de **≤ 100 palabras**. Un solo gate: el dev lee esto, da el ok, y recién ahí implementás con tests. `N/A: <motivo>` es válido donde no aplique.
>
> Si durante la ejecución el alcance se complejiza, anuncialo y re-clasificá: `sdd task type 014 <tipo>`.

- **Qué entendí:** `sdd sync` arma su mensaje comparando versiones y oculta lo que realmente hizo; además menciona AGENTS.md (pre Claude-only).
- **Qué voy a hacer:** el mensaje lista las `actions` reales que devuelve `init` (una por línea), con la versión como encabezado. Archivos: `src/commands/sync.js`, `src/commands/sync.test.js`.
- **Cómo se verifica:** `cmd: node --test --test-reporter=tap src/commands/sync.test.js`

---
_Aprobación del dev: aprobada (2026-08-01, en chat)_
