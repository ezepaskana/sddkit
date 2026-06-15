# ADR 0001 — Los archivos del repo son la fuente de verdad; el grafo central es una proyección publicada

- **Fecha:** 2026-06-12 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/001

## Contexto

El requisito de "grafo organizacional de impacto cross-sistema" (REQUISITO-grafo-impacto.md) introduce por primera vez una base de datos central compartida entre repos. Todo lo demás en sddkit (C4 vivo, catálogo de convenciones, dominio, tareas, ADRs) vive como archivos versionados en git del repo, revisables en code review. Había que decidir si la DB central del grafo se vuelve una nueva fuente de verdad (con su propio ciclo de edición) o si se subordina a los archivos de cada repo.

## Decisión

Los archivos de cada repo (`.sdd/c4/`, `.sdd/patterns.json → capabilities`, `.sdd/domain.md`, etc.) siguen siendo la **única fuente de verdad**, versionada en git y revisable. La base de datos central del grafo (Fase 2) es una **proyección publicada** (snapshot) de esos archivos — nunca al revés. Nadie edita el grafo central para "corregir" la arquitectura de un repo; la corrección se hace en el repo de origen y se vuelve a publicar.

## Alternativas consideradas

- **DB central editable como fuente propia** (con UI o API de edición directa): descartada. Rompería el principio de que los archivos versionados en git son la fuente de verdad, introduciría drift entre lo documentado en el repo y lo que dice el grafo, y requeriría un mecanismo de sincronización inversa (DB → archivos) que nadie pidió.
- **Sin DB central, solo consultas en vivo a cada repo** (clonar/leer otros repos al vuelo): descartada para Fase 1/2. No cumple el objetivo de "responder en segundos y sin explorar otros repos" — requeriría red, acceso y tiempo de exploración por cada consulta de impacto.

## Consecuencias

- El grafo puede estar desactualizado respecto al estado real de un repo si no se volvió a publicar; por eso cada publicación lleva hash de commit + timestamp (ver ADR-0003) para detectar entradas viejas.
- Cualquier corrección de un hecho de arquitectura (un endpoint mal detectado, un C1 incompleto) se hace en el repo de origen vía `sdd scan`/`sdd publish`, nunca parcheando el grafo central directamente.
- El grafo central puede regenerarse desde cero re-publicando todos los repos — no es estado irrecuperable.
