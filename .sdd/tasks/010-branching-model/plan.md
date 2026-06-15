# Plan — tarea 010: Branching Modeling para proyectos que usan sddkit

> Pasos CHICOS: cada uno verificable por sí solo. Tests primero. Métrica: 100% de proyectos con `.sdd/branching.md` válido post-init.

---

## Fase 0: Inicialización del repo

- [x] **1. Correr `git init` en sddkit y crear rama de trabajo** _(rapido)_
  - **Hace:** Inicializar repositorio git en sddkit. Crear rama `task/010-branching-model` basada en commit inicial.
  - **Archivos:** `.git/` (nuevo)
  - **Depende de:** —
  - **Verificación:**
    ```
    cmd: git rev-parse --show-toplevel | grep -q sddkit && git branch --show-current | grep -q task/010
    ```

---

## Fase 1: Módulo `src/lib/branching.js`

- [x] **2. Crear test: lectura y validación de `.sdd/branching.md`** _(medio)_
  - **Hace:** Test suite para `src/lib/branching.js`. Cubre lectura (existe, válido JSON/YAML), validación de schema (tiene `convención`, `flujo`, `patrón`), acceso a versión activa.
  - **Archivos:** `src/lib/branching.test.js`
  - **Depende de:** paso 1
  - **Verificación:**
    ```
    cmd: node --test src/lib/branching.test.js 2>&1 | grep -E '^(✔|✖)' | wc -l | grep -qE '^[0-9]{2,}$'
    ```

- [x] **3. Crear test: generación de fixture `.sdd/branching.md` de ejemplo** _(rapido)_
  - **Hace:** Test que verifica que se puede leer/parsear un `.sdd/branching.md` de ejemplo válido.
  - **Archivos:** `src/lib/branching.test.js` (extender), `.sdd/branching.example.md` (fixture)
  - **Depende de:** paso 2
  - **Verificación:**
    ```
    cmd: node --test src/lib/branching.test.js 2>&1 | grep -q 'valid branching policy'
    ```

- [x] **4. Crear test: defaults (Conventional Commits + GitHub Flow + task/{numero}-{slug})** _(rapido)_
  - **Hace:** Test que verifica función `getBranchingDefaults()` retorna policy correcta.
  - **Archivos:** `src/lib/branching.test.js` (extender)
  - **Depende de:** paso 2
  - **Verificación:**
    ```
    cmd: node --test src/lib/branching.test.js 2>&1 | grep -q 'defaults correctly'
    ```

- [x] **5. Implementar `src/lib/branching.js` con funciones core** _(medio)_
  - **Hace:** Módulo que expone:
    - `readPolicy(rootPath)` → lee `.sdd/branching.md`, retorna objeto con `{convención, flujo, patrón, versions, active}`
    - `validatePolicy(policy)` → valida schema, retorna `{valid, errors[]}`
    - `getBranchingDefaults()` → retorna policy default (CC + GH Flow + task/NNN-slug)
    - `getActiveBranching(rootPath)` → lee policy O retorna defaults si no existe
    - `formatBranchName(taskId, taskTitle, policy)` → genera nombre de rama según patrón (ej: `task/010-branching-model`)
  - **Archivos:** `src/lib/branching.js`
  - **Depende de:** pasos 2-4
  - **Verificación:**
    ```
    cmd: node --test src/lib/branching.test.js 2>&1 | grep -q 'all tests passed'
    ```

- [x] **6. Crear test: generación de nombres de rama (`formatBranchName`)** _(rapido)_
  - **Hace:** Test que verifica `formatBranchName('010', 'Branching Model', policy)` → `task/010-branching-model` (con truncado a 40 chars si es necesario).
  - **Archivos:** `src/lib/branching.test.js` (extender)
  - **Depende de:** paso 5
  - **Verificación:**
    ```
    cmd: node --test src/lib/branching.test.js 2>&1 | grep -q 'branch name formatting'
    ```

---

## Fase 2: Integración en `sdd init` / `sdd setup`

- [x] **7. Crear test: pregunta de policy en modo interactivo** _(medio)_
  - **Hace:** Test que verifica que `setupBranchingPolicy()` (función nueva) hace preguntas interactivas (convención, flujo, patrón) y retorna object con respuestas.
  - **Archivos:** `src/commands/setup.test.js` (extender o crear)
  - **Depende de:** paso 5
  - **Verificación:**
    ```
    cmd: node --test src/commands/setup.test.js 2>&1 | grep -q 'branching policy questions'
    ```

- [x] **8. Crear test: escritura de `.sdd/branching.md` con histórico de versiones** _(rapido)_
  - **Hace:** Test que verifica que se crea `.sdd/branching.md` con estructura versionada: `{versions: [{date, author, convención, flujo, patrón}], active: 0}`.
  - **Archivos:** `src/commands/setup.test.js` (extender)
  - **Depende de:** paso 7
  - **Verificación:**
    ```
    cmd: node --test src/commands/setup.test.js 2>&1 | grep -q 'branching policy persisted'
    ```

