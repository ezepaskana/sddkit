# Ejemplo: Flujo completo de una tarea SDD

Escenario: el usuario dice _"quiero que sdd doctor muestre el estado de los hooks post-commit"_.

---

## Trigger

El mensaje contiene **"quiero que"** → keyword de cambio detectado → se dispara `/sdd-task` automáticamente.

---

## Fase 1 — Capturar

```bash
sdd task new "quiero que sdd doctor muestre el estado de los hooks post-commit"
```

- Se crea `.sdd/tasks/004-sdd-doctor-muestre-estado-hooks/`
- `requirement.md` guarda el requisito verbatim del dev
- `analysis.md`, `spec.md` y `plan.md` se crean con sus templates
- Estado: `draft`

---

## Fase 2 — Analizar (`/sdd-analyze`, modo tarea)

```bash
sdd context    # carga arquitectura C4, catálogo, learnings
```

El agente investiga el código y completa **analysis.md** con las 7 preguntas clave:

1. **Ya existe?** — `sdd doctor` chequea pre-commit hooks, pero no post-commit.
2. **Hay algo más simple?** — No; extender el patrón existente es lo más directo.
3. **Dónde vive?** — `src/commands/doctor.js`, función `checkHooks()`.
4. **Patrón a seguir?** — Mismo que `checkPreCommitHook()`: buscar archivo, reportar estado.
5. **Tests existentes?** — `test/doctor.test.js` cubre pre-commit; falta post-commit.
6. **Riesgos?** — Ninguno significativo; es lectura de filesystem.
7. **Dependencias?** — Ninguna nueva.

**Recomendación** (en analysis.md): proceder con cambios — el patrón ya existe para pre-commit, solo hay que extenderlo.

**Métrica de impacto** (en analysis.md): `sdd doctor` pasa de reportar 0 → 1 tipo de hook post-commit.

```bash
sdd task status 004 analyzed    # gate: el dev aprueba analysis.md
```

---

## Fase 3 — Especificar (`/sdd-specify`)

El agente lee analysis.md (ya aprobado) y escribe **spec.md**:

**Historia:** Como usuario de sddkit quiero que `sdd doctor` reporte el estado del hook post-commit para tener visibilidad completa de la configuración de hooks.

Criterios EARS:

| Tipo | Criterio |
|------|----------|
| **When/Then** | Cuando el usuario ejecuta `sdd doctor`, entonces el output incluye el estado del hook post-commit |
| **While** | Mientras no exista hook post-commit, doctor reporta "missing" sin error |
| **Where** | Donde el hook post-commit existe, doctor reporta "ok" con su path |

**Regla de negocio**: BR-027.

```bash
sdd task status 004 specified    # gate: el dev aprueba spec.md
```

---

## Fase 4 — Planificar (`/sdd-plan`)

| # | Paso | Nivel | Modelo |
|---|------|-------|--------|
| 1 | Crear rama de trabajo | rapido | haiku |
| 2 | Escribir tests para `checkPostCommitHook()` | rapido | haiku |
| 3 | Implementar `checkPostCommitHook()` en doctor.js | medio | sonnet |
| 4 | Actualizar docs C4 (components.md) | rapido | haiku |

```bash
sdd task status 004 planned      # gate: el dev aprueba el plan
```

---

## Fase 5 — Ejecutar (`/sdd-execute`)

```bash
sdd task status 004 in-progress
```

El orquestador lanza cada paso en un **subagente fresco** con el modelo de su nivel:

- **Paso 1** (rapido): crea rama `task/004-sdd-doctor-post-commit-hooks`
- **Paso 2** (rapido): crea test en `test/doctor.test.js` → tests fallan (red) → verificado
- **Paso 3** (medio): implementa `checkPostCommitHook()` → tests pasan (green) → verificado
- **Paso 4** (rapido): actualiza `.sdd/c4/components.md` → verificado

---

## Fase 6 — Cerrar (`/sdd-close`)

```bash
sdd task status 004 done
```

**PR creada** con summary y test plan.

**Retro** (`retro.md`):
- **Métrica**: doctor reporta 0 → 1 tipo de hook post-commit. Cumplida.
- **Desvíos**: ninguno.
- **Learning cosechado** a `.sdd/LEARNINGS.md`: _"El patrón checkHook() es extensible a cualquier tipo de hook; parametrizar si se agregan más."_

---

## Resumen del flujo

```
mensaje del dev
  → trigger detecta cambio
    → capturar (requirement.md + analysis.md + spec.md + plan.md)
      → analizar (analysis.md: 7 preguntas, métrica → gate analyzed)
        → especificar (spec.md: EARS, BRs → gate specified)
          → planificar (plan.md: pasos + niveles → gate planned)
            → ejecutar (subagentes verificados)
              → cerrar (PR + retro + learning)
```

Cada fase tiene un **gate de aprobación** del dev antes de avanzar. Pausar y retomar es posible en cualquier punto con `sdd task status <id> paused` / `sdd task show <id>`.
