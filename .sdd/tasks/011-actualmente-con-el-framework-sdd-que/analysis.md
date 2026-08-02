# Analysis — tarea 011: Documentos SDD verborragicos: resumir + diagramas

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de especificar.

## Análisis crítico

- **¿Qué problema real resuelve?** Los documentos que sddkit genera/prescribe son pesados de leer para el dev y caros en contexto para los agentes. Evidencia medida en este repo: `plan.md` de la tarea 010 = 248 líneas / 3.562 palabras; `analysis.md` de la 010 = 3.127 palabras; `LEARNINGS.md` = 44 líneas pero con bullets de hasta 834 caracteres; `AGENTS.md` = 936 palabras inyectadas al contexto de todo agente en todo repo cliente; `sdd context` (el "destilado barato") devuelve ~34KB. Es exactamente la crítica #1 de la industria a los frameworks SDD (GitHub Spec Kit: "a sea of markdown", planes de 2.000+ líneas, review overload — ver fuentes al pie).

- **¿Ya existe algo en el repo que lo resuelve total o parcialmente?** Parcialmente:
  - Mermaid ya existe, pero solo en 2 de ~12 docs: `context.md` (flowchart fijo de 3 nodos que nunca varía, `src/lib/c4.js:61-66`) y `containers.md` (`c4.js:96-103`). `components.md` y `domain.md` no tienen ningún diagrama, y ningún template de tarea ni skill instruye a crear/mantener diagramas.
  - La única política anti-verborragia del repo está en `src/lib/llmClient.js:55-58` ("cada bullet debe ser corto, concreto y verificable") y es la única **enforced por código** (`isValidSection`). Ningún template ni skill fija presupuesto de longitud para los artefactos de tarea.

- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí, y cambia el foco del requisito. La verborragia no la producen "los documentos": la producen los **templates, skills y ejemplos** que fijan el estándar que el agente copia: 7 preguntas obligatorias duplicadas en dos lugares (`sdd-analyze`), 5 sub-ítems fijos por paso del plan (248 líneas de la 010 = costo fijo × "pasos chicos"), ejemplos de 100-142 líneas citados como "nivel de profundidad esperado", "preguntá sin límite de cantidad", el gate de retro que obliga a llenar todos los campos aunque no apliquen (`task.js:319-321`), y `AGENTS.md` con el flujo SDD en prosa de ~150 palabras por paso. El 80% del valor está en poner **presupuestos de concisión en esas fuentes** (templates + SKILL.md + ejemplos cortos como nuevo estándar + permitir N/A); los diagramas son la parte menor del valor.

- **Supuestos del dev que podrían no ser ciertos:**
  1. *"Diagramas ⇒ docs más cortos."* Un diagrama **agrega** líneas; solo resume si **reemplaza** prosa/tablas. Además `sdd context` hoy excluye explícitamente los diagramas del destilado (`src/commands/context.js:9`): los diagramas actuales benefician solo al lector humano, el agente ni los ve.
  2. *"El problema son los documentos generados."* Es más raíz: son las instrucciones/ejemplos que inducen la longitud (ver punto anterior). Resumir los docs de este repo a mano sin tocar templates/skills regeneraría el problema en la próxima tarea.
  3. (Menor) La sintaxis C4 nativa de Mermaid (`C4Context`…) **no renderiza en GitHub**; la práctica actual es dibujar C4 con `flowchart` estándar — que es lo que c4.js ya hace. Bien ahí.

- **Riesgos y efectos secundarios:**
  - Recortar de más puede perder lo que justifica el framework: trazabilidad y auditoría (requirement verbatim, decisiones con porqué). El recorte debe ser de densidad, no de información vinculante (BR-NNN, ADRs aceptadas siguen intactas).
  - Diagramas generados en `scan` no se re-generan nunca (`upsertGenerated` solo escribe si el archivo no existe) ⇒ riesgo de drift; si se agregan más diagramas hay que decidir quién los mantiene (skill de bootstrap/tareas o living docs).
  - Tocar templates de skills exige tocar `skills/` (fuente de verdad que copia `installSkills`) y re-sincronizar `.claude/skills/` — hoy ya están desincronizados (4 archivos difieren).
  - Relajar gates (N/A en retro) baja la fricción pero puede invitar a retros vacías; conviene N/A explícito y justificado, no campos opcionales.