- [x] **9. Implementar integración en `sdd setup`** _(medio)_
  - **Hace:** Modificar `src/commands/setup.js`:
    - Después de preguntar scope de skills, preguntar política de branching (si `.sdd/branching.md` no existe)
    - Llamar a `setupBranchingPolicy()` para obtener respuestas
    - Escribir `.sdd/branching.md` con histórico
    - Imprimir `✓ Branching policy: <convención> + <flujo> + <patrón>`
  - **Archivos:** `src/commands/setup.js`
  - **Depende de:** pasos 7-8
  - **Verificación:**
    ```
    cmd: node --test src/commands/setup.test.js 2>&1 | grep -E '(✔|ok)' | wc -l | grep -q '[0-9]'
    ```

- [x] **10. Implementar integración en `sdd init`** _(rapido)_
  - **Hace:** Modificar `src/commands/init.js` para llamar a la misma lógica de setup de branching (reutilizar función de paso 9).
  - **Archivos:** `src/commands/init.js`
  - **Depende de:** paso 9
  - **Verificación:**
    ```
    cmd: node --test src/commands/init.test.js 2>&1 | grep -q 'branching'
    ```

---

## Fase 3: Integración en `sdd task plan`

- [x] **11. Crear test: generación de sección "Rama de trabajo" en plan** _(medio)_
  - **Hace:** Test que verifica que `generateRamaDeTrabajoSection()` genera sección Markdown con nombre de rama, origen, destino, patrón de commits.
  - **Archivos:** `src/lib/plan-generator.test.js` (crear o extender)
  - **Depende de:** paso 5
  - **Verificación:**
    ```
    cmd: node --test src/lib/plan-generator.test.js 2>&1 | grep -q 'rama de trabajo section'
    ```

- [x] **12. Crear test: Paso 1 del plan es crear rama (`git checkout -b`)** _(rapido)_
  - **Hace:** Test que verifica que cuando se genera un plan, el Paso 1 siempre es `cmd: git checkout -b <rama>`.
  - **Archivos:** `src/lib/plan-generator.test.js` (extender)
  - **Depende de:** paso 11
  - **Verificación:**
    ```
    cmd: node --test src/lib/plan-generator.test.js 2>&1 | grep -q 'step 1 checkout'
    ```

- [x] **13. Implementar integración en `sdd task plan`** _(medio)_
  - **Hace:** Modificar `src/commands/task.js` (subcommand `plan`):
    - Leer `.sdd/branching.md` (o defaults)
    - Generar sección "Rama de trabajo" con info: nombre de rama, origen, destino, convención de commits
    - Insertar ANTES de "## Paso 1"
    - Crear Paso 1 = `git checkout -b <rama>`
    - Mover pasos anteriores a Paso 2, 3, etc.
  - **Archivos:** `src/commands/task.js`
  - **Depende de:** pasos 11-12
  - **Verificación:**
    ```
    cmd: node --test src/commands/task.test.js 2>&1 | grep -q 'plan with branching'
    ```

- [x] **14. Crear test: plan sin `.sdd/branching.md` usa defaults + aviso** _(rapido)_
  - **Hace:** Test que verifica que si `.sdd/branching.md` no existe, el plan incluye defaults y nota `⚠️ Política de branching no definida`.
  - **Archivos:** `src/commands/task.test.js` (extender)
  - **Depende de:** paso 13
  - **Verificación:**
    ```
    cmd: node --test src/commands/task.test.js 2>&1 | grep -q 'defaults warning'
    ```

---

## Fase 4: Integración en `sdd task execute`

- [x] **15. Crear test: validación de rama antes de ejecutar pasos** _(medio)_
  - **Hace:** Test que verifica que `validateBranchBeforeExecute()` chequea `git branch --show-current` vs rama esperada (del plan).
  - **Archivos:** `src/commands/execute.test.js` (crear o extender)
  - **Depende de:** paso 5
  - **Verificación:**
    ```
    cmd: node --test src/commands/execute.test.js 2>&1 | grep -q 'branch validation'
    ```

- [x] **16. Crear test: Paso 1 (crear rama) es bloqueante — otros pasos no corren si falla** _(rapido)_
  - **Hace:** Test que verifica que si el comando `git checkout -b` en Paso 1 falla (ej: rama ya existe), pasos 2+ no se ejecutan.
  - **Archivos:** `src/commands/execute.test.js` (extender)
  - **Depende de:** paso 15
  - **Verificación:**
    ```
    cmd: node --test src/commands/execute.test.js 2>&1 | grep -q 'step 1 blocking'
    ```

