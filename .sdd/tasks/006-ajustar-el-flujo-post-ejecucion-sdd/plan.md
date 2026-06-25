# Plan — tarea 006: Ajustar el flujo post-ejecución SDD para que: (1) los worker…

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

- **Rama:** `task/006-ajustar-el-flujo-post-ejecucin`
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
  - **Verificación:** `cmd: git checkout -b task/006-ajustar-el-flujo-post-ejecucin`

- [x] **2. Regla no-commit en protocolo de subagentes** _(rapido)_
  - **Hace:** Agrega una sección explícita en el protocolo indicando que los workers NO deben ejecutar `git add` ni `git commit`. Los cambios quedan como modificaciones locales (unstaged/untracked).
  - **Archivos:** `skills/sdd-execute/references/protocolo-subagentes.md`
  - **Depende de:** —
  - **Verificación:** `cmd: grep -q "NO.*git commit\|no.*commitear\|NO.*commit" skills/sdd-execute/references/protocolo-subagentes.md`

- [x] **3. Fase "prueba local" y no-commit en sdd-execute** _(medio)_
  - **Hace:** Modifica el SKILL.md del orquestador para: (a) agregar instrucción de no commitear durante la ejecución, (b) agregar una fase nueva entre "último paso verificado" y "sdd-close" donde el orquestador analiza el tipo de cambio (CLI command, lib, config/docs, skill) y presenta al dev instrucciones concretas de cómo probar localmente, (c) esperar confirmación del dev antes de commitear, (d) si el dev reporta problemas, corregir sin commitear y volver a pedir confirmación. Recién tras el commit, transicionar a sdd-close.
  - **Archivos:** `skills/sdd-execute/SKILL.md`
  - **Depende de:** paso 1
  - **Verificación:** `cmd: grep -q "prueba local\|Prueba local\|probar localmente" skills/sdd-execute/SKILL.md && grep -q "NO.*commit" skills/sdd-execute/SKILL.md`

- [x] **4. Actualizar ejemplo de ejecucion con fase de prueba local** _(rapido)_
  - **Hace:** Agrega una sección "Prueba local" entre el último paso completado y el cierre con `sdd task status done`. Muestra cómo el orquestador sugiere al dev probar (ej: `sdd doctor` para un comando CLI) y espera confirmación antes de commitear.
  - **Archivos:** `skills/sdd-execute/examples/ejecucion-ejemplo.md`
  - **Depende de:** paso 2
  - **Verificación:** `cmd: grep -q "Prueba local\|prueba local" skills/sdd-execute/examples/ejecucion-ejemplo.md`

- [x] **5. Ajustar sdd-close para asumir commit ya hecho** _(rapido)_
  - **Hace:** Modifica la sección "Rama y Pull Request" de sdd-close para que no sea lo primero que corre. El commit ya ocurrió en la fase de prueba local (sdd-execute). sdd-close se enfoca en: push (si no está pusheado), PR, y luego la retro. Ajusta el texto para reflejar que el dev ya probó y commiteó.
  - **Archivos:** `skills/sdd-close/SKILL.md`
  - **Depende de:** paso 2
  - **Verificación:** `cmd: grep -q "ya.*commit\|commit.*ya\|dev.*probó\|probó.*localmente" skills/sdd-close/SKILL.md`

---

_Aprobación del dev: pendiente_
