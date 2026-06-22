---
name: sdd-plan
description: Fase de planificación de una tarea SDD. Usar después de la aprobación de la spec (sdd-specify) para descomponer en pasos chicos verificables con nivel de modelo.
---

# sdd-plan — el plan en pasos chicos

Completá plan.md de la tarea (formato canónico: `templates/plan.md`; ejemplo trabajado: `examples/plan-ejemplo.md`).

## Integración de branching (automática)

Cuando el agente orquestador corre `sdd task plan <id>`, sddkit:
1. **Crea rama de trabajo automáticamente** — genera la sección `## Rama de trabajo` con nombre de rama (ej: `task/010-branching-model`), origen (`main` o `develop`), destino, convención de commits y flujo.
2. **Genera Paso 1 automáticamente** — inserta `git checkout -b <rama>` como Paso 1 (bloqueante, debe correr antes que el resto).
3. **Renumera pasos** — los pasos que escribiste pasan de Paso 1, 2, 3... a Paso 2, 3, 4... automáticamente.
4. **Avisa si falta policy** — si `.sdd/branching.md` no existe, agrega ⚠️ y usa defaults de sddkit (Conventional Commits + GitHub Flow).

**Resultado:** El plan.md es actualizado en-lugar (reescrito) sin que vos toques nada. El dev verá la sección de rama + pasos renumerados.

## Reglas de descomposición

1. **Chico**: cada paso completable y verificable por sí solo en una sesión corta. Si no podés escribir su verificación en una línea, es muy grande — partilo.
1b. **Verificación ejecutable siempre que se pueda**: escribila como `Verificación: cmd: <comando>` (p.ej. `cmd: sdd test`, `cmd: node .sdd/run-tests.mjs`, `cmd: grep -q "X" src/archivo.js`). El orquestador la ejecuta literal con `sdd task verify <id> <paso>` — exit code = verdad, cero razonamiento. Dejá verificación en prosa SOLO cuando requiere juicio humano/visual.
2. **Tests primero**: los tests de un comportamiento van en un paso ANTERIOR a su implementación (rojo → verde).
3. **Archivos explícitos** por paso: rutas exactas, no "varios archivos".
4. **Dependencias**: qué paso necesita a cuál; `[P]` marca los paralelizables.
5. **Nivel de modelo por paso**: `(rapido)` mecánico/boilerplate/renames · `(medio)` implementación estándar · `(fuerte)` diseño, lógica compleja, edge cases. Mapean a modelos concretos en `.sdd/config.json → models`.
6. **El primer paso instrumenta la métrica** si analysis.md no tenía baseline.

## El gate

Corré `sdd task status <id> planned` — **le abre plan.md al dev**. Esperá su aprobación en el chat. Con el ok: `sdd task status <id> in-progress` y seguí con la skill **sdd-execute**.

## Additional Resources

- `examples/plan-ejemplo.md` — Ejemplo de pasos bien descompuestos (3 pasos + anti-ejemplo).
- `templates/plan.md` — Template canónico de plan.md con estructura de checkboxes.
