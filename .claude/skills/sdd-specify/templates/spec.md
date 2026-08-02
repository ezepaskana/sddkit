# Spec — tarea __ID__: __TITLE__

> Estado: borrador. Su presupuesto es de **≤ 300 palabras** — un criterio por comportamiento observable, sin repetir la historia ni el análisis. `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como _(rol)_ quiero _(capacidad)_ para _(beneficio)_.

**Criterios de aceptación (formato EARS):**

- CUANDO _(evento/condición)_, EL SISTEMA DEBE _(comportamiento esperado)_.
- SI _(condición de error)_, EL SISTEMA DEBE _(manejo)_.

**Reglas de negocio afectadas** _(citar por ID desde .sdd/domain.md; las nuevas se agregan allí primero)_: BR-…

**Fuera de alcance:**

- …

**Impacto en arquitectura/catálogo:** _(módulos de components.md afectados; convenciones del catálogo que aplican; ¿requiere actualizar C4 o escribir un ADR?)_

### Diagrama (opcional)

> Incluilo SOLO si REEMPLAZA prosa: flujos de 3+ actores o 3+ pasos con bifurcaciones. Si el flujo se explica en dos líneas, no hay diagrama: **borrá esta sección**. Un diagrama que se suma a la explicación en prosa no cumple el criterio.
>
> Si lo incluís: bloque ` ```mermaid ` con un tipo válido en la primera línea (`flowchart LR`, `sequenceDiagram`, `stateDiagram-v2`) — `sdd validate` falla si no lo declara.

---
_Aprobación del dev: pendiente_