- **¿Qué pasa si NO se hace?** Cada tarea sigue quemando tokens y tiempo de review; los repos cliente heredan un AGENTS.md de 936 palabras compitiendo con el código por contexto; sddkit repite el patrón que frenó la adopción de Spec Kit.

- **Detección y manejo de fallas:** Mayormente no aplica (el grueso es contenido de templates/skills, sin lógica de runtime nueva). Si se agregan chequeos de longitud o de sintaxis Mermaid a `sdd validate`, la detección es el propio validate en pre-commit (determinística, sin LLM); el manejo es el ya existente: mensaje al dev y commit bloqueado. Si se tocan prompts de living docs, ya rige BR-053 (fallo ⇒ sección queda en su última versión válida, warning no bloqueante).

**Recomendación:** `proceder con cambios` — reencuadrar de "agregar diagramas + resumir docs" a cinco frentes (orden = impacto):

1. **Flujo adaptativo por tipo de tarea** (dirección del dev, segunda tanda): captura verbatim universal → el agente clasifica (bug / simple / feature / refactor), avisa y avanza; el dev puede corregir. Cada tipo tiene su flujo: simple = 1 gate de muy pocas palabras + implementación; bug = reproducir → test rojo → fix; feature = flujo completo; refactor = con análisis de impacto. Menos fases → menos artefactos → menos texto.
2. **Templates/skills de tarea concisos**: presupuestos de longitud, ejemplos cortos como estándar, "N/A: motivo" permitido, menos sub-ítems por paso del plan.
3. **Claude-only**: bloque gestionado a CLAUDE.md, borrar soporte Cursor y prosa multi-agente (con ADR + actualización de context.md), contrato de consola mínimo con progressive disclosure.
4. **Diagramas Mermaid donde suman**: completar C4 (`components.md`), flujos de `domain.md`, espacio opcional-con-criterio en spec/plan; los diagramas entran al destilado de `sdd context`.
5. **Enforcement mixto**: presupuestos blandos en templates/skills + chequeos objetivos en `sdd validate` (largo de bullets de LEARNINGS, sintaxis Mermaid) + re-escritura única de los docs vivos de este repo como demostración.

## Preguntas de clarificación

- [x] P1 (alcance — cambia todo): ¿Qué te pesa más al leer? (a) los artefactos por tarea (analysis/spec/plan/retro), (b) los docs vivos (domain, C4, LEARNINGS), (c) AGENTS.md y la salida de consola, (d) todo por igual.
  - Respuesta: (a) artefactos por tarea + (c) AGENTS.md y la salida de consola. Los docs vivos y ADRs pesan menos.
- [x] P2 (objetivo): ¿El objetivo es solo legibilidad humana, o también ahorro de contexto/tokens del agente? (Si es también para agentes, los diagramas deberían entrar al destilado de `sdd context` o no aportan nada ahí.)
  - Respuesta: Ambos — docs más cortos para el dev Y menos contexto para el agente; los diagramas deberían entrar al destilado de `sdd context`.
- [x] P3 (alcance): ¿Tocamos solo lo que sddkit genera hacia adelante (templates/skills/generadores), o también re-escribimos los docs ya existentes de este repo (.sdd/ actual: LEARNINGS, domain, tareas viejas no)?
  - Respuesta: Ambos — templates/skills/generadores nuevos + re-escritura única de los docs vivos actuales de este repo (LEARNINGS, domain, C4, AGENTS.md) como demostración del nuevo estándar. Tareas viejas no se tocan.
- [x] P4 (diagramas): ¿Dónde los ves valiosos? (a) completar C4 (`components.md` hoy sin diagrama), (b) flujos clave en `domain.md`, (c) también en spec/plan de cada tarea, (d) otro.
  - Respuesta: (a) + (b) + (c): completar C4 (components.md y mejorar context.md), flujos de domain.md como diagrama, y espacio en spec/plan por tarea.
