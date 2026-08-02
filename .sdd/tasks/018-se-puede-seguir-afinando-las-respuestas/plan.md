# Plan — tarea 018: cero jerga sin traducir y opciones que digan qué se gana

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. **Máximo 3 sub-ítems por paso** — sin prosa extra. `N/A: <motivo>` es válido donde no aplique. El dev debe APROBAR este plan antes de ejecutar.

## Rama de trabajo

- **Rama:** `task/018-se-puede-seguir-afinando-las-re`
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
  - **Verificación:** `cmd: git checkout -b task/018-se-puede-seguir-afinando-las-re`

- [x] **2. Test rojo: el bloque gestionado exige traducción y pregunta de cierre** _(medio)_
  - **Hace:** test de `## Preferencias de respuesta` con BR-067 (traducir códigos) y BR-068 (pregunta + resultado por opción), sin romper el tope de 450 palabras `src/lib/agentsmd.test.js`
  - **Verificación:** `cmd: node --test src/lib/agentsmd.test.js 2>&1 | grep -q "fail 1"`

- [x] **3. Reescribir el párrafo del bloque gestionado** _(fuerte)_
  - **Hace:** un solo párrafo que cubra BR-064 + BR-067 + BR-068 dentro del tope de 450 palabras (hoy va en 436) `src/lib/agentsmd.js`
  - **Depende de:** paso 2
  - **Verificación:** `cmd: node --test src/lib/agentsmd.test.js`

- [x] **4. Reglas de legibilidad en la skill** _(fuerte)_
  - **Hace:** sección con qué se traduce y qué no, y el desempate cuando la traducción no entra en las 150 palabras `skills/sdd-analyze/SKILL.md`
  - **Depende de:** paso 3
  - **Verificación:** `cmd: grep -q "traduc" skills/sdd-analyze/SKILL.md && grep -q "pregunta" skills/sdd-analyze/SKILL.md`

- [x] **5. Opciones con resultado + pregunta de cierre en los 6 formatos** _(medio)_
  - **Hace:** cada opción pasa de nombre de tarea a resultado (`→ …`) y cada formato cierra con pregunta `skills/sdd-analyze/references/formatos-respuesta.md`
  - **Depende de:** paso 4
  - **Verificación:** `cmd: test $(grep -c "→" skills/sdd-analyze/references/formatos-respuesta.md) -ge 6`

- [x] **6. Ejemplos sin jerga sin traducir** `[P]` _(medio)_
  - **Hace:** traducir los códigos de los dos ejemplos y cerrar ambos con pregunta respondible `skills/sdd-analyze/examples/example-brainstorm.md`, `skills/sdd-analyze/examples/example-bug-investigation.md`
  - **Depende de:** paso 5
  - **Verificación:** `cmd: grep -q "¿" skills/sdd-analyze/examples/example-brainstorm.md && grep -q "¿" skills/sdd-analyze/examples/example-bug-investigation.md`

- [x] **7. Mirror a `.claude/skills/` + suite en verde** _(rapido)_
  - **Hace:** replicar `skills/sdd-analyze/` al destino instalado y correr todo `.claude/skills/sdd-analyze/`
  - **Depende de:** paso 6
  - **Verificación:** `cmd: diff -rq skills/sdd-analyze .claude/skills/sdd-analyze && sdd validate && node .sdd/run-tests.mjs`

---

_Aprobación del dev: pendiente_
