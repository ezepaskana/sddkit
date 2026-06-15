# Plan — tarea 005: Necesito una funcionalidad para actualizar los skills en un …

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

- [x] **1. Test: `installSkills` hace mirror (limpia archivos huérfanos)** `[P]` _(rapido)_
  - **Hace:** nuevo `src/lib/skills.test.js`. Test: instala `sdd-bootstrap` en un `targetBase` temporal (`fs.mkdtempSync`) con `installSkills(tmp, ['sdd-bootstrap'])`, agrega un archivo huérfano dentro de `tmp/.claude/skills/sdd-bootstrap/huerfano.txt`, vuelve a llamar `installSkills(tmp, ['sdd-bootstrap'])` y verifica que `huerfano.txt` ya NO existe y que `SKILL.md` instalado es idéntico (`readFileSync`) al de `skills/sdd-bootstrap/SKILL.md` del paquete (vía `PKG_SKILLS`).
  - **Archivos:** `src/lib/skills.test.js` (nuevo)
  - **Depende de:** —
  - **Verificación:** cmd: node --test src/lib/skills.test.js _(debe fallar en rojo: con el `cpSync` actual, `huerfano.txt` sigue existiendo)_

- [x] **2. Implementar mirror real en `installSkills`** _(rapido)_
  - **Hace:** en el loop de `for (const n of list)`, antes de `cpSync(join(PKG_SKILLS, n), join(dest, n), {recursive:true})`, si `join(dest, n)` ya existe lo borra con `rmSync(join(dest, n), {recursive:true, force:true})`. Deja la carpeta destino idéntica al paquete (mirror), no merge. No cambia la firma ni el resto del contrato de `installSkills`/`availableSkills`/`removeSkills`.
  - **Archivos:** `src/lib/skills.js`
  - **Depende de:** paso 1
  - **Verificación:** cmd: node --test src/lib/skills.test.js

- [x] **3. Test: `init` devuelve `{actions, skipped}` y respeta `flags.silent`** `[P]` _(rapido)_
  - **Hace:** extiende `src/commands/init.test.js` con 3 tests sobre el `gitFixture()` existente:
    1. `const r = await init(root, {quiet:true})` → `r.actions` es un array con `length > 0` y `r.skipped` es un array (puede ser vacío en repo nuevo).
    2. Con `{quiet:true, silent:true}`, capturando `console.log` (mismo patrón `withSilencedLogs` pero contando llamadas en vez de descartarlas), el número de líneas impresas es `0`.
    3. Sin `silent` (solo `{quiet:true}`, como hoy), sigue imprimiéndose al menos una línea que empieza con `Acciones:` — no regresión del comportamiento actual usado por `setup`.
  - **Archivos:** `src/commands/init.test.js`
  - **Depende de:** —
  - **Verificación:** cmd: node --test src/commands/init.test.js _(debe fallar en rojo: hoy `init` no retorna nada y siempre imprime)_

- [x] **4. `init` retorna `{actions, skipped}` y agrega `flags.silent`** _(medio)_
  - **Hace:** en `src/commands/init.js`, envolver bajo `if (!flags.silent) { ... }` los `console.log` de: (a) detección de entorno (`Entorno: desde cero...` / `Entorno existente detectado...` + loop de `env`), (b) `Skills existentes conservadas...`, y (c) el bloque final `Acciones:` + loops de `actions`/`skipped` + el tip (`!flags.quiet`, que queda anidado dentro). El primer `console.log` (`sddkit init — ${stack.name}`, ya guardado por `!flags.quiet`) NO se toca. Al final de la función, `return { actions, skipped };`. `setup.js` no pasa `silent`, por lo que su salida actual no cambia.
  - **Archivos:** `src/commands/init.js`
  - **Depende de:** paso 3
  - **Verificación:** cmd: node --test src/commands/init.test.js

