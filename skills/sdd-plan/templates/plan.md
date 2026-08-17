# Plan — tarea __ID__: __TITLE__

> Tope: **45 líneas** (BR-082). Es una **lista de pasos, no un documento** (BR-085): una línea por paso y su verificación. El detalle técnico va en `design.md`. El dev debe APROBARLO antes de ejecutar.

- [ ] **N. \<qué hace\>** `[P]` — \<una línea, no más\>. `cmd: <comando que lo verifica>`

Reglas del formato:

- **Una línea por paso.** Si no entra, el paso es demasiado grande: partilo.
- **Verificación ejecutable siempre que se pueda**: `cmd: <comando>` — su exit code decide, sin razonamiento. Prosa solo si requiere juicio humano o visual, y ahí se escribe _Verificación manual del dev._
- `[P]` marca los pasos sin dependencias cruzadas, que pueden ir en paralelo. `Depende de N` cuando el orden importa.
- El nivel de modelo (`rapido`/`medio`/`fuerte`) va entre paréntesis solo si no es el default del tipo de paso.
- **Riesgo alto:** el Paso 1 es `git checkout -b <rama>` según `.sdd/branching.md` (BR-039), y el detalle de archivos y dependencias vive en `design.md`.
- En un `bug`, el **primer paso es el test de regresión** (rojo antes del fix, verde después). En un `refactor`, el primero es la corrida verde de baseline.

Si el plan no entra en 45 líneas, la tarea es demasiado grande: decilo y proponé partirla (BR-083).

---
_Aprobación del dev: pendiente_
