# ADR 0008 — Driver SQLite del grafo: `better-sqlite3` como dependencia opcional (lazy)

- **Fecha:** 2026-06-13 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/002

## Contexto

ADR-0002 decidió que el grafo central (Fase 2) usa SQLite como driver local por defecto, pero dejó abierta la elección concreta de librería: `node:sqlite` (built-in desde Node ≥22) vs `better-sqlite3` (dependencia npm con bindings nativos, Node ≥18). Esta sería la primera dependencia de runtime de sddkit, que hoy tiene cero. El entorno de desarrollo actual corre Node v20.20.2, con `engines.node` en `>=18`.

## Decisión

El driver SQLite del grafo usa **`better-sqlite3`** como dependencia **opcional** (`optionalDependencies` en `package.json`), cargada con `import()` perezoso solo cuando `.sdd/config.json → graph.driver = "sqlite"` y se invoca una operación del grafo. `engines.node` se mantiene en `>=18` — no hay bump de versión de Node.

Si `better-sqlite3` no está instalada al usar el driver sqlite, `sdd publish`/`sdd impact`/etc. fallan con un mensaje claro (`Falta better-sqlite3. Instalalo con: npm i better-sqlite3`) sin afectar al resto de los comandos de sddkit (consistente con "degradar con mensaje claro si el grafo no está configurado", ADR-0002/0003).

## Alternativas consideradas

- **`node:sqlite` (built-in, Node ≥22):** mantiene "cero dependencias", pero exige subir `engines.node` de `>=18` a `>=22`. El entorno actual (Node v20.20.2) no lo soporta — ni el dev ni los agentes podrían correr ni testear esta feature sin actualizar Node primero. Descartado por ser un bloqueante práctico inmediato, no solo una decisión de diseño a futuro.
- **`better-sqlite3` como dependencia obligatoria (no opcional):** descartado — convertiría a sddkit en un paquete con bindings nativos obligatorios para TODOS los usuarios, incluidos los que nunca usan el grafo (mayoría hoy). Rompe el principio local-first/cero-config para el caso de uso base (C4 vivo, catálogo, tareas SDD) sin aportarle nada.

## Consecuencias

- Primera entrada en `optionalDependencies` de `package.json` — `domain.md`/catálogo deben actualizarse para reflejar "cero dependencias obligatorias" (ya no "cero dependencias" sin calificar).
- El código del driver sqlite (`src/lib/graphstore/sqlite.js` o similar) debe cargar `better-sqlite3` vía `import()` dentro de la función que lo necesita, nunca en el top-level del módulo, para no fallar al importar el CLI completo si no está instalada.
- Instalar `better-sqlite3` implica compilación de bindings nativos (prebuilds por plataforma/ABI de Node) — puede fallar en plataformas no soportadas; ese caso cae en el mismo mensaje de degradación.
- Si en el futuro `node:sqlite` se estabiliza ampliamente y el proyecto sube su `engines.node` mínimo por otras razones, esta decisión puede revisarse con un ADR nuevo que la reemplace — no se edita este archivo para cambiar la historia.
