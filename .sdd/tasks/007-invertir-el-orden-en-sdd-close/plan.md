# Plan — tarea 007: Invertir el orden en sdd-close: la retro (retro.md, LEARNING…

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

- **Rama:** `task/007-invertir-el-orden-en-sdd-close`
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
  - **Verificación:** `cmd: git checkout -b task/007-invertir-el-orden-en-sdd-close`

- [x] **2. Reordenar sdd-close: retro primero, push+PR despues** _(rapido)_
  - **Hace:** Reordena las secciones de `skills/sdd-close/SKILL.md` para que la retro completa (metrica, desvios, cosecha, promocion) vaya ANTES de push+PR. El flujo nuevo: (1) retro completa, (2) commit de retro+learnings+promociones, (3) push, (4) PR, (5) `sdd task status done`. Agrega instruccion explicita de commitear la retro antes del push.
  - **Archivos:** `skills/sdd-close/SKILL.md`
  - **Depende de:** —
  - **Verificación:** `cmd: head -30 skills/sdd-close/SKILL.md | grep -q "Retro" && awk '/^## /{print NR": "$0}' skills/sdd-close/SKILL.md | head -3`

---

_Aprobación del dev: pendiente_
