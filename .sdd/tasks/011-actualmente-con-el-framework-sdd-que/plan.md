# Plan — tarea 011: Docs concisos + diagramas + flujo adaptativo por tipo (Claude-only)

> Pasos CHICOS verificables. Tests antes que implementación. El dev debe APROBAR este plan antes de ejecutar.

## Rama de trabajo

- **Rama:** `task/011-actualmente-con-el-framework-sd`
- **Origen:** `main`
- **Destino:** `main`
- **Convención de commits:** Conventional Commits
- **Flujo:** GitHub Flow
- **Patrón:** `task/{numero}-{slug}`

## Pasos

- [x] **1. Crear rama de trabajo** _(rapido)_
  - **Hace:** N/A: por decisión del dev la tarea continúa en la rama `task/010-quisiera-que-esto-se-resuelva-d` (refactor grande, viaja junto al trabajo de la 010).
  - **Archivos:** —
  - **Depende de:** —
  - **Verificación:** `cmd: git branch --show-current | grep -q task/010`

- [x] **2. ADR-0013 (Claude-only) y ADR-0014 (flujo adaptativo por tipo)** _(medio)_
  - **Hace:** dos ADRs cortos en formato MADR minimal (contexto/decisión/consecuencias), citando tarea 011; ADR-0013 marca el fin del soporte multi-agente.
  - **Archivos:** `.sdd/decisions/0013-claude-only.md`, `.sdd/decisions/0014-flujo-adaptativo-por-tipo.md`
  - **Depende de:** —
  - **Verificación:** `cmd: test -f .sdd/decisions/0013-claude-only.md && test -f .sdd/decisions/0014-flujo-adaptativo-por-tipo.md`

- [x] **3. Templates de artefactos: presupuestos + tipos nuevos** _(fuerte)_
  - **Hace:** re-escribir `analysis.md`/`spec.md`/`plan.md`/`retro.md` de las skills con presupuestos (350/300/—/150 palabras; plan ≤ 3 sub-ítems por paso) y sección de diagrama opcional-con-criterio; crear templates por tipo en `skills/sdd-task/templates/`: `nota.md` (simple) y `reproduccion.md` (bug). Todos declaran que `N/A: <motivo>` es válido.
  - **Archivos:** `skills/sdd-analyze/templates/analysis.md`, `skills/sdd-specify/templates/spec.md`, `skills/sdd-plan/templates/plan.md`, `skills/sdd-close/templates/retro.md`, `skills/sdd-task/templates/nota.md`, `skills/sdd-task/templates/reproduccion.md`
  - **Depende de:** —
  - **Verificación:** `cmd: grep -l "presupuesto" skills/sdd-analyze/templates/analysis.md skills/sdd-specify/templates/spec.md skills/sdd-close/templates/retro.md | wc -l | grep -q 3 && test -f skills/sdd-task/templates/nota.md && test -f skills/sdd-task/templates/reproduccion.md`

- [x] **4. Tests: `sdd task type`** `[P]` _(medio)_
  - **Hace:** tests (rojos) del subcomando nuevo: registra `tipo` y `riesgo` en la tarea, crea solo los artefactos del tipo (simple→nota, bug→reproducción+plan, refactor→analysis+plan sin spec, feature→analysis+spec+plan), permite re-clasificar sin borrar artefactos existentes.
  - **Archivos:** `src/commands/task.test.js`
  - **Depende de:** paso 3
  - **Verificación:** `cmd: node --test --test-reporter=tap src/commands/task.test.js 2>&1 | grep -q "not ok"`

- [x] **5. Implementar `sdd task type`** _(fuerte)_
  - **Hace:** subcomando `sdd task type <id> <simple|bug|feature|refactor> [--riesgo alto]` en task.js + wiring en bin/sdd.js; persiste tipo/riesgo en el índice de tareas; crea los templates del tipo desde las skills.
  - **Archivos:** `src/commands/task.js`, `bin/sdd.js`
  - **Depende de:** paso 4
  - **Verificación:** `cmd: node --test --test-reporter=tap src/commands/task.test.js`

- [x] **6. Tests: `task new` mínimo + gate N/A** _(medio)_
  - **Hace:** tests (rojos): `sdd task new` crea solo `requirement.md`; contrato impreso ≤ 12 líneas que instruye clasificar tipo+riesgo; el gate de cierre acepta `N/A: <motivo>` en cualquier campo de retro.
  - **Archivos:** `src/commands/task.test.js`
  - **Depende de:** paso 5
  - **Verificación:** `cmd: node --test --test-reporter=tap src/commands/task.test.js 2>&1 | grep -q "not ok"`

- [x] **7. Implementar `task new` mínimo + gate N/A** _(medio)_
  - **Hace:** recortar el contrato de consola (referencia a skills para el detalle), no crear analysis/spec/plan en `new` (los crea `task type`), aceptar `N/A:` en el gate de retro. Desvío registrado: `e2e.test.js` asume que `new` crea spec/plan — se actualiza en este paso.
  - **Archivos:** `src/commands/task.js`, `src/commands/e2e.test.js`
  - **Depende de:** paso 6
  - **Verificación:** `cmd: node --test --test-reporter=tap src/commands/task.test.js`

- [x] **8. Tests: bloque gestionado en CLAUDE.md + migración** `[P]` _(medio)_
  - **Hace:** tests (rojos): el bloque gestionado se escribe en `CLAUDE.md`; si `AGENTS.md` tiene bloque previo, se migra (mueve y limpia); el bloque generado tiene ≤ 450 palabras; init/setup no instalan regla Cursor.
  - **Archivos:** `src/lib/agentsmd.test.js`, `src/commands/init.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: node --test --test-reporter=tap src/lib/agentsmd.test.js 2>&1 | grep -q "not ok"`

