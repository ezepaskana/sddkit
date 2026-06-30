# Analysis — tarea 008: Bug: sdd validate reporta falsos positivos de drift para proyectos Java

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de especificar.

## Análisis crítico

- **¿Qué problema real resuelve?**
  Elimina falsos positivos permanentes del pre-commit en proyectos Java. Cada commit dispara `sdd validate` (vía hook), que hoy reporta warnings de drift para las entradas de tablas secundarias de `components.md` (ej: `domain/model`, `adapter/controller`). El mensaje dice "corré `sdd scan`" pero `sdd scan` no puede resolver la situación (BR-037: no regenera si el archivo existe). El dev no tiene camino de salida salvo editar `validate.js` a mano — es un blocker de usabilidad.

- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?**
  No. El check de drift en `validate.js:44-54` no tiene ningún scope aplicado; extrae `docDirs` con `matchAll(/^\| \`([^\`]+)\` \|/gm)` sobre el documento completo. No hay constante, flag ni test que mitigue esto. La función `MANUAL_MARK` existe en `c4.js` (importado parcialmente en `validate.js`) pero no se usa para delimitar la extracción.

- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?**
  El fix de 2 líneas propuesto por el dev ES la alternativa simple. Hay dos variantes igualmente simples:
  
  **Opción A (propuesta del dev):** split en el primer encabezado `##`/`###`
  ```javascript
  const mainTable = compDoc.split(/^#{2,3}\s/m)[0];
  const docDirs = [...mainTable.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
  ```
  El primer `##` del archivo generado por `genComponents` es siempre `## ❓ VALIDAR con el equipo`, así que esto acota correctamente a la tabla principal.

  **Opción B (alternativa):** split en `MANUAL_MARK` (ya definido en `c4.js`)
  ```javascript
  const autoGen = compDoc.split(MANUAL_MARK)[0];
  const docDirs = [...autoGen.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
  ```
  Más semántico (la sección manual es exactamente lo que queremos excluir), pero incluiría cualquier tabla que estuviera en la sección `## ❓ VALIDAR` (actualmente solo tiene checkboxes, no tablas). Requiere añadir `MANUAL_MARK` al import existente.

  **Recomendación entre variantes:** Opción A. Es más restrictiva (solo la tabla antes del primer `##`), no requiere cambios de import, y el patrón `#{2,3}` es explícito sobre la intención ("nos quedamos con el área de tabla pura, antes de cualquier sección"). Ambas son correctas para el bug actual.

- **Supuestos del dev que podrían no ser ciertos:**
  1. ~~"genComponents escribe una tabla secundaria de packages Java"~~ — **NO en el código actual**. `genComponents` genera una sola tabla (directorio de primer nivel). La tabla secundaria fue añadida por un agente de IA en la sección manual. El bug es real, pero la causa no es `genComponents` sino que el regex de `validate.js` ignora el scope de la tabla.
  2. El dev asume que el fix de split es suficiente sin tests. Dado que no existe ningún test para el check de drift (`validate.js` no tiene `.test.js`), el fix puede romperse en un refactor futuro. **Hay que agregar el test.**

- **Riesgos y efectos secundarios:**
  - Ninguno arquitectural: es una corrección de scope en una extracción de datos.
  - Riesgo menor: si alguien agrega una tabla legítima de componentes documentados directamente en la sección `## ❓ VALIDAR` (antes de `<!-- sdd:manual`), Opción A la ignoraría en el check de drift → false negative. Es un escenario de uso atípico y la sección VALIDAR no está diseñada para eso.
  - Sin impacto en catálogo, conteo de preguntas abiertas, ni reporte de tareas activas (secciones 1, 2b, 2c de `validate.js`).

- **¿Qué pasa si NO se hace?**
  Cada commit en `nido-be/` (y cualquier repo Java/Kotlin/Spring con tablas secundarias en `components.md`) dispara N warnings de drift en el pre-commit. El pre-commit no falla (solo es exit 1 si hay violaciones de catálogo, no warnings), pero el noise habitual oscurece warnings reales. Con el tiempo el dev aprende a ignorar la salida del hook — que es el peor resultado posible para una herramienta de validación.

- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos?**
  No aplica: el cambio no introduce lógica nueva que pueda fallar en runtime. Solo restringe el scope del regex. El test unitario propuesto en el plan actúa como regresión permanente.

**Recomendación:** `proceder` — bug confirmado, fix minimal, sin riesgos colaterales. Agregar test de regresión como condición de aceptación.

## Preguntas de clarificación

- [x] P1: ¿La tabla secundaria que causa el problema vive siempre debajo de `<!-- sdd:manual -->` (sección "Notas del equipo"), o en algún caso el agente la agrega antes de esa marca (ej: dentro de `## ❓ VALIDAR`)?
  - Respuesta: _pendiente de confirmación del dev. El análisis muestra que Opción A cubre ambos casos; Opción B solo cubre el caso "debajo de `<!-- sdd:manual -->`". Dado que no impacta la recomendación (proceder con Opción A), se puede responder post-análisis._

- [x] P2: ¿Queremos también agregar el test de regresión para `componentGroups` (que no tiene cobertura hoy) o solo el test de drift?
  - Respuesta: _pendiente de prioridad del dev. El plan propone ambos, pero puede recortarse a solo el test de drift si el scope es mínimo._

## Métrica de impacto

- **Métrica:** warnings de drift al correr `sdd validate` en un repo Java con tabla secundaria en `components.md`.
- **Baseline actual:** 9 warnings de drift en cada commit (nido-be, según el bug report).
- **Resultado esperado:** 0 warnings de drift producidos por la tabla secundaria (las entradas de la tabla secundaria dejan de aparecer en `docDirs`).
- **Cómo se mide después:** test unitario que afirma `warnings.length === 0` dado un `components.md` con tabla secundaria Java.

---
_Aprobación del dev: pendiente_
