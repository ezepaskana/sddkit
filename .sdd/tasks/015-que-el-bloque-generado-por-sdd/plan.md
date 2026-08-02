# Plan — tarea 015: Que el bloque generado por sdd scan o las skills instruyan a…

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. **Máximo 3 sub-ítems por paso** — sin prosa extra. `N/A: <motivo>` es válido donde no aplique. El dev debe APROBAR este plan antes de ejecutar.

Estructura de cada paso — el checkbox de la **primera línea** es lo que `sdd task` trackea; el detalle va en sub-ítems indentados:

```markdown
- [ ] **N. Título corto del paso** `[P]` _(rapido)_
  - **Hace:** qué se construye o cambia, con los archivos al final: `ruta/uno`, `ruta/dos`
  - **Depende de:** paso M _(omitir la línea entera si no depende de nadie)_
  - **Verificación:** `cmd: <comando>` — preferido; texto plano solo si no hay comando posible
```

`[P]` = paralelizable · Nivel de modelo por paso: _(rapido)_ mecánico/boilerplate · _(medio)_ implementación estándar · _(fuerte)_ diseño, lógica compleja, edge cases. Los modelos concretos de cada nivel están en `.sdd/config.json → models`.

> La sección de **rama de trabajo** y el Paso 1 (`git checkout -b <rama>`) los genera automáticamente `sdd task plan` desde `.sdd/branching.md`; los pasos que escribas acá se renumeran a partir del Paso 2.

## Rama de trabajo

- **Rama:** `task/010-quisiera-que-esto-se-resuelva-d` _(el dev pidió seguir en la rama actual; override de la rama auto-generada)_
- **Origen:** `main`
- **Destino:** `main`
- **Convención de commits:** Conventional Commits
- **Flujo:** GitHub Flow
- **Patrón:** `task/{numero}-{slug}`

## Pasos

- [x] **1. Confirmar rama de trabajo** _(rapido)_
  - **Hace:** confirma que la rama activa es la elegida por el dev (sin crear rama nueva)
  - **Archivos:** —
  - **Depende de:** —
  - **Verificación:** `cmd: git rev-parse --abbrev-ref HEAD | grep -qx "task/010-quisiera-que-esto-se-resuelva-d"`

- [x] **2. Tests rojos de detección de contexto en open** `[P]` _(medio)_
  - **Hace:** agrega tests de BR-063: detección de terminal embebida por env (JetBrains/VS Code), apertura vía bundle id en macOS, degradación sin bundle, y standalone intacto: `src/lib/open.test.js`
  - **Verificación:** `cmd: node --test --test-reporter=tap src/lib/open.test.js 2>&1 | grep -q "not ok"`

- [x] **3. Implementar apertura contextual en el CLI** _(medio)_
  - **Hace:** detección de terminal embebida + apertura en IDE anfitrión (macOS `open -b`), con fallback a opener/default: `src/lib/open.js`
  - **Depende de:** paso 2
  - **Verificación:** `cmd: node --test src/lib/open.test.js`

- [x] **4. Test rojo de la instrucción BR-063 en el bloque** `[P]` _(rapido)_
  - **Hace:** test de que el bloque generado incluye la instrucción contextual (embebido→IDE, standalone→ui.opener) en Preferencias de respuesta: `src/lib/agentsmd.test.js`
  - **Verificación:** `cmd: node --test --test-reporter=tap src/lib/agentsmd.test.js 2>&1 | grep -q "not ok"`

- [x] **5. Agregar la instrucción BR-063 al bloque gestionado** _(medio)_
  - **Hace:** suma la instrucción contextual a la sección Preferencias de respuesta de `buildBlock`: `src/lib/agentsmd.js`
  - **Depende de:** paso 4
  - **Verificación:** `cmd: node --test src/lib/agentsmd.test.js`

- [x] **6. Regenerar CLAUDE.md del repo (dogfooding)** _(rapido)_
  - **Hace:** regenera el bloque gestionado de este repo con `sdd sync`: `CLAUDE.md`
  - **Depende de:** paso 5
  - **Verificación:** `cmd: grep -q "ui.opener" CLAUDE.md`

- [x] **7. Suite completa verde** _(rapido)_
  - **Hace:** corre todos los tests del repo vía la skill sdd-test (sin archivos nuevos)
  - **Depende de:** pasos 3 y 6
  - **Verificación:** `cmd: sdd test`

---

_Aprobación del dev: aprobado 2026-08-01 (con override de rama: seguir en task/010)_
