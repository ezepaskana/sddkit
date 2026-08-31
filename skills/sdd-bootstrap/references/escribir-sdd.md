# Escribir `.sdd/` — qué archivo, con qué contenido

Todo lo de acá se escribe **una vez**, al configurar el repo. El formato de los tres niveles C4, la frontera capa/módulo y la regeneración quirúrgica están en `sdd-task → references/estructura-c4.md`: leelo antes de escribir cualquier archivo de `.sdd/c4/`, una rule de capa o un `CLAUDE.md` de módulo. No lo repitas acá.

## Siempre

| Archivo | Contenido mínimo |
|---|---|
| `.sdd/config.json` | Ver esqueleto abajo |
| `.sdd/domain.md` | Glosario, entidades (una línea cada una) y las reglas `BR-NNN` que puedas citar contra el código |
| `.sdd/QUESTIONS.md` | Las preguntas abiertas + **las rutas de la documentación existente** que usaste como fuente |
| `.sdd/LEARNINGS.md` | El encabezado y las reglas de curado, sin entradas: se llena al cerrar cada tarea (BR-086) |
| `.sdd/branching.md` | La política del repo, versionada. Deducila de las ramas y los commits reales; si no se deduce, preguntá |
| `.sdd/catalog.json` | Solo las convenciones con **una** variante o ya decididas por el dev |
| `.sdd/patterns.json` | Los topics con 2+ variantes, cada uno con conteo y un ejemplo `archivo:línea` |
| `.sdd/c4/context.md` | Nivel 1: qué es el sistema, actores y sistemas externos |
| `.sdd/c4/containers.md` | Nivel 2: qué se despliega y con qué tecnología |
| `.sdd/c4/components.md` | Nivel 3: índice si hay 2+ módulos, detalle si hay uno solo (BR-089) |
| `CLAUDE.md` (raíz) | **Solo** el bloque gestionado, entre marcas — ver abajo |

Los tres niveles C4 llevan su sección `## ❓ VALIDAR con el equipo` con checkboxes y la marca `<!-- sdd:manual -->` al final, debajo de la cual nada se pisa al regenerar (BR-074).

### `.sdd/config.json`

```json
{
  "version": "0.0.1",
  "createdAt": "AAAA-MM-DD",
  "test": { "cmd": "<el comando de tests del repo>" },
  "models": { "rapido": "haiku", "medio": "sonnet", "fuerte": "opus" },
  "ui": {}
}
```

`models` son los alias de Claude Code para delegar pasos del plan: verificá que existan en tu runtime y corregilos si no. `ui.termaid` se escribe cuando el dev responde el ofrecimiento (`"si"` o `"no"`, BR-087); `ui.caveman` en `"no"` apaga el modo caveman (BR-091). Si no hay respuesta, el campo **no se escribe**.

### El bloque gestionado de `CLAUDE.md`

Entre `<!-- sddkit:begin -->` y `<!-- sddkit:end -->`. **Lo que el dev ya tenía en el archivo no se toca, no se reordena y no se resume.** Si el archivo no existe, se crea con el bloque solo.

Adentro va **lo transversal y nada más**: los triggers del flujo (`sdd-task` ante pedidos de cambio, `sdd-analyze` ante preguntas), dónde vive la arquitectura, que el catálogo es vinculante, y **que las convenciones por capa cargan solas** desde `.claude/rules/sdd-layer-*.md` y las responsabilidades por módulo desde el `CLAUDE.md` de cada uno (BR-077). Lo específico de una capa o un módulo **no va acá**: se escribe en su archivo (ADR-0015).

Se lee entero en cada sesión: cada línea que agregues la paga el dev en todas. Apuntá a ~450 palabras.

## Condicionales

| Si el repo… | Escribí | Regla |
|---|---|---|
| tiene capas detectables | `.claude/rules/sdd-layer-<capa>.md`, una por capa, con frontmatter `paths:` que lista los globs de **todos** los módulos donde aparece | BR-071, BR-072 |
| tiene 2+ módulos | un `CLAUDE.md` en la raíz de cada módulo, con responsabilidad, capas, relación con los otros y **símbolos de entrada** | BR-073 |
| tiene un solo módulo | **ningún** `CLAUDE.md` anidado: el detalle se queda en `components.md` | BR-073, BR-089 |
| no tiene capas reconocibles | **ninguna** rule de capa. Es un resultado válido | BR-070 |

El cuerpo de una rule de capa son tres secciones: **responsabilidad**, **dependencias permitidas** (qué capas puede importar y cuáles no, marcadas `❓ VALIDAR`) y **convenciones locales**, vacía para que la llene el equipo. No duplica el catálogo global: lo referencia (BR-072).

Una rule cuyo glob no matchea ningún archivo **nunca se carga y falla en silencio**: chequeá que cada glob matchee algo antes de darla por buena (BR-076).

## Los huecos son checkboxes, no prosa

Todo lo que no pudiste responder va como `- [ ]` en una sección `## ❓ VALIDAR con el equipo` del archivo donde vive, **y** en `.sdd/QUESTIONS.md` indicando su archivo de origen (BR-078). Así entra al circuito: el agente lo responde con el código cuando puede, o se lo pregunta al dev, y marca el checkbox en el origen.

Un `…` sin reemplazar no es un hueco: es un archivo a medio escribir. O lo respondés, o lo convertís en checkbox.

## Repo sin código todavía

No hay nada que investigar y **no se inventa nada**. Escribí solo:

- `.sdd/config.json` (sin `test.cmd` si todavía no hay tests).
- `.sdd/c4/context.md` con lo que el dev te dijo que va a construir, y el resto como `❓ VALIDAR`.
- `.sdd/QUESTIONS.md` con esas preguntas, y `.sdd/LEARNINGS.md` vacío.
- `.sdd/branching.md` con la política que el dev elija (o el default: GitHub Flow + Conventional Commits + `task/{numero}-{slug}`).
- El bloque gestionado de `CLAUDE.md`.

**Sin** `containers.md`, `components.md`, `domain.md`, catálogo ni rules de capa: esos se escriben al cerrar la primera tarea, cuando ya hay código que documentar.
