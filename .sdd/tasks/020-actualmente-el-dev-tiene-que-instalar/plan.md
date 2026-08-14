# Plan — tarea 020: sddkit como plugin de Claude Code, sin CLI ni instalación manual

> Pasos CHICOS: cada uno verificable por sí solo. **Máximo 3 sub-ítems por paso**. El dev debe APROBAR este plan antes de ejecutar.

## Rama de trabajo

Se continúa en la rama actual `task/019-vamos-a-actualizar-esto-ya-que` por decisión explícita del dev (la tarea 019 se absorbe en esta como insumo). **No** se crea rama nueva ni se inserta un Paso 1 de `git checkout -b`.

## Orden y riesgo de auto-borrado

El CLI (`bin/sdd.js`) es la herramienta que trackea esta misma tarea. Por eso su borrado es el **paso 7**, y los pasos 8-10 se verifican sin él; el cierre de la tarea (retro, estado `done`) se hace a mano editando `.sdd/tasks/index.json`. Es el primer dogfood del mundo sin CLI.

## Pasos

- [x] **1. ADR de la decisión** _(fuerte)_
  - **Hace:** documenta distribución solo como plugin y la pérdida aceptada de los tres gates deterministas (conteo de variantes del catálogo, validación bloqueante en pre-commit, verificación de paso por exit code), con su condición de reversión: `.sdd/decisions/0016-sddkit-como-plugin-de-claude.md`
  - **Verificación:** `cmd: test -f .sdd/decisions/0016-sddkit-como-plugin-de-claude.md && grep -q "gates" .sdd/decisions/0016-sddkit-como-plugin-de-claude.md`

- [x] **2. Manifiesto del plugin** `[P]` _(medio)_
  - **Hace:** crea el manifiesto con name, description, version, author y la declaración de skills y hooks: `.claude-plugin/plugin.json`
  - **Verificación:** `cmd: node -e "const p=require('./.claude-plugin/plugin.json'); if(!p.name||!p.version) process.exit(1)"`

- [x] **3. Marketplace propio** `[P]` _(rapido)_
  - **Hace:** declara este repo como fuente instalable por terceros, apuntando al plugin de la raíz: `.claude-plugin/marketplace.json`
  - **Verificación:** `cmd: node -e "const m=require('./.claude-plugin/marketplace.json'); if(!m.plugins||!m.plugins.length) process.exit(1)"`

- [x] **4. Hook de arranque de sesión** _(medio)_
  - **Hace:** registra el `SessionStart` con el one-liner `test -f .sdd/config.json || cat "$CLAUDE_PLUGIN_ROOT/hooks/bootstrap.md"` y deja el prompt como placeholder marcado para redactar después (BR-080): `hooks/hooks.json`, `hooks/bootstrap.md`
  - **Depende de:** paso 2
  - **Verificación:** `cmd: grep -q SessionStart hooks/hooks.json && grep -q 'bootstrap.md' hooks/hooks.json && test -f hooks/bootstrap.md`

- [x] **5. Eliminar las dos skills muertas** `[P]` _(rapido)_
  - **Hace:** borra la skill de tests y la de bootstrap, incluidos sus templates `.mjs`: `skills/sdd-test/`, `skills/sdd-bootstrap/`
  - **Verificación:** `cmd: test ! -e skills/sdd-test && test ! -e skills/sdd-bootstrap && test -z "$(find skills -name '*.mjs')"`

- [x] **6. Purgar los comandos `sdd` de las 7 skills restantes** _(fuerte)_
  - **Hace:** reescribe cada instrucción que invoca un comando eliminado para que el agente haga el trabajo (crear la carpeta de la tarea, escribir los artefactos, correr la verificación del paso, abrir el archivo al dev), en `SKILL.md`, `templates/`, `references/` y `examples/` de: `skills/sdd-task/`, `skills/sdd-analyze/`, `skills/sdd-specify/`, `skills/sdd-plan/`, `skills/sdd-execute/`, `skills/sdd-close/`, `skills/sdd-improve-skill/`
  - **Depende de:** paso 5
  - **Verificación:** `cmd: ! grep -rEn 'sdd (task|scan|validate|context|find|doctor|decide|setup|sync|test|check|publish|impact|init|uninstall|docs)' skills/`

- [x] **7. Borrar el CLI y el andamiaje npm** _(rapido)_
  - **Hace:** elimina el binario, la implementación, el paquete y el CI que lo testeaba: `bin/`, `src/`, `package.json`, `package-lock.json`, `node_modules/`, `eslint.config.js`, `.github/workflows/`
  - **Depende de:** paso 6
  - **Verificación:** `cmd: test ! -e bin && test ! -e src && test ! -e package.json && test ! -e eslint.config.js`

- [x] **8. Reescribir o derogar las reglas colgadas del dominio** _(fuerte)_
  - **Hace:** aplica BR-081 a las 21 reglas que citan comandos inexistentes (BR-049 a BR-056, BR-062, BR-069 a BR-078): reescribe las que describen comportamiento que el agente sigue haciendo, deroga las que dependían de un exit code, y actualiza el diagrama de flujo de negocio: `.sdd/domain.md`
  - **Depende de:** paso 7
  - **Verificación:** `cmd: ! grep -nE '`?sdd (scan|validate|setup|doctor|publish|uninstall|task|context|find|decide|sync|docs)' .sdd/domain.md`

- [x] **9. Regenerar la documentación C4 contra el repo nuevo** _(fuerte)_
  - **Hace:** reemplaza los módulos inexistentes (`src/commands`, `src/lib`, `bin`) por la estructura real del plugin, vacía el catálogo de convenciones que describía el código JS borrado, y regenera el índice de preguntas: `.sdd/c4/context.md`, `.sdd/c4/containers.md`, `.sdd/c4/components.md`, `.sdd/patterns.json`, `.sdd/catalog.json`, `.sdd/QUESTIONS.md`
  - **Depende de:** paso 7
  - **Verificación:** `cmd: ! grep -rn 'src/commands\|src/lib' .sdd/c4/ && grep -q 'claude-plugin' .sdd/c4/components.md`

- [x] **10. Actualizar la documentación al dev** _(medio)_
  - **Hace:** reemplaza las instrucciones de `npm link` + `sdd setup` por la instalación del plugin, y saca del bloque de convenciones toda referencia al CLI: `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
  - **Depende de:** paso 9
  - **Verificación:** `cmd: ! grep -n 'npm link\|sdd setup\|sdd init' README.md CLAUDE.md CONTRIBUTING.md && grep -q 'plugin' README.md`

- [ ] **11. Prueba end-to-end en un repo limpio** _(medio)_
  - **Hace:** instala el plugin desde el clon local, abre una sesión en un repo sin `.sdd/` y confirma que el hook inyecta el bootstrap y que el agente genera la config sin que el dev tipee ningún comando (métrica: 3 pasos manuales → 0)
  - **Depende de:** paso 10
  - **Verificación:** verificación manual — el dev observa la sesión y confirma que no ejecutó ningún comando

---

_Aprobación del dev: aprobada 2026-08-09_
