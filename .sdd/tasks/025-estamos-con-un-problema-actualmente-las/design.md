# Design — tarea 025: instrumentación de contexto por agente

## Impacto en arquitectura y catálogo

`.sdd/c4/components.md` gana dos filas: un cuarto hook `SessionStart` y los tres eventos nuevos (`PreToolUse` sobre `Task`, `SubagentStop`, `SessionEnd`), más el primer archivo ejecutable del plugin desde que murió el CLI. Eso último **pide un ADR corto (0018)**: ADR-0016 dejó abierto el camino ("scripts invocados desde hooks del plugin, no un CLI"), pero conviene dejar asentado que se toma, para qué, y que sigue sin haber runtime nueva (BR-079). El catálogo está vacío: este script inaugura el topic "lenguaje de scripts de hooks" → POSIX `sh` + `grep`/`sed`/`awk`, sin `jq` ni Node ni Python, y se registra en `.sdd/catalog.json`.

## Archivos por área

| Área | Archivos |
|---|---|
| Hooks | `hooks/hooks.json`, `hooks/debug-context.sh`, `hooks/probe.sh` (temporal, se borra en el paso 8) |
| Config del repo | `.sdd/config.json` (`debug_log`), `.gitignore` |
| Docs de arquitectura | `.sdd/c4/components.md`, `.sdd/decisions/0018-scripts-de-hook-en-el-plugin.md`, `.sdd/catalog.json` |
| Skills | `skills/sdd-execute/SKILL.md` |
| Fixtures | `.sdd/tasks/025-.../fixtures/*.json` |

## Dependencias entre pasos

- **El probe (pasos 2-3) es el cuello de botella y va primero**: la forma exacta del JSON que cada evento entrega por stdin no está documentada en este repo, y los pasos 4-7 se escriben contra fixtures reales, no contra lo que suponemos. Sin fixtures no arranca nada.
- **El cableado definitivo (paso 8) va último entre los técnicos**: mientras el probe esté activo, cada evento escribe dos veces.
- Los pasos de docs (10-11) no bloquean a nadie, pero se hacen antes del end-to-end para que el PR salga completo.

## Riesgos de la ejecución

- **Auto-modificación**: la tarea edita los hooks de la sesión que la ejecuta. Los hooks se leen al arrancar la sesión, así que los cambios recién valen en la siguiente — el paso 3 y el 12 los corre el dev en sesión nueva, no el orquestador.
- **Aislar al subagente puede no ser posible**: si los mensajes del worker viven en el mismo JSONL que la sesión (entradas `isSidechain`), hay que filtrarlos por esa marca y por ventana temporal. Si no se los puede aislar de forma confiable, el archivo de fin del worker degrada a "delta de la sesión durante ese paso" y se declara como tal en el archivo, sin bloquear la tarea.
- **Alias vs id real del modelo**: el plan pide un nivel (`medio` → `sonnet`, de `.sdd/config.json → models`) pero el transcript guarda el id que corrió (`claude-sonnet-5`). Se registran los dos sin traducir uno al otro: la discrepancia entre lo pedido y lo ejecutado es justamente el dato.

- **Inicios huérfanos por el matcher `Skill`** (decisión del dev, 2026-09-04): toda invocación de skill escribe su archivo de inicio, dispare o no un subagente, así que las que no lanzan worker quedan sin fin. Se acepta el ruido a cambio de no perder ningún worker: en la corrida real de tinku el subagente vino por `Skill`, no por `Agent`/`Task`.

- **Portabilidad**: `sh`, `grep`, `sed` y `awk` están en macOS y Linux; en Windows nativo sin shell POSIX el script no corre y degrada a no escribir nada (CA-8).
- **Falso ahorro**: la instrumentación no puede volverse cara. El script no lee el transcript entero en memoria ni escribe a stdout (CA-9).

## Rama de trabajo

`task/025-estamos-con-un-problema-actualmente-las`, desde `main` (GitHub Flow, patrón `task/{numero}-{slug}` de `.sdd/branching.md`).
