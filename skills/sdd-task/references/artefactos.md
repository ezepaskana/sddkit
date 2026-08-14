# Artefactos de una tarea SDD — formato canónico

Antes había un CLI que creaba y actualizaba todo esto. Ya no existe (ADR-0016): **lo escribís vos**. Este archivo es la única fuente de verdad del formato; respetalo al pie de la letra o las tareas dejan de ser auditables entre sesiones.

## El índice: `.sdd/tasks/index.json`

```json
{
  "nextId": 21,
  "tasks": [
    {
      "id": "020",
      "dir": "020-actualmente-el-dev-tiene-que-instalar",
      "title": "Actualmente el dev tiene que instalar sddkit, yo lo hago con…",
      "status": "in-progress",
      "createdAt": "2026-08-09",
      "updatedAt": "2026-08-09",
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

> Capturado verbatim el <fecha>. **No editar este archivo**: el refinamiento va en spec.md.

<texto del dev, tal cual>
```

3. Agregá la entrada al índice con `status: "draft"` e incrementá `nextId`.

Esto y nada más: los demás artefactos los crea la clasificación.

## Clasificar: qué artefactos crea cada tipo (BR-058)

| Tipo | Artefactos a crear |
|---|---|
| `simple` | `nota.md` |
| `bug` | `reproduccion.md`, `plan.md` |
| `refactor` | `analysis.md`, `plan.md` |
| `feature` | `analysis.md`, `spec.md`, `plan.md` |

Los templates viven en el plugin, no en el repo del dev:

| Artefacto | Template |
|---|---|
| `analysis.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-analyze/templates/analysis.md` |
| `spec.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-specify/templates/spec.md` |
| `plan.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-plan/templates/plan.md` |
| `retro.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-close/templates/retro.md` |
| `nota.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-task/templates/nota.md` |
| `reproduccion.md` | `${CLAUDE_PLUGIN_ROOT}/skills/sdd-task/templates/reproduccion.md` |

Al copiarlos, reemplazá `__ID__`, `__TITLE__` y `__DATE__` por sus valores.

**Nunca pises un artefacto que ya existe.** Al re-clasificar, creá solo los que falten y dejá los de la clasificación anterior donde están.

## Cambiar de estado

Editá la entrada del índice (`status` + `updatedAt`) y, si el estado abre un gate de revisión, **mostrale el archivo al dev** y esperá su aprobación explícita en el chat:

| Estado | Archivo a mostrar |
|---|---|
| `analyzed` | `analysis.md` |
| `specified` | `spec.md` |
| `planned` | `plan.md` |

Cómo mostrarle un archivo al dev: en terminal embebida de un IDE (`TERMINAL_EMULATOR=JetBrains-JediTerm` o `TERM_PROGRAM=vscode`) abrilo en ese IDE; en terminal standalone usá `.sdd/config.json → ui.opener` si está configurado (`<opener> "<ruta>"`), y sin él tu default. Si `ui.openFiles` es `false`, solo decí la ruta.

## Gates de cierre (`done`)

Antes de poner `done`, **chequealo vos** — ya no hay un exit code que te frene:

1. Todos los checkboxes de `plan.md` marcados. Si falta alguno, no cerrás: completalo o cancelás la tarea.
2. `retro.md` existe y **no tiene ningún `…` sin reemplazar** (fuera de code spans). `N/A: <motivo>` es respuesta válida.
3. `.sdd/LEARNINGS.md` existe; si no, crealo antes de cosechar aprendizajes.

## Retomar en otra sesión

Leé `index.json`, buscá las tareas en `in-progress` o `paused`, y en su `plan.md` contá los checkboxes: el primero sin marcar es el próximo paso. Si el estado es `paused`, pasalo a `in-progress` antes de seguir.
