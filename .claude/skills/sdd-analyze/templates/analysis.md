# Analysis — tarea __ID__: __TITLE__

> Estado: borrador. Su presupuesto es de **≤ 350 palabras** — densidad, no volumen: una línea por punto (dos solo si hay evidencia dura: `archivo:línea`, número medido). `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique. El dev debe APROBARLO antes de especificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **Problema real que resuelve:** …
- **¿Ya existe?** (algo en el repo o una librería que lo resuelva total/parcialmente) …
- **Alternativa más simple** (80% del valor con 20% del esfuerzo): …
- **Supuestos del dev que podrían no ser ciertos:** …
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento): …
- **¿Qué pasa si NO se hace?** …
- **Detección y manejo de fallas en uso real:** … _(`N/A: no introduce lógica nueva que pueda fallar` es válido)_

**Recomendación:** `proceder | proceder con cambios | reconsiderar` — motivo en una línea. Si es "reconsiderar", discutilo con el dev ANTES de seguir: no construyas algo que creés incorrecto sin decirlo.

## Preguntas de clarificación

_(solo las que cambian el alcance o invalidan el enfoque, en tandas razonables; la respuesta del dev va al lado de cada una)_

- [ ] P1: …
  - Respuesta: …

## Métrica de impacto

> Si el cambio no admite métrica cuantificable: `N/A: <motivo>` — no forzar una artificial.

- **Métrica:** … _(p.ej. latencia P95, errores/día, tiempo de tarea del usuario)_
- **Baseline actual:** … _(medir ANTES de implementar; si no existe el dato, instrumentarla es el PRIMER paso del plan)_
- **Resultado esperado:** … _(número o dirección concreta)_
- **Cómo se mide después:** … _(query, dashboard, log, test)_

---
_Aprobación del dev: pendiente_
