# Plan — tarea 003: Implementar las 3 propuestas de mejora de alta prioridad par…

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. El dev debe APROBAR este plan antes de ejecutar.

Estructura de cada paso — el checkbox de la **primera línea** es lo que `sdd task` trackea; el detalle va en sub-ítems indentados:

```markdown
- [ ] **N. Título corto del paso** `[P]` _(rapido)_
  - **Hace:** qué se construye o cambia en este paso
  - **Archivos:** `ruta/uno`, `ruta/dos`
  - **Depende de:** paso M (o —)
  - **Verificación:** cómo se comprueba que quedó bien
```

`[P]` = paralelizable · Nivel de modelo por paso: _(rapido)_ mecánico/boilerplate · _(medio)_ implementación estándar · _(fuerte)_ diseño, lógica compleja, edge cases. Los modelos concretos de cada nivel están en `.sdd/config.json → models`.

> La sección de **rama de trabajo** y el Paso 1 (`git checkout -b <rama>`) los genera automáticamente `sdd task plan` desde `.sdd/branching.md`; los pasos que escribas acá se renumeran a partir del Paso 2.

## Rama de trabajo

- **Rama:** `task/003-implementar-las-3-propuestas-de`
- **Origen:** `main`
- **Destino:** `main`
- **Convención de commits:** Conventional Commits
- **Flujo:** GitHub Flow
- **Patrón:** `task/{numero}-{slug}`

## Pasos

- [x] **1. Crear rama de trabajo** _(rapido)_
  - **Hace:** crear y cambiar a la rama de trabajo de la tarea
  - **Archivos:** —
  - **Depende de:** —
  - **Verificación:** `cmd: git checkout -b task/003-implementar-las-3-propuestas-de`

- [x] **2. Crear skill sdd-think (SKILL.md + examples/)** _(fuerte)_
  - **Hace:** Crea `skills/sdd-think/SKILL.md` con restriccion hard de no-escritura (prohibir Edit/Write/Bash destructivo), categorizacion de preguntas en 5 tipos (bug/behavior, understanding, brainstorm, review, impact analysis) con formato de respuesta distinto para cada uno, y handoff a sdd-task al terminar. Crea `skills/sdd-think/examples/example-brainstorm.md` y `skills/sdd-think/examples/example-bug-investigation.md` con casos concretos de sddkit.
  - **Archivos:** `skills/sdd-think/SKILL.md`, `skills/sdd-think/examples/example-brainstorm.md`, `skills/sdd-think/examples/example-bug-investigation.md`
  - **Depende de:** —
  - **Verificación:** `cmd: test -f skills/sdd-think/SKILL.md && test -f skills/sdd-think/examples/example-brainstorm.md && test -f skills/sdd-think/examples/example-bug-investigation.md`

- [x] **3. Actualizar sdd-analyze: quitar trigger auto para preguntas puras** _(rapido)_
  - **Hace:** Modifica el frontmatter `description` de `skills/sdd-analyze/SKILL.md` para que sea exclusivamente fase del flujo SDD (no trigger automatico para preguntas puras). Quita la mencion "Usar automaticamente cuando el usuario SOLO quiera entender el sistema sin pedir cambio" y deja claro que es solo la fase 2 del flujo de tarea.
  - **Archivos:** `skills/sdd-analyze/SKILL.md`
  - **Depende de:** paso 1
  - **Verificación:** `cmd: grep -q "Fase de análisis crítico" skills/sdd-analyze/SKILL.md && ! grep -q "SOLO quiera entender" skills/sdd-analyze/SKILL.md`

- [x] **4. Actualizar AGENTS.md: triggers de sdd-think** _(rapido)_
  - **Hace:** Modifica la seccion "Triggers automaticos de skills" de AGENTS.md para que las preguntas puras disparen sdd-think (no sdd-analyze). Agrega sdd-think como opcion en el fallback de ambiguedad. Mantiene sdd-analyze como fase del flujo SDD (no en triggers).
  - **Archivos:** `AGENTS.md`
  - **Depende de:** paso 1
  - **Verificación:** `cmd: grep -q "sdd-think" AGENTS.md && grep -q "sdd-task" AGENTS.md`

- [x] **5. Agregar examples/ a sdd-specify** `[P]` _(medio)_
  - **Hace:** Crea `skills/sdd-specify/examples/spec-ejemplo.md` con un ejemplo concreto de spec EARS completa (basado en una tarea real de sddkit, p.ej. tarea 005 sync).
  - **Archivos:** `skills/sdd-specify/examples/spec-ejemplo.md`
  - **Depende de:** —
  - **Verificación:** `cmd: test -f skills/sdd-specify/examples/spec-ejemplo.md`

