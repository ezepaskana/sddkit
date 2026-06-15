# Plan — tarea 009: en la fase de analisis del flujo sdd es importante que quede…

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

> Tarea de contenido (markdown de skills, sin código ni tests automatizados — ver "Fuera de alcance" en spec.md). No aplica "tests primero". Las 3 ubicaciones tocadas hoy son mirrors idénticos (`skills/` ↔ `.claude/skills/`); cada paso edita ambas copias con el mismo texto y verifica con `diff` que sigan idénticas (sin drift, BR-032/aprendizaje tarea 003).

## Pasos

- [x] **1. Pregunta 7 en sdd-analyze/SKILL.md** `[P]` _(rapido)_
  - **Hace:** Inserta la pregunta 7 (texto exacto acordado en spec.md, P3) al final del bloque numerado "Análisis" (después del punto 6 "¿Qué pasa si NO se hace?"), sin modificar el resto del archivo: *"7. Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (logs, métricas, alertas, mensajes de error) y cómo debería reaccionar el sistema (reintento, fallback, mensaje al dev/usuario, degradación)? Si no aplica (sin lógica nueva que pueda fallar), decilo explícitamente."*
  - **Archivos:** `skills/sdd-analyze/SKILL.md`, `.claude/skills/sdd-analyze/SKILL.md`
  - **Depende de:** —
  - **Verificación:** `cmd: diff skills/sdd-analyze/SKILL.md .claude/skills/sdd-analyze/SKILL.md && grep -q "Si esta funcionalidad puede fallar en uso real" skills/sdd-analyze/SKILL.md`

- [x] **2. Bullet espejo en spec.md template** `[P]` _(rapido)_
  - **Hace:** Agrega, en la sección "Análisis crítico" del template, un bullet espejo de la pregunta 7, después del bullet "¿Qué pasa si NO se hace?", con el mismo estilo placeholder (`…`) que los bullets existentes: `- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (detección) y cómo debería reaccionar el sistema (manejo)?** … _(o "no aplica" si la tarea no introduce lógica nueva que pueda fallar)_`
  - **Archivos:** `skills/sdd-specify/templates/spec.md`, `.claude/skills/sdd-specify/templates/spec.md`
  - **Depende de:** —
  - **Verificación:** `cmd: diff skills/sdd-specify/templates/spec.md .claude/skills/sdd-specify/templates/spec.md && grep -q "Si esta funcionalidad puede fallar en uso real" skills/sdd-specify/templates/spec.md`

- [x] **3. Ejemplo de respuesta a la pregunta 7** `[P]` _(medio)_
  - **Hace:** Agrega al final de `analisis-ejemplo.md`, sobre el MISMO escenario ya presente (cache Redis para `GET /plants`), una respuesta de muestra a la pregunta 7 con el mismo nivel de profundidad concreta que el resto del ejemplo: detección concreta (qué log/métrica/alerta puntual delataría la falla) + reacción concreta (qué debería hacer el sistema ante esa falla) — no genérica.
  - **Archivos:** `skills/sdd-analyze/examples/analisis-ejemplo.md`, `.claude/skills/sdd-analyze/examples/analisis-ejemplo.md`
  - **Depende de:** —
  - **Verificación:** `cmd: diff skills/sdd-analyze/examples/analisis-ejemplo.md .claude/skills/sdd-analyze/examples/analisis-ejemplo.md && grep -qi "nos enterar" skills/sdd-analyze/examples/analisis-ejemplo.md`

---

_Aprobación del dev: aprobado 2026-06-15_
