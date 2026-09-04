# Spec — tarea 025: instrumentación de contexto por agente

**Historia:** Como dev que paga los tokens de sddkit quiero ver, por cada agente que corre, cuánto contexto se le mandó y de qué está hecho, para atacar el gasto donde realmente está en vez de adivinar.

## Criterios de aceptación

**Generación de los archivos**

- **CA-1** — CUANDO arranca un agente (el principal o un subagente) y `debug_log` está en `true`, EL SISTEMA DEBE escribir un archivo de inicio con el contexto con el que ese agente empieza.
- **CA-2** — CUANDO ese mismo agente termina, EL SISTEMA DEBE escribir un archivo de fin con el contexto final y el crecimiento respecto del inicio.
- **CA-3** — CUANDO el orquestador lanza un subagente, EL SISTEMA DEBE registrar en el archivo de inicio de ESE subagente el nivel/modelo del paso y el brief que se le mandó.
- **CA-4** — EL SISTEMA DEBE escribir los archivos SIEMPRE dentro de la carpeta de la tarea (`.sdd/tasks/<id>/debug/`): la que esté en `in-progress`, y si no hay ninguna, la última actualizada del índice. Solo SI el índice no tiene ninguna tarea escribe en `.sdd/debug/`.

**Contenido**

- **CA-5** — EL SISTEMA DEBE reportar el contexto de arranque como el total exacto de la primera llamada del agente (`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`) y el de cierre como el de su última llamada.
- **CA-6** — EL SISTEMA DEBE desglosar ese total en las piezas que sddkit compone (brief del paso, archivos nombrados, artefactos de la tarea) más un renglón de overhead fijo obtenido por resta, marcando el desglose como estimado y el total como exacto.

- **CA-12** — CUANDO el agente principal arranca, su transcript todavía no tiene ningún registro de uso: EL SISTEMA DEBE completar su archivo de inicio con el total exacto y el modelo en la primera corrida posterior de un hook, en vez de dejarlo solo con la estimación.
- **CA-11** — EL SISTEMA DEBE registrar en ambos archivos el modelo que efectivamente corrió (campo `model` del transcript) y, en un subagente, además el nivel que le pidió el plan (`rapido`/`medio`/`fuerte`), para detectar cuando no coinciden.

**Degradación (no romper nada)**

- **CA-7** — SI `debug_log` falta, no es `true` o `.sdd/config.json` no existe, EL SISTEMA DEBE no escribir ningún archivo y no emitir ninguna salida.
- **CA-8** — SI el transcript no existe, está vacío o no tiene el formato esperado, EL SISTEMA DEBE terminar en silencio con éxito, sin interrumpir la sesión ni el paso en curso.
- **CA-9** — EL SISTEMA DEBE no escribir nada en la salida estándar del hook: la instrumentación no puede sumar tokens al contexto que mide.
- **CA-10** — EL SISTEMA DEBE excluir el directorio de debug del control de versiones.

## Reglas de negocio afectadas

BR-093 (nueva, se agrega a `.sdd/domain.md` en el mismo cambio). Restricciones que la tarea NO puede violar: BR-079 (sin runtime nueva), BR-091 y BR-080 (los hooks existentes siguen intactos).

## Supuestos

- **S-1** — No existe evento `SubagentStart`: el inicio de un worker se captura en `PreToolUse` sobre `Task` y su cierre en `SubagentStop`.
- **S-2** — CUANDO no se puede aislar el transcript propio de un subagente, sus números son los de la sesión que lo lanzó: el archivo lo declara así en vez de atribuírselos al worker.
- **S-3** — Los tokens de cada pieza propia se estiman por tamaño en bytes; solo los totales del transcript son exactos.
- **S-4** — El overhead fijo (system prompt + schemas de tools + MCP + memory) se reporta como un único renglón por resta, sin desagregar en sus partes.

## Fuera de alcance

- Reducir el gasto de tokens (esta tarea mide, no optimiza) y reproducir el desglose por categoría de `/context` (no accesible fuera de la UI de la CLI), reportes agregados entre tareas o sesiones, y cualquier visualización.

---
_Aprobación del dev: aprobada 2026-09-03._