- [x] **5. Test: comando `sdd sync`** _(medio)_
  - **Hace:** nuevo `src/commands/sync.test.js`, reusando un fixture tipo `gitFixture()` (repo temporal con `.git/hooks/` y `package.json`). Casos:
    1. Repo SIN `.sdd/config.json` → `await sync(root, {})` no crea `.sdd/` (sigue sin existir), y el log capturado menciona `sdd setup`.
    2. Repo con `.sdd/config.json` mínimo válido (`version: '0.0.1'`, `skills: 'local'`, `hooks: {preCommit:true, autoPublish:true}`, `models: {...}`) → tras `sync`, releer `config.json`: `version === VERSION` (importado de `../version.js`); `.claude/skills/sdd-task/SKILL.md` existe y es idéntico al de `skills/sdd-task/SKILL.md` del paquete; el log incluye la cadena `0.0.1` y `→` y `VERSION`.
    3. Repo con `.sdd/config.json` ya en `version: VERSION` y skills ya sincronizadas (correr `sync` dos veces y mirar la 2da corrida) → el log de la 2da corrida incluye `ya estás al día` y `VERSION`.
    4. Repo con `.sdd/config.json` `skills: 'global'` → antes de llamar `sync`, guardar `process.env.HOME` original, setearlo a un `mkdtempSync` nuevo; tras `sync`, el log incluye un aviso de skills GLOBALES (string con "global") y la ruta `<tmpHome>/.claude/skills`; restaurar `process.env.HOME` en un `finally`.
  - **Archivos:** `src/commands/sync.test.js` (nuevo)
  - **Depende de:** pasos 2, 4
  - **Verificación:** cmd: node --test src/commands/sync.test.js _(debe fallar en rojo: `./sync.js` no existe todavía)_

- [x] **6. Implementar `sync.js`** _(medio)_
  - **Hace:** nuevo `src/commands/sync.js` con `export async function sync(root, flags = {})`:
    - Lee `cfg = readJSON(join(root, '.sdd', 'config.json'))`. Si `!cfg` → `console.log('Repo sin sddkit — corré \`sdd setup\` (este comando es para repos ya configurados).')` y `return` sin tocar nada.
    - Si `cfg` existe: `const before = cfg.version || '(desconocida)'`; `const scope = cfg.skills || 'local'`; ejecutar `await init(root, { ...flags, quiet: true, silent: true })`.
    - Imprimir encabezado `━━━ sddkit sync ━━━` y, si `before === VERSION`, `Ya estás al día en v${VERSION} (skills, config, AGENTS.md y hooks revisados).`; si no, `v${before} → v${VERSION}: skills, config, AGENTS.md y hooks actualizados.`
    - Si `scope === 'global'`, imprimir aviso adicional: `⚠ Skills GLOBALES actualizadas en ${join(globalBase(), '.claude', 'skills')} — afecta a todos los repos de esta máquina.` (importar `globalBase` de `../lib/skills.js`).
  - **Archivos:** `src/commands/sync.js` (nuevo)
  - **Depende de:** paso 5
  - **Verificación:** cmd: node --test src/commands/sync.test.js

- [x] **7. Registrar `sdd sync` en `bin/sdd.js`** `[P]` _(rapido)_
  - **Hace:** importar `{ sync }` de `../src/commands/sync.js`; agregar `else if (cmd === 'sync') await sync(root, flags);` al dispatch; agregar una entrada breve en `HELP` (sección de comandos internos) describiendo `sync` como: para repos ya configurados, tras actualizar el paquete `sddkit`, trae skills/config/AGENTS.md/hooks a la versión instalada sin scan ni wizard.
  - **Archivos:** `bin/sdd.js`
  - **Depende de:** paso 6
  - **Verificación:** cmd: d=$(mktemp -d) && node bin/sdd.js sync --dir=$d 2>&1 | grep -qi "sdd setup" && node bin/sdd.js 2>&1 | grep -q "sync" && rm -rf $d

- [x] **8. Test: `sdd doctor` sugiere `sdd sync` para drift de versión/skills/hooks** `[P]` _(rapido)_
  - **Hace:** extiende `src/commands/doctor.test.js` (reusa `setupRepoWithConfig`):
    1. `setupRepoWithConfig(root, { version: '0.0.1' })` → el output de `doctor` para la línea de Config incluye `sdd sync`.
    2. Repo sin `.git/hooks/pre-commit` → la línea de pre-commit ausente incluye `sdd sync`.
    3. Repo sin `.git/hooks/post-commit` (test existente "ausente") → ajustar/extender el assert para que también incluya `sdd sync`.
    4. Repo `skills: 'local'` sin `.claude/skills/` → la línea de "Skills faltantes" incluye `sdd sync`.
    5. Usando `process.env.HOME` apuntado a un tmpdir sin `.claude/skills/sdd-bootstrap` → la línea de `sdd-bootstrap` global sigue sugiriendo `sdd setup` (no cambia); restaurar `HOME` en `finally`.
  - **Archivos:** `src/commands/doctor.test.js`
  - **Depende de:** —
  - **Verificación:** cmd: node --test src/commands/doctor.test.js _(fallan los nuevos asserts en rojo)_

