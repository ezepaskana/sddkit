# Plan — tarea 004: Ajustar el comportamiento de `sdd publish` según el driver d…

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

- [x] **1. ADR-0010 (acota ADR-0003 a `mysql`) + BR-023 a BR-029 en domain.md** `[P]` _(medio)_
  - **Hace:** redacta `.sdd/decisions/0010-publish-automatico-en-post-commit-para-sqlite.md` siguiendo el patrón de ADR-0008 ("no se edita 0003 para cambiar la historia"): documenta que ADR-0003 ("`sdd publish` no desde máquinas de dev") queda **acotado a `graph.driver === "mysql"`** (grafo compartido de equipo) porque su motivación — no ensuciar un grafo compartido con estado de branches no mergeados — no aplica a `sqlite` (grafo local de un solo dev). Para `driver === "sqlite"`, `sdd publish --hook` corre automáticamente vía hook **post-commit** (instalado por `sdd init`/`sdd setup`), controlable con `.sdd/config.json → hooks.autoPublish` (default `true`). Cita ADR-0002/0003/0008 y BR-023..029. Agrega a `.sdd/domain.md` → "Reglas de negocio" las 7 entradas BR-023 a BR-029, una por criterio EARS 1-8 de `spec.md` (criterios 2 y 3 comparten BR-024), con el formato `- **BR-0NN** — "<enunciado>". Fuente: tarea 004.`
  - **Archivos:** `.sdd/decisions/0010-publish-automatico-en-post-commit-para-sqlite.md` (nuevo), `.sdd/domain.md`
  - **Depende de:** —
  - **Verificación:** manual — el orquestador revisa que el ADR no edite 0003, que cite 0002/0008 correctamente, y que BR-023..029 en domain.md correspondan 1:1 a los criterios EARS 1-8 de spec.md (sin inventar reglas nuevas no especificadas); no requiere `node --test`.

- [x] **2. `installPostCommit` en `src/lib/hooks.js` + tests** `[P]` _(medio)_
  - **Hace:** agrega `export function installPostCommit(root)`, análoga a `installPreCommit` pero para `.git/hooks/post-commit` con la línea `sdd publish --hook || true`. Mismo contrato no destructivo: si no hay `.git` → mensaje informativo sin crear nada; si el hook no existe → lo crea con shebang + comentario + la línea; si existe y ya contiene `sdd publish` → "ya estaba instalado" (idempotente); si existe y NO contiene `sdd publish` → agrega la línea al final preservando lo previo. `chmodSync(p, 0o755)` igual que `installPreCommit`. Si reduce duplicación, extraé un helper interno compartido `installHookLine(root, hookName, hookLine, matchToken)` reusado por ambas funciones exportadas — sin cambiar el comportamiento observable de `installPreCommit` (sus mensajes deben seguir incluyendo `pre-commit`/`sdd validate` como hoy).
    - **Tests** (`src/lib/hooks.test.js`, nuevo): para AMBAS funciones (`installPreCommit` como regresión + `installPostCommit` nueva), en un repo temporal con `.git/`:
      1. Sin hook existente → crea el archivo, contenido incluye la línea esperada (`sdd validate`/`sdd publish` según corresponda), y queda con permisos ejecutables.
      2. Hook existente SIN la línea de sddkit → la agrega al final, preserva el contenido previo.
      3. Hook existente CON la línea de sddkit → mensaje "ya estaba instalado", archivo sin duplicados (correr 2 veces seguidas y comparar contenido).
      4. Repo sin `.git` → mensaje informativo, no crea `.git/hooks/`.
  - **Archivos:** `src/lib/hooks.js`, `src/lib/hooks.test.js` (nuevo)
  - **Depende de:** —
  - **Verificación:** cmd: node --test src/lib/hooks.test.js

