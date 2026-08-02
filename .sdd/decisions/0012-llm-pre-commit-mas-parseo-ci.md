# ADR 0012 — LLM en pre-commit para inputs/outputs/entidades/casos de uso + parseo determinístico en CI (reemplaza el mecanismo de ADR-0011)

- **Fecha:** 2026-07-27 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/010

## Contexto

ADR-0011 estableció detección de `endpoints`/`consumptions` vía LLM headless invocado por `sdd publish` en CI, con salida forzada por tool-use/JSON schema estricto (`endpoints`/`consumptions`), acotado al diff incremental desde el último `commitHash` publicado.

El dev pidió dos cambios de alcance sobre ese mecanismo:

1. **Ampliar mucho más allá de HTTP**: no solo endpoints/consumos, sino cualquier input/output del sistema — colas, jobs, storage (S3/FTP), bases de datos — y agregar dos categorías nuevas orientadas a negocio: **Entidades** (ya existe como sección en `.sdd/domain.md`) y **Casos de uso** (nueva).
2. **Mover el momento de detección**: que la actualización ocurra en el **pre-commit** de cada dev, no solo al mergear a main en CI. El objetivo es que los archivos vivos (`.sdd/c4/components.md`, `.sdd/domain.md`) reflejen el código en cada commit local, no solo el estado publicado en main.

Ese segundo pedido es justo lo que ADR-0011 (Contexto, párrafo 2) había descartado explícitamente para el caso de `endpoints`/`consumptions` en el hook post-commit local, invocando las tres garantías de ADR-0010 (velocidad, determinismo, funcionamiento offline). El dev, al pedirlo ahora de forma explícita para este nuevo alcance, acepta conscientemente resignar esas tres garantías en el hook — y ya no bloqueante, ver BR-053 — a cambio de tener los docs vivos siempre al día. Esto obliga a partir el mecanismo en dos etapas con responsabilidades distintas: el LLM ya no puede vivir solo en CI si tiene que correr en cada commit local.

## Decisión

- El LLM corre en el hook **pre-commit** (local, cada dev, cada commit, sin filtrar por relevancia — BR-051), sobre los archivos **staged** de ese commit puntual — no el diff-desde-último-publish de ADR-0011, que era un concepto de CI/`sdd publish`.
- Escribe texto Markdown (bullets) en 2 archivos ya existentes, reusando el patrón de docs vivos ya validado (esqueleto + preservado, BR-037) en vez de crear archivos nuevos separados:
  - `.sdd/c4/components.md` — secciones nuevas **"Inputs"** y **"Outputs"** (colas, jobs, storage S3/FTP, bases de datos, HTTP).
  - `.sdd/domain.md` — sección nueva **"Casos de uso"**, junto a **"Entidades"** que ya existe.
- **No bloqueante** (BR-053): si el LLM falla (sin red, sin `ANTHROPIC_API_KEY`, timeout, rate-limit), el commit sigue igual, las secciones quedan en su última versión válida, y se loguea una advertencia — degradación silenciosa análoga a BR-048/BR-025.
- La CI (`sdd publish --ci`, al mergear a main — sin cambios en el trigger de CI respecto a ADR-0011/BR-049/BR-050) **ya no vuelve a invocar un LLM**. En su lugar, parsea determinísticamente esas 4 secciones (bullets → items), usando `git blame` por línea para calcular la metadata de autoría, y puebla **4 tablas nuevas y separadas** en el mismo graphstore mysql: `inputs`, `outputs`, `entidades`, `casos_de_uso`, relacionadas por `canonicalName`. Esto reemplaza el schema anterior de columnas JSON `endpoints`/`consumptions` en la tabla `systems`.
- Metadata de autoría (quién/cuándo/commit) la calcula la CI vía `git blame`, **nunca la escribe el LLM en el contenido** (BR-056) — mantiene el contenido de las secciones limpio y legible, sin ruido de metadata operativa mezclado con el negocio.

## Alternativas consideradas

- **Mantener el mecanismo JSON-en-CI de ADR-0011 tal cual**: descartado — insuficiente, no cubre colas/jobs/storage/entidades/casos de uso, y el dev pidió explícitamente cambiar de mecanismo, no solo extenderlo.
- **LLM en CI en vez de pre-commit**: descartado — pierde la actualización inmediata en cada commit que pidió el dev, y no resuelve el objetivo de "archivos siempre al día" en el día a día del dev, solo lo resolvería al mergear a main.
- **Que el LLM mismo escriba la metadata de autoría** (quién/cuándo/commit) junto con el contenido: descartado — mezclaría contenido de negocio con metadata operativa en el mismo texto, y sería menos confiable que calcularla determinísticamente vía `git blame` en CI.

## Consecuencias

- Reemplaza el **mecanismo** de detección de ADR-0011 (BR-044 a BR-048, ahora supersedidas por BR-051 a BR-056). Las decisiones de ADR-0011 sobre deprecación de `sqlite` y `mysql` async-aware (BR-049/BR-050 y el fix del graphstore) **siguen vigentes sin cambios** — son ortogonales a este ADR, no las toca.
- Nueva superficie operativa: cada dev necesita `ANTHROPIC_API_KEY` configurada localmente para que el pre-commit invoque el LLM (antes, con ADR-0011, la credencial solo hacía falta en el secret de CI). Esto implica más máquinas con la credencial en circulación.
- Nueva dependencia de schema: 4 tablas nuevas en mysql (`inputs`, `outputs`, `entidades`, `casos_de_uso`), reemplazan las columnas JSON `endpoints`/`consumptions` de la tabla `systems`. No hay migración de datos porque sddkit no tiene todavía un grafo propio publicado.
- El grafo/herramienta de visualización de PR-bot que explotaría estas tablas queda fuera de alcance — motivación futura, no resuelto por este ADR.
