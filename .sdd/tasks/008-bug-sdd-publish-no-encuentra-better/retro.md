# Retro — tarea 008: Fix better-sqlite3 en instalacion global y chequeo en sdd doctor

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-25.

## Resultado de la métrica de impacto

- **Baseline (de analysis.md):** `sdd publish` imprime "Falta una dependencia opcional" aunque `better-sqlite3` esté instalado globalmente con `npm i -g better-sqlite3`.
- **Resultado medido después:** `sqlite.js` usa `createRequire(import.meta.url)` — el módulo se resuelve correctamente via CJS en cualquier topología de paths (local, global separado, global dentro de sddkit). 217 tests verdes sin regresiones. El error `MODULE_NOT_FOUND` de CJS también cae en `missing-dependency` (nuevo test de regresión añadido).
- **¿Se cumplió lo esperado?:** Sí. Fix de 2 líneas en `sqlite.js` + chequeo preventivo en `doctor.js` (6 líneas). No fue posible verificar la instalación global real en CI (fuera de scope), pero la cobertura via inyección es exhaustiva.

## Qué anticipó bien la spec y qué no

La spec anticipó bien:
- El mecanismo exacto del fix (`createRequire` + `Promise.resolve().then()` para preservar el shape `{default: Database}`).
- Que `isModuleNotFound` ya cubría `MODULE_NOT_FOUND` — sin cambios en `index.js`.
- El patrón de inyección `deps.requireSqlite` en `doctor.js` para tests, análogo al `deps.importSqlite` existente.
- Los 3 casos de test para `doctor.js` (disponible, ausente, sin driver sqlite).

No anticipó:
- Que `.sdd/run-tests.mjs` no existe en este repo, por lo que `sdd task verify 008 6` (`sdd test`) falla. Se usó `npm test` como alternativa. No fue bloqueante.

## Desvíos del plan

- **Paso 6 (verificación):** `sdd test` falló por ausencia de `.sdd/run-tests.mjs`. Se sustituyó por `npm test` sin replanificar el paso. El resultado fue idéntico (217/217 verde).
- **Paso 4 (tests doctor en rojo):** La verificación `cmd: node --test src/commands/doctor.test.js` sale con exit 1 por diseño TDD (tests en rojo antes de implementación). El orquestador lo trató como rojo esperado y marcó el paso manualmente. No fue un problema real.

## Aprendizajes accionables

- **`createRequire(import.meta.url)` es el fix canónico para deps opcionales en paquetes globales ESM**: ESM dynamic `import()` no traversa `{prefix}/node_modules/` cuando el paquete está en `{prefix}/lib/node_modules/<pkg>/`. `createRequire` usa CJS resolution que sí lo hace. Patrón: `const _req = createRequire(import.meta.url)` a nivel de módulo, `() => Promise.resolve().then(() => ({ default: _req('dep') }))` como default del loader inyectable. Aplica a cualquier `optionalDependency` que sddkit pueda necesitar en el futuro.

- **Verificaciones TDD "rojo primero" con `cmd:` necesitan un flag o comentario explícito en el plan**: cuando un paso escribe tests que deben fallar intencionalmente, el `cmd:` de verificación sale con exit 1 — igual que un test roto. Documentar en el paso que el rojo es esperado (p.ej. `Verificación: rojo esperado — tests pasarán tras el Paso N`) evita ambigüedad al verificar.

- **`sdd test` requiere `.sdd/run-tests.mjs` — verificar su existencia antes de planificar pasos con `cmd: sdd test`**: si el archivo no existe, `sdd test` falla con "No existe .sdd/run-tests.mjs" sin correr ningún test. Fallback: `npm test` o `node --test 'src/**/*.test.js'`. Considerar agregar la creación del script como prerequisito cuando se planifiquen pasos con `sdd test`.

## Para el catálogo, el dominio o la arquitectura

- **ADR-0008**: no requiere cambios. El fix mantiene todos los invariantes (lazy load, degradación elegante, `optionalDependencies`). El ADR ya describe la intención de carga perezosa; el mecanismo concreto (`createRequire` vs `import()`) es un detalle de implementación que no cambia el contrato del ADR.
- **Sin BRs nuevas**: el comportamiento de `sdd doctor` con `graph.driver === 'sqlite'` es diagnóstico read-only, extensión natural de los chequeos existentes. No amerita una BR separada.
- **C4**: sin cambios estructurales.