- [x] **9. Implementar CLAUDE.md + borrar soporte Cursor** _(medio)_
  - **Hace:** target `CLAUDE.md` en agentsmd.js con bloque re-escrito ≤ 450 palabras (progressive disclosure), migración desde AGENTS.md, eliminar `src/templates.js` y su instalación en init/setup, quitar prosa multi-agente.
  - **Archivos:** `src/lib/agentsmd.js`, `src/commands/init.js`, `src/commands/setup.js`, `src/templates.js` (borrar)
  - **Depende de:** paso 8
  - **Verificación:** `cmd: node --test --test-reporter=tap src/lib/agentsmd.test.js src/commands/init.test.js && ! test -f src/templates.js`

- [x] **10. Tests: diagramas en components/domain + destilado con Mermaid** `[P]` _(medio)_
  - **Hace:** tests (rojos): `genComponents` incluye `flowchart` de módulos; los flujos de `genDomain` ofrecen formato diagrama; `sdd context` incluye los bloques Mermaid de C4/domain.
  - **Archivos:** `src/lib/c4.test.js`, `src/commands/context.test.js`, `src/lib/domain.test.js` (nuevo, desvío registrado: genDomain vive en domain.js)
  - **Depende de:** —
  - **Verificación:** `cmd: node --test --test-reporter=tap src/lib/c4.test.js src/commands/context.test.js 2>&1 | grep -q "not ok"`

- [x] **11. Implementar diagramas + destilado** _(medio)_
  - **Hace:** diagrama Mermaid en `genComponents` (módulos y dependencias conocidas), flujos como diagrama en `genDomain`, inclusión de bloques Mermaid en `sdd context`.
  - **Archivos:** `src/lib/c4.js`, `src/lib/domain.js`, `src/commands/context.js`
  - **Depende de:** paso 10
  - **Verificación:** `cmd: node --test --test-reporter=tap src/lib/c4.test.js src/commands/context.test.js src/lib/domain.test.js`

- [x] **12. Tests: checks de concisión en validate** `[P]` _(medio)_
  - **Hace:** tests (rojos): bullet de `LEARNINGS.md` > 200 caracteres falla; bloque Mermaid sin tipo de diagrama válido en la primera línea falla; contenido conforme pasa.
  - **Archivos:** `src/commands/validate.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: node --test --test-reporter=tap src/commands/validate.test.js 2>&1 | grep -q "not ok"`

- [x] **13. Implementar checks de validate** _(medio)_
  - **Hace:** los dos checks nuevos (largo de bullets de LEARNINGS, tipo Mermaid válido) integrados al mecanismo existente de `sdd validate`.
  - **Archivos:** `src/commands/validate.js`
  - **Depende de:** paso 12
  - **Verificación:** `cmd: node --test --test-reporter=tap src/commands/validate.test.js`

- [x] **14. SKILL.md y ejemplos concisos + flujo por tipo** _(fuerte)_
  - **Hace:** re-escribir las SKILL.md de sdd-task/analyze/specify/plan/execute/close: clasificación tipo+riesgo (BR-057/058), presupuestos (BR-059), diagrama opcional con criterio; recortar ejemplos a ≤ 40 líneas (son el estándar que el agente copia).
  - **Archivos:** `skills/sdd-task/**`, `skills/sdd-analyze/**`, `skills/sdd-specify/**`, `skills/sdd-plan/**`, `skills/sdd-execute/**`, `skills/sdd-close/**`
  - **Depende de:** pasos 3 y 5
  - **Verificación:** `cmd: find skills/*/examples -name "*.md" -exec wc -l {} \; | awk '$1>40{f=1} END{exit f}' && grep -q "tipo" skills/sdd-task/SKILL.md`

- [x] **15. Reinstalar skills en .claude/skills** _(rapido)_
  - **Hace:** sincronizar la copia instalada con la fuente `skills/`.
  - **Archivos:** `.claude/skills/**`
  - **Depende de:** paso 14
  - **Verificación:** `cmd: diff -rq skills/sdd-task .claude/skills/sdd-task && diff -rq skills/sdd-plan .claude/skills/sdd-plan`

- [x] **16. Demostración: re-escribir los docs vivos de este repo** _(medio)_
  - **Hace:** migrar AGENTS.md→CLAUDE.md (bloque nuevo), LEARNINGS.md con bullets ≤ 200 chars (sin perder aprendizajes), flujos de domain.md como diagrama, components.md con diagrama, context.md sin "multi-agente". Desvíos registrados: se recortaron también `package.json → description` y `.sdd/catalog.json → why` (se inyectan verbatim en CLAUDE.md); fix del detector cjs en `src/lib/patterns.js` (falsos positivos por `createRequire`, interop ESM legítimo de archivos de la tarea 010).
  - **Archivos:** `CLAUDE.md`, `AGENTS.md`, `.sdd/LEARNINGS.md`, `.sdd/domain.md`, `.sdd/c4/components.md`, `.sdd/c4/context.md`
  - **Depende de:** pasos 9, 11, 13, 15
  - **Verificación:** `cmd: node bin/sdd.js validate`

- [x] **17. Suite completa verde + métrica CLAUDE.md** _(rapido)_
  - **Hace:** correr toda la suite y verificar el presupuesto del bloque gestionado.
  - **Archivos:** —
  - **Depende de:** paso 16
  - **Verificación:** `cmd: sdd test && test $(wc -w < CLAUDE.md) -le 450`

---

_Aprobación del dev: aprobada (2026-08-01, en chat; sin rama nueva — se sigue en task/010)_
