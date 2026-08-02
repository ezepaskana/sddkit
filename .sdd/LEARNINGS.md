# Aprendizajes del proyecto

> Memoria curada del repo, alimentada por las retros de cada tarea (`.sdd/tasks/*/retro.md`). **Los agentes DEBEN leer este archivo antes de implementar** y actualizarlo al cerrar cada tarea.

> Reglas de curado (responsabilidad del agente que cierra una tarea): entradas accionables y específicas, nunca genéricas; fusionar las similares; podar las obsoletas; **máximo ~30 entradas**, **cada bullet ≤ 200 caracteres** (`sdd validate` lo chequea) — condensá, no narres.

## Gotchas y convenciones aprendidas

- **`node --test` corre `src/commands/test.js` como suite vacía** (matchea el patrón default). Si se agrega un `sdd test` real, excluirlo. _(tarea 001)_
- **Detectores de "llamada HTTP" deben anclar a símbolo de framework inequívoco** (`.uri(`, `restTemplate`, `webClient`), nunca a `.get(`/`.post(` sueltos (falsos positivos en Java). _(tarea 001)_
- **`env:VAR` (BR-009) en JS/TS solo resuelve template con segmento literal + identificador directo**; no cubre interpolación 100% ni expresiones derivadas. Extender en `resolveTarget`. _(tarea 001)_
- **`graphstore/index.js::wrap()` asume store síncrono**: `mysql.js` es async y sin `await` en `wrap()`, `querySystem` devuelve Promise sin resolver. Falta `wrap()` async-aware. _(tarea 002)_
- **Repos piloto con `.sdd/` parcial** (solo `sdd scan`, sin `config.json`): `context()` tira si falta `cfg`; `publish`/`impact` degradan bien. Verificar `config.json` antes. _(tarea 002)_
- **Strings citados literalmente en EARS/domain.md son contrato**: verificar carácter por carácter, no solo "misma idea" — una variante equivalente puede romper el contrato. _(tarea 002)_
- **Skills divergen entre `skills/` (repo) y `~/.claude/skills/` (global)**: un cambio en una sola copia es invisible en la otra. Diffear ambas al tocar `skills/*/SKILL.md`. _(tareas 003, 006)_
- **Al escribir el plan, recalcular explícitamente los conteos que luego son `assert.equal` de una fixture** — un valor "razonable" a ojo puede no coincidir con el real. _(tarea 003)_
- **`stepBlock` (`task.js`) solo sigue líneas indentadas `- ` o `N. `**: un paso con sub-lista en otro formato (`a)`) trunca antes de `Verificación:` y rompe `task brief`/`verify`. _(tarea 004)_
- **Los ejemplos de las skills fijan el estándar que el agente copia**: para cambiar el estilo/largo de la salida, recortá los ejemplos y templates, no solo las instrucciones. _(tarea 011)_
- **`grep "not ok"` sobre `node --test` exige `--test-reporter=tap`**: al pipear, Node ≥20 usa el reporter spec (✔/✖) y el grep no matchea aunque haya fallos reales. _(tarea 011)_
- **El renumerado de `sdd task plan` no actualiza los "Depende de"**: tras insertar el Paso 1 de rama, revisar que las referencias entre pasos no queden desfasadas en uno. _(tarea 011)_
- **Patrón "capa fina sobre `init`"**: `init(root, flags)` retorna `{actions, skipped}` y respeta `flags.silent`; comandos delgados (`sync.js`) lo llaman así y arman su propio resumen sobre `actions`.
- **"¿Está al día?" no es solo comparar `version`**: si `init` puede mutar otros campos sin bumpear versión (BR-029), chequear también `actions` — o "ya al día" puede ser falso. _(tarea 005)_
- **Gate de cierre falla si el título de la tarea supera 60 chars**: el `…` truncado del header en `retro.md` se confunde con placeholder sin completar. Evitar `…`. _(tareas 005-008)_
- **Extractores de tablas Markdown multi-sección: acotar siempre a la primera sección** (`split(/^#{2,3}\s/m)[0]`) para no matchear tablas de secciones secundarias/manuales. _(tarea 008)_
- **Patrón "generar solo si no existe" (`upsertGenerated`, BR-037)**: el fix correcto es "si existe, no-op total" — nunca merge sección-por-sección, o se pierde el esqueleto curado. _(tarea 008)_
- **Patrón "wizard condicional de `setup`" para campo opcional nuevo**: leer `cfg0` antes de `init()`; si falta, preguntar o usar default (`--agent`); después, persistir y confirmar. _(tarea 006)_
- **Degradación elegante > error bloqueante**: para tools externos opcionales (`gh`/`az`/`gl`), detectar disponibilidad, usar si existe, degradar a instrucciones manuales si no (BR-041). _(tarea 010)_
- **Versionar configuración desde el inicio**: histórico `{versions:[...], active: idx}` desde v1 es más fácil que agregarlo después. Ver `.sdd/branching.md`. _(tarea 010)_
- **Separar inyección de contenido de plans en módulo reutilizable** (`plan-generator.js`): testeable, reusable, sin lógica de strings en comandos. _(tarea 010)_
- **E2E con repos git temporales dentro de tests**: valida flujos completos sin efectos secundarios en el repo real (`e2e.test.js`). _(tarea 010)_
- **`spawnSync(cmd, args, {...})` SIN `shell:true` para args con input variable**: array de args literales elimina command injection; escapar comillas no alcanza. _(tarea 011)_
- **No escribas los literales `Verificación:`/`cmd:` en la PROSA de un paso de `plan.md`**: `task verify` toma la 1ra ocurrencia y una mención en prosa la secuestra. _(tarea 011)_
- **Antes de bumpear `version`, `grep` el valor nuevo en `src/`**: tests de migración pueden hardcodear esa versión como sentinela "vieja". Usar sentinelas inalcanzables. _(tarea 012)_
- **Textos estándar largos con cláusulas sensibles (`CODE_OF_CONDUCT.md`) pueden disparar el content-filter de un worker chico**: si se corta, el orquestador lo escribe directo. _(tarea 012)_
- **Un fix "tolerar ausencia de optionalDependency" se verifica CORRIENDO sin esa dependencia**, no solo con ella presente — mover/renombrar el módulo y correr el suite. _(tarea 001-CI)_
- **Tests de comandos que abren un recurso opcional internamente necesitan el guard de skip ANTES de invocar el comando**: probe a nivel módulo con `import()` dinámico + `t.skip`. _(tarea 001-CI)_
- **El PR (o artefacto "cerrable") debe ser el ÚLTIMO paso**: crearlo antes de commitear retro/LEARNINGS deja artefactos de cierre huérfanos tras el merge. _(tarea 007)_
- **Si una tarea modifica una skill usada en la misma sesión, el orquestador puede tener la versión vieja cacheada** — seguir el flujo ya conocido en vez de depender del reload. _(tarea 006)_
- **Triggers de skills por lista cerrada de keywords son frágiles en español**: incluir siempre un fallback de "preguntar al usuario" cuando el clasificador no esté seguro. _(tarea 002-triggers)_
- **Nunca commitear un `.npmrc` de proyecto con `prefix=<ruta absoluta>`**: rompe en otra máquina y npm moderno lo prohíbe. El prefix va en config de usuario/máquina. _(tarea 008)_
- **`createRequire(import.meta.url)` es el fix canónico para `optionalDependencies` en paquetes ESM globales**: la resolución CJS traversa donde `import()` ESM no llega. _(tarea 008)_
- **El gate de `sdd task status done` rechaza retro.md con `…`**: no copies el título truncado de la tarea al encabezado de la retro — usá un título propio sin puntos suspensivos. _(tarea 016)_

## Decisiones de producto/dominio aprendidas

- **Matching `exacto`/`posible` de `sdd impact` (BR-014) validado end-to-end**: `posible` (sufijo de ruta, `env:VAR` stripeado) es el caso más común mientras `env:*` no se resuelva. _(tarea 002)_
- **Scanner de Terraform (BR-017 a BR-022) validado end-to-end con fixture sintética**: 11 casos coinciden 100%. `sdd impact <recurso>` matchea `from` y `to` de `infraEdges`. _(tarea 003)_
</content>
