# Triggers de delegación al orquestador

No esperes a "sentirte" saturado — la saturación de contexto no se siente, se mide. Estos triggers son objetivos: cuando se cumplen, delegá. No hay mérito en resolver todo en un solo hilo.

| Situación | Acción esperada | Ejemplo concreto |
|---|---|---|
| Vas a leer 4+ archivos para entender un flujo | Delegá la exploración a un subagente `rapido` que te devuelva un resumen de dependencias y roles | Entender cómo interactúan `init.js`, `setup.js`, `sync.js` y `hooks.js` → lanzar subagente que lea los 4 y devuelva resumen de dependencias entre ellos |
| El cambio toca 2+ archivos no triviales | Un solo writer (subagente) por paso del plan; nunca dos archivos en el mismo paso | Agregar hook post-commit requiere tocar `hooks.js` y `setup.js` → paso 3 solo toca `hooks.js`, paso 4 solo toca `setup.js` |
| Commit/push/PR después de cambios | Review con contexto fresco: subagente revisor que lea el diff sin el contexto acumulado del orquestador | Antes del PR de tarea 010, subagente revisor leyó el diff completo sin el contexto acumulado del orquestador y detectó un import faltante |
| Accidente de git/worktree, merge raro, entorno de test confuso | FRENÁ — auditoría con contexto fresco antes de resolver cualquier cosa | Merge conflict inesperado después de rebase → frená, auditoría con `git status` / `git log --oneline -10` antes de resolver |
| Sesión larga monolítica acumulando complejidad | Pausá la tarea y replanificá los pasos restantes | Si llevás 6 pasos seguidos y el contexto supera ~100K tokens → `sdd task status <id> paused`, replanificá desde el paso actual con contexto fresco |

## Señales de que NO hace falta delegar

- Fix de un solo archivo sin ambigüedad (typo, ajuste de config).
- Lectura de 1-2 archivos cortos que ya tenés en contexto.
- Commit de docs sin cambios de código.

El objetivo no es ceremonia: es un orquestador responsable con contexto limpio y un solo writer por vez.