- [x] P5 (gates): ¿Aceptás permitir "N/A: <motivo>" en secciones de retro/analysis que no apliquen, y reducir sub-ítems obligatorios del plan? ¿O preferís mantener todas las secciones pero exigirlas cortas?
  - Respuesta: Sí a ambos: "N/A: motivo" permitido en secciones que no apliquen, y reducir los sub-ítems obligatorios por paso del plan.
- [x] P6 (enforcement): ¿Presupuestos de longitud chequeados por `sdd validate` (duro, bloquea commit) o solo instrucciones en skills/templates (blando)?
  - Respuesta: Mixto — presupuestos escritos en skills/templates (blando) + chequeos baratos en `sdd validate` solo para lo objetivo (largo máximo de bullets de LEARNINGS, sintaxis Mermaid válida).
- [x] P7 (diagramas en tareas): ¿Diagrama opcional u obligatorio en spec/plan?
  - Respuesta: Opcional con criterio — el template ofrece el espacio y la skill instruye a usarlo solo cuando reemplaza prosa (flujos con 3+ actores/pasos); tareas simples no lo llevan.

### Segunda tanda — dirección nueva aportada por el dev

El dev amplió el alcance con dos definiciones estructurales:

1. **Flujo adaptativo por tipo de tarea.** No todas las tareas ameritan las 6 fases. Se mantiene la captura verbatim como primer paso universal; después se determina el tipo de tarea y se aplica el flujo que corresponda. Ejemplos del dev: bug → reproducir + test que lo compruebe + fix; mejora simple (p.ej. devolver un campo más en un endpoint) → cambio corto y rápido; cálculo/lógica compleja → análisis más profundo; refactor → análisis de impacto. (Coincide con la crítica de la industria a Spec Kit: proceso completo para tareas chicas = overkill.)
2. **Claude-only.** El framework es válido solo para Claude; no interesa la compatibilidad con otros agentes.

- [x] P8 (clasificación): ¿Cómo se decide el tipo de tarea tras capturar?
  - Respuesta: El agente decide solo, avisa qué flujo eligió y avanza; el dev puede corregirlo en cualquier momento.
- [x] P9 (vía rápida): ¿Qué gates quedan para una mejora simple?
  - Respuesta: Un solo gate: el agente explica **en muy pocas palabras** qué entendió y qué va a hacer — siempre con muy pocas palabras — y con el ok implementa.
- [x] P10 (Claude-only): ¿Qué pasa con AGENTS.md y el soporte Cursor?
  - Respuesta: El bloque gestionado pasa a CLAUDE.md (nativo de Claude Code), se elimina la regla de Cursor (`src/templates.js`) y la prosa multi-agente. Breaking change asumido: Claude es el único target. Amerita ADR y actualización de `.sdd/c4/context.md` (hoy declara "multi-agente").

## Métrica de impacto

- **Métrica:** palabras por artefacto generado (medible con `wc -w`): artefactos de la próxima tarea completa, AGENTS.md gestionado, salida de `sdd context`.
- **Baseline actual:** tarea 010: plan 3.562 palabras / analysis 3.127; AGENTS.md 936 palabras (6.5 KB); `sdd context` ~34 KB; LEARNINGS.md 2.709 palabras.
- **Resultado esperado:** −50% de palabras en los artefactos de la primera tarea post-cambio manteniendo la información vinculante; AGENTS.md ≤ 450 palabras; bullets de LEARNINGS ≤ 200 caracteres (si P3 incluye docs existentes).
- **Cómo se mide después:** `wc -w` sobre los mismos archivos tras la primera tarea que use los templates nuevos, comparado contra la 010.

### Investigación: cómo clasifican los tipos de tarea otros frameworks SDD

Hallazgo central: **ningún framework SDD usa una taxonomía fija de tipos** (bug/feature/refactor). Todos escalan el proceso por **riesgo/complejidad**, y los que distinguen algo lo hacen de forma binaria o por patrones:

