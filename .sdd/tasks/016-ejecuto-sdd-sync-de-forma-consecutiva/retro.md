# Retro — tarea 016: Ejecuto sdd sync de forma consecutiva en el mismo repo y me …

> La AUTOGENERA el agente al cerrar, con datos que ya tiene — sin preguntarle nada al dev, que la lee en el PR. Creada el 2026-08-02.

Fix de reporte engañoso de `sdd sync`: `upsertAgentsMd` devuelve `null` si el bloque no cambió (comparación ignorando fecha), `installSkills` mirrorea solo skills que difieren (`{updated, unchanged}`), `installPreCommit` devuelve `{msg, changed}` y `sync` separa `·` acciones de `–` al día con "sin cambios — todo ya estaba al día"; verificado con 2 tests de regresión nuevos en `sync.test.js` (rojos antes / verdes después) + suite completa `sdd test` 290/290 en verde + nota en BR-031.
