# ADR 0015 — Progressive disclosure híbrido: rules por capa + CLAUDE.md por módulo

- **Fecha:** 2026-08-05 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/019-vamos-a-actualizar-esto-ya-que

## Contexto

Hasta esta decisión, TODA la convención que sddkit le da al agente vivía en un único bloque gestionado en el `CLAUDE.md` de la raíz (`buildBlock`, `src/lib/agentsmd.js`), alimentado por un catálogo repo-wide (`.sdd/catalog.json`, sin noción de scope). Eso tiene dos costos que crecen con el tamaño del repo:

1. El agente carga en cada sesión convenciones de capas que no va a tocar.
2. No hay forma de expresar "en controllers se hace X, en repositories se hace Y", ni de darle a cada módulo de un monorepo su responsabilidad.

Claude Code ofrece dos mecanismos de carga bajo demanda (docs oficiales, verificados en la tarea 019):

- **`CLAUDE.md` anidado**: los archivos en subdirectorios "load on demand when Claude reads files in those directories".
- **`.claude/rules/*.md` con frontmatter `paths:`**: reglas scopeadas por glob que "only load into context when Claude works with matching files".

## Decisión

Usar **los dos, cada uno para lo que es bueno**: las convenciones de **capa** se generan como rules con `paths:` en `.claude/rules/sdd-layer-<capa>.md`, y la responsabilidad de cada **módulo** de un monorepo como `CLAUDE.md` en la raíz de ese módulo. El bloque global deja de ser el único lugar y pasa a declarar dónde vive lo específico (BR-077).

## Alternativas consideradas

- **Solo `CLAUDE.md` anidado en cada carpeta de capa** (lo que pidió literalmente el dev). Descartada como mecanismo único: una capa suele estar en varios módulos (`packages/*/src/controllers`), lo que obliga a duplicar el mismo doc N veces; ensucia el árbol de fuentes del repo del dev con archivos por todos lados; y los `CLAUDE.md` anidados **no se re-inyectan después de un `/compact`**, mientras que las rules path-scoped se re-evalúan al leer un archivo que matchea.
- **Solo rules con `paths:`**. Descartada como mecanismo único porque la responsabilidad de un módulo de monorepo es información que el humano quiere encontrar abriendo la carpeta del módulo, no escondida en `.claude/rules/`; y porque en un monorepo con `claudeMdExcludes` de otros equipos, el `CLAUDE.md` del módulo propio sigue siendo el lugar natural.
- **Dar scope por capa al catálogo (`catalog.json` + `sdd validate`)**. Postergada, no descartada: daría enforcement real por capa en el pre-commit, pero cambia el modelo de datos del catálogo y el comando `validate`. La tarea 019 la dejó explícitamente fuera de alcance; las rules generadas hoy son un esqueleto para que el dev/agente escriba, no una regla enforceada.

## Consecuencias

- **Se gana:** el contexto de arranque no crece con el repo; una convención de capa se escribe una vez y aplica en todos los módulos donde esa capa existe; el `CLAUDE.md` global vuelve a ser corto (446 palabras, bajo el tope de 450 de BR-059).
- **Se sacrifica:** sddkit ahora escribe archivos FUERA de `.sdd/` en el repo del dev (`.claude/rules/` y `CLAUDE.md` de módulo). Eso obliga a que `sdd uninstall` los sepa remover (BR-075) y a que la regeneración preserve lo manual (BR-074).
- **Deuda asumida:** una capa se detecta por el NOMBRE del directorio (mapa `ROLES`, `src/lib/c4.js`). Un repo que organiza por feature (`src/plants/{controller,service}.js`) o que usa nombres propios no va a generar rules útiles hasta que se amplíe el mapa. Las dependencias permitidas que se generan son un esqueleto marcado `❓ VALIDAR`, derivado de un orden de capas por defecto: no son verdad hasta que alguien las confirme.
- **Se vuelve más difícil:** razonar sobre "qué instrucciones tiene el agente" de un vistazo, porque ahora están repartidas. Mitigado por BR-076 (`sdd validate` avisa de rules muertas) y por la sección nueva del bloque global, que dice dónde buscar.