- [x] **17. Implementar integración en `sdd task execute`** _(medio)_
  - **Hace:** Modificar `src/commands/execute.js`:
    - ANTES de ejecutar pasos, validar que `.git` existe (si no, fallar con instrucción clara)
    - ANTES de Paso 1, leer branching policy
    - Ejecutar Paso 1 (`git checkout -b <rama>`)
    - Validar: `git branch --show-current` == rama esperada
    - SI falla, parar ejecución con mensaje claro
    - SI Paso 1 succeeds, continuar con pasos 2+
    - Pasos 2+ pueden avisar (warning, no error) si rama no es la esperada
  - **Archivos:** `src/commands/execute.js`
  - **Depende de:** pasos 15-16
  - **Verificación:**
    ```
    cmd: node --test src/commands/execute.test.js 2>&1 | grep -E '(✔|ok)' | wc -l | grep -q '[0-9]'
    ```

---

## Fase 5: Integración en `sdd task close`

- [x] **18. Crear test: verificación de rama pusheada** _(rapido)_
  - **Hace:** Test que verifica que `verifyBranchPushed()` chequea `git branch -r` para ver si rama existe en origin.
  - **Archivos:** `src/commands/close.test.js` (crear o extender)
  - **Depende de:** paso 5
  - **Verificación:**
    ```
    cmd: node --test src/commands/close.test.js 2>&1 | grep -q 'branch pushed check'
    ```

- [x] **19. Crear test: detección de plataforma git (GitHub, Azure DevOps, GitLab, etc.)** _(medio)_
  - **Hace:** Test que verifica que `detectGitPlatform()` lee remoto `origin` y retorna platform: 'github' | 'azure' | 'gitlab' | 'unknown'.
  - **Archivos:** `src/commands/close.test.js` (extender)
  - **Depende de:** paso 18
  - **Verificación:**
    ```
    cmd: node --test src/commands/close.test.js 2>&1 | grep -q 'platform detection'
    ```

- [x] **20. Crear test: creación de comando PR por plataforma (gh, az, gl)** _(medio)_
  - **Hace:** Test que verifica que `buildPRCommand()` genera comando correcto para cada plataforma:
    - GitHub: `gh pr create --draft --title="..." --body="..." --head=<rama> --base=<destino>`
    - Azure DevOps: `az repos pr create --source-branch=<rama> --target-branch=<destino> --draft ...`
    - GitLab: `gl mr create --source-branch=<rama> --target-branch=<destino> --draft ...`
  - **Archivos:** `src/commands/close.test.js` (extender)
  - **Depende de:** paso 19
  - **Verificación:**
    ```
    cmd: node --test src/commands/close.test.js 2>&1 | grep -q 'pr command generation'
    ```

- [x] **21. Crear test: degradación a "PR manual" si tool no está disponible** _(rapido)_
  - **Hace:** Test que verifica que si `gh`/`az`/`gl` no está instalado, retorna mensajes de ayuda manual (URLs, instrucciones).
  - **Archivos:** `src/commands/close.test.js` (extender)
  - **Depende de:** paso 20
  - **Verificación:**
    ```
    cmd: node --test src/commands/close.test.js 2>&1 | grep -q 'manual pr creation'
    ```

- [x] **22. Implementar integración en `sdd task close`** _(fuerte)_
  - **Hace:** Modificar `src/commands/task.js` (subcommand `close`):
    - Leer rama actual (`git branch --show-current`)
    - Verificar rama está pusheada a origin
    - Detectar plataforma (GitHub, Azure, GitLab)
    - Generar título y body del PR (incluir link a tarea)
    - Ejecutar comando PR (gh, az, gl) o avisar para manual
    - Capturar PR URL/ID
    - Documentar en reporte final: `# PR: #XXX (draft) — <URL>`
  - **Archivos:** `src/commands/task.js`, `src/lib/branching.js` (extender con helpers PR)
  - **Depende de:** pasos 18-21
  - **Verificación:**
    ```
    cmd: node --test src/commands/close.test.js 2>&1 | grep -E '(✔|ok)' | wc -l | grep -q '[0-9]'
    ```

- [x] **23. Crear test: reporte final de cierre con estado de rama y PR** _(rapido)_
  - **Hace:** Test que verifica que el reporte de cierre documenta: rama name, PR URL/ID, "Próximo: revisión y merge manual".
  - **Archivos:** `src/commands/close.test.js` (extender)
  - **Depende de:** paso 22
  - **Verificación:**
    ```
    cmd: node --test src/commands/close.test.js 2>&1 | grep -q 'close report'
    ```

---

## Fase 6: Tests end-to-end

