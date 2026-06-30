# Plan — tarea 008: Fix falso positivo de drift en sdd validate con tablas secundarias

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

- **Rama:** `task/008-bug-sdd-validate-reporta-falsos`
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
  - **Verificación:** `cmd: git checkout -b task/008-bug-sdd-validate-reporta-falsos`

- [x] **2. Escribir test de regresión para el check de drift** _(medio)_
  - **Hace:** Crea `src/commands/validate.test.js` con un test que:
    1. Arma un fixture en tempdir con `src/main/Foo.java` y `src/test/FooTest.java` (para que `componentGroups` devuelva `{main, test}`)
    2. Escribe `.sdd/c4/components.md` con la tabla principal (`src/main`, `src/test`) seguida de una sección `### Subcapas` con una segunda tabla (`domain/model`, `adapter/controller`)
    3. Captura la salida de `console.log` (mock temporal) al correr `validate(root, {})`
    4. Afirma que no se emitió ningún warning de drift para `domain/model` ni para `adapter/controller`
    5. Afirma que tampoco hay warnings para `src/main` ni `src/test` (no hay drift real)
  - **Archivos:** `src/commands/validate.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: node --check src/commands/validate.test.js`

- [x] **3. Aplicar el fix de 2 líneas en validate.js** _(rapido)_
  - **Hace:** En `src/commands/validate.js`, reemplaza la extracción de `docDirs` (línea 46) para acotarla a la primera sección del archivo (antes del primer `##`/`###`):
    - Antes: `const docDirs = [...compDoc.matchAll(/^\| \`([^\`]+)\` \|/gm)].map((m) => m[1]);`
    - Después: dos líneas — `const mainTable = compDoc.split(/^#{2,3}\s/m)[0];` seguida de `const docDirs = [...mainTable.matchAll(/^\| \`([^\`]+)\` \|/gm)].map((m) => m[1]);`
  - **Archivos:** `src/commands/validate.js`
  - **Depende de:** Paso 1
  - **Verificación:** `cmd: node --test src/commands/validate.test.js`

- [x] **4. Verificar suite completa sin regresiones** _(rapido)_
  - **Hace:** Corre todos los tests del proyecto para confirmar que el fix no rompió nada
  - **Archivos:** (ninguno — solo verificación)
  - **Depende de:** Paso 2
  - **Verificación:** `cmd: npm test`

---

_Aprobación del dev: confirmada 2026-06-29_
