---
name: sdd-execute
description: Fase de ejecución de una tarea SDD con patrón orquestador/workers. Usar tras la aprobación del plan (sdd-plan) para ejecutar los pasos en subagentes con contexto limpio.
---

# sdd-execute — orquestador/workers

**Vos sos el ORQUESTADOR: NO implementás ningún paso vos mismo.** Tu contexto queda limpio (spec, plan, coordinación); la implementación contamina solo contextos descartables de subagentes. El protocolo completo está en `references/protocolo-subagentes.md`.

## Paso 1 es BLOQUEANTE: rama de trabajo

**ANTES de lanzar ningún subagente:** El Paso 1 (auto-generado) es `git checkout -b <rama>`. Este paso es **bloqueante**:
- Verifica que el repo tiene `.git` (si no, instrucción clara para `git init`).
- Ejecuta el comando de checkout.
- Valida que la rama activa es la esperada.
- **Si falla:** STOP. No continúa con Paso 2+.

Esto asegura que todos los commits van a la rama correcta. El orquestador ejecuta Paso 1 automáticamente cuando corrés `sdd task execute <id>` (antes de lanzar workers para Paso 2+).

Resumen del ciclo por paso (incluidos los `(fuerte)`):

1. **Paso 1 ya se ejecutó** (rama creada, validada). Partir de Paso 2.
2. Generá el contexto mínimo del paso: `sdd task brief <id> <paso>` — el CLI recorta determinísticamente (el paso + spec refinada + solo las BR citadas + catálogo). NO le digas al worker "leé spec.md y plan.md completos": el brief reemplaza esas lecturas y se paga una sola vez por paso.
3. Lanzá un subagente con el modelo del nivel del paso (`.sdd/config.json → models`) cuyo prompt sea el output del brief (ver protocolo).
4. Cuando reporta, **verificá VOS**: `sdd task verify <id> <paso>` — si la verificación es `cmd:` se ejecuta literal (exit 0 = pasó; exit 3 = verificación manual, ahí sí juzgá vos). Tests sueltos: `sdd test` / `sdd check`. Solo con verificación en verde marcá el checkbox en plan.md.
5. Subagente bloqueado → te devuelve la pregunta; resolvela con el dev, registrá la respuesta en analysis.md, relanzá.
6. Pasos `[P]` sin dependencias cruzadas: subagentes paralelos.
7. Si un paso falla o revela un problema de la spec: frená y consultá al dev antes de improvisar.

Sin subagentes disponibles (p.ej. Cursor): ejecutá secuencial, pero releé analysis.md, spec.md y plan.md antes de cada paso en vez de confiar en tu memoria de la conversación.

Pausar: `sdd task status <id> paused`. Retomar (cualquier sesión/agente): `sdd task show <id>`. Al completar todos los pasos: skill **sdd-close**.

## Additional Resources

- `examples/ejecucion-ejemplo.md` — Ejemplo completo de ejecución con bloqueo, clarificación y reintento.
- `references/protocolo-subagentes.md` — Protocolo de prompt, verificación y modelo por nivel para workers.
