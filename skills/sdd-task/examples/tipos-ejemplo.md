# Ejemplo: clasificación y artefactos (el estándar de concisión)

**Un solo camino** (BR-058): toda tarea escribe `analysis.md` y `plan.md`. Solo el riesgo `alto` agrega `spec.md` y `design.md`. El tipo decide el **contenido**, no la lista de archivos.

## `simple` — "el mail de bienvenida dice 'Bienvenio'"

Anuncio (una línea): _"Lo trato como `simple` (riesgo bajo): typo en un archivo, lo arreglo con un test que lo fije. Decime si preferís otro tipo."_

`analysis.md` entero — sin diagrama (el pedido se explica en una línea) y sin huecos:

```markdown
## Entendimiento
El template del mail de bienvenida tiene un typo en el saludo: dice "Bienvenio".

## Huecos
Ninguno: el archivo es uno solo y el texto correcto es evidente.
```

`plan.md` entero, dos pasos:

```markdown
- [ ] **1. Test que fija el saludo correcto** — `cmd: npm test -- emails` (rojo)
- [ ] **2. Corregir el literal en `src/emails/welcome.hbs`** — `cmd: npm test -- emails` (verde)
```

## `bug` — "el filtro de fechas ignora la factura del último día del rango"

Anuncio: _"Lo trato como `bug` (riesgo bajo): reproduzco, test rojo, fix."_ La reproducción va **en el entendimiento**:

```markdown
## Entendimiento
Con `desde=2026-03-01&hasta=2026-03-31`, una factura del `2026-03-31` no aparece
en el listado. El borde superior se compara como `< hasta` en vez de `<= hasta`.
```

Y el test de regresión es el **primer paso del plan**, no un artefacto aparte:

```markdown
- [ ] **1. Test que captura el borde superior** — `invoices.test.js`. `cmd: npm test -- invoices` (rojo por el motivo correcto)
- [ ] **2. Comparar con `<=` en el filtro** — `src/services/invoices.js`. `cmd: npm test -- invoices` (verde)
```

## `refactor` — "extraer el armado de queries a su propio módulo"

Anuncio: _"Lo trato como `refactor` (riesgo alto: `invoices.js` tiene 6 dependientes): mapeo dependientes, tests verdes antes y después."_ → suma `spec.md` y `design.md`.

El `analysis.md` lleva diagrama (el flujo tiene varios actores) y los dependientes medidos con el comando que los produjo. El **primer paso del plan** es la corrida verde de baseline, y el último la misma corrida.

## Anti-ejemplo

Clasificar `feature` "por las dudas" un cambio de un archivo: genera cuatro artefactos para tres líneas de código. Si dudás entre `simple` y otro tipo, no es `simple` — pero tampoco infles: elegí el tipo real y ajustá el **riesgo**, que es lo que decide la profundidad.
