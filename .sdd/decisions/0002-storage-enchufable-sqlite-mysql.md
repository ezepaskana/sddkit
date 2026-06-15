# ADR 0002 — Storage del grafo enchufable: SQLite por defecto (local), MySQL para equipo

- **Fecha:** 2026-06-12 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/001

## Contexto

El grafo central (Fase 2) necesita persistencia. Hay dos perfiles de uso muy distintos: (a) un dev individual que quiere consultar impacto entre varios repos propios, sin levantar infraestructura; (b) un equipo que ya opera infraestructura compartida y quiere un grafo único para todos sus repos/CI.

## Decisión

Storage **enchufable** detrás de una interfaz única (`publishSystem`, `querySystem`, `queryImpact`, `queryCapability` — ver `src/lib/graphstore.js` o similar, a definir en la spec de Fase 2). Dos drivers:

- **SQLite** — default, cero-config, archivo local. Cubre el perfil "un dev con varios repos propios" (principio local-first de sddkit).
- **MySQL** — para despliegue de equipo, ya operado por el equipo (encaja con la capa comercial). Config de conexión en `.sdd/config.json → graph`.

La elección concreta de librería para SQLite (`node:sqlite` de Node ≥22 vs `better-sqlite3` como dependencia opcional) y para MySQL (`mysql2` como dependencia opcional) queda para la spec de Fase 2 — ese trade-off de dependencias merece su propio ADR cuando se resuelva.

## Alternativas consideradas

- **Un solo backend, solo SQLite:** descartado — no sirve para un equipo que necesita compartir el grafo entre varias máquinas/CI.
- **Un solo backend, solo MySQL:** descartado — rompe cero-config/local-first; un dev individual probando la Fase 2 tendría que levantar un MySQL solo para evaluar la feature.
- **Otro motor (Postgres, archivo JSON plano, etc.):** Postgres no encaja con la capa comercial ya operada por el equipo (MySQL) y agregaría una dependencia nueva sin necesidad; un archivo JSON plano no escala razonablemente a queries de impacto (joins por método+ruta, ARN, nombre canónico).

## Consecuencias

- Dos drivers a mantener detrás de una interfaz común; los tests de Fase 2 deben correr contra ambos (o al menos contra SQLite en CI, con MySQL como integración opcional).
- `sdd impact`/`sdd publish` deben degradar con mensaje claro si el grafo no está configurado (ningún driver elegido) — sin romper los comandos locales.
- Esta es la primera decisión de sddkit que potencialmente introduce una dependencia de npm (hoy el proyecto tiene cero). La spec de Fase 2 debe resolver explícitamente si eso ocurre y con qué alcance (opcional vs obligatoria).