- [x] **3. `sdd publish --hook` (BR-024, BR-025, BR-026) + tests** `[P]` _(fuerte)_
  - **Hace:** en `src/commands/publish.js`, mueve `const cfg = readJSON(join(root, '.sdd', 'config.json'))` al inicio de `publish()` (hoy se lee recién en el paso 4) y reusala más abajo en `createGraphStore(cfg)`. Si `flags.hook`:
    - Si `!cfg`, o `cfg.graph?.driver !== 'sqlite'`, o `cfg.hooks?.autoPublish === false` → `return` inmediato, sin imprimir nada y sin tocar el storage (BR-024). Esto preserva ADR-0003 sin cambios para `driver === 'mysql'`.
    - Si el gate de calidad (checkboxes `- [ ] ` pendientes en C4) rechaza, O `createGraphStore(cfg)` devuelve `{ok:false, ...}` (p.ej. `missing-dependency`) → `return` sin imprimir nada (BR-025). En modo NO-hook, ambos casos conservan exactamente los mensajes actuales (`✖ Publicación rechazada...`, `⚠ Grafo no configurado...`, `⚠ Falta una dependencia...`).
    - En éxito: si `flags.hook`, imprime `` `✓ grafo local actualizado (sqlite) → commit ${commitHash ? commitHash.slice(0,7) : '(sin git)'} @ ${publishedAt}` `` (BR-026); si NO `flags.hook`, conserva el mensaje actual (`✓ Publicado "${canonicalName}" → ...`).
    - **Tests** nuevos en `src/commands/publish.test.js` (reusan el helper `tmpRepo`/`withCapturedLogs` existentes):
      1. `--hook` con `.sdd/config.json` SIN `graph` (o `graph.driver: "mysql"`) → `publish(root, {hook:true})` no produce logs y el store (si hay uno configurado) no recibe el upsert.
      2. `--hook` con `graph.driver: "sqlite"` y `hooks: {autoPublish: false}` → sin logs, sin upsert.
      3. `--hook` con `graph.driver: "sqlite"` y C4 con un checkbox `- [ ] ` pendiente (mismo fixture que el test del paso "gate rechaza") → sin logs, `querySystem` sigue devolviendo `null`.
      4. `--hook` con todo OK (C4 sin pendientes, `graph.driver: "sqlite"`) en un repo temporal inicializado como repo git real con UN commit (`git init` + `git -c user.email=t@t -c user.name=t commit --allow-empty -m x`, vía `execSync`) → el log empieza con `✓ grafo local actualizado (sqlite)`, y `store.querySystem(canonicalName).commitHash === execSync('git rev-parse HEAD', {cwd: root}).toString().trim()`. Si `better-sqlite3` no está disponible, `t.skip(...)` igual que los tests existentes (ADR-0008).
  - **Archivos:** `src/commands/publish.js`, `src/commands/publish.test.js`
  - **Depende de:** —
  - **Verificación:** cmd: node --test src/commands/publish.test.js

- [x] **4. `sdd init`/`sdd setup`: `hooks.autoPublish: true` + instala el hook post-commit (BR-029, parte de BR-023)** _(medio)_
  - **Hace:** en `src/commands/init.js`: (a) el config default (cuando no existe `.sdd/config.json`) incluye `hooks: { preCommit: true, autoPublish: true }`; (b) la migración de configs existentes agrega `autoPublish: true` si `cfg.hooks` existe pero no tiene `autoPublish` (o crea `cfg.hooks = { preCommit: true, autoPublish: true }` si `cfg.hooks` no existe), marcando `migrated = true`; (c) en la sección "Hook pre-commit automático" (paso 6 de `init.js`), agrega `actions.push(installPostCommit(root))` junto al `installPreCommit(root)` existente, importando `installPostCommit` desde `../lib/hooks.js`.
    - **Test** (`src/commands/init.test.js`, nuevo): en un repo temporal con `.git/`, correr `init(root, {quiet:true})` y verificar (1) `.sdd/config.json` resultante tiene `hooks.autoPublish === true`; (2) `.git/hooks/post-commit` existe y su contenido incluye `sdd publish`. Caso de migración: escribir un `.sdd/config.json` previo con `hooks: { preCommit: true }` (sin `autoPublish`) y `version` distinta de la actual, correr `init(root, {quiet:true})` de nuevo, verificar que el config migrado tiene `autoPublish: true`.
  - **Archivos:** `src/commands/init.js`, `src/commands/init.test.js` (nuevo)
  - **Depende de:** paso 2 (usa `installPostCommit`)
  - **Verificación:** cmd: node --test src/commands/init.test.js

