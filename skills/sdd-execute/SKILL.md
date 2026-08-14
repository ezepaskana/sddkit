---
name: sdd-execute
description: Fase de ejecución de una tarea SDD con patrón orquestador/workers. Usar tras la aprobación del plan (sdd-plan) para ejecutar los pasos en subagentes con contexto limpio.
---

# sdd-execute — orquestador/workers

**Sos el ORQUESTADOR: no implementás ningún paso vos mismo** (tampoco los `(fuerte)`). Tu contexto queda limpio; la implementación contamina contextos descartables. Protocolo completo en `references/protocolo-subagentes.md`.

Aplica a todos los tipos y riesgos: siempre hay plan, aunque tenga dos pasos (BR-058).

## Paso 1 — bloqueante: rama de trabajo

Antes de lanzar ningún subagente, ejecutá el Paso 1 auto-generado (`git checkout -b <rama>`): verificá que existe `.git`, corré el checkout y validá que la rama activa es la esperada. **Si falla, STOP** — no sigas con el Paso 2.

**Nadie commitea durante la ejecución** (ni workers ni vos): los cambios quedan como modificaciones locales hasta la prueba local.

## Ciclo por paso (desde el Paso 2)

1. **Armá el brief del paso vos** — el recorte mínimo (paso + spec + BR citadas + catálogo); composición exacta en `references/protocolo-subagentes.md`. **No le digas al worker "leé spec.md y plan.md completos"**: el brief reemplaza esas lecturas y se paga una vez por paso.
2. Lanzá un subagente con el modelo del nivel del paso (`.sdd/config.json → models`) y el brief como prompt.
3. **Verificá VOS**: corré el `cmd:` del paso y mirá su exit code (sin `cmd:` la verificación es manual, ahí juzgá vos). El reporte del worker es un claim, no una prueba. Solo con verde marcás el checkbox en plan.md.
4. Worker bloqueado → te devuelve la pregunta: resolvela con el dev, registrala como hueco en `analysis.md` y relanzá con el brief actualizado.
5. Pasos `[P]` sin dependencias cruzadas: subagentes en paralelo.
6. Si un paso falla o revela un problema de la spec: frená y consultá al dev, no improvises. Si el alcance mutó, re-clasificá (actualizá `tipo` en `.sdd/tasks/index.json`) y avisá.

Específicos: **`bug`** → el paso del test rojo se verifica con el test fallando por el motivo correcto, no por otro error. **`refactor`** → la corrida verde de baseline se registra antes del primer cambio y la misma corrida debe quedar verde al final.

Sin subagentes disponibles: ejecutá secuencial, releyendo los artefactos de la tarea antes de cada paso en vez de confiar en tu memoria de la conversación.

Pausar: poné `paused` en el índice. Retomar (cualquier sesión): leé `.sdd/tasks/index.json`, abrí el `plan.md` de la tarea y seguí desde el primer checkbox sin marcar. Detalle en `sdd-task → references/artefactos.md`.

## Prueba local (cuando todos los checkboxes están verificados)

1. Presentale al dev una instrucción concreta según el cambio: comando CLI → "corré `<comando>` y mirá la salida"; función → "usala y verificá el retorno"; config/docs → "revisá `git diff`"; skill → "probá el flujo en una tarea de prueba".
2. **Esperá su confirmación.** Si reporta problemas, corregí sin commitear y volvé a pedirla.
3. Recién con la confirmación: commiteá con mensaje convencional (`.sdd/branching.md`) y pasá a **sdd-close**.

## Additional Resources

- `references/protocolo-subagentes.md` — Prompt del worker, verificación y modelo por nivel.
- `examples/ejecucion-ejemplo.md` — Ejecución real con bloqueo, clarificación y reintento.
