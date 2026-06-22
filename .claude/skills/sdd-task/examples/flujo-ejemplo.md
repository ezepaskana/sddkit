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
- Estado: `captured`

---

## Fase 2 — Analizar (`/sdd-analyze`)

```bash
sdd context    # carga arquitectura C4, catálogo, learnings
```

El agente investiga el código y responde 7 preguntas clave:

1. **Ya existe?** — `sdd doctor` chequea pre-commit hooks, pero no post-commit.
2. **Hay algo más simple?** — No; extender el patrón existente es lo más directo.
3. **Dónde vive?** — `src/commands/doctor.js`, función `checkHooks()`.
4. **Patrón a seguir?** — Mismo que `checkPreCommitHook()`: buscar archivo, reportar estado.
5. **Tests existentes?** — `test/doctor.test.js` cubre pre-commit; falta post-commit.
6. **Riesgos?** — Ninguno significativo; es lectura de filesystem.
7. **Dependencias?** — Ninguna nueva.

**Recomendación**: proceder con cambios — el patrón ya existe para pre-commit, solo hay que extenderlo a post-commit.

---

## Fase 3 — Especificar (`/sdd-specify`)

Criterios EARS seleccionados:

| Tipo | Criterio |
|------|----------|
| **When/Then** | Cuando el usuario ejecuta `sdd doctor`, entonces el output incluye el estado del hook post-commit |
| **While** | Mientras no exista hook post-commit, doctor reporta "missing" sin error |
| **Where** | Donde el hook post-commit existe, doctor reporta "ok" con su path |

**Métrica de impacto**: `sdd doctor` pasa de reportar 0 → 1 tipo de hook post-commit.

**Regla de negocio**: BR-027 (doctor debe reportar estado completo de la configuración).

```bash
sdd task status 004 specified    # gate: el dev aprueba la spec
```

---

## Fase 4 — Planificar (`/sdd-plan`)

| # | Paso | Nivel | Modelo |
|---|------|-------|--------|
| 1 | Escribir tests para `checkPostCommitHook()` | rapido | haiku |
| 2 | Implementar `checkPostCommitHook()` en doctor.js | medio | sonnet |
| 3 | Actualizar docs C4 (components.md) | rapido | haiku |

```bash
sdd task status 004 planned      # gate: el dev aprueba el plan
```

---

## Fase 5 — Ejecutar (`/sdd-execute`)

```bash
sdd task status 004 in-progress
```

El orquestador lanza cada paso en un **subagente fresco** con el modelo de su nivel:

- **Paso 1** (haiku): crea test en `test/doctor.test.js` → tests fallan (red) → verificado
- **Paso 2** (sonnet): implementa `checkPostCommitHook()` → tests pasan (green) → verificado
- **Paso 3** (haiku): actualiza `.sdd/c4/components.md` → verificado

Branch: `task/004-sdd-doctor-post-commit-hooks`

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
    → capturar (requirement.md)
      → analizar (7 preguntas, recomendación)
        → especificar (EARS + métrica + gate)
          → planificar (pasos + niveles + gate)
            → ejecutar (subagentes verificados)
              → cerrar (PR + retro + learning)
```

Cada fase tiene un **gate de aprobación** del dev antes de avanzar. Pausar y retomar es posible en cualquier punto con `sdd task status <id> paused` / `sdd task show <id>`.