- [x] **5. `sdd doctor` reporta el hook post-commit (BR-027)** _(rapido)_
  - **Hace:** en `src/commands/doctor.js`, junto al bloque "Hook" existente (líneas ~33-37), agrega: lee `.git/hooks/post-commit`; si `cfg.hooks?.autoPublish === false` → `info('post-commit hook (auto-publish) desactivado por config')`; si el archivo incluye `sdd publish` → `ok('post-commit hook (auto-publish) activo')`; sino → `warn('post-commit hook (auto-publish) ausente — corré \`sdd setup\`')`.
    - **Test** (`src/commands/doctor.test.js`, nuevo): en un repo temporal con `.sdd/config.json` válido (mínimo: `version`, `models`, `hooks`) y `.git/`, tres casos: (1) sin `.git/hooks/post-commit` → `doctor(root)` loguea `post-commit hook (auto-publish) ausente`; (2) `.git/hooks/post-commit` instalado vía `installPostCommit(root)` (paso 2) → loguea `post-commit hook (auto-publish) activo`; (3) `cfg.hooks.autoPublish = false` (con o sin el hook instalado) → loguea `post-commit hook (auto-publish) desactivado por config`.
  - **Archivos:** `src/commands/doctor.js`, `src/commands/doctor.test.js` (nuevo)
  - **Depende de:** paso 2 (el test usa `installPostCommit` para el fixture del caso "activo")
  - **Verificación:** cmd: node --test src/commands/doctor.test.js

- [x] **6. `sdd uninstall --repo` limpia el hook post-commit (BR-028)** _(rapido)_
  - **Hace:** en `src/commands/uninstall.js`, junto a la limpieza de `.git/hooks/pre-commit` (líneas ~74-84), agrega el mismo tratamiento para `.git/hooks/post-commit`: si el archivo incluye `sdd publish`, filtra las líneas agregadas por sddkit (`sdd publish`, `Instalado por sddkit`, `Agregado por sddkit`, `desactivable en .sdd/config.json`); si lo que queda es solo el shebang → borra el archivo entero (`gone.push('.git/hooks/post-commit (era solo de sddkit)')`); si queda contenido previo → reescribe solo sin la línea de sddkit (`gone.push('.git/hooks/post-commit (solo la línea de sddkit)')`). Actualiza también el texto de ayuda (línea ~33, lista de "a mano") agregando `· línea "sdd publish --hook" en .git/hooks/post-commit`.
    - **Test** (`src/commands/uninstall.test.js`, nuevo): en un repo temporal con `.git/`, instalar el hook con `installPostCommit(root)` (paso 2) y correr `uninstall(root, {repo:true})`; verificar que `.git/hooks/post-commit` queda sin `sdd publish` (archivo borrado si solo tenía eso, o sin esa línea si había contenido previo de otro hook).
  - **Archivos:** `src/commands/uninstall.js`, `src/commands/uninstall.test.js` (nuevo)
  - **Depende de:** paso 2 (el test usa `installPostCommit` para el fixture)
  - **Verificación:** cmd: node --test src/commands/uninstall.test.js

- [x] **7. README: documentar auto-publish (sqlite vía hook) vs CI (mysql, ADR-0003)** _(rapido)_
  - **Hace:** en la sección "Grafo de impacto" de `README.md`, junto a la entrada existente de `sdd publish`, agrega un párrafo: con `graph.driver: "sqlite"`, `sdd setup`/`sdd init` instalan un hook post-commit que corre `sdd publish --hook` automáticamente tras cada commit (desactivable con `.sdd/config.json → hooks.autoPublish: false`), sin mensajes salvo éxito (`✓ grafo local actualizado...`). Con `graph.driver: "mysql"` no cambia nada — sigue el flujo de CI sobre `main` de ADR-0003 (el hook post-commit no hace nada en ese caso).
  - **Archivos:** `README.md`
  - **Depende de:** pasos 3, 4
  - **Verificación:** manual — el orquestador revisa que el texto sea consistente con BR-023..029 y no contradiga la sección de CI existente; no requiere `node --test`.

---

_Aprobación del dev: aprobada (2026-06-14)_
