# Ejemplo: ejecución orquestador/workers

Tarea 003 (`feature`, riesgo bajo), plan de 4 pasos aprobado. El Paso 1 (rama) ya corrió y validó.

## Paso 2 — tests de `sdd doctor` _(rapido)_

```
$ sdd task brief 003 2
Agent({ description: "Paso 2: tests sdd doctor", model: "haiku", prompt: "<output del brief>" })
```

El worker reporta "3 tests escritos". El orquestador **no confía en el reporte**: `sdd task verify 003 2` → `cmd: sdd test` → 3 tests en rojo (esperado: el comando no existe aún) → exit 0 → marca `- [x] **2. Tests de sdd doctor** _(rapido)_`.

## Paso 3 — implementar _(fuerte)_ — worker bloqueado

El worker devuelve una pregunta en vez de código:

> "La spec dice 'dependencias opcionales' pero no lista cuáles. ¿Solo better-sqlite3, o también gh/az/glab?"

El orquestador **no decide solo**, se la pasa al dev. Dev: _"better-sqlite3, gh y glab. az no."_ Lo registra en `analysis.md`:

```
## Clarificación paso 3 (2026-06-22)
P: ¿Qué dependencias opcionales chequea sdd doctor? — R: better-sqlite3, gh y glab; az excluido.
```

Relanza con el brief actualizado (ya incluye la clarificación) → `sdd task verify 003 3` → los tests del paso 2 en verde → checkbox.

## Paso 4 — docs _(rapido)_

`sdd task verify 003 4` → `cmd: grep -q "sdd doctor" .sdd/c4/components.md` → exit 0 → checkbox.

## Prueba local y cierre

> **Orquestador → Dev:** Todos los pasos verificados. Probá: `sdd doctor` — debe listar hooks, dependencias (better-sqlite3, gh, glab) y config.

Dev: _"Funciona, glab lo instalo después. Dale."_ → commit convencional (`feat(doctor): reportar estado de hooks y dependencias`) → **sdd-close**.
