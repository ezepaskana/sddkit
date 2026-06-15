# Retro — tarea 005: Necesito una funcionalidad para actualizar los skills en un proyecto (sdd sync)

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-14.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** 1 comando (`sdd setup`), pero dispara scan completo + wizard interactivo de convenciones (ajenos al objetivo "actualizar a la versión nueva"). Además `installSkills` (merge, no mirror) no garantizaba limpiar archivos eliminados en versiones nuevas del paquete.
- **Resultado medido después:** 1 comando (`sdd sync`), no interactivo, sin scan ni wizard. Test de integración (`src/commands/sync.test.js`, 5 casos): repo sin config → sugiere `sdd setup` sin tocar nada; repo con `version` vieja → migra `cfg.version` a `VERSION`, instala skills `sdd-*` byte-a-byte idénticas al paquete (incluye limpieza de huérfanos, `skills.test.js`), reporta `vANTERIOR → vNUEVA`; repo ya al día sin drift → "ya estás al día"; repo `skills:'global'` → avisa explícitamente sobre `~/.claude/skills`; repo al día en versión pero con migración pendiente de config (BR-029) → reporta "config migrado" en vez de "ya estás al día". Smoke test real en este mismo repo (`sddkit`): `sdd sync` migró `.sdd/config.json` (agregó `hooks.autoPublish`, BR-029 pendiente desde tarea 004) y regeneró `AGENTS.md`; `sdd doctor` post-sync ya no reporta "Config vX vs CLI vY" ni "Skills desactualizadas/faltantes". Suite completa: 134/134 verde.
- **¿Se cumplió lo esperado?:** Sí, completamente — incluyendo el caso límite (config al día en versión pero con migración de campos pendiente) que la spec no había anticipado explícitamente pero el plan sí dejó marcado para revisar en el smoke test.

## Qué anticipó bien la spec y qué no

- **Bien:** la spec anticipó correctamente que "actualizar" era reusar `init` (config + AGENTS.md + skills + hooks) como capa fina, sin scan ni wizard — el diseño de `sync.js` (paso 6) terminó siendo ~25 líneas gracias a esto. También anticipó correctamente el gap de `installSkills` (merge vs mirror, BR-032) como prerrequisito real, no cosmético.
- **No tan bien / refinado en la marcha:** BR-031 decía "ya estás al día en vX.Y.Z si `cfg.version === VERSION` antes de sincronizar" — pero `cfg.version === VERSION` no implica que `init()` no haya migrado nada más (p.ej. BR-029 agrega `hooks.autoPublish` sin tocar `version`). El propio plan (paso 12) ya dejaba anotado "sync debería... NO decir 'ya al día' sin más detalle si hubo una migración real", así que no fue una sorpresa total, pero sí un ajuste de último momento no cubierto por los pasos 5/6 originales.

## Desvíos del plan

- **Paso 12 (smoke test) reveló un caso no cubierto por los pasos 5/6**: con `cfg.version === VERSION` pero `.sdd/config.json` sin `hooks.autoPublish` (BR-029 pendiente), `sync` decía "ya estás al día" aunque `init()` SÍ migró el config. Se agregó un 3er caso al mensaje de resumen (`v${VERSION}: config migrado (campos nuevos)...`), detectando `actions.some(a => a.startsWith('.sdd/config.json'))` sobre el retorno de `init()`. Se sumó un 5to test a `sync.test.js` (total 5/5, suite 134/134) y un addendum a BR-031 documentando el matiz. Cambio pequeño y acotado, hecho dentro del propio paso 12 tal como el plan lo dejaba previsto.
- El resto de los 12 pasos se ejecutó tal cual estaba planificado, sin replanificaciones. Los 2 pasos TDD "rojo" (1 y 3, y luego 5) fallaron exactamente por el motivo documentado (módulo/comportamiento aún no implementado), confirmado independientemente por el orquestador antes de avanzar al paso "verde".

## Aprendizajes accionables

- **Patrón "capa fina sobre `init`"**: cualquier comando que necesite el efecto completo de `init` (config + AGENTS.md + skills + hooks + cursor rule) sin su salida verbosa ni su banner, puede llamar `init(root, { ...flags, quiet: true, silent: true })` y usar el `{actions, skipped}` devuelto para construir su propio resumen. `sync.js` es el primer caso de uso de este patrón — replicable para futuros comandos "delgados".
- **"¿Está al día?" no es solo comparar una versión**: si un comando resume "sin cambios" comparando un campo único (p.ej. `cfg.version === VERSION`) pero la operación subyacente puede mutar otros campos por motivos independientes (migraciones tipo BR-029), el resumen debe verificar también si la operación reportó cambios reales (`actions` no vacío relacionado), no solo el campo de versión. Aplicable a cualquier futuro "doctor"/"sync"/"migrate".

## ¿Algo para el catálogo, el dominio o la arquitectura?

- **`.sdd/domain.md`**: agregadas BR-030 a BR-034 (paso 10), más un addendum a BR-031 (paso 12, ver desvíos) documentando el caso "config migrado sin cambio de versión".
- Sin convenciones nuevas de catálogo, sin ADR nuevo (confirmado en spec.md: extensión de patrones existentes).
- Sin cambios estructurales en `.sdd/c4/` — `sync` es un comando interno más, mismo nivel que `doctor`/`init` en la arquitectura ya documentada.
