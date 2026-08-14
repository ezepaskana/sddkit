# Analysis — tarea 021: artefactos que entran en la terminal, con mermaid renderizado

> Estado: borrador. Presupuesto ≤ 350 palabras. El dev debe APROBARLO antes de especificar.

## Análisis crítico

- **Problema real:** el gate saca al dev de la terminal — el agente lanza una app externa (`ui.opener` = `open -a "Sublime Text"`) para que lea algo que aprueba en el chat. Y los diagramas Mermaid (BR-061) quedan crudos en cualquier visor sin plugin.
- **¿Ya existe?** Parcial: BR-063 ya permite no abrir nada (`ui.openFiles: false` → solo la ruta). Falta el camino del medio: mostrar el contenido en la terminal.
- **Medición (por qué el alcance se amplía):** una pantalla útil son ~45 líneas. `analysis` (30-41), `spec` (28-47), `retro`/`nota`/`reproduccion` (≤20) entran. **`plan.md` no entra nunca (40-113 líneas) y es el ÚNICO template sin presupuesto declarado.** Además los presupuestos que existen no se cumplen: los 7 `analysis.md` del repo van de 442 a 3127 palabras contra un tope de 350 — nadie los chequea.
- **Causa raíz:** el presupuesto está en **palabras**, pero lo que decide si entra en pantalla son **líneas**.
- **Alternativa más simple:** volcar el archivo y dejar el Mermaid crudo. Da el 80% sin dependencia externa; pierde el diagrama legible.
- **Supuestos del dev que no se sostienen:** (1) "que se instale junto con el plugin" — imposible: un plugin es markdown + JSON y no corre instaladores (ADR-0016, BR-079); queda como detectar + ofrecer una vez. (2) termaid es Python (`pip install termaid`), no Go.
- **Riesgos:** ADR-0016 declara cero runtime → termaid debe ser **opcional con degradación**, y eso necesita ADR propia. Preguntar cada sesión sería ruido: la respuesta (incluido el "no") se persiste.
- **¿Qué pasa si NO se hace?** El flujo funciona; el dev sigue cambiando de ventana y los planes largos siguen sin tope.
- **Fallas en uso real:** sin `termaid` en el `PATH`, se muestra el bloque crudo y no se vuelve a ofrecer si ya dijo que no.

**Recomendación:** `proceder con cambios` — se hace todo salvo la instalación automática, que el formato del plugin no permite.

## Preguntas de clarificación

- [x] P1: ¿Y si el dev rechaza la instalación? — Queda anotado en `.sdd/config.json`; no se vuelve a ofrecer.
- [x] P2: ¿Volcado siempre o con tope? — Los artefactos deben ser cortos y entrar en la terminal. Si uno excede, el agente avisa y el dev lo abre explícitamente. Se redefinen los presupuestos y la composición de todos los artefactos.

## Decisiones transversales

- **Profundidad calibrada, sin rito extra:** la clasificación sigue siendo automática (BR-057). El agente le pregunta al dev su expectativa (tipo, tamaño, hasta dónde profundizar) **solo cuando las señales son ambiguas o contradictorias**, no en cada tarea. La respuesta fija la profundidad de todos los artefactos, no solo qué artefactos se crean.
- **Los aprendizajes sobreviven a la retro:** al cerrar, el agente agrega directo a `.sdd/LEARNINGS.md` lo que supere el umbral "otro agente tropezaría con esto", sin documento intermedio. Es el único mecanismo por el que una tarea le enseña algo a la siguiente.
- **Antecedente:** [Böckeler](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) documenta los dos fracasos a evitar — Kiro convirtió un bug chico en 4 historias y 16 criterios ("un mazo para romper una nuez") y spec-kit generó markdown tan verboso que era tedioso de revisar, además de ignorar su propia investigación y regenerarla duplicada.

## Decisiones por artefacto (revisión archivo por archivo con el dev)

| # | Artefacto | Decisión |
|---|---|---|
| 1 | `requirement.md` | **Tope solo para el volcado**: el archivo guarda el requisito verbatim completo e intacto; si excede el tope, el agente muestra las primeras líneas + aviso para abrirlo. El contenido nunca se recorta ni se resume. |
| 2 | `analysis.md` | **Tres secciones, nada más.** (a) Entendimiento del pedido en muy pocas palabras; (b) diagrama Mermaid que explica lo mismo, si aplica; (c) huecos: **máximo 5**, preguntados de a uno, cada uno con respuesta sugerida. Se caen las 7 preguntas fijas, la recomendación explícita y la métrica de impacto. Propósito del documento: entender el pedido y cubrir los huecos. |
| 3 | `spec.md` | **Continúa el analysis, no lo repite**: arranca de los huecos ya respondidos y no reescribe el entendimiento. Su contenido propio son los criterios de aceptación, las reglas y el fuera de alcance. Evita el duplicado que Böckeler documenta. **Deja de escribirse siempre: solo la lleva la tarea cuya profundidad lo amerita (riesgo alto); en el resto los criterios de aceptación van dentro del plan.** Baja de 4 a 3 las paradas antes de escribir código. **Composición:** historia, criterios de aceptación **numerados** (`CA-1`, `CA-2`… citables desde el plan y desde un test), reglas BR afectadas, fuera de alcance, y **supuestos** (los defaults que el agente eligió sin preguntar — complemento del tope de 5 huecos, tomado de spec-kit). El "impacto en arquitectura/catálogo" se muda al plan: es el cómo, no el qué. |
| 4 | `plan.md` | **Se parte en dos.** El plan queda como lista corta de pasos ejecutables (una línea + su `cmd:` de verificación por paso) que entra en pantalla; el detalle técnico —impacto en arquitectura, archivos, dependencias entre pasos— sale del plan. Hoy es el único template sin tope declarado y el único que nunca entra en pantalla (40 a 248 líneas). Kiro y spec-kit ya lo resuelven así: `tasks.md` es lista, el diseño vive antes. El detalle técnico se muda a un artefacto nuevo, `design.md` (ver fila 8), que solo escribe la tarea de riesgo alto. |
| 5 | `nota.md` | **Eliminado.** Se solapaba casi por completo con el `analysis.md` nuevo (qué entendí / qué hago / cómo se verifica ≈ entendimiento + plan de un paso). Una tarea `simple` escribe el analysis corto y un plan de uno o dos pasos: **un solo camino que se profundiza con el riesgo**, en vez de formatos paralelos por tipo. |
| 6 | `reproduccion.md` | **Eliminado.** En un `bug`, la reproducción y el esperado/observado SON el entendimiento del pedido: van en el analysis. El test de regresión —lo único que no se solapaba, porque hace de criterio de aceptación— pasa a ser el primer paso del plan (rojo antes del fix, verde después). |
| 7 | `retro.md` | **Eliminado por ahora**, junto con toda la métrica de impacto (baseline/resultado) en cualquier artefacto. Decisión reversible: el dev dijo "por ahora". Impacto: `sdd-close` pierde su artefacto principal y el gate de `done` deja de exigir retro. |
| 8 | `design.md` **(nuevo)** | Recibe lo que sale del plan: impacto en arquitectura y catálogo (mudado desde la spec), archivos a tocar y dependencias entre pasos. **Solo lo escribe la tarea de riesgo alto**, igual que la spec. Equivalente al `design.md` de Kiro. |

> _Este documento tenía una sección "Métrica de impacto": se eliminó al decidirse que la métrica sale del framework (ver fila 7). Los números que la sostenían siguen arriba, en **Medición**._

---
_Aprobación del dev: aprobada 2026-08-11 (con la métrica removida)_
