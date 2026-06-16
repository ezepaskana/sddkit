# Requisito original — tarea 001

> Capturado verbatim el 2026-06-16. **No editar este archivo**: el refinamiento va en spec.md.

CI falla porque los tests importan better-sqlite3 (optionalDependency) de forma dura; hacer los tests resilientes (skip si el nativo no esta, igual que el codigo de produccion degrada per ADR-0008/BR-025) y a la vez garantizar en ci.yml que el nativo se instale/compile, para no perder cobertura del graph store sqlite. CI rojo->verde en node 18/20/22.
