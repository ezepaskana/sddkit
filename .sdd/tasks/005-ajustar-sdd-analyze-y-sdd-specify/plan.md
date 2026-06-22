# Plan — tarea 005: Ajustar sdd-analyze y sdd-specify para separar outputs y res…

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

- **Rama:** `task/005-ajustar-sdd-analyze-y-sdd-speci`
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
  - **Verificación:** `cmd: git checkout -b task/005-ajustar-sdd-analyze-y-sdd-speci`

- [x] **2. Crear template analysis.md y actualizar template spec.md** _(medio)_
  - **Hace:** Crea `skills/sdd-analyze/templates/analysis.md` con el template de analisis critico (7 preguntas, clarificacion, recomendacion, metrica de impacto opcional con nota "si no aplica, declararlo"). Actualiza `skills/sdd-specify/templates/spec.md` removiendo las secciones "Analisis critico", "Preguntas de clarificacion" y "Metrica de impacto" — spec.md queda con: historia, criterios EARS, reglas de negocio, fuera de alcance, impacto en arquitectura, linea de aprobacion.
  - **Archivos:** `skills/sdd-analyze/templates/analysis.md`, `skills/sdd-specify/templates/spec.md`
  - **Depende de:** —
  - **Verificacion:** `cmd: test -f skills/sdd-analyze/templates/analysis.md && ! grep -q "Análisis crítico" skills/sdd-specify/templates/spec.md && grep -q "Spec refinada\|Historia\|EARS" skills/sdd-specify/templates/spec.md`

- [x] **3. Actualizar task.js: crear analysis.md en task new + estado analyzed** _(medio)_
  - **Hace:** (a) Agrega `analyzed` a STATUSES (entre draft y specified). (b) En `task new`, carga y escribe el template analysis.md (igual que spec.md y plan.md). Imprime la ruta de analysis.md en el output. (c) En el bloque de `status`, mapea `analyzed` a abrir `analysis.md` (linea ~323, reviewFile). (d) Actualiza el contrato impreso por `task new` para reflejar: analizar en analysis.md -> gate analyzed -> especificar en spec.md -> gate specified.
  - **Archivos:** `src/commands/task.js`
  - **Depende de:** paso 1 (template debe existir)
  - **Verificacion:** `cmd: node -e "import('./src/commands/task.js')" 2>&1 | grep -v "ExperimentalWarning" && grep -q "analyzed" src/commands/task.js && grep -q "analysis.md" src/commands/task.js`

- [x] **4. Actualizar task.js: brief incluye spec refinada (sin cambios sustanciales)** _(rapido)_
  - **Hace:** En `sdd task brief`, agrega lectura de analysis.md para extraer la seccion de recomendacion (si existe) y la incluye en el brief del subagente despues de la spec refinada. No rompe el brief existente: si analysis.md no existe (tarea vieja), sigue funcionando solo con spec.md.
  - **Archivos:** `src/commands/task.js`
  - **Depende de:** paso 2
  - **Verificacion:** `cmd: grep -q "analysis.md" src/commands/task.js && grep -q "Recomendación\|recomendacion" src/commands/task.js`

- [x] **5. Actualizar agentsmd.js y templates.js** `[P]` _(rapido)_
  - **Hace:** En `src/lib/agentsmd.js`, actualiza el texto del flujo SDD del bloque gestionado: fase 2 ahora escribe en analysis.md con gate `analyzed`, fase 3 escribe en spec.md con gate `specified`, las preguntas del orquestador se registran en analysis.md (no spec.md). En `src/templates.js`, actualiza la CURSOR_RULE para reflejar analysis.md y el nuevo flujo.
  - **Archivos:** `src/lib/agentsmd.js`, `src/templates.js`
  - **Depende de:** —
  - **Verificacion:** `cmd: grep -q "analysis.md" src/lib/agentsmd.js && grep -q "analyzed" src/lib/agentsmd.js && grep -q "analysis.md" src/templates.js`

- [x] **6. Actualizar skills SKILL.md (analyze, specify, task)** _(medio)_
  - **Hace:** (a) `skills/sdd-analyze/SKILL.md` modo tarea: output es analysis.md (no spec.md), mencionar el gate `analyzed`. (b) `skills/sdd-specify/SKILL.md`: indicar que lee analysis.md como input y escribe spec.md, el gate sigue siendo `specified`. (c) `skills/sdd-task/SKILL.md`: actualizar la tabla de fases (fase 2 salida = analysis.md, nueva columna con gate, fase 2 gate = analyzed).
  - **Archivos:** `skills/sdd-analyze/SKILL.md`, `skills/sdd-specify/SKILL.md`, `skills/sdd-task/SKILL.md`
  - **Depende de:** —
  - **Verificacion:** `cmd: grep -q "analysis.md" skills/sdd-analyze/SKILL.md && grep -q "analysis.md" skills/sdd-specify/SKILL.md && grep -q "analyzed" skills/sdd-task/SKILL.md`

- [x] **7. Tests** _(medio)_
  - **Hace:** Actualiza los tests existentes en `src/commands/task.test.js` para verificar: (a) `sdd task new` crea analysis.md, (b) `analyzed` es un estado valido, (c) `sdd task status <id> analyzed` funciona. Si no hay tests de task.js existentes, crear los minimos para estos 3 casos.
  - **Archivos:** `src/commands/task.test.js`
  - **Depende de:** pasos 1, 2
  - **Verificacion:** `cmd: node --test src/commands/task.test.js 2>&1 | tail -5`

- [x] **8. Sincronizar copias desplegadas y regenerar AGENTS.md** _(rapido)_
  - **Hace:** Copia `skills/sdd-analyze/` a `.claude/skills/sdd-analyze/`, `skills/sdd-specify/` a `.claude/skills/sdd-specify/`, `skills/sdd-task/` a `.claude/skills/sdd-task/` (mirror BR-032). Corre `sdd scan` para regenerar AGENTS.md con el nuevo texto de agentsmd.js.
  - **Archivos:** `.claude/skills/sdd-analyze/`, `.claude/skills/sdd-specify/`, `.claude/skills/sdd-task/`, `AGENTS.md`
  - **Depende de:** pasos 4, 5
  - **Verificacion:** `cmd: diff -rq skills/sdd-analyze .claude/skills/sdd-analyze && diff -rq skills/sdd-specify/SKILL.md .claude/skills/sdd-specify/SKILL.md && grep -q "analysis.md" AGENTS.md`

---

_Aprobacion del dev: APROBADA (2026-06-22)_
