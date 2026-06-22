# Spec — tarea 002: Agregar fallback de 3 opciones en los triggers de skills SDD…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** …
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** …
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** …
- **Supuestos del dev que podrían no ser ciertos:** …
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento): …
- **¿Qué pasa si NO se hace?** …
- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (detección) y cómo debería reaccionar el sistema (manejo)?** … _(o "no aplica" si la tarea no introduce lógica nueva que pueda fallar)_

**Recomendación:** `proceder | proceder con cambios | reconsiderar` — _justificada. Si es "reconsiderar", discutilo con el dev ANTES de seguir: no construyas algo que creés incorrecto sin decirlo._

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [ ] P1: …
  - Respuesta: …

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** _(p.ej. latencia P95 del endpoint, errores/día, conversión, tiempo de tarea del usuario)_
- **Baseline actual:** _(medir ANTES de implementar; si no existe el dato, el PRIMER paso del plan debe ser instrumentarla)_
- **Resultado esperado:** _(número o dirección concreta)_
- **Cómo se mide después:** _(query, dashboard, log, test de carga)_

_Si no hay métrica cuantificable, declararlo explícitamente y justificar el impacto cualitativo esperado._

## Spec refinada

**Historia:** Como _(rol)_ quiero _(capacidad)_ para _(beneficio)_.

**Criterios de aceptación (formato EARS):**

- CUANDO _(evento/condición)_, EL SISTEMA DEBE _(comportamiento esperado)_.
- SI _(condición de error)_, EL SISTEMA DEBE _(manejo)_.

**Reglas de negocio afectadas** _(citar por ID desde .sdd/domain.md; las nuevas se agregan allí primero)_: BR-…

**Fuera de alcance:**

- …

**Impacto en arquitectura/catálogo:** _(módulos de components.md afectados; convenciones del catálogo que aplican; ¿requiere actualizar C4 o escribir un ADR?)_

---
_Aprobación del dev: pendiente_
