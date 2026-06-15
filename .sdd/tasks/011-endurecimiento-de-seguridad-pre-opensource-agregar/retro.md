# Retro — tarea 011: Endurecimiento de seguridad pre-opensource

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-15.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** `buildPRCommand` corría por shell (`execSync`) escapando solo `"` → `$`, `` ` ``, `\` y `branchName`/`baseBranch` sin comillar quedaban interpretables (≥4 vectores shell-activos). Sin SECURITY.md. README sin sección de seguridad (0/2 artefactos de higiene OSS).
- **Resultado medido después:** 0 caracteres shell-activos interpretados — el flujo de PR ya no pasa por shell: `buildPRCommand` devuelve `{cmd, args}` y el consumidor usa `spawnSync(cmd, args, {cwd, encoding})` sin `shell:true`. Test de seguridad `'buildPRCommand: pasa metacaracteres de shell como argumentos literales'` confirma que `$(rm -rf x)` y `task/1;whoami` se pasan literales en `args`. 2/2 artefactos OSS presentes (SECURITY.md + sección `## Seguridad` en README, + SECURITY.md agregado a `files` de package.json). Suite completa en verde: 210 tests, 0 fallos.
- **¿Se cumplió lo esperado?:** Sí. Ambas dimensiones de la métrica alcanzadas (0 vectores shell, 2/2 artefactos). La auditoría previa ya había confirmado lo importante para abrir el repo: sin secrets en código ni historial, sin archivos sensibles trackeados, cero deps de producción, sin SQL injection.

## Qué anticipó bien la spec y qué no

- **Bien:** el análisis crítico identificó que el cambio de `buildPRCommand` (string → `{cmd,args}`) rompía 5 tests y tocaba el consumidor + BR-041; el plan separó tests-first (paso 2) de implementación (paso 3) y eso evitó sorpresas. La recomendación honesta ("hardening defensivo, no agujero activo — inputs locales") calibró bien la prioridad.
- **No tan bien:** la spec no anticipó que el propio texto del plan podía romper la verificación automática del paso 4 (ver desvíos).

## Desvíos del plan

- **Paso 4 — colisión del parser de `sdd task verify`:** el texto del bullet **Hace** del paso 4 contenía la frase literal de verificación con prefijo `cmd:` (describiendo qué poner en el README). El parser de `sdd task verify` (`stepBlock` + regex `/Verificación:.../m`) matcheó esa ocurrencia DENTRO de la prosa del Hace en vez de la línea `**Verificación:**` real, y ejecutó basura → `Syntax error`. Se verificó el paso a mano (mismo comando, exit 0). No es un bug del entregable: es un gotcha de redacción del plan. Aprendizaje cosechado abajo.
- **Cierre:** el checkbox del Paso 1 (crear rama, auto-generado) no se auto-marcó tras `sdd task execute`; hubo que marcarlo a mano antes de cerrar (consistente con cómo el orquestador marca el resto de los pasos).
- **PR automático:** omitido a propósito — el repo todavía no tiene remote (`origin`), así que `sdd task close` no aplica. El cierre fue local.

## Aprendizajes accionables

- **No escribas la cadena `Verificación:` ni `cmd:` dentro de la prosa de un paso del plan** (bullets Hace/Archivos): el parser de `sdd task verify` toma la PRIMERA ocurrencia de `/Verificación:/` del bloque del paso, así que una mención en prosa secuestra la verificación real y ejecuta texto arbitrario. Si tenés que referirte a esos literales, parafraseá ("la línea de verificación", "un comando `cmd`") o escapá el contexto. → promovido a LEARNINGS.
- **`spawnSync(cmd, args, {...})` sin `shell:true` es el patrón correcto para ejecutar tools externos con input variable** (títulos de PR, nombres de rama): elimina la clase de command injection sin escaping frágil. Cuando una función helper arma un comando, que devuelva `{cmd, args}` en vez de un string. → promovido a LEARNINGS.

## ¿Algo para el catálogo, el dominio o la arquitectura?

- **Dominio:** BR-041 actualizada con una nota (tarea 011): `buildPRCommand` devuelve `{cmd, args}` y la ejecución usa `spawnSync` sin shell; el contrato de degradación a `buildManualPRInstructions` y el reporte de PR quedan intactos. No es una BR nueva (cambio de implementación, no de contrato).
- **Catálogo:** sin convención nueva (el patrón `spawnSync` sin shell se documenta como aprendizaje, no como decisión de catálogo — no hay variante competidora en el repo).
- **Arquitectura/C4:** sin cambios (no se agregaron módulos, stores ni dependencias). No requiere ADR.
