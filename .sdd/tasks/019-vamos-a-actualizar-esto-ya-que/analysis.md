# Analysis — tarea 019: convenciones por capa/módulo con progressive disclosure

> Presupuesto ≤ 350 palabras. El dev debe APROBARLO antes de especificar.

## Análisis crítico

- **Problema real que resuelve:** hoy TODA la convención vive en un único bloque global de `CLAUDE.md` (`buildBlock`, `src/lib/agentsmd.js:8` + `renderCatalogMd`, `src/lib/catalog.js:12`). El catálogo no tiene noción de scope: `{topic, chosen, legacy}` es repo-wide. En un repo grande el agente carga convenciones de capas que no está tocando, y no tiene forma de expresar "en controllers se hace X, en repositories Y".
- **¿Ya existe?** Parcialmente, y es la palanca clave: `componentGroups()` (`src/lib/c4.js:117`) ya agrupa archivos por módulo y `ROLES` (`c4.js:129`) ya mapea `controllers → Controladores`, `services → Lógica de negocio`, `repositories → Repositorios`, etc. La detección de capa está hecha; falta emitirla como doc scopeada.
- **Mecanismos reales de Claude Code** (verificado en docs oficiales, no supuesto):
  1. **`CLAUDE.md` anidado**: "files in subdirectories load on demand when Claude reads files in those directories". Es literal lo que pidió el dev. Contra: ensucia el árbol de fuentes del repo ajeno, y **no se re-inyecta después de `/compact`**.
  2. **`.claude/rules/*.md` con frontmatter `paths:`**: globs (`src/**/controllers/**`) que cargan solo al leer archivos que matchean. Todo queda bajo `.claude/`, mirroreable/desinstalable igual que las skills (BR-032), y cubre capas que NO son una carpeta física.
- **Alternativa más simple (80/20):** solo `.claude/rules/` generadas desde `componentGroups` + `ROLES`, sin tocar `catalog.json` ni `validate`. Da progressive disclosure real sin cambiar el modelo de datos del catálogo.
- **Supuestos del dev que podrían no ser ciertos:**
  - "capa = carpeta": en Java/Spring y en monorepos la capa suele ser `packages/*/src/main/java/**/controller/**`, no un dir de primer nivel. `componentGroups` solo mira **un** nivel bajo un **único** `srcRoot` (`c4.js:118`) → en monorepo agrupa por paquete, no por capa. Es el gap técnico más grande.
  - "monorepo detectado": `detectStack` solo lee `package.json → workspaces` (`src/lib/detect.js:38`). Sin soporte para pnpm-workspace.yaml, Nx/Turbo, Maven multi-módulo, `go.work`.
- **Riesgos:** (a) escribir archivos dentro del código del dev es invasivo y hay que sacarlo en `sdd uninstall` (`src/commands/uninstall.js:51` hoy solo borra `.sdd`, skills y la rule de Cursor); (b) duplicar en cada capa lo que ya dice `components.md` = drift garantizado; (c) generar 20 rules vacías con `❓ por validar` es ruido, no contexto.
- **¿Qué pasa si NO se hace?** sddkit escala mal: cuanto más grande el repo, menos útil su bloque global, que es justo donde más valdría.
- **Detección y manejo de fallas:** rules mal scopeadas fallan en silencio (nunca cargan). Verificable con el hook `InstructionsLoaded` y con `sdd doctor`/`validate` chequeando que cada glob matchee ≥1 archivo real.

**Recomendación:** `proceder con cambios` — el mecanismo correcto es `.claude/rules/` con `paths:` (o híbrido), no necesariamente `CLAUDE.md` anidado; y hay que resolver antes qué contenido lleva cada capa.

## Preguntas de clarificación

- [ ] P1: ¿Dónde viven las convenciones por capa? (a) `.claude/rules/*.md` con globs — centralizado, desinstalable, cubre capas no-carpeta; (b) `CLAUDE.md` anidado en cada carpeta — literal al pedido, visible para humanos, pero invasivo y se pierde tras `/compact`; (c) híbrido: rules por capa + `CLAUDE.md` por módulo de monorepo.
  - Respuesta: **(c) híbrido** — `.claude/rules/` con globs para las capas + `CLAUDE.md` por módulo de monorepo.
- [x] P2: ¿Qué contenido lleva el doc de una capa? Hoy el catálogo solo sabe de topics globales (`module-system`, `http-endpoints`, `test-naming`). Opciones: (a) responsabilidad + dependencias permitidas + convenciones locales, escritas por el dev/agente sobre un esqueleto generado; (b) además, scopear los topics del catálogo por módulo (`catalog.json` gana `scope`, y `validate` cuenta por scope).
  - Respuesta: **(a)** — esqueleto generado (responsabilidad + dependencias permitidas + hueco de convenciones locales). `catalog.json` y `validate` quedan repo-wide, SIN campo de scope: fuera de alcance de esta tarea.
- [x] P3: ¿Alcance de detección de capa en esta tarea? (a) solo primer nivel bajo `src/` (lo que ya hace `componentGroups`); (b) extender a capas anidadas y a monorepos multi-lenguaje (Maven, pnpm, go.work) — bastante más trabajo.
  - Respuesta: **(b)** — detectar módulos de monorepo (`package.json → workspaces`, `pnpm-workspace.yaml`, Maven/Gradle multi-módulo, `go.work`) y después las capas DENTRO de cada módulo. Sin paso interactivo de confirmación.
- [x] P4: ¿Los archivos generados se commitean al repo del dev y se regeneran con `sdd scan`/`sdd sync` (mirror, BR-032), o se generan una vez y quedan bajo custodia del dev?
  - Respuesta: **regeneración preservando lo manual** — mismo patrón que los docs C4 (`preserveManual`, `src/lib/c4.js:7`): sddkit regenera su parte, lo escrito bajo la marca manual sobrevive, y `sdd uninstall` los remueve.

## Métrica de impacto

- **Métrica:** tokens de contexto de instrucciones cargados al arranque, y % de convenciones cargadas que aplican al archivo que el agente está tocando.
- **Baseline actual:** bloque gestionado de `CLAUDE.md` = 100% de las convenciones cargadas siempre, en todos los repos (en sddkit mismo: 2 topics, ~30 líneas; el problema escala con el repo destino).
- **Resultado esperado:** el bloque global queda solo con lo transversal; las convenciones de capa cargan solo al tocar esa capa (0 tokens si no se toca).
- **Cómo se mide después:** `/context` (sección Memory files) + hook `InstructionsLoaded` sobre un repo de prueba con 3+ capas, comparando arranque vs. tras leer un controller.

---
_Aprobación del dev: pendiente_
