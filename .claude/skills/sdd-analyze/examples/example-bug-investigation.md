# Ejemplo: investigación de bug (standalone, read-only)

> `/sdd-analyze ¿por qué sdd task verify falla con "no tiene línea de Verificación" en pasos que claramente la tienen?`

---

## 1. Al chat

> `stepBlock` (`src/commands/task.js`) recorta el paso siguiendo el regex `/^\s+(-|\d+\.) /`. Con cualquier otro marcador de sub-lista (`a)`, `b)`) el bloque se **trunca antes** de llegar a `**Verificación:**` — por eso falla solo en algunos pasos. `sdd task brief` tiene el mismo síntoma: le entrega el paso cortado al subagente.
>
> Ya nos pasó: quedó anotado en los aprendizajes de la tarea 004 y se arregló agregando otro formato. Volvió con uno nuevo.
>
> ¿Qué querés ver?
>
> 1. El arreglo que propongo, con su test
>    → sabés cuánto trabajo es antes de decidir
> 2. Cómo reproducirlo
>    → lo confirmás vos en dos minutos
> 3. Qué más usa esa misma función
>    → te enterás si hay otros comandos rotos en silencio
>
> **¿Con cuál sigo?** Detalle en `.sdd/notes/stepblock-truncado.md`.

**126 palabras.** Causa raíz con `archivo:línea`, opciones con lo que dan, y una pregunta al final. No adelanta el arreglo hasta que el dev lo pide.

Las rutas y nombres de función reales (`stepBlock`, `src/commands/task.js`) **se quedan**: ubican al dev en su propio código. Lo que se tradujo fue "regresión en el regex de sub-listas" → "volvió con un formato nuevo" (BR-067).

---

## 2. A la nota (`.sdd/notes/stepblock-truncado.md`)

```markdown
# stepBlock trunca el paso según el marcador de sub-lista

**Estado:** en curso · **Última sesión:** 2026-08-02

## Conclusión hasta ahora
Causa raíz confirmada: el regex de `stepBlock` solo contempla `- ` y `N. `.
Es una reaparición del bug de la tarea 004, con un marcador nuevo.

## Decisiones del dev
- (pendiente)

## Detalle
### Síntoma
`sdd task verify <id> <n>` reporta "no tiene línea de Verificación" con el plan bien escrito.

### Archivos
- `src/commands/task.js` → `stepBlock` (el truncado ocurre acá)
- consumidores: `verify` (falla) y `brief` (entrega un paso incompleto, sin error visible)
- `.sdd/LEARNINGS.md` → entrada de la tarea 004 con la receta

### Fix sugerido (descrito, NO aplicado — standalone es read-only)
1. Reproducir con un `plan.md` cuyo paso use el marcador sospechoso.
2. Extender el regex de `stepBlock` a ese formato, conservando `- ` y `N. `.
3. Test de regresión con sub-listas mezcladas: el bloque debe llegar hasta `**Verificación:**`.

## Abierto
- [ ] ¿Conviene invertir la lógica (cortar en el próximo `- [ ] **N.`) en vez de enumerar marcadores?
```

---

## Handoff

Cuando el dev decide arreglarlo:

> Corré `/sdd-task` con: "que `stepBlock` no trunque el paso cuando los sub-ítems usan `<formato>`, con test de regresión". Es un `bug`: reproducción + test rojo + fix.
