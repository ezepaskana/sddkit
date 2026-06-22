# Plan — tarea 004: Fusionar sdd-think con sdd-analyze: eliminar sdd-think como …

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

- **Rama:** `task/004-fusionar-sdd-think-con-sdd-anal`
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
  - **Verificación:** `cmd: git checkout -b task/004-fusionar-sdd-think-con-sdd-anal`

- [x] **2. Reescribir sdd-analyze/SKILL.md con modo dual** _(fuerte)_
  - **Hace:** Reescribe `skills/sdd-analyze/SKILL.md` para soportar dos modos: (A) **Modo tarea** (fase 2 SDD) — las 7 preguntas criticas, clarificacion, escribe en spec.md, sigue con sdd-specify; (B) **Modo standalone** — investigacion read-only, categorizacion por tipo de pregunta (bug, comprension, brainstorm, revision, impacto), formatos estructurados (referencia a `references/formatos-respuesta.md`), restriccion critica de no-escritura (prohibir Edit/Write/Bash destructivo), handoff a `/sdd-task`. El SKILL.md detecta el modo por contexto: si hay tarea activa con spec.md pendiente -> modo tarea; si no -> modo standalone.
  - **Archivos:** `skills/sdd-analyze/SKILL.md`
  - **Depende de:** —
  - **Verificacion:** `cmd: grep -q "modo standalone" skills/sdd-analyze/SKILL.md && grep -q "modo tarea" skills/sdd-analyze/SKILL.md && grep -q "read-only" skills/sdd-analyze/SKILL.md && grep -q "sdd-specify" skills/sdd-analyze/SKILL.md`

- [x] **3. Migrar resources de sdd-think a sdd-analyze** `[P]` _(rapido)_
  - **Hace:** Copia `skills/sdd-think/references/formatos-respuesta.md` a `skills/sdd-analyze/references/formatos-respuesta.md`. Copia `skills/sdd-think/examples/example-brainstorm.md` y `skills/sdd-think/examples/example-bug-investigation.md` a `skills/sdd-analyze/examples/`. Actualiza las invocaciones `/sdd-think` dentro de los examples a `/sdd-analyze`.
  - **Archivos:** `skills/sdd-analyze/references/formatos-respuesta.md`, `skills/sdd-analyze/examples/example-brainstorm.md`, `skills/sdd-analyze/examples/example-bug-investigation.md`
  - **Depende de:** —
  - **Verificacion:** `cmd: test -f skills/sdd-analyze/references/formatos-respuesta.md && test -f skills/sdd-analyze/examples/example-brainstorm.md && test -f skills/sdd-analyze/examples/example-bug-investigation.md && ! grep -q "sdd-think" skills/sdd-analyze/examples/example-brainstorm.md`

- [x] **4. Actualizar AGENTS.md: triggers** _(rapido)_
  - **Hace:** Cambia el trigger de preguntas puras de `/sdd-think` a `/sdd-analyze`. Actualiza la opcion (b) del fallback de ambiguedad de "sdd-think" a "sdd-analyze".
  - **Archivos:** `AGENTS.md`
  - **Depende de:** —
  - **Verificacion:** `cmd: grep -q "sdd-analyze" AGENTS.md && ! grep -q "sdd-think" AGENTS.md`

- [x] **5. Actualizar settings.local.json** _(rapido)_
  - **Hace:** Remueve las lineas de permisos de Bash que copian/eliminan `sdd-think` en `.claude/settings.local.json`.
  - **Archivos:** `.claude/settings.local.json`
  - **Depende de:** —
  - **Verificacion:** `cmd: ! grep -q "sdd-think" .claude/settings.local.json`

- [x] **6. Eliminar carpetas sdd-think** _(rapido)_
  - **Hace:** Elimina `skills/sdd-think/` y `.claude/skills/sdd-think/`.
  - **Archivos:** `skills/sdd-think/` (eliminar), `.claude/skills/sdd-think/` (eliminar)
  - **Depende de:** paso 2 (resources ya migrados)
  - **Verificacion:** `cmd: ! test -d skills/sdd-think && ! test -d .claude/skills/sdd-think`

- [x] **7. Sincronizar copia desplegada (.claude/skills/sdd-analyze/)** _(rapido)_
  - **Hace:** Copia `skills/sdd-analyze/` completa a `.claude/skills/sdd-analyze/` (mirror, como BR-032).
  - **Archivos:** `.claude/skills/sdd-analyze/`
  - **Depende de:** pasos 1, 2
  - **Verificacion:** `cmd: diff -rq skills/sdd-analyze .claude/skills/sdd-analyze`

---

_Aprobacion del dev: APROBADA (2026-06-22)_
