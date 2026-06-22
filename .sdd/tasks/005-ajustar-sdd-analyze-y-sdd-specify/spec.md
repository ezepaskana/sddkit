# Spec — tarea 005: Ajustar sdd-analyze y sdd-specify para separar outputs y res…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Que problema real resuelve?** Hoy analyze y specify escriben en el mismo archivo (spec.md), mezclando el analisis critico (cuestionamiento, clarificacion) con la especificacion formal (historia, EARS, metrica). Esto genera confusion sobre la frontera entre ambas fases y hace que spec.md sea un archivo monolitico que mezcla "¿deberíamos?" con "¿que exactamente?". Separarlos en dos artefactos (analysis.md + spec.md) deja claro que son dos actividades distintas con outputs distintos.
- **¿Ya existe algo en el repo (o una libreria) que lo resuelve total o parcialmente?** No. El template actual de spec.md tiene las secciones de ambas fases juntas. No hay un analysis.md en el sistema.
- **¿Hay una alternativa mas simple que logre el 80% del valor con el 20% del esfuerzo?** Podriamos solo mover las secciones de analisis a analysis.md sin tocar la logica de sdd-specify. Pero el dev tambien pide que specify haga agrupamiento en entregables con sentido de negocio, lo cual es un cambio conceptual en la skill.
- **Supuestos del dev que podrian no ser ciertos:** El "agrupamiento en entregables cortos con sentido de negocio" es interesante pero hay una tension con sdd-plan. Hoy sdd-plan descompone en pasos tecnicos verificables. Si specify agrupa en entregables de negocio, tenemos dos niveles de descomposicion: negocio (specify) y tecnico (plan). Esto puede ser valioso (el dev aprueba entregables de negocio, el agente descompone cada uno en pasos tecnicos) o puede ser una capa extra innecesaria para tareas chicas. **Punto a clarificar.**
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento): Impacto en codigo JS: `src/commands/task.js` referencia spec.md en ~15 lugares (template, brief, verify, status, show, close). Hay que agregar la creacion de analysis.md en `task new`, y actualizar `sdd task brief` (hoy lee la seccion "Spec refinada" de spec.md para el brief de los workers). El template de spec.md vive en `skills/sdd-specify/templates/spec.md`. Tambien hay que actualizar `src/lib/agentsmd.js` (texto del bloque gestionado de AGENTS.md) y `src/templates.js` (sdd-bootstrap).
- **¿Que pasa si NO se hace?** El flujo sigue funcionando con el spec.md monolitico. La confusion entre fases 2 y 3 persiste pero no es bloqueante.
- **Si esta funcionalidad puede fallar en uso real, ¿como nos enterariamos (deteccion) y como deberia reaccionar el sistema (manejo)?** Riesgo principal: que `sdd task brief` no encuentre la "Spec refinada" si el formato de spec.md cambia. El brief ya tiene fallback: `'(spec refinada no encontrada -- lee spec.md completo)'`. Bajo riesgo.

**Recomendacion:** `proceder con cambios` — La separacion de artefactos (analysis.md vs spec.md) es clara y valiosa. El agrupamiento en entregables de negocio necesita clarificacion: ¿es una seccion nueva dentro de spec.md o reemplaza la descomposicion de plan.md? Aclaro abajo.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: El "agrupamiento en entregables cortos con sentido de negocio" -- ¿es una seccion dentro de spec.md donde los criterios EARS se agrupan en bloques logicos (ej: "Entregable 1: Login basico", "Entregable 2: Recovery de password"), que despues sdd-plan descompone en pasos tecnicos? ¿O reemplaza directamente a lo que hoy hace sdd-plan?
  - Respuesta: No avanzar con el agrupamiento en entregables por ahora. Queda fuera de alcance.
- [x] P2: ¿Queres un nuevo estado intermedio entre `specified` y `planned` (ej: `analyzed`) para marcar cuando analysis.md esta completo? ¿O el gate sigue siendo solo en `specified` (que ahora significaria "spec.md aprobada, analysis.md ya esta hecho")?
  - Respuesta: Si, nuevo gate `analyzed` entre `draft` y `specified`.
- [x] P3: La metrica de impacto (baseline, resultado esperado) -- ¿va en analysis.md (es parte del analisis critico) o en spec.md (es parte de la especificacion formal)?
  - Respuesta: Va en analysis.md, pero no hay que forzarla: no siempre aplica.

## Metrica de impacto

