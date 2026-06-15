# Plan — tarea 006: En el setup es importante que me pregunte la ubicación del a…

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

- [x] **1. Tests (rojo) para la configuración del grafo en `sdd setup`** _(rapido)_
  - **Hace:** crea `src/commands/setup.test.js` (nuevo) con un fixture mínimo (`package.json` + un archivo fuente, sin `.git`, similar a `gitFixture`/`setupRepoWithConfig` de `sync.test.js` pero sin `.git`). 3 casos, todos corriendo `setup(root, { agent: true })`:
    1. Repo nuevo (sin `.sdd/config.json`) → tras `setup`, `readJSON('.sdd/config.json').graph` es `{driver:'sqlite', sqlite:{path:'~/.sddkit/graph.db'}}`.
    2. Repo con `.sdd/config.json` preexistente con `graph: {driver:'mysql', mysql:{urlEnv:'X'}}` → tras `setup`, `cfg.graph` queda exactamente igual (deepEqual al original, sin agregar `sqlite`).
    3. Repo con `.sdd/config.json` preexistente con `graph: {driver:'sqlite'}` (sin `sqlite.path`, como el config real de este repo) → tras `setup`, `cfg.graph` queda exactamente `{driver:'sqlite'}` (no se agrega `sqlite.path`, no se pregunta).
  - **Archivos:** `src/commands/setup.test.js` (nuevo)
  - **Depende de:** —
  - **Verificación:** `cmd: node --test src/commands/setup.test.js` — los 3 tests existen y fallan (caso 1 porque `cfg.graph` no existe todavía).

- [x] **2. Implementar la configuración de `graph.sqlite.path` en `sdd setup`** _(medio)_
  - **Hace:** en `src/commands/setup.js`, agrega (análogo al bloque existente de scope de skills, líneas ~23-41) un bloque ANTES de `init()` que, solo si `!cfg0?.graph`, determina `graphSqlitePath`: en modo interactivo pregunta con `readline` ("¿Dónde guardo el grafo de impacto local (SQLite)? [Enter=~/.sddkit/graph.db]: "), trim y default `~/.sddkit/graph.db` si vacío; en modo no interactivo usa ese default directamente (sin preguntar) e imprime una línea informativa análoga a la de "Skills SDD: alcance local (default en modo agente...)". DESPUÉS de `init()`, si `graphSqlitePath` fue determinado, relee `.sdd/config.json`, setea `cfg.graph = {driver:'sqlite', sqlite:{path: graphSqlitePath}}`, lo escribe con `writeJSON` (de `../lib/fsutil.js`, agregar al import) e imprime `✓ Grafo de impacto: sqlite local → <path>`. Si `cfg0.graph` ya existía, no toca nada ni imprime nada nuevo.
  - **Archivos:** `src/commands/setup.js`
  - **Depende de:** paso 1
  - **Verificación:** `cmd: node --test src/commands/setup.test.js` (los 3 casos en verde) y `cmd: node --test` (suite completa sigue en verde). Además, smoke test manual interactivo: correr `sdd setup` en un repo de prueba con TTY y sin `cfg.graph`, confirmar que aparece la pregunta, que Enter acepta `~/.sddkit/graph.db`, y que `.sdd/config.json` queda con `graph.sqlite.path` seteado.

- [x] **3. Actualizar README — sección "Grafo de impacto"** _(rapido)_
  - **Hace:** aclara que `sdd setup` activa `graph.driver: "sqlite"` por default (ruta configurable, default `~/.sddkit/graph.db`, BR-035); MySQL sigue siendo edición manual de `.sdd/config.json` + variable de entorno (BR-015). Ajusta la frase "Sin configuración, todo lo que sigue degrada en silencio" para que quede acotada a repos que no corrieron `sdd setup` con esta versión (o config manual previo sin `graph`).
  - **Archivos:** `README.md`
  - **Depende de:** paso 2
  - **Verificación:** revisión visual — la sección no contradice BR-024/BR-026 (hook post-commit) y refleja BR-035.

- [x] **4. Suite completa + bump de versión** _(rapido)_
  - **Hace:** corre la suite completa (debe seguir en verde) y sube `package.json`/`package-lock.json` de `0.10.2` a `0.11.0` (nueva funcionalidad + cambio de comportamiento default de `setup`, no solo un fix de texto).
  - **Archivos:** `package.json`, `package-lock.json`
  - **Depende de:** pasos 2 y 3
  - **Verificación:** `cmd: node --test` (todo verde) y `cmd: grep -q '"version": "0.11.0"' package.json`

---

_Aprobación del dev: aprobado 2026-06-15_
