# ADR 0011 — Detección de endpoints/consumos vía LLM en CI/CD reemplaza extractores regex y driver `sqlite`

> **Mecanismo de detección reemplazado por [ADR-0012](0012-llm-pre-commit-mas-parseo-ci.md)** (Pivot 2) — las decisiones sobre deprecación de sqlite y mysql async-aware siguen vigentes sin cambios.

- **Fecha:** 2026-07-27 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/010

## Contexto

`src/lib/patterns.js` detecta `endpoints`/`consumptions` con extractores por regex (`extractEndpoints`/`extractConsumptions`). Ese enfoque tiene límites estructurales: no puede resolver targets dinámicos — wrappers de cliente HTTP, identificadores derivados en runtime, URLs armadas por concatenación/interpolación fuera del literal que matchea el patrón. El dev pidió aprovechar un LLM para detectar inputs/outputs del sistema de forma más inteligente que un matcher determinista.

Se evaluó correr esa detección en el hook post-commit local (mismo punto de enganche que ADR-0010 usa para `sdd publish --hook` con `driver=sqlite`). Se descartó: invocar un LLM en cada commit local rompe las tres garantías que motivaron ese hook — velocidad (una llamada de red por commit), determinismo (un LLM no es reproducible bit a bit) y funcionamiento offline (el hook de ADR-0010 debe degradar en silencio sin red, un LLM lo requiere por diseño). La alternativa consistente con esas garantías es correr la detección LLM en CI/CD, al mergear a la rama principal — el mismo punto donde ADR-0003 ya ubica `sdd publish` para el perfil de grafo compartido.

Esto además implica revisar el perfil `sqlite` de ADR-0002: ese driver asume un grafo local de un solo dev, publicado desde su propia máquina (ADR-0010) — un modelo incompatible con "la detección corre en CI/CD", porque un repo sin CI/CD no tiene dónde ejecutar el LLM. Mantener `sqlite` como perfil alternativo sin LLM (con el regex viejo) fue considerado y descartado explícitamente por el dev en el chat de la tarea 010, para simplificar el sistema a un solo camino de detección.

## Decisión

- **Trigger**: la detección LLM corre dentro de `sdd publish` cuando éste se ejecuta en un pipeline de CI/CD, en push/merge a la rama principal — nunca en un commit local (BR-044). Corre independientemente de si el código llegó vía `/sdd-task` o por un commit fuera del flujo SDD (BR-044).
- **Scope**: incremental. Se calculan los archivos modificados entre el último `commitHash` publicado y `HEAD`, y solo esos archivos se envían al LLM — nunca un re-escaneo del repo completo (BR-045).
- **Proveedor**: Anthropic Messages API vía el SDK oficial `@anthropic-ai/sdk`, invocado en modo headless (sin sesión interactiva). Modelo configurable en `.sdd/config.json → llm.model`, default `claude-haiku-4-5-20251001`. `temperature: 0.1` para minimizar no-determinismo entre corridas sobre el mismo diff.
- **Salida**: forzada por tool-use/JSON schema fijo — `endpoints: [{method, path, file, confidence}]`, `consumptions: [{method, target, file, confidence}]` — el sistema rechaza/reintenta una respuesta que no valide contra ese schema (BR-046).
- **Merge del resultado**: el resultado válido para los archivos del diff reemplaza únicamente las entradas de `capabilities.endpoints`/`consumptions` de esos archivos, preservando sin cambios las entradas de archivos no incluidos en el diff (BR-047).
- **Fallback no bloqueante**: si la invocación al LLM falla, agota reintentos o excede timeout, las entradas de los archivos afectados quedan marcadas `pending`, el resto del snapshot se publica igual, y `sdd publish` termina con exit 0 — degradación silenciosa análoga a BR-025 (BR-048).
- **Driver de storage**: `sqlite` (ADR-0002/ADR-0010) se **deprecia por completo**. Único driver soportado para el grafo de impacto: `mysql` (BR-049). `sdd setup` deja de ofrecer `sqlite` como opción; `sdd doctor` reporta como error de configuración cualquier repo que lo tenga configurado. Un repo con `driver=mysql` pero sin CI/CD corriendo `sdd publish` lo reporta explícitamente en `sdd context`/`sdd doctor` (BR-050).
- **Sin cambios en el consumo del grafo**: `src/lib/matching.js`/`sdd impact` no cambian de lógica (exacto / posible / nunca-match-en-dynamic) — lo único que cambia es quién produce las entradas `endpoints`/`consumptions` (LLM en vez de regex), no cómo se interpretan después.

## Alternativas consideradas

- **Extender el regex con más patrones deterministas**: descartado — insuficiente para el objetivo del dev; los casos que motivaron esta tarea (wrappers, identificadores derivados, URLs armadas en runtime) no son resolubles con más reglas sintácticas, requieren razonamiento semántico sobre el código.
- **Correr el LLM en el hook post-commit local** (mismo punto que ADR-0010): descartado — rompe velocidad (red por commit), determinismo y el funcionamiento offline que ADR-0010 exige explícitamente para ese hook.
- **Mantener `sqlite` como perfil alternativo sin LLM** (regex viejo solo para ese driver): descartado explícitamente por el dev en el chat de la tarea 010, para simplificar el sistema a un único camino de detección y no mantener dos motores de extracción en paralelo indefinidamente.

## Consecuencias

- **Supersede ADR-0002** (storage enchufable sqlite/mysql) y **ADR-0010** (hook post-commit para `driver=sqlite`). Ambos ADRs fueron retirados del árbol en la limpieza de historial del 2026-08-01 (recuperables del historial git).
- sddkit mismo usa hoy `graph.driver: "sqlite"` en su propio `.sdd/config.json` y va a necesitar migrar a `mysql` + CI/CD — tratado como tarea aparte (paso 15 del plan de la tarea 010), no resuelto por este ADR.
- Nueva dependencia externa que sddkit no tenía hasta ahora: red y credenciales (`ANTHROPIC_API_KEY`) requeridas en el entorno de CI/CD para que `sdd publish` pueda invocar el LLM. Repos sin esa credencial configurada no pueden completar la detección — degradan vía el fallback `pending` de BR-048.
- Nueva dependencia de npm: `@anthropic-ai/sdk`.
- El regex de `src/lib/patterns.js` deja de ser la fuente de verdad para `endpoints`/`consumptions` en el flujo de publish de CI/CD; su destino final (retirado del todo vs. mantenido como fallback local de debugging) queda fuera del alcance de este ADR.
