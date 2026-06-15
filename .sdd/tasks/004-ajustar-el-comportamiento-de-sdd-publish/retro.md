# Retro — tarea 004: Ajustar el comportamiento de `sdd publish` según el driver del graphstore configurado

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-14.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** Lag indefinido / 0% de los commits actualizan el grafo local — `sdd publish` era 100% manual.
- **Resultado medido después:** el test 9 de `src/commands/publish.test.js` ("publish --hook: todo OK en repo git → log corto + commitHash persistido") instala el flujo `--hook` en un repo git real temporal, hace un commit real (`git commit --allow-empty`), corre `publish(root, {hook:true})` y verifica que `store.querySystem(canonicalName).commitHash === git rev-parse HEAD` y que el log empieza con `✓ grafo local actualizado (sqlite)`. Suite completa: 120/120 tests verdes (111 previos + 9 nuevos en `publish.test.js` + 8 en `hooks.test.js` − ajustes).
- **¿Se cumplió lo esperado?:** Sí para la parte automatizada — el test de integración demuestra `commitHash`/`publishedAt` sincronizados con el HEAD recién creado, sin acción manual, exactamente lo que pedía el "resultado esperado" de spec.md. La **validación manual adicional** descrita en spec.md (aplicar `sdd setup` en este repo `sddkit`, hacer un commit real, confirmar con `sdd context`) **no se pudo ejecutar**: `/path/to/projects/sddkit` todavía no es un repositorio git (no existe `.git/`), por lo que `installPostCommit` no tiene dónde instalar el hook. Queda pendiente para cuando se inicialice git en este repo — en ese momento `sdd setup` instalará ambos hooks y la migración del paso 4 agregará `hooks.autoPublish: true` a `.sdd/config.json`.

## Qué anticipó bien la spec y qué no

- **Bien anticipado:** el análisis crítico identificó correctamente que un hook pre-commit desalinearía `commitHash` (commit padre) del `publishedAt`/contenido recién commiteado — post-commit fue la elección correcta y el test 9 lo valida contra un `git rev-parse HEAD` real.
- **Bien anticipado:** el patrón `--hook` de `validate.js` (lee `.sdd/config.json` en runtime, degrada en silencio) se reusó en `publish.js` sin sorpresas ni necesidad de infraestructura nueva.
- **No anticipado por la spec:** un bug preexistente en `stepBlock` (`src/commands/task.js`), el extractor de bloques de paso usado por `sdd task brief` y `sdd task verify`. Solo seguía líneas indentadas que empiezan con `- `; los pasos 2 y 3 de este plan tienen sub-listas numeradas (`1.`, `2.`, `3.`, `4.`) en su sección "Tests", que rompían la extracción ANTES de llegar a la línea `**Verificación:**`. Esto truncaba tanto los briefs generados para los subagentes como `sdd task verify 004 2`/`3` (fallaban con "no tiene línea de Verificación"). No estaba en el plan porque es un problema de la herramienta SDD, no del dominio de `sdd publish`.

## Desvíos del plan

- Los 7 pasos se ejecutaron en el orden y agrupación planificados (1-3 en paralelo, luego 4-6 en paralelo, luego 7), sin pasos nuevos ni reordenamientos formales.
- **Desvío no planificado:** antes de poder verificar los pasos 2 y 3, se detectó y corrigió el bug de `stepBlock` descripto arriba — fix de una línea (`/^\s+(-|\d+\.) /` en vez de `/^\s+- /`, `src/commands/task.js`), validado contra la suite completa (111/111 antes → 120/120 al final, sin regresiones). Es un fix de herramienta interna de sddkit, fuera del alcance original de los 7 pasos pero necesario para ejecutarlos.
- La validación manual adicional de la métrica (commit real en `sddkit` + `sdd context`) no se realizó — ver sección de métrica arriba.

## Aprendizajes accionables

- **`stepBlock` (src/commands/task.js), usado por `sdd task brief` y `sdd task verify`, ahora sigue tanto `- ` como `N. ` en las líneas indentadas de un paso.** Antes, cualquier paso de `plan.md` cuya sección "Tests"/"Hace" usara una sub-lista numerada (`1.`/`2.`/...) en vez de guiones se truncaba antes de `**Verificación:**`, rompiendo `sdd task verify` y generando briefs incompletos para los subagentes (el subagente recibía la spec completa pero el "Tu paso" cortado a mitad de la lista de tests). Si en el futuro un plan usa otro formato de sub-lista (p.ej. `a)`/`b)`), extender el mismo regex en `stepBlock`.
- **Patrón "ADR que acota a otro sin editarlo" confirmado por segunda vez** (ADR-0008 → ADR-0010): cuando una decisión previa sigue vigente para un subconjunto de casos pero no para otro nuevo, crear un ADR nuevo que referencia al previo y delimita su alcance por una condición explícita (acá `graph.driver`), en vez de reescribir la decisión original.

## ¿Algo para el catálogo, el dominio o la arquitectura?

- **Regla de negocio:** BR-023 a BR-029 ya agregadas a `.sdd/domain.md` (paso 1) — cubren instalación del hook post-commit, condiciones de silencio (`driver≠sqlite` / `autoPublish===false`), degradación silenciosa ante gate/dependencia faltante, mensaje de éxito, y reporte/limpieza en `sdd doctor`/`sdd uninstall`.
- **ADR:** ADR-0010 ya creado en `.sdd/decisions/` (paso 1) — acota ADR-0003 a `driver=mysql` sin editarlo, documenta el hook post-commit para `driver=sqlite`.
- **C4 / arquitectura:** sin cambios estructurales — no se agregaron componentes ni contenedores nuevos, solo comportamiento operacional de comandos existentes (`publish`, `init`, `doctor`, `uninstall`) y la herramienta interna `sdd task`.
- **Catálogo de convenciones:** sin cambios — se reusó el patrón `--hook` ya existente.
