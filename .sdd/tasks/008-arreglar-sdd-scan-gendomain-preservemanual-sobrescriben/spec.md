# Spec — tarea 008: Arreglar sdd scan: genDomain/preserveManual sobrescriben y b…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** `sdd scan` regenera `.sdd/c4/{context,containers,components}.md` y `.sdd/domain.md` llamando a `genContext`/`genContainers`/`genComponents`/`genDomain` (`src/lib/c4.js`, `src/lib/domain.js`) y reemplazando TODO el contenido arriba de `<!-- sdd:manual -->` vía `upsertGenerated`/`preserveManual` (`scan.js`/`c4.js`). Eso es correcto la PRIMERA vez (crea el esqueleto), pero en cualquier re-ejecución de `sdd scan` borra silenciosamente todo lo que el dev/agente haya escrito arriba del marcador desde entonces: respuestas a los `❓`/`- [ ] VALIDAR con el equipo`, descripciones de entidades, y — el caso real observado — la sección `## Reglas de negocio` de `domain.md` (BR-001 a BR-035 reemplazadas por el esqueleto vacío al correr `sdd scan` en el paso 3 de la tarea 007).
- **¿Ya existe algo en el repo que lo resuelve total o parcialmente?** Sí, parcialmente: `MANUAL_MARK`/`preserveManual` YA es el mecanismo de "preservar al regenerar", pero su frontera está mal ubicada — protege solo "## Notas del equipo" (debajo del marcador), mientras que TODO el contenido fillable/curable (BR-NNN, glosario, entidades, checkboxes VALIDAR) vive arriba, en la zona que se regenera completa. `sdd find` no encontró ninguna decisión/ADR previo sobre esta frontera, y no hay tests que cubran una segunda corrida de `scan` sobre estos 4 archivos.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí — en vez de un merge sección-por-sección (complejo: distinguir contenido "todavía skeleton" de "ya curado" para cada sección, manejar entidades/containers/components nuevos detectados después de la primera corrida, etc.), alcanza con: **`upsertGenerated` solo escribe estos 4 archivos si NO EXISTEN todavía**; si ya existen, `sdd scan` los deja completamente intactos (no-op). Esto es coherente con el modelo ya documentado en AGENTS.md/BR-036 ("Si tu cambio modifica la arquitectura... actualizá esos archivos COMO PARTE DEL MISMO CAMBIO" — la responsabilidad de mantenerlos vivos es del agente/dev desde la primera edición, no de un re-scan automático). El costo es que las tablas auto-detectadas (containers/components/dependencias/entidades candidatas) quedan congeladas en el estado de la primera corrida — aceptable porque hoy ya son solo el punto de partida que el agente debe completar y mantener a mano.
- **Supuestos del dev que podrían no ser ciertos:**
  - Que el alcance es SOLO `domain.md` (donde se observó la pérdida real): el mismo mecanismo (`upsertGenerated`/`preserveManual`) aplica IGUAL a `context.md`/`containers.md`/`components.md`. Si esos archivos llegan a completarse (checkboxes VALIDAR resueltos, como pide el flujo "Completar los docs" de `sdd-bootstrap` y exige el gate BR-013 de `sdd publish`), un `sdd scan` posterior los volvería a pisar — mismo bug, todavía no observado en este repo porque esos 3 archivos siguen siendo esqueleto (`openQ > 0`). Recomiendo incluir los 4 archivos en el fix, no solo `domain.md`.
  - Que "arreglar" implica un merge inteligente sección-por-sección: la alternativa "generar solo si no existe" (arriba) es más simple, más segura, y suficiente para eliminar la pérdida de datos — sin necesidad de un parser de secciones nuevo.
