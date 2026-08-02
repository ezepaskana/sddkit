---
name: sdd-plan
description: Fase de planificación de una tarea SDD. Usar después de la aprobación de la spec (sdd-specify) para descomponer en pasos chicos verificables con nivel de modelo.
---

# sdd-plan — el plan en pasos chicos

Aplica a `feature` (después de la spec), `bug` (después de la reproducción) y `refactor` (después del análisis). Las tareas `simple` **no llevan plan**: su `nota.md` ya dice qué se hace y cómo se verifica.

Completá `plan.md` de la tarea (formato canónico: `templates/plan.md`).

**Presupuesto: máximo 3 sub-ítems por paso** (`Hace` con archivos, `Depende de` solo si existe, `Verificación`). Sin prosa extra: lo que no entra en esos tres sub-ítems va en la spec o no va.

## Reglas de descomposición

1. **Chico**: verificable por sí solo y completable en una sesión corta. Si no podés escribir su verificación en una línea, partilo.
2. **Verificación ejecutable siempre que se pueda**: `Verificación: cmd: <comando>` (`cmd: sdd test`, `cmd: grep -q "X" src/archivo.js`). El orquestador la corre literal con `sdd task verify <id> <paso>` — exit code = verdad, cero razonamiento. Prosa solo si requiere juicio humano o visual.
3. **Tests primero**: el paso que escribe los tests de un comportamiento va ANTES del que lo implementa (rojo → verde). En `bug`, el test rojo que reproduce el defecto es un paso propio. En `refactor`, el primer paso deja registrada la corrida verde de baseline.
4. **Archivos explícitos** por paso: rutas exactas, nunca "varios archivos". Un solo writer por archivo.
5. **Nivel de modelo**: `(rapido)` mecánico/boilerplate/renames · `(medio)` implementación estándar · `(fuerte)` diseño, lógica compleja, edge cases. Mapean a `.sdd/config.json → models`.
6. **Métrica**: si analysis.md no tenía baseline, el primer paso la instrumenta.
7. `[P]` marca los pasos paralelizables (sin dependencias cruzadas ni archivos compartidos).
8. **Diagrama de dependencias**: opcional y solo si REEMPLAZA prosa (3+ pasos con dependencias cruzadas o paralelismo no obvio). Orden lineal → sin diagrama.

Riesgo `alto` → pasos más chicos y verificación `cmd:` en todos. Riesgo `bajo` → no infles el plan con pasos ceremoniales.

## Branching (automático)

`sdd task plan <id>` reescribe el plan en el lugar: agrega la sección `## Rama de trabajo` desde `.sdd/branching.md` (o defaults con ⚠️ si no existe), inserta `git checkout -b <rama>` como **Paso 1 bloqueante** y renumera tus pasos a partir del 2. No lo escribas vos.

## El gate

`sdd task status <id> planned` **le abre plan.md al dev**. Con su ok: `sdd task status <id> in-progress` y seguí con **sdd-execute**.

## Additional Resources

- `templates/plan.md` — Artefacto canónico: estructura de cada paso y su presupuesto.
- `examples/plan-ejemplo.md` — Pasos bien descompuestos + anti-ejemplo.
