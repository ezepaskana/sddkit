# Requisito original — tarea 008

> Capturado verbatim el 2026-06-25. **No editar este archivo**: el refinamiento va en spec.md.

Bug: sdd publish no encuentra better-sqlite3 instalado globalmente. sqlite.js usa import('better-sqlite3') (ESM dynamic import) cuya resolución parte de import.meta.url en {prefix}/lib/node_modules/sddkit/ y no traversa hasta {prefix}/node_modules/ donde npm instala deps globales separadas. Fix: reemplazar por createRequire(import.meta.url)('better-sqlite3') que usa resolución CJS y sí traversa correctamente la jerarquía de node_modules globales.