- **Riesgos y efectos secundarios:**
  - **Tablas/diagramas se congelan tras la primera corrida** (containers, components, dependencias salientes, entidades candidatas, stack detectado, fecha "Generado por sddkit el"): si el código crece, esos datos no se refrescan solos. Mitigación: ya hoy `.sdd/QUESTIONS.md` y `sdd context` son los mecanismos vivos de "qué falta"; el agente actualiza C4/domain.md a mano cuando cambia la arquitectura (ya documentado). No se pierde nada que no se perdiera ya (la sección SIEMPRE se regeneraba igual, con o sin cambios reales en el código).
  - **Repos que YA corrieron `sdd scan` más de una vez** con estos archivos en estado esqueleto (sin curar) seguirán viendo el esqueleto — comportamiento idéntico al actual para ellos, sin regresión.
  - **Mantenimiento**: `genContext`/`genContainers`/`genComponents`/`genDomain` quedan como generadores de "estado inicial" únicamente; siguen usándose tal cual, solo cambia CUÁNDO se invocan (gate de existencia en `upsertGenerated`).
  - **Sin riesgo de seguridad/performance** (cambio de lógica de escritura de archivos de documentación, sin tocar datos de negocio del usuario final).
- **¿Qué pasa si NO se hace?** Cualquier repo que use sddkit y vuelva a correr `sdd scan` después de haber curado `.sdd/domain.md` (BR-NNN) o completado los checkboxes de `.sdd/c4/*.md` pierde ese trabajo sin aviso. El propio repo de sddkit ya lo sufrió dos veces (domain.md generado el 2026-06-13 con BR hasta 035, y borrado de nuevo hoy al ejecutar el paso 3 de la tarea 007).

**Recomendación:** `proceder con cambios` — alcance ampliado a los 4 archivos generados (`context.md`, `containers.md`, `components.md`, `domain.md`), con la estrategia simple "generar solo si no existe; si existe, `sdd scan` no lo toca" (sin merge sección-por-sección).

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: ¿Alcance: solo `domain.md` (donde se observó la pérdida real) o los 4 archivos generados (`context.md`, `containers.md`, `components.md`, `domain.md`), que comparten el mismo mecanismo?
  - Respuesta: los 4 archivos.
- [x] P2: ¿Estrategia: "generar solo si no existe" (simple, recomendada) o merge sección-por-sección (más preciso, mucho más esfuerzo)?
  - Respuesta: generar solo si no existe.
- [x] P3: Con esa estrategia, la tabla "## Dependencias salientes" de `containers.md` (100% derivada del código) también queda congelada tras la primera corrida — ¿aceptable, o esa tabla debería seguir refrescándose siempre como excepción?
  - Respuesta: congelarla también (sin excepción; comportamiento uniforme para los 4 archivos).
- [x] P4: ¿La métrica de impacto puede ser un test de regresión: scan → edición manual arriba del marcador → scan de nuevo → archivo queda byte-a-byte igual a como quedó tras la edición (hoy falla, se pisa)?
  - Respuesta: sí, ese test de regresión.

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** test de regresión (nuevo) que, para cada uno de los 4 archivos (`.sdd/c4/context.md`, `.sdd/c4/containers.md`, `.sdd/c4/components.md`, `.sdd/domain.md`), hace: `sdd scan` (crea el archivo) → edita manualmente arriba del marcador `<!-- sdd:manual -->` (simula contenido curado: agrega una entrada tipo BR-NNN / responde un checkbox `❓`/`- [ ]`) → corre `sdd scan` otra vez → compara el archivo resultante byte-a-byte contra el estado post-edición.
- **Baseline actual:** FALLA — la segunda corrida de `sdd scan` sobreescribe la edición manual con el esqueleto generado de nuevo (0% de preservación; ya observado en producción con BR-001..035 de `domain.md` durante la tarea 007).
- **Resultado esperado:** PASA — 100% de preservación: los 4 archivos quedan byte-a-byte idénticos al estado post-edición tras la segunda corrida de `sdd scan`.
- **Cómo se mide después:** `node --test` (o `sdd test`) sobre el nuevo test agregado en `src/commands/scan.test.js` (o archivo nuevo dedicado).

## Spec refinada

