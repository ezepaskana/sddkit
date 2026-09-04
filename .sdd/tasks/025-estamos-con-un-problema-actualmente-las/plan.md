# Plan — tarea 025: instrumentación de contexto por agente

> Detalle técnico, archivos y riesgos: `design.md`. Criterios: `spec.md` (CA-1 a CA-10).

- [x] **1. Rama de trabajo** — `git checkout -b task/025-estamos-con-un-problema-actualmente-las` desde `main`. `cmd: git rev-parse --abbrev-ref HEAD | grep -qx task/025-estamos-con-un-problema-actualmente-las`
- [x] **2. Probe de payloads** — `hooks/probe.sh` vuelca stdin a `.sdd/debug/probe/<evento>-<ts>.json`, cableado temporalmente en los 4 eventos. `cmd: sh -n hooks/probe.sh && python3 -c "import json;json.load(open('hooks/hooks.json'))"`
- [ ] **3. Congelar fixtures** — el dev abre una sesión nueva y corre una tarea de prueba con un subagente; los payloads reales quedan en `.sdd/tasks/025-*/fixtures/`. Depende de 2. _Verificación manual del dev._
- [x] **4. Gate y destino** (fuerte) — `hooks/debug-context.sh`: lee `debug_log` de `.sdd/config.json`, resuelve `.sdd/tasks/<id>/debug/` o `.sdd/debug/`, y con el flag apagado no escribe ni imprime nada (CA-4, CA-7, CA-9). Depende de 3. `cmd: sh -n hooks/debug-context.sh && sh hooks/debug-context.sh < .sdd/tasks/025-*/fixtures/session-start.json > /tmp/o.txt 2>&1; test ! -s /tmp/o.txt && test ! -d .sdd/debug`
- [x] **5. Totales exactos** (fuerte) — `awk` sobre el transcript: contexto de arranque = primera llamada, de cierre = última, sumando `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` (CA-5). Depende de 4. `cmd: sh .sdd/tasks/025-*/fixtures/check-totales.sh`
- [x] **6. Desglose estimado** (fuerte) — renglones por pieza propia (brief, archivos nombrados, artefactos) más overhead fijo por resta, marcado como estimado, más el modelo que efectivamente corrió (CA-6, CA-11). Depende de 5. `cmd: sh .sdd/tasks/025-*/fixtures/check-desglose.sh`
- [x] **7. Inicio y fin del subagente** — `PreToolUse`/`Task` registra el nivel pedido y el brief; `SubagentStop` escribe el fin con el delta (CA-1 a CA-3, CA-11). Depende de 6. `cmd: sh .sdd/tasks/025-*/fixtures/check-subagente.sh`
- [x] **8. Cableado definitivo** (rapido) — los 4 eventos reales en `hooks/hooks.json` y borrar el probe. Depende de 7. `cmd: python3 -c "import json;json.load(open('hooks/hooks.json'))" && grep -q SubagentStop hooks/hooks.json && ! grep -q probe hooks/hooks.json`
- [x] **9. Flag y gitignore** `[P]` (rapido) — `debug_log: false` con su `_nota` en `.sdd/config.json`; `.gitignore` excluye los directorios de debug (CA-10). `cmd: grep -q debug_log .sdd/config.json && git check-ignore -q .sdd/debug/x.md`
- [x] **10. ADR-0018 y C4** `[P]` — el ADR de scripts de hook en el plugin, las filas nuevas en `.sdd/c4/components.md` y el topic de scripts en `.sdd/catalog.json`. `cmd: test -f .sdd/decisions/0018-scripts-de-hook-en-el-plugin.md && grep -q debug-context .sdd/c4/components.md`
- [x] **11. sdd-execute** `[P]` (rapido) — una línea: con `debug_log` en `true`, el brief de cada worker queda registrado en su archivo de debug. `cmd: grep -q debug_log skills/sdd-execute/SKILL.md`
- [ ] **12. Prueba end-to-end** — el dev pone `debug_log: true`, abre sesión nueva y corre una tarea con un subagente: 4 archivos escritos, totales coherentes. Depende de 8. _Verificación manual del dev._

---
_Aprobación del dev: aprobado 2026-09-03._
