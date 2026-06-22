# Plan — tarea 002: Agregar fallback de 3 opciones en los triggers de skills SDD…

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

## Pasos

- [x] **1. Actualizar triggers en agentsmd.js y skill descriptions** _(medio)_
  - **Hace:** Expande keywords de cambio, agrega fallback de 3 opciones (implementar/analizar/charlar) cuando el LLM no esté seguro
  - **Archivos:** `src/lib/agentsmd.js`, `.claude/skills/sdd-analyze/SKILL.md`, `.claude/skills/sdd-task/SKILL.md`, `skills/sdd-analyze/SKILL.md`, `skills/sdd-task/SKILL.md`
  - **Depende de:** —
  - **Verificación:** `sdd scan` regenera AGENTS.md con los nuevos triggers; 210/210 tests pasan

---

_Aprobación del dev: pendiente_