No hay metrica cuantificable directa. Impacto cualitativo: separacion clara de artefactos (analysis.md vs spec.md) y de responsabilidades (analyze = cuestionar, specify = formalizar). Antes: 1 archivo monolitico (spec.md) con ambas cosas. Despues: 2 archivos con responsabilidades distintas y un gate intermedio (`analyzed`).

## Spec refinada

**Historia:** Como desarrollador usando sddkit quiero que sdd-analyze y sdd-specify tengan artefactos de salida separados (analysis.md y spec.md respectivamente) con un gate intermedio, para que la frontera entre "cuestionar la propuesta" y "formalizar lo que se va a construir" sea clara.

**Criterios de aceptacion (formato EARS):**

### analysis.md (output de sdd-analyze)

- CUANDO `sdd task new` cree una tarea nueva, EL SISTEMA DEBE crear analysis.md (ademas de spec.md y plan.md) con el template de analisis critico (7 preguntas, clarificacion, recomendacion, y seccion de metrica de impacto opcional).
- CUANDO sdd-analyze complete el analisis en modo tarea, EL SISTEMA DEBE escribir en analysis.md (no en spec.md).
- CUANDO la metrica de impacto no aplique a una tarea, EL SISTEMA DEBE permitir declararlo explicitamente en analysis.md sin forzar baseline ni resultado esperado.
- CUANDO se corra `sdd task status <id> analyzed`, EL SISTEMA DEBE abrir analysis.md al dev para revision (mismo patron que `specified` abre spec.md y `planned` abre plan.md).

### spec.md (output de sdd-specify)

- CUANDO sdd-specify escriba la spec, EL SISTEMA DEBE escribir en spec.md SIN seccion de "Analisis critico" ni "Preguntas de clarificacion" ni "Metrica de impacto" (eso ya esta en analysis.md). spec.md contiene: historia, criterios EARS, reglas de negocio, fuera de alcance, impacto en arquitectura.
- CUANDO se corra `sdd task status <id> specified`, EL SISTEMA DEBE abrir spec.md al dev (sin cambios en este gate).

### Estado `analyzed` en la maquina de estados

- EL SISTEMA DEBE aceptar `analyzed` como estado valido en `STATUSES` del CLI.
- CUANDO se corra `sdd task status <id> analyzed`, EL SISTEMA DEBE abrir analysis.md al dev en su editor.
- EL SISTEMA DEBE actualizar el contrato impreso por `sdd task new` para reflejar el nuevo flujo (analyze -> analysis.md -> gate analyzed -> specify -> spec.md -> gate specified).

### sdd task brief

- CUANDO `sdd task brief` genere el contexto para un subagente, EL SISTEMA DEBE leer la seccion "Spec refinada" de spec.md (sin cambios) y opcionalmente incluir la recomendacion de analysis.md si es relevante.

### Skills SKILL.md

- sdd-analyze SKILL.md (modo tarea) DEBE indicar que el output es analysis.md.
- sdd-specify SKILL.md DEBE indicar que lee analysis.md como input y escribe spec.md como output.

### Textos de AGENTS.md y templates

- `src/lib/agentsmd.js` DEBE reflejar el nuevo flujo con analysis.md y el gate `analyzed`.
- `src/templates.js` (sdd-bootstrap) DEBE reflejar el nuevo flujo.

**Reglas de negocio afectadas:** Ninguna BR existente impactada. No se crean BRs nuevas (es reorganizacion interna del flujo).

**Fuera de alcance:**

- Agrupamiento en entregables de negocio (descartado por el dev).
- Cambios a sdd-plan, sdd-execute, sdd-close.
- Cambios al modo standalone de sdd-analyze (ya escribe solo en conversacion, no en archivos).
- Migracion de tareas existentes (las tareas viejas con spec.md monolitico siguen funcionando).

**Impacto en arquitectura/catalogo:**

- Modulos afectados: `src/commands/task.js` (template, estados, brief, show, contrato), `src/lib/agentsmd.js` (texto del bloque gestionado), `src/templates.js` (sdd-bootstrap).
- Skills afectadas: `skills/sdd-analyze/SKILL.md`, `skills/sdd-specify/SKILL.md`, `skills/sdd-task/SKILL.md`.
- Templates: `skills/sdd-specify/templates/spec.md` (remover seccion analisis), nuevo `skills/sdd-analyze/templates/analysis.md`.
- No requiere ADR. No requiere cambios en C4.

---
_Aprobacion del dev: APROBADA (2026-06-22)_
