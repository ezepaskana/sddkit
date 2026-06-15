# Ejemplo de análisis crítico (nivel de profundidad esperado)

**Requisito**: "agregar un cache Redis para el endpoint de plantas porque está lento"

**¿Qué problema real resuelve?** Latencia alta en GET /plants (el dev reporta ~2s).

**¿Ya existe algo?** No hay cache, pero `plantService.list()` hace N+1 queries (una por medidor). El problema probablemente no es la falta de cache.

**¿Alternativa más simple?** Sí: un JOIN en la query elimina el N+1. Estimado: 1 paso vs 6 (Redis = dependencia nueva, invalidación, deploy).

**Supuestos del dev cuestionados:** que la lentitud es por volumen de lectura (no hay evidencia; con 200 plantas el N+1 explica todo).

**Riesgos de la propuesta original:** invalidación de cache con datos de facturación = bugs sutiles que violan BR-003 (la facturación usa siempre la última medición).

**¿Qué pasa si no se hace?** El endpoint sigue lento; nada se rompe.

**Recomendación: reconsiderar** — propongo arreglar el N+1 primero y medir (la métrica de impacto lo confirma o refuta). Si después de eso la latencia sigue > objetivo, el cache se evalúa con un ADR.

## Pregunta 7 (ejemplo de respuesta)

Pensando en la propuesta original del dev (cache Redis para GET /plants):

**Detección (cómo nos enteraríamos):** si Redis se cae o se desconfigura el TTL, el hit-rate del cache cae a 0% (métrica `cache.plants.hit_rate`) y la latencia de GET /plants vuelve a subir a ~2s, visible en el dashboard de latencia del endpoint. Si Redis no responde, los logs muestran errores de conexión tipo `ECONNREFUSED` o timeouts del cliente Redis al hacer `get`/`set`.

**Reacción:** el endpoint no debe romperse — ante un error de Redis, el código debe hacer fallback a la query directa (la misma que ya existe sin cache) y responder igual, aunque más lento. El error de conexión a Redis se loguea como warning (no error crítico, porque el endpoint sigue funcionando) para que el equipo lo note sin que dispare una alerta de incidente.
