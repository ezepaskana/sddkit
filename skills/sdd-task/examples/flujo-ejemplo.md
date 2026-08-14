# Ejemplo: flujo completo de una tarea

Mensaje del dev: _"quiero que el listado de facturas se pueda filtrar por rango de fechas"_ → "quiero que" es keyword de cambio → se dispara `/sdd-task`.

## 1-2. Capturar y clasificar

Creo `.sdd/tasks/004-quiero-que-el-listado-de-facturas/requirement.md` con el texto verbatim y agrego la entrada al índice en `draft`.

Anuncio: _"Lo trato como `feature` (riesgo bajo): comportamiento nuevo en el listado, pero el patrón de filtros ya existe. Decime si preferís otro tipo."_

Las señales son claras (un pedido, un alcance evidente), así que **no pregunto la expectativa**: clasifico y sigo. Si el pedido admitiera lecturas de tamaño muy distinto, ahí sí preguntaría antes de clasificar (BR-057).

**Riesgo bajo → dos artefactos**: `analysis.md` y `plan.md`. Sin spec ni design.

## 3. Analizar (`/sdd-analyze`) — ≤ 45 líneas

```markdown
## Entendimiento
`buildInvoiceQuery()` (`src/services/invoices.js:44`) ya filtra por estado: el rango
de fechas se agrega ahí parametrizando el filtro existente, no en un endpoint nuevo.

## Huecos
- [ ] H1: ¿Los extremos del rango se incluyen? — sugerido: sí, ambos inclusive.
  - Respuesta: sí
```

Sin diagrama: se explica en dos líneas. Paso el estado a `analyzed`, **vuelco `analysis.md` en la terminal** → el dev aprueba.

## 4. Planificar (`/sdd-plan`) — ≤ 45 líneas

Sin spec (riesgo bajo), así que los criterios de aceptación van en el plan:

```markdown
- [ ] **1. Rama de trabajo** — `cmd: test "$(git branch --show-current)" = task/004-filtro-fechas`
- [ ] **2. Tests del rango y del borde invertido** `[P]` — `cmd: npm test -- invoices` (rojo)
- [ ] **3. Parametrizar `buildInvoiceQuery()`** — ambos extremos inclusive; `desde > hasta` responde 400 `INVALID_DATE_RANGE` (BR-027). Depende de 2. `cmd: npm test -- invoices`
- [ ] **4. Actualizar `.sdd/c4/components.md`** `[P]` — `cmd: grep -q 'filtro por rango' .sdd/c4/components.md`
```

Paso a `planned`, lo vuelco → aprueba → `in-progress`.

## 5. Ejecutar y cerrar

`/sdd-execute`: un subagente por paso con el brief que armás vos, y **corrés la verificación antes de marcar el checkbox** — el reporte del worker es un claim, no una prueba.

`/sdd-close`: sin documento de retro. Si hubo un aprendizaje que haría tropezar a otro agente, va directo a `.sdd/LEARNINGS.md`; después, commit, PR draft y estado `done`.
