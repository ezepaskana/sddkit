# Analysis — tarea 017: necesito que siempre me responda en pocas palabras simples, …

> Estado: borrador. Su presupuesto es de **≤ 350 palabras** — densidad, no volumen: una línea por punto (dos solo si hay evidencia dura: `archivo:línea`, número medido). `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique. El dev debe APROBARLO antes de especificar.

## Análisis crítico

- **Problema real que resuelve:** el chat es el canal equivocado para el detalle. Hoy el agente vuelca todo el análisis en la respuesta y el dev no puede leerlo ni contestarlo. Se separa **canal dev** (corto, con diagrama, elegible) de **canal agente** (detallado, persistido).
- **¿Ya existe?** Parcial. El modo tarea tiene presupuesto (`sdd-analyze/SKILL.md:19`, ≤350 palabras) y BR-059 exige presupuesto en todo template. El **modo standalone no tiene ninguno**: `SKILL.md:48-56` solo dice "estructurá según el tipo de pregunta" y `references/formatos-respuesta.md` describe volcados completos (5 formatos, ninguno acota longitud ni entrega incremental). Ese es el hueco.
- **Alternativa más simple:** poner un límite de palabras en standalone. Rechazada: acorta pero no da opciones ni adapta; el dev pidió elegir de a poco.
- **Supuestos del dev que podrían no ser ciertos:** que el detalle se puede persistir siempre. En standalone la skill es **read-only** (`SKILL.md:57-59`): no puede escribir un `.md` extendido sin romper esa restricción. Ver P1.
- **Riesgos y efectos secundarios:** que "corto" degrade a superficial — el detalle debe existir igual, solo no se vuelca; y que el ida y vuelta por opciones alargue tareas simples (mitigación: el menú se ofrece, no se obliga).
- **¿Qué pasa si NO se hace?** El análisis se produce pero no se consume: costo de tokens sin decisión del dev.
- **Detección y manejo de fallas en uso real:** el dev corta y pide otro formato. `sdd validate` puede chequear presupuesto de artefacto, no de respuesta en chat.

**Recomendación:** `proceder con cambios` — el eje no es "responder corto" sino **dos salidas por análisis**: resumen navegable para el dev + detalle para el agente/artefacto.

## Preguntas de clarificación

- [x] P1: ¿Alcance del cambio? — **Respuesta:** dos versiones: una resumida con diagramas para el dev, otra extendida y detallada para el agente.
- [x] P2: ¿Formato default de la versión resumida? — **Respuesta:** hallazgo (3-5 líneas) + 2-4 opciones numeradas, y esperar la elección.
- [x] P3: En **standalone** (read-only, sin tarea), ¿dónde vive la versión extendida?
  - Respuesta: en un archivo. Motivo: investigaciones largas que el dev corta y retoma en otra sesión. Implica **levantar la restricción read-only** de `SKILL.md:57-59` para una excepción acotada (escribir solo el doc de notas; sigue prohibido tocar código).

## Métrica de impacto

- **Métrica:** palabras de la respuesta de análisis en el chat.
- **Baseline actual:** ~1.100 palabras (análisis de zones/POIs que motivó esta tarea).
- **Resultado esperado:** ≤ 150 palabras en el primer turno, con menú de opciones.
- **Cómo se mide después:** contar palabras del próximo análisis standalone y comparar.

---
_Aprobación del dev: pendiente_
