# Guías de respuesta por tipo de pregunta (modo standalone)

No son formularios: son el orden que hace útil la respuesta. Adaptá las secciones al caso, sacá las que no aporten y citá siempre `archivo:línea` en vez de describir de memoria. Cerrá con handoff (`/sdd-task`) solo si el dev quiere actuar.

## Bug / comportamiento inesperado

Observado vs esperado → causa raíz con `archivo:línea` (varias causas: en orden de impacto) → archivos involucrados con su rol → fix **descrito, no aplicado**.

## Comprensión (¿cómo funciona X?)

Resumen de 2-3 oraciones → flujo paso a paso (`archivo.js:función()` por paso) → archivos clave y su rol → gotchas no evidentes (side effects, orden de ejecución, env vars, dependencias implícitas).

## Brainstorm (¿cómo podríamos hacer X?)

Cómo funciona hoy (con archivos; si no existe, decilo) → 2-4 opciones con pros y contras concretos del proyecto → recomendación con su razón → pregunta de cierre al dev. Más de 4 opciones diluye la discusión.

## Revisión (¿está bien cómo está X?)

Qué está bien (específico: no "es limpio" sino "el manejo de errores en `validate.js` cubre los 3 casos de BR-004") → qué preocupa, con archivo y riesgo → sugerencias priorizadas (alto/medio/bajo), descritas, no implementadas.

## Análisis de impacto (¿qué se rompe si cambio X?)

Dependientes directos (usá `sdd impact` si hay grafo) → efectos indirectos (contratos de API, formato de output que otros consumen, side effects en filesystem o estado global) → esfuerzo de migración en magnitud (1 archivo trivial / 5-10 moderado / refactor amplio) → riesgo neto alto/medio/bajo con una oración de justificación.