- **Kiro (AWS)**: binario — "vibe" (prompt directo, sin artefactos) vs "spec" (Requirements → Design → Tasks). El dev elige a mano; sin clasificación automática.
- **OpenSpec**: principio "actions, not phases" (comandos disponibles, no etapas obligatorias); regla explícita "minor bugs can be fixed without a proposal"; patrones de workflow por contexto: Quick Feature (new→apply→archive), Exploratory (explore→new→…), Parallel. El diseño se saltea si no hace falta.
- **Allegro (best practices)**: profundidad de spec proporcional al riesgo — "para tareas livianas (p.ej. agregar un campo a una API) SDD es overkill; una conversación directa funciona igual de bien". Bajo riesgo → menos control → más velocidad.
- **Spec Kit**: sin tipos; aplica el pipeline completo siempre — y esa es exactamente su crítica #1.
- Fuera de SDD, las taxonomías establecidas son Conventional Commits (feat/fix/refactor/perf/docs/chore/test) y los work items ágiles (story/bug/task/spike).

**Síntesis propuesta**: dos ejes. El **tipo** define la *forma* del flujo (qué fases tienen sentido) y el **riesgo/tamaño** define la *profundidad* (cuánto artefacto y cuántos gates). Taxonomía mínima de 4 tipos:

| Tipo | Forma del flujo | Artefactos |
|---|---|---|
| `simple` | 1 gate de pocas palabras → implementar con tests | requirement + nota mínima |
| `bug` | reproducir → test rojo que lo compruebe → fix → verificar | requirement + reproducción; el test ES la spec |
| `feature` | flujo completo (analizar → spec → plan → ejecutar → retro), profundidad según riesgo | los actuales, concisos |
| `refactor` | análisis de impacto (`sdd impact`) → tests verdes antes/después → sin spec EARS (el comportamiento no cambia) | requirement + impacto + plan corto |

La investigación pura ("¿cómo funciona X?") ya está cubierta por `sdd-analyze` standalone y no necesita tipo. Si una tarea muta de tipo a mitad de camino (una `simple` que resulta compleja), el agente lo dice y re-clasifica — mismo espíritu que el decision tree de OpenSpec.

- [x] P11 (taxonomía): ¿Qué tipos de tarea existen y cómo escalan?
  - Respuesta: confirmada la síntesis propuesta — 4 tipos (`simple`/`bug`/`feature`/`refactor`) + riesgo (bajo/alto, estimado por el agente) como segundo eje que gradúa la profundidad dentro de cada fase.

### Fuentes de la investigación web

- Crítica a Spec Kit por verborragia: https://github.com/github/spec-kit/discussions/1784 · https://codemyspec.com/blog/github-spec-kit-guide (Scott Logic: 2.000+ líneas por fase de plan, "10× más rápido sin el pipeline")
- Docs para agentes / progressive disclosure: https://www.aihero.dev/a-complete-guide-to-agents-md · https://www.augmentcode.com/guides/how-to-build-agents-md (raíz ≤150-200 líneas; "un snippet real > tres párrafos"; secciones de arquitectura removibles sin cambiar el comportamiento del agente)
- Diagrams-as-code / C4 con Mermaid: https://mermaideditor.com/blog/c4-model-diagrams-with-mermaid · https://github.com/orgs/community/discussions/197898 (GitHub no renderiza la sintaxis C4 de Mermaid; usar flowchart)
- ADRs livianos (MADR minimal): https://ozimmer.ch/practices/2022/11/22/MADRTemplatePrimer.html · https://adr.github.io/adr-templates/
- Tipos de tarea en otros SDD: https://kiro.dev/docs/specs/ (vibe vs spec) · https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md ("actions, not phases", decision tree) · https://blog.allegro.tech/2026/06/spec-driven-development-best-practices.html (profundidad ∝ riesgo) · https://redreamality.com/blog/-sddbmad-vs-spec-kit-vs-openspec-vs-promptx/ (comparativa)

---
_Aprobación del dev: pendiente_
