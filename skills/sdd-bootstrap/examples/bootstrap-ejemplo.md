# Ejemplo: Bootstrap de un repo existente

Escenario: el usuario abre un repo Node.js (`solar-backend`) y pide _"agregame un endpoint de alertas"_. El repo no tiene sddkit.

---

## Detección

```
¿Existe .sdd/config.json? → NO
¿Está instalado sdd? → sdd --version → 0.3.0 ✓
```

El agente avisa:

> Este repo no tiene sddkit configurado — ¿lo configuro? Documenta la arquitectura y fija convenciones para los agentes.

El usuario acepta.

---

## Paso a: Generar

```bash
$ sdd setup --agent
✓ .sdd/config.json creado
✓ .sdd/c4/ generados (context, containers, components)
✓ .sdd/domain.md generado
✓ AGENTS.md actualizado
✓ Skills instaladas (local)

Decisiones pendientes:
  [PENDIENTE] module-system: esm (18 archivos) vs cjs (2 archivos)
  [PENDIENTE] http-endpoints: express-router (12 archivos)
```

---

## Paso b: Decidir

El agente presenta las opciones al usuario:

> **module-system**: 18 archivos usan ESM, 2 usan CJS. ¿Elegís `esm`?

Usuario: "sí, esm"

```bash
$ sdd decide module-system esm --why="mayoría del repo es ESM"
```

> **http-endpoints**: 12 archivos usan express-router (es la única variante). ¿Confirmás?

Usuario: "sí"

```bash
$ sdd decide http-endpoints express-router --why="único framework HTTP del proyecto"
```

---

## Paso c: Completar docs

El agente sigue el procedimiento de `references/completar-docs.md`:

1. **Subagente medio** → lee README.md, docs/, ADRs → completa context.md, containers.md, domain.md (glosario, BRs, actores)
2. **3 subagentes rapido en paralelo** → una entidad cada uno (Plant, Meter, Invoice) → devuelven descripción + ciclo de vida
3. **4 subagentes rapido en paralelo** → un módulo cada uno (src/routes, src/services, src/models, src/middleware) → devuelven rol en una frase
4. **Edits mecánicos** → reemplaza `❓` en domain.md y components.md
5. **Verificación** → `sdd validate` → 0 preguntas abiertas

---

## Paso d-e: Verificar modelos y resumir

```
✓ .sdd/config.json → models: rapido=haiku, medio=sonnet, fuerte=opus (ok)
```

> Listo. sddkit configurado en solar-backend:
> - Arquitectura C4 documentada (3 contenedores, 5 módulos, 4 entidades)
> - Catálogo: module-system=esm, http-endpoints=express-router
> - Tu pedido original era "agregame un endpoint de alertas" — arranco el flujo SDD.

```bash
$ sdd task new "agregar endpoint de alertas"
```

→ Continúa con sdd-task.
