# ADR 0009 — infraResources/infraEdges extienden `systems` (no tablas nuevas)

- **Fecha:** 2026-06-13 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/003

## Contexto

La Fase 3 (scanner de Terraform) necesita persistir, junto al snapshot de cada sistema (BR-013), los recursos compartibles y las aristas de infraestructura detectados por el scanner (BR-017/BR-018/BR-019): `infraResources` (`{name, arn, type, address}`) e `infraEdges` (`{from, to, type, action?, confidence}`). El storage del grafo (BR-012) ya tiene una tabla `systems` con el snapshot por `canonicalName`, poblada en tarea 002 por dos drivers (`sqlite.js`/`mysql.js`). Hay que decidir cómo modelar estos datos nuevos: tablas relacionales nuevas con FK a `systems`, o extender la fila de `systems` que ya existe. El volumen es bajo (un puñado de recursos/aristas por sistema) y el consumo es siempre "todos los de un sistema" o "buscar un recurso en todos los sistemas".

## Decisión

Extender la tabla `systems` (BR-012) con dos columnas JSON nuevas, `infra_resources` e `infra_edges` (default `'[]'`), publicadas por el mismo `publishSystem` e hidratadas por el mismo `rowToSystem` que ya maneja el resto del snapshot — sin tablas nuevas. La correlación `confirmado`/`potencial` (ADR-0006) NO se materializa en publish: se calcula en tiempo de consulta con `queryInfraImpact` (estilo `matching.js`, en memoria sobre `listSystems()`). La migración es idempotente (`ALTER TABLE ... ADD COLUMN` con detección de columna ya existente) en ambos drivers, aplicada sobre las filas ya publicadas en tarea 002.

## Alternativas consideradas

- **Tablas nuevas con FK a `systems` (`infra_resources`/`infra_edges` relacionales):** descartada — obliga a JOINs en toda lectura y a migraciones más invasivas en los dos drivers (creación de tablas, índices, FKs, orden de borrado en upsert) sin necesidad real dado el volumen bajo y el patrón de acceso "todo el conjunto de un sistema de una". El costo de modelado supera el beneficio.
- **Grafo/storage separado para infra (módulo o tabla aparte de los snapshots):** descartada — duplicaría la identidad de sistema y el ciclo de publicación de BR-012 (otro upsert por `canonicalName`, otra fuente de drift), partiendo en dos lo que conceptualmente es un único snapshot por sistema.

## Consecuencias

- El `ALTER TABLE ... ADD COLUMN` debe ser idempotente y no romper las filas ya publicadas en tarea 002: esas filas quedan con `infra_resources='[]'`/`infra_edges='[]'` hasta su próximo `sdd publish`. Hay que detectar la columna existente antes de agregarla (catálogo del driver) para que correr la migración dos veces no falle.
- `queryInfraImpact` opera en memoria sobre `listSystems()` (no hay índice por ARN/recurso a nivel SQL), heredando el mismo límite de escalabilidad que ADR-0002 — aceptable para el volumen de sistemas/recursos previsto.
- Calcular `confirmado`/`potencial` en consulta y no en publish mantiene la correlación versionada con el código (un cambio en la heurística de ADR-0006 no exige re-publicar todos los sistemas), a costa de recomputarla en cada `sdd impact`.
- La forma JSON de las dos columnas evoluciona sin migración de esquema (es texto), pero pierde validación a nivel base de datos: la garantía de forma queda en el código que serializa/parsea (BR-019).
