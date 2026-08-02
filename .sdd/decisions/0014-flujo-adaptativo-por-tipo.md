# ADR 0014 — Flujo SDD adaptativo por tipo de tarea

- **Fecha:** 2026-08-01 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/011

## Contexto

El flujo SDD aplicaba siempre las mismas fases (análisis/spec/plan/ejecución/cierre) sin importar el tamaño del cambio, generando artefactos pesados incluso para tareas triviales. El dev pidió que el agente clasifique la tarea y solo cree los artefactos que ese tipo amerita, reduciendo texto y tiempo de review sin perder trazabilidad en los cambios grandes.

## Decisión

- Tras `sdd task new`, el agente clasifica con `sdd task type <id> <tipo> [--riesgo alto]`: tipo `simple|bug|feature|refactor`, riesgo `bajo|alto`; lo anuncia en una línea; el dev puede corregirlo en cualquier momento.
- `simple` → crea solo una nota única breve; un gate: el agente explica en pocas palabras qué entendió y qué va a hacer; con el ok del dev, implementa con tests.
- `bug` → crea reproducción + plan corto; flujo reproducir → test rojo → fix → test verde; sin `spec.md` (el test de regresión la reemplaza).
- `feature` → flujo completo actual: `analysis.md`/`spec.md`/`plan.md`, profundidad según riesgo.
- `refactor` → crea impacto + plan (sin criterios EARS); si hay grafo configurado, corre `sdd impact` y verifica tests verdes antes y después.
- Si el alcance muta durante la ejecución, el agente re-clasifica con `sdd task type` y crea los artefactos faltantes sin perder lo hecho.
- BR-057 y BR-058 son las reglas vinculantes de esta decisión.

## Consecuencias

- Menos artefactos y menos texto para cambios chicos; el costo de trazabilidad completa se paga solo en `feature`/`refactor` de riesgo alto.
- `task.js` gana el comando `task type` y lógica de gates condicionales por tipo; más ramas que mantener que un flujo único.
- Requiere que el agente clasifique bien: una mala clasificación inicial se corrige re-clasificando, no reiniciando la tarea.
