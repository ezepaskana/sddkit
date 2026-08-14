# Ejemplo: clasificación y artefactos por tipo (el estándar de concisión)

## `simple` — "el mail de bienvenida dice 'Bienvenio'"

Anuncio (una línea): _"Lo trato como `simple` (riesgo bajo): typo en un archivo, lo arreglo con un test que lo fije. Decime si preferís otro tipo."_ → único artefacto: `nota.md`.

`nota.md` completa (único artefacto, único gate):

- **Qué entendí:** el template del mail de bienvenida tiene un typo en el saludo.
- **Qué voy a hacer:** corregir el literal en `src/emails/welcome.hbs`.
- **Cómo se verifica:** `cmd: npm test -- emails`

## `bug` — "el filtro de fechas ignora la factura del último día del rango"

Anuncio: _"Lo trato como `bug` (riesgo bajo): reproduzco, test rojo, fix. Decime si preferís otro tipo."_ → artefactos: `reproduccion.md` + `plan.md`.

`reproduccion.md` (reemplaza a la spec):

1. Crear una factura con fecha `2026-03-31` y pedir el listado con `desde=2026-03-01&hasta=2026-03-31`.
- **Esperado:** la factura aparece. **Observado:** no aparece — el borde superior se compara como `< hasta` en vez de `<= hasta`.
- **Test de regresión:** `invoices.test.js::incluye la factura del último día del rango` — falla antes del fix. `cmd: npm test -- invoices`

## `refactor` — "extraer el armado de queries a su propio módulo"

Anuncio: _"Lo trato como `refactor` (riesgo alto: `invoices.js` tiene 6 dependientes): mapeo los dependientes, tests verdes antes y después, sin EARS."_ → artefactos: `analysis.md` + `plan.md`, riesgo `alto`.

`analysis.md` (extracto — el resto es `N/A` justificado):

- **Problema real:** `invoices.js` mezcla armado de queries, reglas de negocio y serialización; 480 líneas, 3 funciones duplican el armado del `WHERE`.
- **Dependientes:** 6, todos internos (`grep -rn "from './invoices'" src/`); sin consumidores externos.
- **Riesgos:** el manejo de zonas horarias tiene semántica sutil (LEARNINGS tarea 004) — se mueve tal cual, sin "mejoras" de paso.
- **Métrica:** `N/A: refactor sin cambio de comportamiento observable; el criterio son los 213 tests verdes antes y después.`

## Anti-ejemplo

Clasificar `feature` "por las dudas" un cambio de un archivo: genera analysis + spec + plan para tres líneas de código. Si dudás entre `simple` y otro tipo, no es `simple` — pero tampoco infles: elegí el tipo real y ajustá el **riesgo**.
