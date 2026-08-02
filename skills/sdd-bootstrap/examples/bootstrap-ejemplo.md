# Ejemplo: bootstrap de un repo existente

El dev abre `solar-backend` (Node, sin sddkit) y pide _"agregame un endpoint de alertas"_.

## Detección y aviso

`.sdd/config.json` → no existe. `sdd --version` → 0.3.0 ✓. El agente avisa en una línea: _"Este repo no tiene sddkit configurado — ¿lo configuro? Documenta la arquitectura y fija convenciones para los agentes."_ El dev acepta.

## a. Generar

```
$ sdd setup --agent
✓ .sdd/config.json, .sdd/c4/, .sdd/domain.md creados · CLAUDE.md actualizado · skills instaladas (local)
Decisiones pendientes:
  [PENDIENTE] module-system: esm (18 archivos) vs cjs (2)
  [PENDIENTE] http-endpoints: express-router (12)
```

## b. Decidir

> **module-system**: 18 archivos ESM, 2 CJS. ¿Elegís `esm`? — Dev: "sí"

```bash
sdd decide module-system esm --why="mayoría del repo es ESM"
sdd decide http-endpoints express-router --why="único framework HTTP del proyecto"
```

## c. Completar docs (subagentes, según `references/completar-docs.md`)

1 subagente `medio` lee README/docs/ADRs → context, containers, domain. 3 `rapido` en paralelo, uno por entidad (Plant, Meter, Invoice). 4 `rapido` en paralelo, uno por módulo (routes, services, models, middleware). Después: edits mecánicos de los `❓` y `sdd validate` → 0 preguntas abiertas.

## d-e. Cerrar y arrancar la tarea

`models` verificado (rapido=haiku, medio=sonnet, fuerte=opus). Resumen al dev y arranque del pedido original:

```bash
sdd task new "agregar endpoint de alertas"
```

→ sigue con **sdd-task**: clasificar tipo y riesgo, y avanzar con el flujo del tipo.
