# Ejemplo de análisis crítico (nivel de profundidad esperado — 190 palabras)

**Requisito:** _"agregar un cache Redis para el endpoint de plantas porque está lento"_. Tipo `feature`, riesgo alto (dependencia nueva).

## Análisis crítico

- **Problema real:** latencia de GET /plants ~2s reportada por el dev.
- **¿Ya existe?** No hay cache, pero `plantService.list()` (`src/services/plantService.js:41`) hace N+1 queries, una por medidor.
- **Alternativa más simple:** un JOIN elimina el N+1 — 1 paso vs 6 (Redis suma dependencia, invalidación y deploy).
- **Supuestos cuestionados:** que la lentitud es por volumen de lectura; con 200 plantas el N+1 la explica entera.
- **Riesgos:** invalidar cache sobre datos de facturación viola BR-003 (facturación usa siempre la última medición).
- **¿Si no se hace?** El endpoint sigue lento; nada se rompe.
- **Detección y manejo de fallas:** si Redis cae, `cache.plants.hit_rate` va a 0 y la latencia vuelve a ~2s; el endpoint debe hacer fallback a la query directa y loguear warning, nunca romper.

**Recomendación:** `reconsiderar` — arreglar el N+1 y medir; si la latencia sigue sobre el objetivo, el cache se evalúa con ADR.

## Métrica de impacto

- **Baseline:** P95 de GET /plants = 2,1s (20 requests, log de `timing.js`). **Esperado:** < 400ms. **Cómo se mide después:** el mismo log.
