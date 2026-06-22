# Ejemplo: Ejecución orquestador/workers

Tarea `003-agregar-comando-sdd-doctor`. Plan aprobado (4 pasos). El Paso 1 (crear rama) ya se ejecutó y validó. Arrancamos desde el Paso 2.

---

## Paso 2 — Test del comando `sdd doctor` _(rapido)_

El orquestador genera el brief y lanza un subagente haiku:

```
$ sdd task brief 003 2          # recorte determinístico: paso + spec + catálogo

Agent({ description: "Paso 2: test sdd doctor", model: "haiku",
        prompt: "<output del brief>" })
```

El subagente crea `tests/doctor.test.js` (check exitoso, warning, dependencia faltante). Reporta "3 tests escritos". El orquestador **no confía en el reporte** — verifica:

```
$ sdd task verify 003 2
# verificación del paso: cmd: sdd test
# ejecuta los tests → 3 tests, 3 en rojo (esperado: todavía no existe el comando)
# exit 0 → verificación pasó
```

Marca el checkbox en plan.md: `- [x] **2. Test del comando sdd doctor** _(rapido)_`

---

## Paso 3 — Implementar el comando _(fuerte)_

```
$ sdd task brief 003 3

Agent({ description: "Paso 3: implementar sdd doctor", model: "opus",
        prompt: "<output del brief>" })
```

### Subagente bloqueado

El subagente devuelve una pregunta en vez de código:

> "La spec dice que `sdd doctor` debe verificar 'dependencias opcionales',
> pero no lista cuáles. ¿Solo better-sqlite3 o también gh/az/glab?"

El orquestador **no decide solo** — le pregunta al dev:

> **Orquestador → Dev:** El subagente del paso 3 pregunta: ¿qué dependencias
> opcionales debe chequear `sdd doctor`? Solo better-sqlite3, o también
> gh/az/glab?

**Dev:** "Las tres: better-sqlite3, gh y glab. az no."

El orquestador registra la respuesta en analysis.md:

```
## Clarificación paso 3 (2026-06-22)
**P:** ¿Qué dependencias opcionales chequea `sdd doctor`?
**R:** better-sqlite3, gh y glab. az excluido por decisión del dev.
```

Relanza con el brief actualizado (ya incluye la clarificación):

```
$ sdd task brief 003 3

Agent({ description: "Paso 3: sdd doctor (reintento)", model: "opus",
        prompt: "<output del brief actualizado>" })
```

El subagente crea `src/commands/doctor.js`. Reporta "implementado". Verificación:

```
$ sdd task verify 003 3
# verificación del paso: cmd: sdd test
# ejecuta tests → 3 tests del paso 2 ahora en verde
# exit 0 → verificación pasó
```

Marca el checkbox: `- [x] **3. Implementar el comando sdd doctor** _(fuerte)_`

---

## Paso 4 — Actualizar docs _(rapido)_

```
$ sdd task brief 003 4

Agent({ description: "Paso 4: actualizar docs", model: "haiku",
        prompt: "<output del brief>" })
```

El subagente agrega la entrada de `sdd doctor` en AGENTS.md. Reporta "listo".

```
$ sdd task verify 003 4
# verificación del paso: cmd: grep -q "sdd doctor" AGENTS.md
# exit 0 → verificación pasó
```

Marca el checkbox: `- [x] **4. Actualizar docs** _(rapido)_`

---

## Todos los pasos completados

No quedan checkboxes pendientes en plan.md. Transición:

```
$ sdd task status 003 done
# requiere retro → el orquestador invoca sdd-close
```

A partir de acá toma el control el skill **sdd-close**: retro con métrica, desvíos del plan (el bloqueo del paso 3 y la clarificación), aprendizajes cosechados a `.sdd/LEARNINGS.md`.
