# Guías de respuesta por tipo de pregunta (modo standalone)

Cada guía tiene dos columnas: **al chat** (≤ 150 palabras, hallazgo + 2-4 opciones, y frenás) y **a la nota** (`.sdd/notes/<slug>.md`, sin límite). Investigás todo; mostrás poco.

Tres reglas que valen para todos los formatos:

- **Cada opción dice el resultado**, no la tarea: `→ podés ver plazas por barrio`, no "implementar el loader" (BR-068).
- **Cerrá preguntando** algo respondible: "¿cuál arranco?", "¿dale?" (BR-068).
- **Traducí tu jerga** en 3-4 palabras; las rutas reales (`archivo:línea`) se citan tal cual (BR-067).

## Bug / comportamiento inesperado

- **Chat:** observado vs esperado en una línea → causa raíz con `archivo:línea` → opciones: (1) te muestro el fix → sabés cuánto trabajo es · (2) las otras causas candidatas → descartás que sea otra cosa · (3) cómo reproducirlo → lo verificás vos. **¿Cuál ves?**
- **Nota:** todas las causas en orden de impacto, archivos con su rol, el fix descrito (nunca aplicado), cómo se reproduce.

## Comprensión (¿cómo funciona X?)

- **Chat:** 2-3 oraciones de resumen, con diagrama Mermaid si el flujo tiene 3+ pasos o actores → opciones: (1) un paso en detalle → entendés dónde tocar · (2) los gotchas → evitás romperlo · (3) quién lo llama → medís el impacto. **¿Qué abrimos?**
- **Nota:** flujo paso a paso (`archivo.js:función()` por paso), archivos clave y su rol, gotchas no evidentes (side effects, orden de ejecución, env vars, dependencias implícitas).

## Brainstorm (¿cómo podríamos hacer X?)

- **Chat:** cómo funciona hoy en una línea (si no existe, decilo) → **las opciones SON la respuesta**: 2-4, una línea cada una + qué ganás, con tu recomendación marcada. **¿Con cuál voy?**
- **Nota:** pros y contras concretos del proyecto por opción, las descartadas con su motivo, precedentes en el repo.

## Revisión (¿está bien cómo está X?)

- **Chat:** el hallazgo que más importa, con archivo y riesgo → opciones: (1) el resto de lo que preocupa → ves el panorama completo · (2) cómo lo arreglaría → salís con un plan · (3) qué está bien → sabés qué no tocar. **¿Seguimos por dónde?**
- **Nota:** todo lo bueno (específico: no "es limpio" sino "el manejo de errores en `validate.js` cubre los 3 casos"), todo lo que preocupa con archivo y riesgo, sugerencias priorizadas alto/medio/bajo, descritas, no implementadas.

## Análisis de impacto (¿qué se rompe si cambio X?)

- **Chat:** riesgo neto (alto/medio/bajo) + esfuerzo en magnitud (1 archivo trivial / 5-10 moderado / refactor amplio) → opciones: (1) los dependientes → sabés qué tocar · (2) los efectos indirectos → evitás la sorpresa en producción · (3) el orden de migración → lo hacés sin romper nada. **¿Qué necesitás ver?**
- **Nota:** dependientes directos (`sdd impact` si hay grafo), efectos indirectos (contratos de API, formato de output que otros consumen, side effects en filesystem o estado global), justificación del riesgo.

## Roadmap o análisis de varios temas

Es el caso que más se desborda, y el que más jerga genera: los objetivos numerados que inventaste (`Z1`, `Z3`) no significan nada para el dev. **Nombralos por lo que hacen.**

- **Chat:** el bloqueante en una línea → menú de temas en castellano (`el modelo de datos · las licencias · cómo clasificamos · seguridad`) → **¿cuál abrimos?**
- **Nota:** el roadmap completo con sus códigos, la tabla comparativa, las fuentes.
