# ADR 0016 — sddkit se distribuye como plugin de Claude Code y elimina su CLI

- **Fecha:** 2026-08-09 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/020-actualmente-el-dev-tiene-que-instalar

## Contexto

Adoptar sddkit exigía tres pasos manuales al dev: `npm link` (o instalación global), `sdd setup` para configurar el repo, y `sdd sync` cada vez que se actualizaba el paquete. Esa fricción hacía a sddkit inadoptable fuera de la máquina del autor.

Buena parte del CLI existía sólo para resolver ese problema: `setup.js`, `init.js`, `sync.js`, `uninstall.js` y `lib/skills.js` (~450 líneas) reimplementan a mano la copia, versionado y desinstalación de skills — exactamente lo que el plugin manager de Claude Code ya hace de forma nativa.

El resto del CLI (12.071 líneas entre `bin/` y `src/`) se dividía en tres grupos: comandos deterministas ejecutados por git hooks sin agente presente (`validate`, `scan`, `docs`, `publish`), la máquina de estados de tareas (`task *`), y destiladores de contexto (`context`, `find`, `doctor`, `decide`).

## Decisión

Eliminar el CLI por completo y distribuir sddkit exclusivamente como plugin de Claude Code (`.claude-plugin/plugin.json` + `marketplace.json`), con contenido de markdown y templates: instalarlo no requiere Node ni ninguna otra runtime. La detección de un repo sin configurar pasa a un hook `SessionStart` que inyecta instrucciones al agente (BR-079, BR-080).

## Alternativas consideradas

- **Embeber el CLI dentro del plugin** e invocarlo como `node "$CLAUDE_PLUGIN_ROOT/bin/sdd.js"`. Conservaba todos los gates deterministas y sólo cambiaba la forma de invocación. Descartada: mantiene la dependencia de Node y ~12k líneas de código cuyo valor real había que demostrar caso por caso.
- **Scripts sueltos en el plugin** (`scripts/*.mjs`) para las capacidades que un agente hace mal: conteo de variantes de patrones y validación. Descartada por ahora, no por ser incorrecta: se prefiere partir de cero y reconstruir sólo lo que la práctica demuestre necesario.
- **Publicar de verdad en npm** (`npm i -g sddkit`). Descartada: no elimina el paso manual del dev, que es el requisito.
- **Detectar la falta de configuración desde la descripción de las skills**, sin hook. Descartada: depende de que el modelo dispare la skill, y el requisito es que el dev no haga absolutamente nada.

## Consecuencias

**Se gana:** cero pasos manuales para el dev; actualizaciones por el plugin manager; sin dependencia de Node; el repo pasa de ~12k líneas de JS a markdown.

**Se sacrifica — y esto es lo importante de este ADR.** Tres garantías deterministas dejan de existir y pasan a depender del criterio del agente:

1. **Conteo de variantes de patrones** (`src/lib/patterns.js`). Es lo que producía "esm: 25 archivos vs cjs: 1" y sostenía tanto el catálogo de convenciones como el *ratchet* de deuda legacy (la variante no canónica puede bajar pero nunca crecer). Sin él no hay baseline numérico que defender.
2. **Validación bloqueante en pre-commit** (`sdd validate`, exit 1). Cubría drift entre `components.md` y el repo, placeholders sin responder, bullets de LEARNINGS sobre 200 caracteres y bloques Mermaid sin tipo declarado. Corría en cada commit, incluso fuera de Claude.
3. **Verificación de paso por exit code** (`sdd task verify`), más los gates de rama obligatoria y retro obligatoria. Convertían "el subagente dice que anda" en una prueba.

La diferencia es de naturaleza, no de grado: **un exit 1 no es negociable; una instrucción en un SKILL.md sí.** Un agente puede razonar que una regla no aplica a su caso. Esta decisión asume ese riesgo de forma consciente.

**Condición de reversión:** si en la práctica aparecen commits con drift no detectado, deuda legacy que crece en silencio, o pasos marcados como completos sin verificar, reintroducir esas tres capacidades como scripts invocados desde hooks del plugin (`PreToolUse`, `Stop`) — no como un CLI que el dev deba instalar. La alternativa "scripts sueltos" de arriba es el camino de vuelta, y se descartó por ahora, no por siempre.

**Deuda inmediata:** 21 de las 81 reglas de negocio de `.sdd/domain.md` citan comandos que dejan de existir y deben reescribirse o derogarse (BR-081).
