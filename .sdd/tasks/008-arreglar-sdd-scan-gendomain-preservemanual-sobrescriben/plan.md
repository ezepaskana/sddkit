# Plan — tarea 008: Arreglar sdd scan: genDomain/preserveManual sobrescriben y borran "## Reglas de negocio" de domain.md

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

## Pasos

- [x] **1. Test (rojo): segunda corrida de `sdd scan` debe preservar ediciones arriba del marcador en los 4 archivos generados** _(rapido)_
  - **Hace:** agrega un test a `src/commands/scan.test.js` (reusa el helper `fixture` existente) que: (a) corre `scan(root, {quiet:true})` una primera vez sobre un fixture mínimo (igual a los tests existentes) — esto crea `.sdd/c4/context.md`, `.sdd/c4/containers.md`, `.sdd/c4/components.md` y `.sdd/domain.md`, los 4 con `MANUAL_MARK` (importado de `../lib/c4.js`) al final; (b) para cada uno de los 4 archivos, lee el contenido, inserta una línea de "edición curada" (p.ej. `\n- EDICION-CURADA-DE-PRUEBA\n`) inmediatamente ANTES de `MANUAL_MARK`, y escribe el resultado de vuelta; (c) guarda ese contenido editado de cada archivo; (d) corre `scan(root, {quiet:true})` una segunda vez; (e) para cada uno de los 4 archivos, `assert.equal(readFileSync(path,'utf8'), contenidoEditadoGuardado)` — byte a byte.
  - **Archivos:** `src/commands/scan.test.js`
  - **Depende de:** —
  - **Verificación:** `cmd: node --test src/commands/scan.test.js` — el test nuevo existe y falla (hoy la segunda corrida pisa la línea "EDICION-CURADA-DE-PRUEBA" en los 4 archivos).

- [x] **2. Fix: `upsertGenerated` no toca un archivo que ya existe** _(rapido)_
  - **Hace:** en `src/commands/scan.js`, cambia la función local `upsertGenerated(path, generated)` para que: si `read(path) !== null` (el archivo ya existe), retorne sin escribir nada (no-op); si no existe, escriba `preserveManual(null, generated)` (genera el esqueleto inicial + `MANUAL_MARK` + "## Notas del equipo", igual que hoy en la primera corrida). Sin cambios en `genContext`/`genContainers`/`genComponents`/`genDomain` ni en `preserveManual` (`src/lib/c4.js`) — solo cambia cuándo se invoca `upsertGenerated` para los 4 archivos (`context.md`, `containers.md`, `components.md`, `domain.md`).
  - **Archivos:** `src/commands/scan.js`
  - **Depende de:** paso 1
  - **Verificación:** `cmd: node --test` — toda la suite en verde, incluido el test del paso 1 (ahora en verde) y los tests existentes de `scan.test.js` (primera corrida sigue generando los 4 archivos igual que antes).

- [x] **3. Documentar BR-037, bump de versión (patch) y verificación en este repo** _(rapido)_
  - **Hace:** agrega **BR-037** a `## Reglas de negocio` de `.sdd/domain.md` (texto exacto de la "Spec refinada" de spec.md, sección "Reglas de negocio afectadas"). Sube `package.json`/`package-lock.json` de `0.12.0` a `0.12.1` (bugfix de comportamiento publicado — análogo en impacto a los bumps de tareas 004-007, pero PATCH porque no cambia contenido instalado en repos nuevos, solo corrige pérdida de datos en repos existentes). Luego corre `sdd scan` en este mismo repo (donde los 4 archivos YA EXISTEN) para confirmar el fix end-to-end: `.sdd/domain.md` debe conservar BR-001 a BR-037 sin cambios, y `.sdd/c4/*.md` no deben modificarse.
  - **Archivos:** `.sdd/domain.md`, `package.json`, `package-lock.json`
  - **Depende de:** paso 2
  - **Verificación:** `cmd: node --test` (todo verde) y `cmd: grep -q '"version": "0.12.1"' package.json`; revisión visual: tras correr `sdd scan`, `.sdd/domain.md` sigue listando BR-001..BR-037 (nada borrado) y `.sdd/c4/*.md` queda byte a byte igual a antes (comparar contenido capturado antes/después — este repo no tiene `.git`).

---

_Aprobación del dev: pendiente_
