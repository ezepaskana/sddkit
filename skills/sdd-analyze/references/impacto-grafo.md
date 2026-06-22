# ¿A quién impacto? (análisis de impacto vía grafo)

Este paso es **opcional e informativo** — solo aplica si `.sdd/config.json` → `graph` está configurado. Sin grafo, omitilo (degrada en silencio).

## Endpoints y sistemas

Si la tarea menciona un endpoint/ruta/recurso que existe en tu índice (corre `sdd find` o mirá `capabilities.endpoints`), corré `sdd impact <MÉTODO> <ruta>` (o `sdd impact <sistema>` para el sentido inverso) y citá el resultado — es informativo, no bloquea (BR-014).

## Recursos de infraestructura

Si la tarea menciona un recurso de infraestructura (bucket, cola, topic, tabla, ARN) y el grafo tiene sistemas con `infraEdges` publicados, `sdd impact <ARN-o-nombre>` también puede responder qué depende de ese recurso (BR-021) — mismo espíritu informativo.
