# Reproducción — tarea 016: Ejecuto sdd sync de forma consecutiva en el mismo repo y me …

> Tarea de tipo `bug`: este artefacto REEMPLAZA a la spec — el test de regresión es el criterio de aceptación. Su presupuesto es de **≤ 150 palabras**. Flujo: reproducir → test rojo → fix → test verde. `N/A: <motivo>` es válido donde no aplique.

## Pasos de reproducción

1. En un repo ya configurado, correr `sdd sync` dos veces seguidas sin tocar nada entre medio.

## Comportamiento

- **Esperado:** la 2da corrida indica que no hubo cambios reales (todo al día).
- **Observado:** ambas corridas imprimen `CLAUDE.md bloque gestionado actualizado` y `skills SDD instaladas/actualizadas…`. Causa: `sync` imprime las `actions` de `init()`, y tanto `upsertAgentsMd` (`src/lib/agentsmd.js:72`) como `installSkills` (`src/lib/skills.js:31`) escriben incondicionalmente sin comparar con lo existente.

## Test de regresión que lo captura

- **Test:** `src/commands/sync.test.js` :: "sync: segunda corrida consecutiva sin cambios → reporta al día, no actualizado"
- **Falla ANTES del fix y pasa después:** `cmd: node --test src/commands/sync.test.js`

---
_Aprobación del dev: aprobada (2026-08-02, chat)_
