# Ejemplo de plan bien descompuesto

El plan es una **lista**: una línea por paso, con su verificación (BR-085). Tope 45 líneas.

```markdown
- [ ] **1. Rama de trabajo** — `git checkout -b task/014-join-plantas`. `cmd: test "$(git branch --show-current)" = task/014-join-plantas`
- [ ] **2. Tests de contrato de GET /plants con join** `[P]` — caso feliz, lista vacía y planta sin medidor, en `tests/plants.spec.js`. `cmd: npm test -- plants` (3 en rojo)
- [ ] **3. Reemplazar el N+1 por JOIN en `plantService.list`** _(fuerte)_ — mismo contrato de respuesta. Depende de 2. `cmd: npm test -- plants`
- [ ] **4. Documentar el cambio en el C4** `[P]` — `cmd: grep -q 'join a medidores' .sdd/c4/components.md`
```

Cuatro pasos, cuatro líneas, cada uno verificable solo. Los archivos de un paso se nombran en su línea si son uno o dos; si son más, van a `design.md`.

## Qué mirar

- **El test va antes que la implementación** (rojo → verde), y eso se ve en el orden de los pasos.
- **La verificación es un comando**, no una promesa: su exit code decide, sin razonamiento del orquestador.
- `[P]` marca los que pueden ir en paralelo — los pasos 2 y 4 no comparten archivos con nadie.
- El nivel de modelo se anota **solo** cuando no es el obvio: el 3 es `(fuerte)` porque toca lógica de negocio; los demás no lo necesitan.

## Anti-ejemplos

- `- [ ] Implementar la mejora de performance del endpoint` — no es verificable ni dice qué toca.
- Un paso con seis sub-ítems explicando el diseño: eso es `design.md`, no el plan.
- Un plan de 80 líneas: no es un plan detallado, es una tarea demasiado grande (BR-083). Partila.
