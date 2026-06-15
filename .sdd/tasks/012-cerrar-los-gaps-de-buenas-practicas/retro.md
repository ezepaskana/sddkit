# Retro — tarea 012: Cerrar los gaps de buenas prácticas OSS

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-15.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** 0/6 artefactos OSS presentes. CI: no (210 tests solo localmente). Versión: `0.12.3` incoherente con primer release público; sin CHANGELOG.
- **Resultado medido después:** **6/6 artefactos** presentes (CI workflow, CONTRIBUTING, CODE_OF_CONDUCT, CHANGELOG, templates issue/PR, dependabot — 8 archivos contando los 2 templates de issue por separado). CI: workflow `node --test` en matriz Node 18/20/22 listo. Versión `0.0.1` coherente en `package.json` + `package-lock.json` (2 ocurrencias) + `.sdd/config.json`. CHANGELOG `[0.0.1]` consolida el baseline. **210/210 tests en verde.**
- **¿Se cumplió lo esperado?:** Sí, 6/6. El CI verde *real* se confirmará en el primer push al remoto (fuera de alcance, acción del dev — el repo aún no tiene `origin`).

## Qué anticipó bien la spec y qué no

- **Bien:** que ningún archivo de `src/`/`bin/` de producción cambiaría; que el riesgo estaba concentrado en la sintaxis del YAML del CI y en el reset de versión; que `package.json → files` no debía ampliarse (docs dev-facing).
- **No anticipó:** que el reset de versión a `0.0.1` rompería un test (`sync.test.js:53`) que usaba `0.0.1` como versión "vieja" sentinela para probar la migración de `sdd sync`. La spec solo mencionó `version.test.js` (que sí pasó intacto, porque solo verifica string no vacío). Hubo que bajar el sentinela a `0.0.0`.

## Desvíos del plan

- **Paso 3 (docs de comunidad):** el subagente (haiku) se cortó por filtro de contenido al generar el texto del Contributor Covenant (`CODE_OF_CONDUCT.md`). `CONTRIBUTING.md` quedó bien creado. El orquestador completó `CODE_OF_CONDUCT.md` directamente (Contributor Covenant v2.1 estándar) y la verificación pasó.
- **Paso 6 (reset de versión):** el orquestador lo hizo directo con un reemplazo de string exacto (mecánico, sin ambigüedad) en vez de delegarlo a un subagente.
- **Paso 7 (verificación final):** falló en la 1ra corrida por `sync.test.js:53` (colisión de versión sentinela). Fix: sentinela `0.0.1` → `0.0.0` en ese test. 2da corrida: 210/210 verde.
- **Git (pre-ejecución):** la tarea 011 estaba `done` pero sin commitear, sobre la rama `task/011`, y no existía `main` (el trunk es `master`). Se frenó y consultó al dev: se commiteó la 011, se mergeó a `master` (fast-forward) y se creó `task/012` desde `master` limpio.

## Aprendizajes accionables

- **Resetear la versión del paquete puede romper tests que hardcodean un número de versión como sentinela "vieja".** Antes de cambiar `version` en `package.json`, `grep -rn "<nueva-version>" src/` para detectar tests que usan ese literal como "versión a migrar" (visto en `sync.test.js`, que usaba `0.0.1` como versión vieja → colisión cuando la versión real pasó a `0.0.1`). Usar sentinelas claramente inalcanzables (`0.0.0`) en tests de migración.
- **Generar textos estándar largos con cláusulas sensibles (Code of Conduct, políticas de acoso) en un subagente chico puede tripear el filtro de salida.** El Contributor Covenant es legítimo pero su lista de conductas inaceptables disparó el filtro en haiku. Si un worker se corta por content-filter en un doc estándar conocido, el orquestador lo escribe directo en vez de reintentar igual.

## ¿Algo para el catálogo, el dominio o la arquitectura?

- **Catálogo:** nada nuevo. Los archivos creados son YAML/Markdown, no código JS sujeto a `module-system`.
- **Dominio (BR):** ninguna BR nueva ni modificada. La invariante de BR-034 (`config.version == VERSION`) se preservó al alinear `.sdd/config.json` a `0.0.1`.
- **Arquitectura/C4:** sin cambios (no hay módulos/stores/deps nuevos en `src/`). No requiere ADR.
- **A `.sdd/LEARNINGS.md`:** se cosechan los 2 aprendizajes accionables de arriba (reset de versión vs sentinelas en tests; content-filter en docs estándar de subagentes).
