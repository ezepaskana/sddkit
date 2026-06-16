# Plan — tarea 001: CI falla porque los tests importan better-sqlite3 (optionalD…

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

- **Rama:** `task/001-ci-falla-porque-los-tests-impor`
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
  - **Verificación:** `cmd: git checkout -b task/001-ci-falla-porque-los-tests-impor`

- [x] **2. `sqlite.test.js` resiliente: sacar import duro + skip si falta el nativo** _(medio)_
  - **Hace:** Eliminar el `import Database from 'better-sqlite3'` top-level (línea 6) que tumba el archivo entero con `ERR_MODULE_NOT_FOUND` cuando el nativo no está. Agregar un probe de disponibilidad por `import()` dinámico ESM (p.ej. al inicio: `let Database = null; try { ({ default: Database } = await import('better-sqlite3')); } catch {}`). Los tests que abren un store real vía `createSqliteStore`/`createGraphStore(sqlite)` (`upsert real`, `querySystem inexistente`, `queryImpact`, `queryCapability`, `infra roundtrip`, `infra migración legacy`, `infra idempotente`) deben hacer `if (!Database) return t.skip('better-sqlite3 no instalado');` al inicio. El test de migración legacy usa el constructor crudo `new Database(dbPath)` (línea 154) → usar el `Database` del probe. NO tocar los tests que ya degradan sin nativo: `not-configured` (x2), `driver desconocido`, `missing-dependency` (import inyectado), `mysql sin urlEnv`, `resolveDbPath` (x3).
  - **Archivos:** `src/lib/graphstore/sqlite.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: bash -c "! grep -qE \"^import Database from 'better-sqlite3'\" src/lib/graphstore/sqlite.test.js && node --test src/lib/graphstore/sqlite.test.js"`

- [x] **3. `impact`/`context`/`publish` tests resilientes: skip si `store.ok===false`** `[P]` _(medio)_
  - **Hace:** Replicar el patrón de skip ya existente en los tests `publish --hook` (`if (!store.ok) { t.skip(\`graphstore no disponible: ${store.reason}\`); return; }`) en los tests que hoy asumen el nativo presente. (a) `impact.test.js`: el `before()` (línea 34) hace `assert.equal(store.ok, true, ...)` → cambiar a: si `!store.ok`, dejar un flag `graphReady=false` y `return` sin seedear; cada test (`impact {method,path}` x2, `impact {system}` x2, `impact <recurso>`) hace `if (!graphReady) return t.skip('better-sqlite3 no instalado');`. Los tests que NO usan el grafo (`impact <argumento>` sin sistema/recurso, `impact: grafo no configurado`) quedan igual. (b) `context.test.js`: los tests `sistema publicado → "Publicado:"` (línea 50) y `nunca publicado → "Sin publicar"` (línea 79) gatean en `store.ok`. (c) `publish.test.js`: los 3 tests sin `--hook` que rompen (`publica OK` línea 39, `infra CON` 95, `infra SIN` 147) agregan el mismo guard; los `--hook` ya lo tienen.
  - **Archivos:** `src/commands/impact.test.js`, `src/commands/context.test.js`, `src/commands/publish.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: node --test src/commands/impact.test.js src/commands/context.test.js src/commands/publish.test.js`

- [x] **4. `ci.yml`: forzar build del nativo + step de verificación ruidoso** _(medio)_
  - **Hace:** Tras `npm ci`, agregar un step que fuerce la instalación/compilación del nativo exponiendo el error: `npm rebuild better-sqlite3 mysql2 --foreground-scripts`. Después, un step de verificación dedicado que falle ruidosamente si el nativo no carga: `node -e "require('better-sqlite3'); require('mysql2'); console.log('native deps OK')"`. Esto materializa "verde con cobertura ruidosa": `npm test` nunca rompe por ausencia del opcional (pasos 2-3), pero CI grita si el nativo no quedó disponible (no se pierde cobertura sqlite en silencio). No tocar el resto del workflow (matrix 18/20/22, cache, etc.).
  - **Archivos:** `.github/workflows/ci.yml`
  - **Depende de:** —
  - **Verificación:** `cmd: bash -c "grep -q 'npm rebuild better-sqlite3 mysql2' .github/workflows/ci.yml && grep -q \"require('better-sqlite3')\" .github/workflows/ci.yml && node -e \"require('better-sqlite3'); require('mysql2')\""`

- [x] **5. Verificación end-to-end de la métrica: `npm test` verde con y sin el nativo** _(rapido)_
  - **Hace:** Validar el criterio central de la spec reproduciendo ambos escenarios: (1) con `better-sqlite3` presente → `npm test` exit 0 ejecutando de verdad los tests de sqlite/graph; (2) quitando temporalmente `node_modules/better-sqlite3` → `npm test` exit 0 (degrada a skips, sin `ERR_MODULE_NOT_FOUND`), restaurando el módulo al final. Paso de verificación pura (sin cambios de código).
  - **Archivos:** — (sólo verificación)
  - **Depende de:** pasos 2, 3, 4
  - **Verificación:** `cmd: bash -c 'set -e; npm test >/tmp/sdd001-con.log 2>&1; echo con-nativo-OK; mv node_modules/better-sqlite3 /tmp/sdd001-bsq3; if npm test >/tmp/sdd001-sin.log 2>&1; then rc=0; echo sin-nativo-OK; else rc=1; echo sin-nativo-FALLO; fi; mv /tmp/sdd001-bsq3 node_modules/better-sqlite3; exit $rc'`

---

_Aprobación del dev: APROBADA (2026-06-16, Eze)_