- [x] **6. Agregar examples/ a sdd-execute** `[P]` _(medio)_
  - **Hace:** Crea `skills/sdd-execute/examples/ejecucion-ejemplo.md` con un ejemplo concreto del ciclo orquestador/worker: brief, lanzamiento de subagente, verificacion, marcado de checkbox.
  - **Archivos:** `skills/sdd-execute/examples/ejecucion-ejemplo.md`
  - **Depende de:** —
  - **Verificación:** `cmd: test -f skills/sdd-execute/examples/ejecucion-ejemplo.md`

- [x] **7. Agregar examples/ a sdd-close** `[P]` _(medio)_
  - **Hace:** Crea `skills/sdd-close/examples/retro-ejemplo.md` con un ejemplo concreto de retro completa: metrica vs baseline, desvios, cosecha, promocion.
  - **Archivos:** `skills/sdd-close/examples/retro-ejemplo.md`
  - **Depende de:** —
  - **Verificación:** `cmd: test -f skills/sdd-close/examples/retro-ejemplo.md`

- [x] **8. Agregar examples/ a sdd-task** `[P]` _(medio)_
  - **Hace:** Crea `skills/sdd-task/examples/flujo-ejemplo.md` con un ejemplo concreto del flujo completo de una tarea SDD: desde el trigger hasta el cierre, mostrando las transiciones entre fases.
  - **Archivos:** `skills/sdd-task/examples/flujo-ejemplo.md`
  - **Depende de:** —
  - **Verificación:** `cmd: test -f skills/sdd-task/examples/flujo-ejemplo.md`

- [x] **9. Agregar references/ donde faltan y enriquecer existentes** `[P]` _(medio)_
  - **Hace:** Revisa cada skill y agrega references/ donde tenga sentido: (a) sdd-think/references/formatos-respuesta.md con los 5 formatos de respuesta por tipo de pregunta (extraido de SKILL.md si queda largo), (b) sdd-task/references/triggers-delegacion.md con la tabla de triggers de delegacion expandida con ejemplos, (c) sdd-plan/references/reglas-descomposicion.md si la seccion de reglas crece. Agrega seccion "Additional Resources" al final de cada SKILL.md que referencie sus archivos.
  - **Archivos:** `skills/sdd-think/references/formatos-respuesta.md`, `skills/sdd-task/references/triggers-delegacion.md`, SKILL.md de cada skill afectada
  - **Depende de:** paso 1
  - **Verificación:** `cmd: test -f skills/sdd-think/references/formatos-respuesta.md && test -f skills/sdd-task/references/triggers-delegacion.md`

- [x] **10. Crear skill sdd-improve-skill (SKILL.md + references/)** _(fuerte)_
  - **Hace:** Crea `skills/sdd-improve-skill/SKILL.md` con el flujo completo: identificar skill target, leer todos sus archivos, evaluar contra 6 categorias (Frontmatter, Progressive Disclosure, Directory Completeness, Content Quality, Examples, Robustness), presentar reporte tabular con PASS/IMPROVE/MISSING, proponer mejoras priorizadas, preguntar cuales aplicar, aplicar las aprobadas, verificar. Crea `skills/sdd-improve-skill/references/skill-creator-checklist.md` con el checklist de best practices adaptado de Anthropic.
  - **Archivos:** `skills/sdd-improve-skill/SKILL.md`, `skills/sdd-improve-skill/references/skill-creator-checklist.md`
  - **Depende de:** —
  - **Verificación:** `cmd: test -f skills/sdd-improve-skill/SKILL.md && test -f skills/sdd-improve-skill/references/skill-creator-checklist.md`

- [x] **11. Sync a .claude/skills/ y validacion final** _(rapido)_
  - **Hace:** Copia todas las skills nuevas/modificadas de `skills/` a `.claude/skills/` (mirror). Verifica que no hay drift entre ambas copias. Corre `sdd validate` para asegurar que todo esta en orden.
  - **Archivos:** `.claude/skills/sdd-think/`, `.claude/skills/sdd-analyze/`, `.claude/skills/sdd-improve-skill/`, `.claude/skills/sdd-task/`, `.claude/skills/sdd-specify/`, `.claude/skills/sdd-execute/`, `.claude/skills/sdd-close/`
  - **Depende de:** pasos 1-9
  - **Verificación:** `cmd: diff -rq skills/sdd-think .claude/skills/sdd-think && diff -rq skills/sdd-analyze/SKILL.md .claude/skills/sdd-analyze/SKILL.md && diff -rq skills/sdd-improve-skill .claude/skills/sdd-improve-skill`

---

_Aprobacion del dev: APROBADA (2026-06-22)_
