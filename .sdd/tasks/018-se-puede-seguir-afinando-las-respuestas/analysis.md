# Analysis — tarea 018: cero jerga sin traducir y opciones que digan qué se gana

> Estado: borrador. Su presupuesto es de **≤ 350 palabras** — densidad, no volumen: una línea por punto (dos solo si hay evidencia dura: `archivo:línea`, número medido). `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique. El dev debe APROBARLO antes de especificar.

## Análisis crítico

- **Problema real que resuelve:** la tarea 017 acortó la respuesta, pero corto ≠ legible. El caso que lo mostró: un resumen de ~120 palabras con "Z3", "BR-004", "ZoneIndicator" y una lista final de la que el dev no sabía qué se esperaba que contestara. **La compresión sin traducción produce jerga densa.**
- **¿Ya existe?** No. BR-064 fija cantidad (≤ 150 palabras, 2-4 opciones) pero **nada sobre legibilidad ni sobre el cierre**. `references/formatos-respuesta.md` propone opciones que son tareas ("ver los dependientes"), no resultados.
- **Alternativa más simple:** subir el límite de palabras. Rechazada: el problema no era la longitud sino que cada línea asumía contexto que el dev no tiene.
- **Supuestos del dev que podrían no ser ciertos:** ninguno detectado — el diagnóstico es verificable en la respuesta citada.
- **Riesgos y efectos secundarios:** traducir cada código gasta palabras del presupuesto de 150 (mitigación: la traducción son 3-4 palabras y reemplaza prosa, no se suma). Segundo riesgo: sonar condescendiente — la regla aplica a **códigos internos del agente** (IDs de roadmap, BR-NNN, nombres de clase inventados), nunca al vocabulario técnico que el dev ya maneja.
- **¿Qué pasa si NO se hace?** El resumen queda ilegible para quien no leyó la nota y el menú no se puede contestar: el dev vuelve a pedir el detalle y se pierde lo ganado en 017.
- **Detección y manejo de fallas en uso real:** el dev responde "no entiendo X" o "¿qué esperás que conteste?".

**Recomendación:** `proceder` — es el complemento faltante de BR-064: legibilidad y accionabilidad, no volumen.

## Preguntas de clarificación

- [x] P1: ¿Qué le exijo al resumen? — **Respuesta:** las dos cosas: cero códigos sin traducir + cerrar con pregunta concreta y qué implica cada opción.
- [x] P2: ¿Qué muestro al proponer pasos? — **Respuesta:** qué gana con cada opción (resultado concreto), no el nombre técnico de la tarea.

## Métrica de impacto

- **Métrica:** códigos sin traducir por resumen + presencia de pregunta explícita de cierre.
- **Baseline actual:** 4 códigos sin traducir (`Z3`, `Z5`, `BR-003`, `BR-004`) y 0 preguntas en la respuesta citada.
- **Resultado esperado:** 0 códigos sin traducir, 1 pregunta explícita.
- **Cómo se mide después:** leer el próximo resumen del agente y contar.

---
_Aprobación del dev: aprobado 2026-08-02_
