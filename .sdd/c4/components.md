# C4 — Nivel 3: Componentes

> Generado por sddkit el 2026-06-15. Base: `src`.

| Módulo | Archivos | Rol |
|---|---|---|
| `src/lib` | 24 | Librería interna |
| `src/commands` | 24 | Comandos |
| `(raíz)` | 3 | ❓ por validar |

```mermaid
flowchart TD
  bin["bin/sdd.js<br/>entry point CLI"] --> commands["src/commands/*<br/>init, scan, setup, task,<br/>publish, impact, context, validate…"]
  commands --> lib["src/lib/*<br/>agentsmd, c4, domain, catalog,<br/>patterns, hooks, llmClient, livingDocs…"]
  lib --> graphstore["src/lib/graphstore/*<br/>index (wrap), mysql, matching"]
  graphstore --> mysql[("MySQL<br/>grafo compartido")]
```

## ❓ VALIDAR con el equipo

- [ ] ¿Cuál es el rol del módulo `(raíz)`?

<!-- sdd:manual — todo lo que está debajo de esta línea se preserva en regeneraciones -->

## Notas del equipo

_(esta sección no se pisa al regenerar)_
