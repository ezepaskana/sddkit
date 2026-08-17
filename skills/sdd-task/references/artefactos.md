# Artefactos de una tarea SDD — formato canónico

Antes había un CLI que creaba y actualizaba todo esto. Ya no existe (ADR-0016): **lo escribís vos**. Este archivo es la única fuente de verdad del formato; respetalo al pie de la letra o las tareas dejan de ser auditables entre sesiones.

## El índice: `.sdd/tasks/index.json`

```json
{
  "nextId": 22,
  "tasks": [
    {
      "id": "021",
      "dir": "021-antes-de-hacer-la-prueba-necesito",
      "title": "Antes de hacer la prueba necesito hacer una modificacion má…",
      "status": "in-progress",
      "createdAt": "2026-08-11",
      "updatedAt": "2026-08-14",
      "tipo": "feature",
      "riesgo": "alto"
    }
  ]
}
```

- `id`: el `nextId` actual con padding a 3 dígitos (`7` → `"007"`). Después de usarlo, **incrementá `nextId`**.
- `dir`: `<id>-<slug>`. El slug sale del requisito: minúsculas, sin acentos, no alfanumérico → `-`, y **como máximo las primeras 6 palabras**.
- `title`: primeros ~60 caracteres del requisito, cortados con `…`.
- `createdAt` / `updatedAt`: fecha ISO corta (`AAAA-MM-DD`). `updatedAt` cambia en cada transición de estado.
- `tipo`: `simple | bug | feature | refactor`. `riesgo`: `bajo | alto`. Se agregan al clasificar, no al crear.
- Si el archivo no existe todavía, crealo con `{ "nextId": 1, "tasks": [] }`.

**Estados válidos:** `draft`, `analyzed`, `specified`, `planned`, `in-progress`, `paused`, `done`, `cancelled`.

## Crear una tarea

1. Leé `index.json` para sacar el `nextId`.
2. Creá `.sdd/tasks/<id>-<slug>/requirement.md` con el requisito **verbatim** del dev — sin parafrasear, sin corregirle la ortografía, sin resumir. Encabezalo así:

```markdown
# Requisito original — tarea <id>

> Capturado verbatim el <fecha>. **No editar este archivo**: el refinamiento va en los artefactos siguientes.

<texto del dev, tal cual>
```

3. Agregá la entrada al índice con `status: "draft"` e incrementá `nextId`.

## Qué artefactos escribe cada tarea (BR-058)

**Un solo camino, más profundo según el riesgo.** No hay formatos especiales por tipo:

| Riesgo | Artefactos |
|---|---|
| `bajo` | `requirement.md` → `analysis.md` → `plan.md` |
| `alto` | los tres, más `spec.md` (criterios numerados) y `design.md` (detalle técnico) |

- En un **`bug`**, la reproducción va en el `analysis.md` y el test de regresión es el **primer paso del plan** (rojo antes del fix, verde después).
- En un **`refactor`**, la corrida verde de baseline es el primer paso, y la misma corrida debe quedar verde al final.
- En una tarea **`simple`**, el plan tiene uno o dos pasos. No por eso se saltea.

Los templates viven en el plugin, no en el repo del dev:

| Artefacto | Template |
|---|---|
| `analysis.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-analyze/templates/analysis.md` |
| `spec.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-specify/templates/spec.md` |
| `plan.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-plan/templates/plan.md` |
| `design.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-plan/templates/design.md` |

Al copiarlos, reemplazá `__ID__`, `__TITLE__` y `__DATE__` por sus valores. **Nunca pises un artefacto que ya existe**: al re-clasificar, creá solo los que falten.

## Mostrarle un artefacto al dev (BR-063)

**Volcá el contenido en la terminal. Nunca lances una aplicación externa** — ni el IDE, ni un editor, ni `open`. El campo `.sdd/config.json → ui.opener` quedó obsoleto en la tarea 021: no lo leas ni lo escribas.

**Tope: 45 líneas** (BR-082). Contalas antes de volcar:

- **Entra** → volcalo completo y pedí la aprobación.
- **No entra** → es señal de que la tarea es demasiado grande (BR-083). Decilo, volcá solo lo esencial, indicá la ruta para que el dev lo abra si quiere, y **proponé partir la tarea**. No lo aceptes en silencio.

El `requirement.md` es la excepción parcial: su contenido es verbatim y **nunca se recorta ni se resume** en el archivo. Si es largo, se recorta solo el volcado.

## Diagramas Mermaid en la terminal (BR-087, ADR-0017)

Cuando el artefacto que volcás tiene un bloque ` ```mermaid `:

1. **`termaid` disponible** (`command -v termaid`) → renderizalo: `termaid <archivo>` o por stdin. Flags útiles: `--ascii`, `--width N`.
2. **No está, y `.sdd/config.json → ui.termaid` no tiene valor** → ofrecéselo al dev **una sola vez**, en una línea: `pip install termaid` (o `uvx termaid <archivo>` sin instalar nada).
3. **Persistí la respuesta** en `ui.termaid`: `"si"` si aceptó, `"no"` si rechazó. Con cualquiera de los dos valores, **no vuelvas a ofrecerlo nunca**.
4. **Sin termaid** → mostrá el bloque crudo y seguí. No es un error.

## Cambiar de estado

Editá la entrada del índice (`status` + `updatedAt`) y, si el estado abre un gate, **mostrale el artefacto al dev** (arriba) y esperá su aprobación explícita en el chat:

| Estado | Artefacto a mostrar |
|---|---|
| `analyzed` | `analysis.md` |
| `specified` | `spec.md` _(solo riesgo alto)_ |
| `planned` | `plan.md` |

## Gates de cierre (`done`)

Antes de poner `done`, **chequealo vos** — ya no hay un exit code que te frene:

1. Todos los checkboxes de `plan.md` marcados. Si falta alguno, no cerrás: completalo o cancelás la tarea.
2. Ningún artefacto tiene un `…` sin reemplazar (fuera de code spans). `N/A: <motivo>` es respuesta válida.
3. `.sdd/LEARNINGS.md` existe; si no, crealo antes de cosechar aprendizajes (BR-086). **No hay retro**: los aprendizajes van directo ahí.

## Retomar en otra sesión

Leé `index.json`, buscá las tareas en `in-progress` o `paused`, y en su `plan.md` contá los checkboxes: el primero sin marcar es el próximo paso. Si el estado es `paused`, pasalo a `in-progress` antes de seguir.