- [x] **9. Actualizar mensajes de `sdd doctor`** _(rapido)_
  - **Hace:** en `src/commands/doctor.js`, cambiar de `sdd setup` a `sdd sync` los mensajes de: `warn` de config desactualizada (`Config vX vs CLI vY`), `warn` de pre-commit hook ausente, `warn` de post-commit hook ausente, y los `warn` de "Skills faltantes"/"Skills desactualizadas". NO tocar el mensaje de `sdd-bootstrap` global ausente (sigue siendo `sdd setup`), ni el de `AGENTS.md sin bloque sddkit` (sigue siendo `sdd scan`).
  - **Archivos:** `src/commands/doctor.js`
  - **Depende de:** paso 8
  - **Verificación:** cmd: node --test src/commands/doctor.test.js

- [x] **10. BR-030 a BR-034 en `.sdd/domain.md`** `[P]` _(rapido)_
  - **Hace:** agregar 5 reglas de negocio nuevas (consecutivas desde BR-029), citando "Fuente: tarea 005", describiendo: BR-030 (sync sin config.json → sugiere setup, no toca nada), BR-031 (sync con config.json → equivalente de init sin scan/wizard + resumen de versión `vANTERIOR → vNUEVA` o "ya al día"), BR-032 (`installSkills` mirror real, aplica también a init/setup), BR-033 (aviso de skills globales actualizadas), BR-034 (mensajes de `doctor` apuntan a `sdd sync` salvo `sdd-bootstrap` global/AGENTS.md/scan). Usar como base el texto de los criterios EARS de `spec.md`.
  - **Archivos:** `.sdd/domain.md`
  - **Depende de:** pasos 6, 9
  - **Verificación:** cmd: grep -c "BR-03[0-4]" .sdd/domain.md

- [x] **11. Documentar `sdd sync` en `README.md`** `[P]` _(rapido)_
  - **Hace:** agregar una sección breve (cerca de `doctor`/`setup`) explicando qué hace `sdd sync` (config + AGENTS.md + skills + hooks a la versión instalada, sin scan ni wizard), cuándo usarlo (después de `npm update`/actualizar el paquete `sddkit`), y qué NO hace (no instala `sdd-bootstrap` global, no corre `scan` ni `decide`).
  - **Archivos:** `README.md`
  - **Depende de:** paso 6
  - **Verificación:** prosa — la sección existe, es consistente con el comportamiento implementado y con el texto de `bin/sdd.js`'s `HELP`.

- [x] **12. Suite completa + smoke test real en este repo** _(medio)_
  - **Hace:** correr toda la suite de tests. Luego correr `node bin/sdd.js doctor` y `node bin/sdd.js sync` sobre el propio repo `sddkit` (dogfooding, sin `.git` así que los hooks informan "no aplica") para verificar manualmente que el resumen tiene sentido (este repo ya está en `version: VERSION` pero le falta `hooks.autoPublish` en `.sdd/config.json` — BR-029 — así que `sync` debería migrarlo y NO decir "ya al día" sin más detalle si hubo una migración real). Reportar al dev el diff resultante en `.sdd/config.json`, `AGENTS.md` y `.claude/skills/sdd-*` antes de dejarlo (mirror puede tocar archivos si había drift entre `skills/` y `.claude/skills/`, ver aprendizaje de tarea 003).
  - **Archivos:** ninguno nuevo — posibles cambios de estado en `.sdd/config.json`, `AGENTS.md`, `.claude/skills/sdd-*` de este repo como efecto del smoke test (revisar antes de confirmar que queden)
  - **Depende de:** pasos 1-11
  - **Verificación:** cmd: node --test _(suite completa en verde)_ + revisión manual del output de `sdd doctor`/`sdd sync` y del diff resultante

---

_Aprobación del dev: aprobada 2026-06-14 ("Sí, apruebo, ejecutá el plan")_
