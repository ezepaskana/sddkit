# Plan — tarea 017: necesito que siempre me responda en pocas palabras simples, …

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. **Máximo 3 sub-ítems por paso** — sin prosa extra. `N/A: <motivo>` es válido donde no aplique. El dev debe APROBAR este plan antes de ejecutar.

## Rama de trabajo

- **Rama:** `task/017-necesito-que-siempre-me-respond`
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
  - **Verificación:** `cmd: git checkout -b task/017-necesito-que-siempre-me-respond`

- [x] **2. Test rojo: `buildBlock` declara el contrato de respuesta** _(medio)_
  - **Hace:** test que exige que el bloque gestionado incluya, en `## Preferencias de respuesta`, el contrato de BR-064 (resumen corto + opciones + detalle en archivo) `src/lib/agentsmd.test.js`
  - **Verificación:** `cmd: node --test src/lib/agentsmd.test.js 2>&1 | grep -q "fail 1"`

- [x] **3. Implementar el contrato en el bloque gestionado (BR-066)** _(medio)_
  - **Hace:** agregar el párrafo de BR-064 a `## Preferencias de respuesta` de `buildBlock` `src/lib/agentsmd.js`
  - **Depende de:** paso 2
  - **Verificación:** `cmd: node --test src/lib/agentsmd.test.js`

- [x] **4. Reescribir el modo standalone de `sdd-analyze` (BR-064 + BR-065)** _(fuerte)_
  - **Hace:** presupuesto ≤150 palabras + hallazgo/opciones/espera, nota persistente en `.sdd/notes/<slug>.md` y excepción acotada a la restricción read-only `skills/sdd-analyze/SKILL.md` (+ mirror en `.claude/skills/`)
  - **Verificación:** `cmd: grep -q "150 palabras" .claude/skills/sdd-analyze/SKILL.md && grep -q ".sdd/notes/" .claude/skills/sdd-analyze/SKILL.md`

- [x] **5. Reference nuevo: notas persistentes** _(medio)_
  - **Hace:** cómo nombrar el slug, qué va en la nota extendida, cómo detectar y continuar una existente, más el link en Additional Resources `.claude/skills/sdd-analyze/references/notas-persistentes.md`, `skills/sdd-analyze/SKILL.md` (+ mirror en `.claude/skills/`)
  - **Depende de:** paso 4
  - **Verificación:** `cmd: test -f .claude/skills/sdd-analyze/references/notas-persistentes.md && grep -q "notas-persistentes.md" .claude/skills/sdd-analyze/SKILL.md`

- [x] **6. Convertir los 5 formatos de respuesta al modelo resumen + opciones** _(medio)_
  - **Hace:** cada formato pasa a "titular + 2-4 opciones", con lo que va a la nota extendida y no al chat `skills/sdd-analyze/references/formatos-respuesta.md` (+ mirror)
  - **Depende de:** paso 4
  - **Verificación:** `cmd: grep -c "opciones" .claude/skills/sdd-analyze/references/formatos-respuesta.md`

- [x] **7. Actualizar los ejemplos standalone al formato nuevo** `[P]` _(medio)_
  - **Hace:** reescribir ambos ejemplos mostrando respuesta corta con menú + extracto de la nota `skills/sdd-analyze/examples/*.md` (+ mirror)
  - **Depende de:** paso 6
  - **Verificación:** `cmd: grep -q "\.sdd/notes/" .claude/skills/sdd-analyze/examples/example-brainstorm.md`

- [x] **8. Suite completa + validate en verde** _(rapido)_
  - **Hace:** correr tests y validación del framework `N/A: no toca archivos`
  - **Depende de:** paso 7
  - **Verificación:** `cmd: sdd validate && node .sdd/run-tests.mjs`

---

_Aprobación del dev: pendiente_
