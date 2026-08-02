# Plan — tarea 016: Ejecuto sdd sync de forma consecutiva en el mismo repo y me …

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. **Máximo 3 sub-ítems por paso** — sin prosa extra. `N/A: <motivo>` es válido donde no aplique. El dev debe APROBAR este plan antes de ejecutar.

`[P]` = paralelizable · Nivel de modelo por paso: _(rapido)_ mecánico/boilerplate · _(medio)_ implementación estándar · _(fuerte)_ diseño, lógica compleja, edge cases.

## Pasos

- [x] **1. Test rojo de regresión** _(medio)_
  - **Hace:** en `src/commands/sync.test.js`, test "2da corrida consecutiva → no imprime `actualizado`/`instaladas/actualizadas`, imprime al día" + test "skill instalada modificada a mano → sync la reporta como actualizada"
  - **Verificación:** `cmd: node --test src/commands/sync.test.js` — los tests nuevos fallan, el resto pasa

- [x] **2. `upsertAgentsMd` detecta no-cambio** _(medio)_
  - **Hace:** compara el contenido nuevo con el existente ignorando la fecha de `Última actualización:` (para no reportar cambio solo por el día); si es idéntico no escribe y devuelve señal de "al día": `src/lib/agentsmd.js`
  - **Depende de:** paso 1
  - **Verificación:** `cmd: node --test src/lib/agentsmd.test.js src/commands/init.test.js`

- [x] **3. `installSkills` mirror condicional** _(medio)_
  - **Hace:** compara cada carpeta destino contra la del paquete (árbol + contenido); solo mirrorea las distintas y devuelve `{updated, unchanged}`; ajusta callers (`src/commands/init.js`, `src/commands/bootstrap.js`): `src/lib/skills.js`
  - **Depende de:** paso 1
  - **Verificación:** `cmd: node --test src/lib/skills.test.js src/commands/init.test.js`

- [x] **4. `init`/`sync` reportan cambios reales** _(medio)_
  - **Hace:** `init` rutea a `actions` solo lo que cambió y a `skipped` lo que estaba al día (incl. hook "ya estaba instalado"); `sync` imprime `·` para acciones y `–` para lo al día, y "sin cambios — todo ya estaba al día" si no hubo acciones: `src/commands/init.js`, `src/commands/sync.js`, `src/lib/hooks.js`
  - **Depende de:** pasos 2 y 3
  - **Verificación:** `cmd: node --test src/commands/sync.test.js` — tests del paso 1 en verde

- [x] **5. Docs: BR-031 refleja el nuevo resumen** _(rapido)_
  - **Hace:** actualiza BR-031 en `.sdd/domain.md` (el resumen de `sync` lista solo cambios reales y marca lo al día)
  - **Depende de:** paso 4
  - **Verificación:** `cmd: sdd validate`

- [x] **6. Suite completa en verde** _(rapido)_
  - **Hace:** corre la suite entera del repo
  - **Depende de:** paso 5
  - **Verificación:** `cmd: sdd test`

---

_Aprobación del dev: aprobada (2026-08-02, chat)_
