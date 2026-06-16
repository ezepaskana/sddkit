# ADR 0007 — Join keys del grafo: ARN/nombre (infra), método+ruta normalizada (HTTP), nombre canónico curado (sistemas)

- **Fecha:** 2026-06-12 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/001

## Contexto

El grafo central conecta hechos publicados por repos distintos: los consumos salientes de un repo (Fase 1) deben emparejarse con los endpoints expuestos de otro (matching), y las aristas de infraestructura (Fase 3) deben emparejarse con los recursos que otros sistemas usan. Para eso se necesitan claves de unión (join keys) estables entre repos publicados de forma independiente.

## Decisión

Tres tipos de join key, según el tipo de hecho:

1. **Infraestructura** → ARN o nombre de recurso, tal como aparece en `terraform show -json` (ADR-0005).
2. **HTTP** → método + ruta normalizada (p.ej. `/plants/:id` ≡ `/plants/{id}`) — endpoints expuestos (`capabilities.endpoints`) ↔ consumos detectados (`capabilities.consumptions`, Fase 1) se emparejan por esta clave.
3. **Sistemas/repos** → nombre canónico, con **curación manual mínima** en una tabla `systems` (Fase 2).

## Alternativas consideradas

- **Identificador global único (UUID) por recurso/sistema, asignado por un registro central previo:** descartado — requeriría un paso de registro previo a cualquier publish, y los recursos de infra ya tienen identificadores naturales y estables (ARNs); para HTTP, método+ruta es el identificador natural que ya usan ambos lados (cliente y servidor).
- **Matching difuso de nombres de sistema sin tabla curada** (similaridad de strings sobre el nombre del paquete/repo): descartado para sistemas — nombres de repos/paquetes varían demasiado entre convenciones (`backend-service` vs `payments-backend` vs "Payments Backend") como para confiar en matching automático; se prefiere curación manual mínima (una tabla chica, editada a mano) sobre heurísticas que fallarían silenciosamente.

## Consecuencias

- Fase 1 (esta tarea) debe producir rutas de forma consistente y normalizable: lo que hoy hace `extractEndpoints` para rutas expuestas (`/:id` con Express, etc.) y lo que el nuevo detector de consumos produzca deben poder normalizarse con la MISMA función de normalización en Fase 2 — esto no bloquea Fase 1, pero la spec de Fase 1 debe evitar formatos de ruta que compliquen esa normalización futura (p.ej., mantener placeholders reconocibles en vez de valores interpolados).
- La tabla `systems` con nombres canónicos es trabajo de curación manual que se introduce en Fase 2; Fase 1 no la necesita (opera sobre un solo repo).
- Si dos repos publican el mismo recurso de infra con nombres distintos para el mismo ARN, el ARN es la clave que los une — no el nombre.