**Historia:** Como agente/dev que usa sddkit, quiero que `sdd scan` no pise el contenido que agregué o editó arriba de `<!-- sdd:manual -->` en `.sdd/c4/*.md` y `.sdd/domain.md`, para poder volver a correr `scan` (p.ej. tras agregar módulos) sin perder reglas de negocio (BR-NNN), respuestas a checkboxes `❓ VALIDAR` ni glosario/entidades ya documentados.

**Criterios de aceptación (formato EARS):**

- CUANDO `sdd scan` corre y alguno de `.sdd/c4/context.md`, `.sdd/c4/containers.md`, `.sdd/c4/components.md` o `.sdd/domain.md` NO EXISTE todavía, EL SISTEMA DEBE generarlo desde cero (mismo esqueleto/heurística de hoy: `genContext`/`genContainers`/`genComponents`/`genDomain` + `preserveManual`), igual que en la primera corrida actual.
- CUANDO `sdd scan` corre y alguno de esos 4 archivos YA EXISTE, EL SISTEMA DEBE dejarlo completamente sin modificar (no-op para ese archivo) — no se invoca a `genContext`/`genContainers`/`genComponents`/`genDomain` ni a `preserveManual` para él.
- CUANDO ninguno de los 4 archivos existe (repo recién iniciado), EL SISTEMA DEBE comportarse exactamente igual que hoy (genera los 4 esqueletos completos) — sin regresión en el flujo de primera corrida.
- SI un archivo existe pero quedó vacío o con contenido no esperado (p.ej. truncado a mano), EL SISTEMA DEBE tratarlo igual que cualquier archivo existente (no-op) — el dev/agente es responsable de su contenido una vez creado, igual que ya ocurre hoy con `.sdd/c4/*.md` debajo de `<!-- sdd:manual -->`.

**Reglas de negocio afectadas** _(citar por ID desde .sdd/domain.md; las nuevas se agregan allí primero)_: nueva **BR-037** (a documentar en `.sdd/domain.md` como parte del plan, análoga en formato a BR-023..036): "Cuando `sdd scan` corre, genera `.sdd/c4/{context,containers,components}.md` y `.sdd/domain.md` SOLO si el archivo todavía no existe; si ya existe, lo deja sin modificar — preserva cualquier contenido agregado o editado arriba de `<!-- sdd:manual -->` (BR-NNN, checkboxes VALIDAR, glosario, entidades) entre corridas".

**Fuera de alcance:**

- Merge sección-por-sección (descartado en P2: mucho más esfuerzo/riesgo para el mismo objetivo).
- Refrescar automáticamente tablas auto-detectadas (containers, components, dependencias salientes, entidades candidatas, stack, fecha "Generado por sddkit el") en corridas posteriores de `sdd scan` — quedan congeladas en el estado de la primera corrida (P3). El agente/dev las actualiza a mano cuando cambia la arquitectura, como ya indica la sección "Arquitectura (modelo C4 vivo)" de AGENTS.md.
- Un flag explícito de "forzar regeneración" (p.ej. `sdd scan --force`) — no fue pedido; si se necesita, es una tarea aparte.
- Cambios al contenido generado por `genContext`/`genContainers`/`genComponents`/`genDomain` en sí — siguen siendo los mismos generadores de "estado inicial", solo cambia CUÁNDO se invocan.

**Impacto en arquitectura/catálogo:** Afecta `src/commands/scan.js` (función local `upsertGenerated`, que pasa de "escribir siempre con `preserveManual`" a "escribir solo si `read(path) === null`") y, en consecuencia, el rol de `preserveManual`/`MANUAL_MARK` en `src/lib/c4.js` (se sigue usando, pero solo en la rama "archivo no existe", donde `oldContent` es `null`). Módulo afectado en `components.md`: "Comandos CLI" (`scan.js`). No introduce una convención nueva de catálogo (no hay variantes a decidir); es un fix de comportamiento documentado como BR-037. No requiere ADR (no es una decisión arquitectónica con alternativas en competencia, sino la corrección de un bug de pérdida de datos ya analizado arriba).

---
_Aprobación del dev: pendiente_
