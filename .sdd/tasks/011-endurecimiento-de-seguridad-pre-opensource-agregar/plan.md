# Plan — tarea 011: Endurecimiento de seguridad pre-opensource: agregar nota de …

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

- **Rama:** `task/011-endurecimiento-de-seguridad-pre`
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
  - **Verificación:** `cmd: git checkout -b task/011-endurecimiento-de-seguridad-pre`

- [x] **2. Migrar/extender los tests de `buildPRCommand` al nuevo contrato `{cmd, args}`** _(medio)_
  - **Hace:** Reescribe los 5 tests existentes de `buildPRCommand` (líneas ~167-201 de `close.test.js`) para afirmar el nuevo retorno `{ cmd, args }` en vez del string: github → `{cmd:'gh', args:['pr','create','--draft', '--title=...', '--body=...', '--head=...', '--base=...']}`; azure/gitlab análogos con su binario y flags; `unknown` → `null`. Agrega un test NUEVO de seguridad titulado exactamente `'buildPRCommand: pasa metacaracteres de shell como argumentos literales'` que invoca con `title='feat: $(rm -rf x)'`, `branch='task/1;whoami'` y afirma que esos valores aparecen **literales** dentro de `args` (`assert.ok(cmd.args.includes('--title=feat: $(rm -rf x)'))`) — sin expansión ni split. Tests primero: quedan en ROJO hasta el paso 2.
  - **Archivos:** `src/commands/close.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: grep -q "metacaracteres de shell como argumentos literales" src/commands/close.test.js`

- [x] **3. Refactor `buildPRCommand` → `{cmd, args}` y migrar el consumidor a `spawnSync` sin shell** _(fuerte)_
  - **Hace:** (a) En `src/lib/branching.js`, `buildPRCommand(branch, base, title, body, platform)` deja de armar un string y devuelve `{ cmd, args }` para `github`/`azure`/`gitlab` (cada flag y valor como elemento separado del array; sin escapado de comillas — ya no hay shell), `null` para `unknown`. (b) En `src/commands/task.js` (rama `sub === 'close'`, ~líneas 382-394): cambia `const cmd = buildPRCommand(...)` + `execSync(cmd, ...)` por `const { cmd, args } = buildPRCommand(...)` + `spawnSync(cmd, args, { cwd: root, encoding: 'utf8' })`; lee `r.stdout` (con guardas), trata `r.status !== 0` / `r.error` como fallo degradando a `buildManualPRInstructions` (preserva BR-041), y mantiene intacto el parseo de URL (`/https?:\/\/\S+/`) y la línea `# PR: …`. Importar `spawnSync` (agregar al import de `node:child_process` en task.js). (c) En `.sdd/domain.md`, agregar una nota a BR-041 aclarando que `buildPRCommand` devuelve `{cmd,args}` y la ejecución usa `spawnSync` sin shell (cambio de implementación, contrato de degradación intacto).
  - **Archivos:** `src/lib/branching.js`, `src/commands/task.js`, `.sdd/domain.md`
  - **Depende de:** paso 2 (los tests deben existir en rojo antes de implementar)
  - **Verificación:** `cmd: npm test`

- [x] **4. Docs de seguridad OSS: sección README, SECURITY.md y `files` de package.json** `[P]` _(medio)_
  - **Hace:** (a) Agrega sección `## Seguridad` al `README.md` (antes de `## Licencia`): advierte que sddkit ejecuta comandos definidos en `.sdd/tasks/**/plan.md` (`Verificación: cmd: …` vía `sdd task verify`) y el `git checkout -b` del Paso 1 (vía `sdd task execute`), recomienda correrlo solo sobre repos confiables (mismo modelo que `make`/npm scripts), y linkea a `SECURITY.md`. (b) Crea `SECURITY.md` en la raíz: contacto `eze.paskana@gmail.com`, divulgación responsable, y alcance (qué es / qué no es vuln en una herramienta que ejecuta comandos locales por diseño). (c) Agrega `"SECURITY.md"` al array `files` de `package.json` para que viaje al paquete npm.
  - **Archivos:** `README.md`, `SECURITY.md` (nuevo), `package.json`
  - **Depende de:** — (paralelizable con pasos 1-2; no toca código)
  - **Verificación:** `cmd: test -f SECURITY.md && grep -q "## Seguridad" README.md && grep -q "SECURITY.md" package.json`

---

_Aprobación del dev: APROBADA (2026-06-15)_
