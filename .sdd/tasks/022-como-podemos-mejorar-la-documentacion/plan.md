# Plan — tarea 022

> Lista de pasos. Detalle técnico en `design.md`. Tope: 45 líneas.

- [x] **1. Reglas en `domain.md`** — BR-073 amplía con símbolos de entrada; BR-088 (formato máquina), BR-089 (índice vs detalle + tope) y BR-090 (frontera capa/módulo) nuevas. `cmd: test $(grep -cE '^- \*\*BR-(088|089|090)\*\*' .sdd/domain.md) -eq 3 && grep -q 'símbolos de entrada' .sdd/domain.md` _(desvío: la frontera capa/módulo quedó como BR-090 propia en vez de extender BR-077 — es una regla, no una aclaración)_
- [x] **2. Formato canónico de `components.md` y del `CLAUDE.md` de módulo** — tabla con rutas y símbolos reales, índice si hay 2+ módulos, detalle en el módulo si no (CA-1 a CA-5). En `skills/sdd-task/references/`. Depende de 1. `cmd: test -f skills/sdd-task/references/estructura-c4.md && grep -q 'símbolos de entrada' skills/sdd-task/references/estructura-c4.md`
- [x] **3. Frontera capa/módulo con ejemplo** `[P]` — qué va en la rule de capa y qué en el `CLAUDE.md` de módulo, con un caso concreto de cada lado (CA-6, CA-7). Depende de 1. `cmd: grep -q 'cómo se escribe' skills/sdd-task/references/estructura-c4.md`
- [x] **4. `sdd-analyze` lee los tres niveles** `[P]` — hoy solo manda leer `components.md` (CA-8). `cmd: grep -q 'context.md' skills/sdd-analyze/SKILL.md && grep -q 'containers.md' skills/sdd-analyze/SKILL.md`
- [x] **5. Dogfood: `components.md` de sddkit al formato nuevo** — con rutas y símbolos reales; es repo de un módulo, así que conserva el detalle (CA-4). Depende de 2. `cmd: grep -q 'skills/sdd-task/references/artefactos.md' .sdd/c4/components.md && test $(wc -l < .sdd/c4/components.md) -le 45`
- [x] **6. `context.md` y `containers.md` dentro del tope** `[P]` — que los tres niveles entren en 45 líneas (CA-9). `cmd: test $(wc -l < .sdd/c4/context.md) -le 45 && test $(wc -l < .sdd/c4/containers.md) -le 45`
- [x] **7. README: progressive disclosure al día** — índice + detalle por módulo, y la frontera con las rules de capa. Depende de 5. `cmd: grep -q 'índice de módulos' README.md`
- [x] **9. Enlazar `estructura-c4.md` desde donde se usa** — `sdd-task` lo lista en sus recursos y el bloque de `CLAUDE.md` declara la frontera capa/módulo. _(paso agregado: un reference que ninguna skill nombra no se lee nunca)_ `cmd: grep -q 'estructura-c4.md' skills/sdd-task/SKILL.md && grep -q 'cómo se escribe' CLAUDE.md`
- [x] **8. Prueba en el repo Java** — abrir sesión en el monorepo y confirmar que al tocar un controller se carga la rule de capa + el `CLAUDE.md` de su módulo, y que `components.md` alcanzó como índice. _Verificación manual del dev: confirmada 2026-09-03._

---
_Aprobación del dev: aprobada 2026-08-14_
