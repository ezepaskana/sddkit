# Plan — tarea 008: Bug: sdd publish no encuentra better-sqlite3 en instalación global

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

- **Rama:** `task/008-bug-sdd-publish-no-encuentra-be`
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
  - **Verificación:** `cmd: git checkout -b task/008-bug-sdd-publish-no-encuentra-be`

- [x] **2. Test: error CJS propagado como missing-dependency en sqlite** _(rapido)_
  - **Hace:** Agrega un test en `sqlite.test.js` que inyecta `deps.importSqlite` con un error de estilo CJS (`{ code: 'MODULE_NOT_FOUND' }`) y verifica que `createGraphStore` retorna `{ ok: false, reason: 'missing-dependency', install: 'npm i better-sqlite3' }`. Cubre la ruta que usará `createRequire` una vez aplicado el fix, donde el error tiene `code` en vez de solo un mensaje.
  - **Archivos:** `src/lib/graphstore/sqlite.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: node --test src/lib/graphstore/sqlite.test.js`

- [x] **3. Fix: sqlite.js usa createRequire en vez de import()** _(rapido)_
  - **Hace:** En `sqlite.js`, importa `createRequire` de `node:module` al tope del archivo (`import { createRequire } from 'node:module'`), crea `const _req = createRequire(import.meta.url)` a nivel de módulo, y reemplaza el default de `importSqlite` por `() => Promise.resolve().then(() => ({ default: _req('better-sqlite3') }))`. El `.then()` convierte cualquier `throw` síncrono de `_req()` en Promise rechazada. La destructuración `const { default: Database } = await importSqlite()` en la línea 77 no cambia.
  - **Archivos:** `src/lib/graphstore/sqlite.js`
  - **Depende de:** Paso 1 (test en rojo primero)
  - **Verificación:** `cmd: node --test src/lib/graphstore/sqlite.test.js`

- [x] **4. Tests: chequeo preventivo de better-sqlite3 en sdd doctor** _(rapido)_
  - **Hace:** Agrega 3 tests en `doctor.test.js` usando el patrón `deps.requireSqlite` inyectable (que se implementará en el paso siguiente). Los tests cubren:
    1. `graph.driver === 'sqlite'` + `deps.requireSqlite` que resuelve → output contiene `✓ better-sqlite3 disponible`.
    2. `graph.driver === 'sqlite'` + `deps.requireSqlite` que lanza → output contiene `⚠ better-sqlite3 no encontrado`.
    3. Sin `graph` configurado (config default sin `graph`) → output NO contiene `better-sqlite3`.
  - **Archivos:** `src/commands/doctor.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: node --test src/commands/doctor.test.js`

- [x] **5. Implementar chequeo better-sqlite3 en doctor.js** _(rapido)_
  - **Hace:** En `doctor.js`: (a) agrega `import { createRequire } from 'node:module'` y `const _req = createRequire(import.meta.url)` al tope; (b) agrega `deps = {}` al parámetro de `doctor(root, deps = {})`; (c) dentro de `doctor()`, después del bloque de hooks y antes del bloque de skills, agrega chequeo condicional: si `cfg.graph?.driver === 'sqlite'`, ejecuta `(deps.requireSqlite || (() => _req('better-sqlite3')))()` en un try/catch — éxito → `ok('better-sqlite3 disponible (driver sqlite operativo)')`, error → `warn('better-sqlite3 no encontrado — instalalo con: npm i better-sqlite3')`.
  - **Archivos:** `src/commands/doctor.js`
  - **Depende de:** Paso 3 (tests en rojo primero)
  - **Verificación:** `cmd: node --test src/commands/doctor.test.js`

- [x] **6. Suite completa verde** _(rapido)_
  - **Hace:** Corre el suite completo para verificar que ningún test existente rompió con los cambios.
  - **Archivos:** —
  - **Depende de:** Pasos 2 y 4
  - **Verificación:** `cmd: sdd test`

---

_Aprobación del dev: aprobado 2026-06-25_
