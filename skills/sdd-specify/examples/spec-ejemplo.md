# Ejemplo: spec de "exportar facturas a CSV" (tarea 005 — 265 palabras)

> Requisito: _"necesito bajarme las facturas del mes en CSV para pasárselas al contador, sin tener que copiar la tabla a mano"_. Tipo `feature`, riesgo bajo.

## Spec refinada

**Historia:** Como administrativo quiero exportar el listado de facturas filtrado a un archivo CSV para entregárselo al contador sin copiar la tabla a mano.

**Criterios de aceptación (EARS):**

1. CUANDO se pide la exportación con filtros activos, EL SISTEMA DEBE generar un CSV con exactamente las facturas que muestra el listado, en el mismo orden.
2. CUANDO se genera el CSV, EL SISTEMA DEBE incluir una fila de encabezados con los nombres de columna visibles en la interfaz.
3. CUANDO un campo contiene comas, comillas o saltos de línea, EL SISTEMA DEBE encerrarlo entre comillas y duplicar las comillas internas (RFC 4180).
4. CUANDO se exportan importes, EL SISTEMA DEBE escribirlos con punto decimal y sin separador de miles, independientemente del idioma de la sesión.
5. SI el resultado filtrado está vacío, EL SISTEMA DEBE generar igual el archivo con solo la fila de encabezados, sin error.
6. SI el resultado supera las 50.000 filas, EL SISTEMA DEBE rechazar la exportación con código `EXPORT_TOO_LARGE` y sugerir acotar el rango de fechas (BR-031).

**Reglas de negocio afectadas:** BR-030 a BR-034 (ya escritas en `.sdd/domain.md`).

**Fuera de alcance:** exportar a Excel con formato; envío por mail al contador; exportación programada; columnas configurables por usuario.

**Impacto:** `src/services/invoices.js` (reutiliza el filtro existente), `src/routes/invoices.js` (endpoint nuevo), `src/lib/csv.js` (nuevo). Convención de módulos del catálogo. Agregar `csv.js` a `components.md`. ADR: no requiere.

---
_Aprobación del dev: pendiente_
