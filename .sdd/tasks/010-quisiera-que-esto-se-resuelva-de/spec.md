# Spec — tarea 010: Quisiera que esto se resuelva de una manera mucho mas inteli…

> Estado: borrador. El agente completa este archivo con la spec formal. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como mantenedor de un repo que usa sddkit, quiero que 4 archivos vivos (Inputs, Outputs, Entidades, Casos de uso) se mantengan siempre al día vía un LLM que corre en el pre-commit, para que la CI pueda parsearlos determinísticamente al mergear y poblar un grafo con TODO el I/O real del sistema (no solo HTTP: colas, jobs, storage, DBs) más su capa de negocio, con metadata de autoría calculada por la CI misma.

> **Nota de versión:** esta spec reemplaza el mecanismo del Pivot 1 (BR-044 a BR-048: detección LLM con salida JSON, disparada en CI por diff incremental). Esas 4 reglas quedan **supersedidas** — el trigger pasa de "CI al mergear" a "pre-commit en cada commit", y el contenido generado pasa de JSON estructurado a texto en 2 archivos Markdown existentes. BR-049 y BR-050 (deprecación de `sqlite`, aviso de "requiere CI/CD") **no cambian** — siguen vigentes y ya implementadas.

### Criterios de aceptación (formato EARS)

1. **Trigger: pre-commit, siempre** —
   CUANDO se ejecuta el hook pre-commit de git,
   EL SISTEMA DEBE invocar un LLM para completar/actualizar las secciones Inputs y Outputs (en `.sdd/c4/components.md`) y Casos de uso (en `.sdd/domain.md`, junto a Entidades que ya existe), en TODOS los commits, sin filtrar por relevancia de los archivos modificados.

2. **Clasificación de las 4 categorías** —
   EL SISTEMA DEBE clasificar lo detectado así: **Inputs** = cualquier disparador de proceso (endpoint HTTP, listener de queue, job programado); **Outputs** = cualquier cliente de salida (llamada HTTP saliente, escritura a S3/FTP, mensaje a una queue, escritura a una base de datos); **Entidades** = entidades de negocio administradas (ya existente); **Casos de uso** = responsabilidades/casos de uso del sistema.

3. **No bloqueante ante fallo del LLM** —
   SI la invocación al LLM en el pre-commit falla (sin red, sin API key, timeout, rate-limit),
   EL SISTEMA DEBE dejar el commit continuar sin bloquear, preservando las secciones en su última versión válida, y loguear una advertencia (sin abortar el commit).

4. **Preservación del resto del archivo** —
   CUANDO el LLM actualiza Inputs/Outputs/Casos de uso,
   EL SISTEMA DEBE escribir solo esas secciones, preservando intacto el resto de `components.md`/`domain.md` (mismo patrón de sección generada/preservada ya usado en el proyecto, BR-037).

5. **CI parsea determinísticamente, sin volver a invocar LLM** —
   CUANDO `sdd publish --ci` corre al mergear a la rama principal,
   EL SISTEMA DEBE parsear (sin LLM, determinístico) las secciones Inputs/Outputs/Entidades/Casos de uso del commit mergeado y poblar 4 tablas separadas en el graphstore `mysql` (una por categoría), relacionadas entre sí por `canonicalName` del sistema.

6. **Metadata de autoría calculada por CI** —
   CUANDO la CI puebla esas 4 tablas,
   EL SISTEMA DEBE agregar metadata de autoría (quién, cuándo, en qué commit) calculada vía `git blame`/metadata del commit — nunca escrita por el LLM dentro del contenido de las secciones.

7. **Deprecación del driver `sqlite`** _(sin cambios respecto al Pivot 1, ya implementado)_ —
   EL SISTEMA DEBE dejar de ofrecer `graph.driver: "sqlite"` como perfil soportado.

8. **Repo sin CI/CD configurado** _(sin cambios respecto al Pivot 1, ya implementado)_ —
   SI un repo con driver compartido configurado no tiene un pipeline de CI/CD corriendo `sdd publish`,
   EL SISTEMA DEBE reportarlo explícitamente en `sdd context`/`sdd doctor`.

### Reglas de negocio afectadas

- **BR-044 a BR-048** — **supersedidas** por BR-051 a BR-056 (mecanismo del Pivot 1: JSON en CI). Se marcan en `.sdd/domain.md` con nota de reemplazo, sin borrarlas.
- **BR-049** — Deprecación de `graph.driver: "sqlite"` (criterio 7) — vigente, sin cambios.
- **BR-050** — Reporte "requiere CI/CD" (criterio 8) — vigente, sin cambios.
- **BR-051** _(nueva)_ — Trigger pre-commit, siempre, sin filtrar por relevancia (criterio 1).
- **BR-052** _(nueva)_ — Clasificación Inputs/Outputs/Entidades/Casos de uso (criterio 2).
- **BR-053** _(nueva)_ — Fallback no bloqueante ante fallo del LLM en pre-commit (criterio 3).
- **BR-054** _(nueva)_ — Preservación del resto del archivo al escribir las secciones (criterio 4).
- **BR-055** _(nueva)_ — CI parsea determinísticamente y puebla 4 tablas relacionadas por sistema (criterio 5).
- **BR-056** _(nueva)_ — Metadata de autoría calculada por CI, no por el LLM (criterio 6).

### Fuera de alcance

- **Herramienta de grafo/PR-bot** que explota la DB poblada — motivación futura, tarea aparte.
- **Selección de librería de parsing Markdown concreta** — se decide en la fase de plan.
- **Relajar la semántica de matching de `sdd impact`** — sigue fuera de alcance, sin cambios.
- **Migrar datos ya publicados bajo el schema del Pivot 1** (columnas JSON `endpoints`/`consumptions` en `systems`) al nuevo schema de 4 tablas — no hay dato real publicado todavía (sddkit no tiene grafo propio configurado), no hace falta migrador.

### Impacto en arquitectura/catálogo

- **Módulos afectados:** `src/lib/llmClient.js`/`llmDetect.js` (pasan de JSON endpoints/consumptions a texto de 4 secciones Markdown), `src/commands/publish.js` (se retira el bloque de detección-en-CI del Pivot 1, se agrega el parser Markdown→DB), `src/lib/graphstore/mysql.js` (schema nuevo: 4 tablas en vez de columnas JSON blob en `systems`), `src/lib/hooks.js`/`setup.js` (nuevo hook pre-commit que invoca el LLM), `.sdd/c4/components.md` (secciones nuevas Inputs/Outputs), `.sdd/domain.md` (sección nueva Casos de uso).
- **ADR:** requiere ADR nuevo (0012) que documenta el reemplazo del mecanismo de detección del ADR-0011 (CI-JSON) por LLM-en-pre-commit + parseo-en-CI. ADR-0011 queda marcado como parcialmente reemplazado (sus decisiones sobre `sqlite`/`mysql` async siguen vigentes; su mecanismo de detección no).

---
_Aprobación del dev: aprobado en chat 2026-07-29._
