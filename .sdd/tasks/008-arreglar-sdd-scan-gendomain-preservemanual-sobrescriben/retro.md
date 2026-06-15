# Retro — tarea 008: Arreglar sdd scan: upsertGenerated no pisa archivos existentes

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-15.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** test de regresión (paso 1) FALLABA — la segunda corrida de `sdd scan` pisaba la línea "EDICION-CURADA-DE-PRUEBA" insertada arriba de `<!-- sdd:manual -->` en los 4 archivos (`context.md`, `containers.md`, `components.md`, `domain.md`); 0% de preservación. Caso real que disparó la tarea: BR-001..035 de `.sdd/domain.md` fueron borradas por `sdd scan` durante el paso 3 de la tarea 007.
- **Resultado medido después:** suite completa 139/139 verde, incluido el test del paso 1 ahora en verde (100% de preservación en los 4 archivos del fixture). Verificación end-to-end en este mismo repo (paso 3): se agregó BR-037 a `.sdd/domain.md`, se corrió `sdd scan`, y los hashes sha256 de `.sdd/domain.md` y los 3 `.sdd/c4/*.md` quedaron IDÉNTICOS antes y después del scan.
- **¿Se cumplió lo esperado?:** Sí — 0% → 100% de preservación, exactamente como proyectaba spec.md.

## Qué anticipó bien la spec y qué no

- **Bien:** la hipótesis "generar solo si no existe" (P2) fue suficiente y NO requirió tocar `genContext`/`genContainers`/`genComponents`/`genDomain`/`preserveManual` — el fix completo fueron 2 líneas en `upsertGenerated` (`src/commands/scan.js`).
- **Bien:** ampliar el alcance a los 4 archivos (P1) fue correcto — los 3 `c4/*.md` comparten el mismo mecanismo y sufrirían el mismo bug en cuanto se completen sus checkboxes `❓ VALIDAR`.
- **Trade-off aceptado, no problemático en la práctica:** congelar las tablas auto-detectadas tras la primera corrida (P3 — containers, dependencias salientes, components, entidades) no generó ningún problema en la verificación, porque el stack/dependencias de este repo no cambió desde la última corrida.
- **No anticipado:** reapareció el bug conocido del título con puntos suspensivos en la plantilla de retro (ya documentado en LEARNINGS por tareas 005/006) — mismo workaround aplicado (título de retro sin truncar).

## Desvíos del plan

Ninguno — los 3 pasos se ejecutaron tal como estaban planificados, sin replanificación ni bloqueos.

## Aprendizajes accionables

- **Patrón "generar solo si no existe" para docs vivos con esqueleto + marca manual**: `preserveManual`/`MANUAL_MARK` solo protege lo que está DEBAJO de la marca; el esqueleto curado de ARRIBA (BR-NNN, checkboxes `❓ VALIDAR`, glosario, entidades) se perdía en cada `sdd scan` posterior. El fix correcto fue "`upsertGenerated`: si `read(path) !== null`, no-op" — nada de merge sección-por-sección. Costo aceptado: tablas auto-detectadas quedan congeladas tras la primera corrida; el agente las actualiza a mano si cambia la arquitectura. _(tarea 008)_
- **El bug "título con puntos suspensivos dispara falso positivo en el gate de cierre" (tareas 005/006) reapareció en la 008** — van 3 tareas con el mismo workaround manual (editar el título del retro para que no contenga puntos suspensivos). Vale la pena arreglarlo de raíz: el check de retro completa no debería mirar la primera línea/header.
- **Repo sin `.git`: las operaciones de regeneración (`sdd scan`) no tienen red de seguridad de versionado.** La restauración de `.sdd/domain.md` en la tarea 007 dependió 100% del contexto de la conversación porque no había `git` para recuperar el archivo. Con el fix de esta tarea el riesgo específico de `sdd scan` queda eliminado, pero el patrón general (sin `.git`, sin red de seguridad) sigue valiendo para cualquier otra operación destructiva.

## ¿Algo para el catálogo, el dominio o la arquitectura?

- **BR-037 agregada a `.sdd/domain.md`** (paso 3): documenta el nuevo comportamiento "`sdd scan` genera `.sdd/c4/{context,containers,components}.md` y `.sdd/domain.md` SOLO si el archivo no existe; si existe, no-op".
- No se requiere ADR (corrección de bug, sin alternativas arquitectónicas en competencia).
- No se requieren cambios en `.sdd/c4/*.md` (sin cambio estructural — mismo módulo `scan.js`, mismo rol).
- Sin preguntas nuevas para `.sdd/QUESTIONS.md`.
