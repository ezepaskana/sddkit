# Plan — tarea 012: Cerrar los gaps de buenas prácticas OSS detectados en la rev…

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

- **Rama:** `task/012-cerrar-los-gaps-de-buenas-prcti`
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
  - **Verificación:** `cmd: git checkout -b task/012-cerrar-los-gaps-de-buenas-prcti`

- [x] **2. Workflow de CI (GitHub Actions)** `[P]` _(medio)_
  - **Hace:** crea el workflow que corre la suite en cada push y PR. Trigger `on: [push, pull_request]`. Job `test` con `strategy.matrix.node-version: [18, 20, 22]`, `runs-on: ubuntu-latest`. Pasos: `actions/checkout@v4` → `actions/setup-node@v4` (con `node-version: ${{ matrix.node-version }}`) → `npm ci` → `npm test`. Sin lint, sin publicación al grafo.
  - **Archivos:** `.github/workflows/ci.yml` (nuevo)
  - **Depende de:** —
  - **Verificación:** `cmd: test -f .github/workflows/ci.yml && grep -q "setup-node@v4" .github/workflows/ci.yml && grep -q "npm test" .github/workflows/ci.yml && grep -q "node-version" .github/workflows/ci.yml` — además revisión visual de que el YAML parsea y la matriz lista 18, 20 y 22 (no hay parser YAML en deps; el run real en GitHub lo confirma de punta a punta).

- [x] **3. Docs de comunidad: CONTRIBUTING + CODE_OF_CONDUCT** `[P]` _(rapido)_
  - **Hace:** (a) `CONTRIBUTING.md` mínimo: cómo correr tests (`npm test`), referencia al flujo SDD (enlace a `AGENTS.md`) y a las convenciones ya consolidadas (Conventional Commits + GitHub Flow + patrón `task/{n}-{slug}`, citando `.sdd/branching.md`) SIN reescribirlas, y nota de actualizar `CHANGELOG.md` al contribuir. (b) `CODE_OF_CONDUCT.md` con el texto estándar Contributor Covenant (v2.1) y contacto `eze.paskana@gmail.com` en la sección de enforcement.
  - **Archivos:** `CONTRIBUTING.md` (nuevo), `CODE_OF_CONDUCT.md` (nuevo)
  - **Depende de:** —
  - **Verificación:** `cmd: test -f CONTRIBUTING.md && test -f CODE_OF_CONDUCT.md && grep -q "Contributor Covenant" CODE_OF_CONDUCT.md && grep -q "eze.paskana@gmail.com" CODE_OF_CONDUCT.md && grep -q "AGENTS.md" CONTRIBUTING.md`

- [x] **4. CHANGELOG.md (Keep a Changelog, baseline 0.0.1)** `[P]` _(medio)_
  - **Hace:** crea `CHANGELOG.md` en formato Keep a Changelog con encabezado estándar (enlaces a keepachangelog.com y SemVer), una sección `## [Unreleased]` vacía y una primera entrada `## [0.0.1] - 2026-06-15` que consolida el estado actual del proyecto como baseline (CLI SDD: setup/scan/validate/sync, flujo SDD por tarea, grafo de impacto SQLite/MySQL, scanner Terraform, branching model, hooks pre/post-commit) SIN backfillear el detalle de las 12 tareas internas.
  - **Archivos:** `CHANGELOG.md` (nuevo)
  - **Depende de:** —
  - **Verificación:** `cmd: test -f CHANGELOG.md && grep -q "0.0.1" CHANGELOG.md && grep -qi "keepachangelog" CHANGELOG.md && grep -q "Unreleased" CHANGELOG.md`

- [x] **5. Templates de GitHub (issues + PR) y dependabot** `[P]` _(rapido)_
  - **Hace:** (a) `.github/ISSUE_TEMPLATE/bug_report.md` (descripción, pasos de repro, comportamiento esperado/actual, entorno: SO + versión de Node + versión de sddkit). (b) `.github/ISSUE_TEMPLATE/feature_request.md` (motivación/problema, propuesta, alternativas, alcance). (c) `.github/PULL_REQUEST_TEMPLATE.md` (descripción, tipo de cambio, checklist: tests en verde `npm test`, changelog actualizado, sigue Conventional Commits). (d) `.github/dependabot.yml` con `package-ecosystem: npm` (schedule weekly) y `package-ecosystem: github-actions` (schedule weekly).
  - **Archivos:** `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml` (todos nuevos)
  - **Depende de:** —
  - **Verificación:** `cmd: test -f .github/ISSUE_TEMPLATE/bug_report.md && test -f .github/ISSUE_TEMPLATE/feature_request.md && test -f .github/PULL_REQUEST_TEMPLATE.md && test -f .github/dependabot.yml && grep -q "github-actions" .github/dependabot.yml && grep -q "npm" .github/dependabot.yml`

- [x] **6. Reset de versión a 0.0.1 (coherente en 3 archivos)** _(medio)_
  - **Hace:** cambia la versión `0.12.3` → `0.0.1` en `package.json` (campo `version`), `package-lock.json` (ambas ocurrencias: raíz y `packages."".version`) y `.sdd/config.json` (campo `version`, para preservar la invariante de BR-034 `config.version == VERSION` y no disparar el aviso de `sdd doctor`/`sync`). No toca ningún otro campo ni código.
  - **Archivos:** `package.json`, `package-lock.json`, `.sdd/config.json`
  - **Depende de:** —
  - **Verificación:** `cmd: grep -q '"version": "0.0.1"' package.json && grep -q '"version": "0.0.1"' .sdd/config.json && test "$(grep -c '"version": "0.0.1"' package-lock.json)" -ge 2 && ! grep -rq '0.12.3' package.json package-lock.json .sdd/config.json`

- [x] **7. Verificación final: suite completa + 6/6 artefactos** _(medio)_
  - **Hace:** corre toda la suite de tests para confirmar que el reset de versión no rompió nada (incluido `version.test.js`) y verifica que los 6 artefactos OSS están presentes en sus rutas. No crea archivos nuevos; es el gate de cierre técnico de la tarea.
  - **Archivos:** — (solo lectura/ejecución)
  - **Depende de:** pasos 2, 3, 4, 5, 6
  - **Verificación:** `cmd: npm test && test -f .github/workflows/ci.yml && test -f CONTRIBUTING.md && test -f CODE_OF_CONDUCT.md && test -f CHANGELOG.md && test -f .github/PULL_REQUEST_TEMPLATE.md && test -f .github/dependabot.yml`

---

_Aprobación del dev: APROBADA (2026-06-15)_
