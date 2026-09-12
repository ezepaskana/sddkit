# Fixtures — tarea 025

Payloads de hooks con la **forma documentada** en https://code.claude.com/docs/en/hooks
(obtenida el 2026-09-03), no capturados de una corrida real: el probe del paso 2 no llegó
a ejecutarse porque el harness bloquea escribir hooks en `.claude/settings.json` y el
plugin instalado es una copia congelada en `~/.claude/plugins/cache/`.

**Paso 3 pendiente para el dev**: confirmar estos payloads contra una captura real antes
de dar la tarea por cerrada. El script está escrito para degradar en silencio (CA-8) ante
cualquier campo ausente o inesperado, así que una diferencia de forma no rompe la sesión:
solo deja de escribir el archivo.

`transcript.jsonl` es un transcript sintético con números elegidos a mano:
- primera llamada: 5 + 1000 + 60000 = **61005** tokens de contexto de arranque
- última llamada: 2 + 500 + 90000 = **90502** tokens de contexto de cierre
- crecimiento: **29497**