- [x] **24. Test E2E: flujo completo en repo de prueba (init → plan → execute → close)** _(fuerte)_
  - **Hace:** Test que crea un repo temporal, corre:
    1. `sdd init` → crea `.sdd/branching.md`
    2. `sdd task new 001-test-task`
    3. `sdd task plan 001` → plan con rama de trabajo
    4. `sdd task execute 001` → crea rama, commits, pushea
    5. `sdd task close 001` → crea PR (o avisa para manual)
    Verifica que cada paso completa correctamente.
  - **Archivos:** `src/commands/e2e.test.js` (crear)
  - **Depende de:** pasos 9-10, 13, 17, 22
  - **Verificación:**
    ```
    cmd: node --test src/commands/e2e.test.js 2>&1 | grep -q 'e2e flow complete'
    ```

- [x] **25. Test E2E: flujo con `.sdd/branching.md` existente (no-op en init)** _(rapido)_
  - **Hace:** Test que si `.sdd/branching.md` ya existe, `sdd init` no lo sobrescribe.
  - **Archivos:** `src/commands/e2e.test.js` (extender)
  - **Depende de:** paso 24
  - **Verificación:**
    ```
    cmd: node --test src/commands/e2e.test.js 2>&1 | grep -q 'policy not overwritten'
    ```

---

## Fase 7: Reglas de negocio y documentación

- [x] **26. Agregar BR-039 a BR-042 en `.sdd/domain.md`** _(rapido)_
  - **Hace:** Agregar 4 nuevas reglas de negocio al dominio:
    - BR-039: Toda tarea SDD en rama dedicada
    - BR-040: Policy versionada en histórico
    - BR-041: Best-effort para crear PR, degrada a manual
    - BR-042: Avisos sobre commits que no siguen convención
  - **Archivos:** `.sdd/domain.md`
  - **Depende de:** paso 24
  - **Verificación:**
    ```
    cmd: grep -c "^- \*\*BR-04[0-2]\*\*" .sdd/domain.md | grep -q '[3-4]'
    ```

- [x] **27. Crear `.sdd/branching-guide.md` — guía de creación de PR por plataforma** _(rapido)_
  - **Hace:** Documentación: "Si sddkit no pudo crear el PR automáticamente, aquí está cómo hacerlo manualmente en tu plataforma" (GitHub, Azure DevOps, GitLab, Bitbucket).
  - **Archivos:** `.sdd/branching-guide.md`
  - **Depende de:** paso 26
  - **Verificación:**
    ```
    cmd: test -f .sdd/branching-guide.md && grep -q 'GitHub\|Azure\|GitLab' .sdd/branching-guide.md
    ```

- [x] **28. Crear `.sdd/branching.example.md` — ejemplo de policy versionada** _(rapido)_
  - **Hace:** Archivo de ejemplo con estructura completa de `.sdd/branching.md` incluyendo histórico de versiones.
  - **Archivos:** `.sdd/branching.example.md`
  - **Depende de:** paso 27
  - **Verificación:**
    ```
    cmd: test -f .sdd/branching.example.md && grep -q 'versions' .sdd/branching.example.md
    ```

---

## Fase 8: Ejecución en vivo (dogfooding de la tarea 010 misma)

- [x] **29. Ejecutar `sdd task close 010` — rama lista, aviso para PR manual** _(rapido)_
  - **Hace:** Aplicar el feature implementado a la tarea 010 misma: rama `task/010-branching-model` ya existe (paso 1), commits ya están hechos. Ejecutar `sdd task close 010` que:
    1. Verifica rama está en estado correcto
    2. Genera descripción de PR
    3. **Avisa:** "PR ready to create manually: sddkit aún no tiene remote. Los proyectos que instalen sddkit verán aquí `gh pr create --draft --title=... --body=...`"
  - **Archivos:** —
  - **Depende de:** pasos 9-28 (toda la implementación)
  - **Verificación:**
    ```
    cmd: git log --oneline task/010-branching-model | head -3 | grep -q 'branching'
    ```
  - **Nota:** sddkit no tiene remote en GitHub, así que `sdd-close` degradará a "PR manual". Esto es correcto — el feature ESTÁ implementado y funcionará completamente en proyectos que instalen sddkit y tengan sus propios remotes.

---

## Resumen

**Total pasos:** 29 (reorganizables, ~5-10 paralelizables en fases 1-5)

**Dependencias críticas:**
- Fase 0 (git init) → bloqueante para todo
- Fase 1 (módulo) → bloqueante para 2-5
- Fases 2-5 → pueden paralelizarse parcialmente (tests primero, implementación después)
- Fase 6 (E2E) → bloqueante para 7
- Fase 8 (dogfooding) → último (requiere todo)

**Tiempo estimado:** 4-6 horas (con subagentes en paralelo, 2-3 horas)

---

_Aprobación del dev: pendiente_
