# Retro — tarea 007: Agregar la sección "Ante dudas o incongruencias: preguntale al dev" a AGENTS.md

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-15.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** 0% — el texto de la nueva "regla cero" no existía en ningún `AGENTS.md` generado (confirmado: `sdd find pregunt|duda` no encontraba un principio general transversal, solo las 3 menciones puntuales preexistentes).
- **Resultado medido después:** 100% — `src/lib/agentsmd.test.js` (test nuevo, paso 1 rojo → paso 2 verde) verifica que `buildBlock(...)` incluye el texto exacto de `## Ante dudas o incongruencias: preguntale al dev` y que aparece ANTES de `## Arquitectura (modelo C4 vivo)`. Smoke manual (paso 3): `sdd scan` regeneró `AGENTS.md` con la nueva sección como primera del bloque gestionado (confirmado leyendo las primeras líneas del bloque).
- **¿Se cumplió lo esperado?:** Sí — 0% → 100%, como proyectaba spec.md.

## Qué anticipó bien la spec y qué no

- **Bien anticipado:** el texto exacto, la calibración del tono ("habilita Y obliga ante incongruencias genuinas, no ante decisiones menores resolubles con buen juicio normal"), la ubicación como "regla cero" antes de Arquitectura, y la métrica de presencia de texto vía test — todo se implementó en los pasos 1-2 sin ambigüedad ni replanificación.
- **NO anticipado (gap del análisis crítico):** el paso 3 ("correr `sdd scan` para regenerar AGENTS.md") tuvo un efecto secundario catastrófico fuera del alcance declarado de esta tarea. `sdd scan` no solo regenera el bloque de AGENTS.md — también regenera `.sdd/domain.md` vía `genDomain`/`preserveManual` (`src/commands/scan.js`, `src/lib/c4.js`, `src/lib/domain.js`), y ese mecanismo sobrescribía TODO el contenido arriba de `<!-- sdd:manual -->`, borrando BR-001 a BR-035 (curadas en las tareas 004-006) y reemplazándolas por el esqueleto vacío del template. El análisis crítico de la tarea 007 (acotado a `buildBlock`/`agentsmd.js`) no tenía por qué cubrir `c4.js`/`domain.js` dado su alcance declarado — pero el paso de plan "correr `sdd scan`" sí los tocaba.

## Desvíos del plan

- El paso 3 se ejecutó como estaba escrito (`sdd scan` + suite + bump de versión a 0.12.0), pero reveló el incidente de pérdida de datos descrito arriba. Se restauró `.sdd/domain.md` manualmente (Read + Write), reconstruyendo BR-001 a BR-035 desde el contenido capturado previamente en la conversación — el repo no tiene `.git`, así que no había red de seguridad de versionado. Tras restaurar (más el agregado de BR-036), se verificó `node --test` → 138/138 en verde.
- Ante el hallazgo, se le presentaron al dev dos opciones: (a) cerrar la tarea 007 ahora y documentar el bug para después, o (b) abrir una tarea nueva (008) para arreglar la causa raíz ANTES de cerrar la 007. El dev eligió (b): "Vamos con la opcion 2".
- Se creó y completó la **tarea 008** ("Arreglar sdd scan: genDomain/preserveManual sobrescriben y borran '## Reglas de negocio' de domain.md"), que corrigió `upsertGenerated` (`src/commands/scan.js`) para que sea no-op si el archivo ya existe, documentó **BR-037**, y subió la versión a 0.12.1. Verificado end-to-end: re-correr `sdd scan` en este repo ya NO modifica `.sdd/domain.md` ni `.sdd/c4/*.md` (hashes sha256 idénticos antes/después del scan).
- Con la tarea 008 cerrada, se retoma y completa el cierre de la 007. El paso 3 de esta tarea queda como ejecutado (la versión final visible en `package.json` es 0.12.1, producto del bump posterior de la 008 — el bump propio de la 007 a 0.12.0 quedó subsumido).

## Aprendizajes accionables

- **Una tarea acotada a un módulo (`agentsmd.js`) puede disparar, vía un comando compartido (`sdd scan`), efectos secundarios en módulos completamente distintos (`c4.js`/`domain.js`) que no estaban en su análisis crítico.** Cuando un paso de plan ejecuta un comando "ómnibus" como `sdd scan` (que regenera 7+ archivos), vale la pena que el análisis crítico liste explícitamente TODO lo que ese comando toca — no solo el archivo que motivó la tarea — aunque el resto "no debería cambiar".
- En un repo sin `.git`, antes de correr cualquier comando regenerativo (`sdd scan`, `sdd init`, `sdd setup`) sobre un repo con docs curados, vale considerar capturar el contenido actual de `.sdd/domain.md`/`.sdd/c4/*.md` (o iniciar `git init`). Desde la tarea 008 `sdd scan` ya no sobrescribe estos archivos si existen, pero el patrón general (comando regenerativo + repo sin versionar) sigue siendo de riesgo para otros comandos.
- (El patrón "generar solo si no existe" para `upsertGenerated`, y la repetición del bug "título con puntos suspensivos" en el gate de cierre, ya quedaron cosechados en `.sdd/LEARNINGS.md` con la retro de la tarea 008 — actualizada para incluir también esta tarea 007.)

## ¿Algo para el catálogo, el dominio o la arquitectura?

- **BR-036 agregada a `.sdd/domain.md`** (esta tarea): documenta que el bloque gestionado de AGENTS.md incluye, como primera sección (antes de "## Arquitectura"), `## Ante dudas o incongruencias: preguntale al dev`.
- **BR-037** (agregada por la tarea 008, motivada por el incidente descubierto en esta tarea): documenta el fix de `sdd scan` (genera `.sdd/c4/*.md`/`.sdd/domain.md` solo si no existen).
- No se requiere ADR (cambio de contenido textual de las reglas para agentes, sin decisión arquitectónica).
- Sin preguntas nuevas para `.sdd/QUESTIONS.md`.
