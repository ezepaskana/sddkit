# Analysis — tarea 020: sddkit deja de ser CLI npm y pasa a ser plugin de Claude Code

> Presupuesto ≤ 350 palabras. Aprobación del dev requerida antes de especificar.

## Análisis crítico

- **Problema real que resuelve:** hoy adoptar sddkit exige `npm link` + recordar `sdd setup` vs `sdd init`. Fricción de instalación y de mantenimiento (`sdd sync` tras cada update). Como plugin, el dev no ejecuta nada.
- **¿Ya existe?** Sí: los plugins de Claude Code distribuyen skills/hooks nativamente. `src/lib/skills.js`, `setup.js`, `sync.js`, `uninstall.js` (~450 ln) reimplementan a mano lo que el plugin manager ya hace.
- **Alternativa más simple:** publicar a npm de verdad (`npm i -g sddkit`) y quedarse con el CLI. Descartada: no elimina el paso manual del dev, que es el requisito.
- **Supuestos del dev que podrían no ser ciertos:** el requisito nombra `setup.json`; el repo ya usa `.sdd/config.json`. Se mantiene ese nombre (ver P2).
- **Riesgos y efectos secundarios:** se borran **12.071 líneas** de `bin/` + `src/` y todos sus tests. Tres capacidades quedan sin implementación determinista y pasan a depender del criterio del agente: (1) conteo de variantes de patrones que alimenta el catálogo y el ratchet de deuda legacy, (2) los gates de `validate` (drift, placeholders, Mermaid, bullets >200), (3) los gates de tarea (`verify` por exit code, rama obligatoria, retro obligatoria). Un exit 1 no es negociable; una instrucción en un SKILL.md sí. **Es una pérdida de garantía aceptada explícitamente por el dev**: si se necesitan, se reconstruyen después.
- **¿Qué pasa si NO se hace?** sddkit sigue siendo inadoptable fuera de la máquina del autor.
- **Detección y manejo de fallas en uso real:** el hook `SessionStart` valida la config al abrir el repo; si falta o está incompleta, el agente inicia la conversación de configuración.

**Recomendación:** `proceder con cambios` — el alcance es correcto, pero la pérdida de los gates deterministas debe quedar registrada como ADR para no redescubrirla.

## Preguntas de clarificación

- [x] P1: ¿el CLI sobrevive en alguna forma (embebido, scripts sueltos)?
  - Respuesta: **no**. Se eliminan A (instalador), B (validate/scan/docs/publish/test/check/impact), C (máquina de estados de tareas) y D (context/find/doctor/decide). "Si los necesitamos los crearemos de nuevo."
- [x] P2: ¿el archivo de config se llama `setup.json` como dice el requisito?
  - Respuesta: pendiente de confirmar en la spec — el repo ya usa `.sdd/config.json`.
- [x] P3: ¿dónde vive la detección de config faltante?
  - Respuesta: hook **`SessionStart`** del plugin. Corre siempre al abrir el repo; el dev no dispara nada.
- [x] P4: ¿qué pasa con `sdd-test` y `sdd-bootstrap`?
  - Respuesta: **ambas mueren**, junto con los templates `run-tests.mjs` / `run-checks.mjs`. El agente corre los tests como sabe.
- [x] P5: ¿qué pasa con la tarea 019 (progressive disclosure), 15/16 y sin commitear?
  - Respuesta: se **absorbe** en la 020 como insumo. `src/lib/layers.js` se borra; la funcionalidad (rules por capa, CLAUDE.md por módulo) la genera el agente.
- [x] P6: ¿sddkit se distribuye por marketplace propio o instalación local desde el repo?
  - Respuesta: **las dos**. `.claude-plugin/marketplace.json` en este repo para terceros, más instalación local desde el clon para el desarrollo del propio sddkit.

## Métrica de impacto

- **Métrica:** pasos manuales del dev para dejar un repo nuevo configurado con sddkit.
- **Baseline actual:** 3 (`npm link` → `sdd setup` → responder decisiones de catálogo).
- **Resultado esperado:** **0** — solo responder preguntas si el agente las plantea.
- **Cómo se mide después:** en un repo limpio, abrir sesión con el plugin instalado y verificar que `.sdd/` queda completo sin haber tipeado ningún comando.

---
_Aprobación del dev: pendiente_
