# Ejemplo: flujo completo de una tarea `feature`

Mensaje del dev: _"quiero que el listado de facturas se pueda filtrar por rango de fechas"_ → "quiero que" es keyword de cambio → se dispara `/sdd-task`.

## 1-2. Capturar y clasificar

Creo `.sdd/tasks/004-quiero-que-el-listado-de-facturas/requirement.md` con el texto verbatim, agrego la entrada al índice en `draft`, y al clasificar como `feature` copio los tres templates (`analysis.md`, `spec.md`, `plan.md`) desde el plugin.

Anuncio: _"Lo trato como `feature` (riesgo bajo): comportamiento nuevo en el listado, pero el patrón de filtros ya existe. Decime si preferís otro tipo."_

## 3. Analizar (`/sdd-analyze`) — ≤ 350 palabras

- **¿Ya existe?** `buildInvoiceQuery()` en `src/services/invoices.js:44` ya filtra por estado; el rango de fechas se agrega ahí, no en un endpoint nuevo.
- **Alternativa más simple:** parametrizar el filtro existente en vez de duplicar la query.
- **Riesgos:** ninguno — es lectura. **Métrica:** el dev deja de exportar a Excel para filtrar a mano (hoy ~3 veces por semana).
- **Recomendación:** `proceder con cambios` (parametrizar, no duplicar).

Paso el estado a `analyzed`, le muestro `analysis.md` al dev → aprueba.

## 4. Especificar (`/sdd-specify`) — ≤ 300 palabras

- CUANDO se pide el listado con `desde` y `hasta`, EL SISTEMA DEBE devolver solo las facturas emitidas dentro de ese rango, incluyendo ambos extremos.
- SI `desde` es posterior a `hasta`, EL SISTEMA DEBE responder 400 con código `INVALID_DATE_RANGE` (BR-027).

Paso a `specified`, le muestro `spec.md` → aprueba.

## 5. Planificar (`/sdd-plan`) — ≤ 3 sub-ítems por paso

Paso 1 rama de trabajo · Paso 2 tests del rango y del borde invertido _(rapido)_ · Paso 3 parametrizar `buildInvoiceQuery()` _(medio)_ · Paso 4 actualizar `.sdd/c4/components.md` _(rapido)_.

Paso a `planned`, le muestro `plan.md` → aprueba → `in-progress`.

## 6. Ejecutar y cerrar

`/sdd-execute`: un subagente por paso con el brief que armás vos, y **corrés la verificación del paso antes de marcar su checkbox** — el reporte del worker es un claim, no una prueba. `/sdd-close`: retro ≤ 150 palabras (métrica cumplida, sin desvíos, un aprendizaje cosechado) y estado `done`.
