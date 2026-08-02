# Analysis — tarea 015: Que el bloque generado por sdd scan o las skills instruyan a…

> Estado: borrador. Su presupuesto es de **≤ 350 palabras** — densidad, no volumen: una línea por punto (dos solo si hay evidencia dura: `archivo:línea`, número medido). `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique. El dev debe APROBARLO antes de especificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **Problema real que resuelve:** `ui.opener` (`.sdd/config.json`) solo lo usa el CLI al abrir artefactos (`src/commands/task.js:195,265,345,371`); cuando el dev le pide al agente "mostrame X", el agente usa el IDE conectado (p.ej. PyCharm vía plugin JetBrains) e ignora el opener configurado.
- **¿Ya existe?** No: `grep opener` en `.claude/skills/` y en `buildBlock` (`src/lib/agentsmd.js:8-40`) da vacío — ninguna instrucción al agente lo menciona.
- **Alternativa más simple:** una línea manual en el CLAUDE.md de cada repo — no escala (el requisito pide que aplique a todos los repos) y se pierde fuera del bloque gestionado.
- **Supuestos del dev que podrían no ser ciertos:** que las skills son el lugar — no: las skills cargan solo al invocarse; "mostrame un archivo" pasa fuera de ellas. El bloque de CLAUDE.md carga en toda sesión → es el único lugar efectivo.
- **Riesgos y efectos secundarios:** `buildBlock(stack, cat, date)` no recibe config; texto incondicional ("si `ui.opener` existe, usalo") evita pasarla y tolera cambios de config sin re-scan. Repos existentes lo reciben con `sdd sync`/`sdd scan` (BR-031).
- **¿Qué pasa si NO se hace?** El opener queda como config engañosa: aparenta definir "la herramienta para mostrar archivos" pero solo cubre los opens automáticos del CLI.
- **Detección y manejo de fallas en uso real:** N/A: es texto instructivo; si el opener falla, el agente lo ve en el error de Bash y degrada solo.

**Recomendación:** `proceder` — cambio chico en `buildBlock` + test, alto valor de coherencia config↔comportamiento.

## Preguntas de clarificación

- [x] P1: ¿Instrucción incondicional en el bloque (texto fijo: "si `.sdd/config.json → ui.opener` existe, usalo") o condicional al config al momento del scan? Recomiendo incondicional: el bloque queda estático y sobrevive cambios de config.
  - Respuesta: incondicional (dev aprobó la recomendación, 2026-08-01).
- [x] P2: ¿Ubicación: línea nueva en `## Preferencias de respuesta` o sección propia? Recomiendo línea en Preferencias — no amerita sección.
  - Respuesta: línea en Preferencias de respuesta (dev aprobó la recomendación, 2026-08-01).

## Métrica de impacto

- **Métrica:** N/A: cambio cualitativo de UX (app correcta al abrir archivos); no hay dato instrumentable.
- **Baseline actual:** N/A.
- **Resultado esperado:** N/A.
- **Cómo se mide después:** N/A.

---
_Aprobación del dev: aprobado 2026-08-01 (con recomendaciones P1/P2)_
