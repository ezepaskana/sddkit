# Plan — tarea 024: Dale con la 1, redactá bootstrap.md en serio

> Detalle técnico, archivos y riesgos: `design.md`. Verificaciones pensadas para correrse desde la raíz del repo.

- [x] **1. Rama de trabajo** — `task/024-dale-con-la-1-redacta-bootstrap` sobre `main` (ya creada). `cmd: git rev-parse --abbrev-ref HEAD | grep -qx 'task/024-dale-con-la-1-redacta-bootstrap'`
- [x] **2. Reglas** — reescribir BR-080 (el hook ofrece e invoca) y agregar BR-092 (procedimiento de `sdd-bootstrap`) en `.sdd/domain.md`. `cmd: grep -q 'BR-092' .sdd/domain.md && grep -c 'sdd-bootstrap' .sdd/domain.md`
- [x] **3. SKILL.md de `sdd-bootstrap`** (fuerte) — frontmatter + las 5 fases del procedimiento + enlaces a sus references. Depende de 2. `cmd: grep -q '^name: sdd-bootstrap' skills/sdd-bootstrap/SKILL.md`
- [x] **4. Sin comandos muertos** (rapido) — ninguna instrucción de la skill cita un `sdd …` inexistente (BR-081, CA-6). Depende de 3. `cmd: ! grep -rnE '\bsdd (setup|decide|validate|scan|init|task|impact|sync)\b' skills/sdd-bootstrap/`
- [x] **5. `references/investigar-repo.md`** (fuerte) `[P]` — qué detecta el agente y en qué orden: stack, módulos (BR-069), capas (BR-070), entidades, fuentes de doc existentes. Depende de 3. `cmd: test -s skills/sdd-bootstrap/references/investigar-repo.md`
- [x] **6. `references/escribir-sdd.md`** (fuerte) — los archivos que genera con su esqueleto: `config.json`, `catalog/patterns.json`, `domain.md`, `QUESTIONS.md`, `LEARNINGS.md`, `branching.md`, los 3 niveles de `c4/`, bloque de `CLAUDE.md`, rules de capa y `CLAUDE.md` de módulo condicionales (CA-7, CA-8), y el caso repo vacío (CA-9). Depende de 3. `cmd: grep -c 'CLAUDE.md' skills/sdd-bootstrap/references/escribir-sdd.md`
- [x] **7. `references/completar-docs.md`** (medio) `[P]` — adaptar el procedimiento de subagentes borrado en la tarea 020, sin comandos `sdd …` y sin `sdd validate` como cierre. Depende de 3. `cmd: grep -q 'subagente' skills/sdd-bootstrap/references/completar-docs.md`
- [x] **8. Reescribir `hooks/bootstrap.md`** (fuerte) — ofrecimiento en una línea como primer acto del turno, invocación a `sdd-bootstrap`, qué hacer si el dev dice que no (CA-1 a CA-5). Depende de 3. `cmd: test $(wc -l < hooks/bootstrap.md) -le 25 && ! grep -qi 'placeholder' hooks/bootstrap.md && grep -q 'sdd-bootstrap' hooks/bootstrap.md`
- [x] **9. Actualizar `.sdd/c4/components.md`** (medio) — fila de la skill nueva y del hook, sin pasar el tope. Depende de 8. `cmd: grep -q 'sdd-bootstrap' .sdd/c4/components.md && test $(wc -l < .sdd/c4/components.md) -le 45`
- [x] **10. Actualizar `README.md`** (rapido) `[P]` — "las 7 skills" → 8, con `sdd-bootstrap` descrita en la tabla de carpetas. Depende de 3. `cmd: grep -q 'sdd-bootstrap' README.md && ! grep -q 'las 7 skills' README.md`
- [x] **11. Smoke test del hook** (medio) — correr el one-liner real en un directorio sin `.sdd/` y confirmar que vuelca el texto nuevo. Depende de 8. `cmd: d=$(mktemp -d); (cd $d && CLAUDE_PLUGIN_ROOT=$OLDPWD bash -c 'test -f .sdd/config.json || cat "$CLAUDE_PLUGIN_ROOT/hooks/bootstrap.md"') | grep -q 'sdd-bootstrap'`
- [x] **12. CHANGELOG** (rapido) — entrada de la tarea 024. Depende de 11. `cmd: grep -q '024' CHANGELOG.md`

**Verificación manual del dev (al cerrar):** reinstalar el plugin y abrir una sesión en `tinku` — el agente tiene que ofrecer la configuración en una línea antes de atender cualquier pedido. Ningún `cmd:` puede probar eso (`design.md → Riesgos`).

---
_Aprobación del dev: pendiente_
