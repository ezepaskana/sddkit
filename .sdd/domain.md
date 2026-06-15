# Dominio y lógica de negocio — sddkit

> Generado por sddkit el 2026-06-15. Complemento del C4: `.sdd/c4/` dice CÓMO está construido el sistema; este archivo dice QUÉ reglas gobiernan el negocio y QUÉ significan los términos. **Las reglas de negocio son vinculantes para los agentes, igual que el catálogo de convenciones.** Las specs deben citar las reglas afectadas por su ID (BR-NNN).

## Glosario (lenguaje del dominio)

> Términos que en este negocio significan algo específico. Evita que cada agente invente su propia interpretación.

| Término | Significado en este sistema |
|---|---|
| _(completar)_ | … |

## Entidades principales

> Qué son y qué relación tienen entre sí (no su estructura técnica — eso está en el código).

_(no se detectaron candidatos automáticamente — completar desde el código y la documentación)_

## Reglas de negocio

> Numeradas y citables (BR-001, BR-002…). Cada regla: condición + comportamiento obligado + de dónde sale (doc, dev, código). Si una tarea cambia una regla, este archivo se actualiza en el mismo cambio.

- **BR-001** — _(ejemplo de formato: "Una planta sin medidor activo no puede generar facturación. Fuente: doc/negocio.md")_ ❓ completar
- **BR-023** — "Cuando se corre `sdd setup`/`sdd init` en un repo con `.git`, el sistema instala (además del pre-commit existente) un hook post-commit que ejecuta `sdd publish --hook || true`, sin pisar hooks post-commit existentes (agrega al final, mismo patrón no destructivo que `installPreCommit`, vía nueva `installPostCommit` en `src/lib/hooks.js`)". Fuente: tarea 004.
- **BR-024** — "Cuando se ejecuta `sdd publish --hook` y `.sdd/config.json → graph.driver` no es `\"sqlite\"` (no configurado, o `\"mysql\"`), o `.sdd/config.json → hooks.autoPublish === false`, el sistema termina sin publicar y sin imprimir nada (exit 0) — preserva ADR-0003 sin cambios para `mysql` (ver ADR-0010)". Fuente: tarea 004.
- **BR-025** — "Si `sdd publish --hook` corre con `graph.driver === \"sqlite\"` y `hooks.autoPublish !== false`, pero el gate de calidad (BR-013, checkboxes `- [ ]` pendientes en `.sdd/c4/`) rechaza la publicación o falta la dependencia opcional `better-sqlite3` (ADR-0008), el sistema degrada en silencio (sin imprimir nada, exit 0) — el dev puede diagnosticar con `sdd publish`/`sdd doctor`, que sí muestran el detalle". Fuente: tarea 004.
- **BR-026** — "Cuando `sdd publish --hook` publica exitosamente (mismas condiciones de éxito que `sdd publish` manual, BR-013), el sistema imprime una línea corta de confirmación con nombre canónico, hash corto y timestamp (p.ej. `✓ grafo local actualizado (sqlite) → commit <hash corto> @ <timestamp>`)". Fuente: tarea 004.
- **BR-027** — "Cuando se corre `sdd doctor`, el sistema reporta el estado del hook post-commit (instalado / ausente — sugiere `sdd setup` / desactivado por `hooks.autoPublish === false`), análogo al reporte existente del pre-commit". Fuente: tarea 004.
- **BR-028** — "Cuando se corre `sdd uninstall`, el sistema remueve la línea del hook post-commit agregada por sddkit (o el archivo `.git/hooks/post-commit` completo si era solo de sddkit), análogo al manejo existente de pre-commit". Fuente: tarea 004.
- **BR-029** — "Cuando `sdd init`/`sdd setup` crea o migra `.sdd/config.json`, el sistema incluye `hooks.autoPublish: true` junto a `hooks.preCommit: true` (configs existentes sin el campo se migran agregándolo)". Fuente: tarea 004.
- **BR-030** — "Cuando se corre `sdd sync` en un repo SIN `.sdd/config.json`, el sistema informa que el repo no está inicializado, sugiere `sdd setup`, y no crea ni modifica ningún archivo". Fuente: tarea 005.
- **BR-031** — "Cuando se corre `sdd sync` en un repo CON `.sdd/config.json`, el sistema ejecuta el equivalente de `sdd init` (migración de config, regeneración del bloque gestionado de AGENTS.md, reinstalación/actualización de skills `sdd-*` en el scope de `cfg.skills`, reinstalación/migración de hooks pre-commit y post-commit, rule de Cursor si aplica) SIN correr `scan` ni el wizard de convenciones, e imprime un resumen con la transición de versión: `vANTERIOR → vNUEVA` (o "ya estás al día en vX.Y.Z" si `cfg.version === VERSION` antes de sincronizar); si `cfg.version === VERSION` pero `init` migró `.sdd/config.json` igual (p.ej. BR-029), el resumen indica que el config fue migrado en lugar de "ya estás al día"". Fuente: tarea 005.
- **BR-032** — "Cuando `installSkills` actualiza una carpeta `sdd-*` que ya existe en el destino, el sistema la deja idéntica a la carpeta correspondiente del paquete instalado — incluyendo eliminar del destino cualquier archivo/subcarpeta que ya no exista en el paquete (mirror real, no merge). Aplica a `sync`, `init` y `setup` por igual (misma función compartida)". Fuente: tarea 005.
- **BR-033** — "Cuando `cfg.skills === 'global'`, el sistema imprime un aviso explícito indicando que se actualizaron las skills GLOBALES (`~/.claude/skills/sdd-*`), compartidas por todos los repos de la máquina". Fuente: tarea 005.
- **BR-034** — "Cuando `sdd doctor` detecta `config.version !== VERSION`, hooks pre-commit/post-commit ausentes, o skills `sdd-*` faltantes/desactualizadas en el scope configurado, el sistema sugiere `sdd sync` (no `sdd setup`) como remedio. La advertencia de `sdd-bootstrap` global (instalada solo por `setup`) sigue sugiriendo `sdd setup`". Fuente: tarea 005.
- **BR-035** — "Cuando `sdd setup` corre en un repo cuyo `.sdd/config.json` no tiene `graph` configurado, el sistema activa `graph.driver: \"sqlite\"` y persiste la ruta del archivo en `graph.sqlite.path`: en modo interactivo (TTY, sin `--agent`) pregunta la ruta mostrando `~/.sddkit/graph.db` como default (Enter o respuesta vacía la acepta); en modo `--agent`/sin TTY usa ese default sin preguntar. Si `graph` ya está configurado (driver `sqlite` o `mysql`, de una corrida anterior o edición manual), no pregunta ni modifica nada. `sdd init`/`sdd sync` standalone no agregan ni migran `graph`". Fuente: tarea 006.
- **BR-036** — "Cuando se genera o regenera el bloque gestionado de AGENTS.md (vía `sdd init`, `sdd scan`, `sdd setup` o `sdd decide`, a través de `buildBlock`/`upsertAgentsMd` en `src/lib/agentsmd.js`), el sistema incluye, como primera sección del bloque (antes de `## Arquitectura (modelo C4 vivo)`), una sección `## Ante dudas o incongruencias: preguntale al dev` que habilita y, ante incongruencias genuinas (requisito que contradice el código, instrucción que violaría el catálogo o una BR-NNN/ADR, información faltante o ambigua, o algo que no tiene sentido), obliga al agente a frenar y preguntarle al dev antes de avanzar con una suposición — sin afectar decisiones menores resolubles con buen juicio normal". Fuente: tarea 007.
- **BR-037** — "Cuando `sdd scan` corre, genera `.sdd/c4/{context,containers,components}.md` y `.sdd/domain.md` SOLO si el archivo todavía no existe; si ya existe, lo deja sin modificar — preserva cualquier contenido agregado o editado arriba de `<!-- sdd:manual -->` (BR-NNN, checkboxes VALIDAR, glosario, entidades) entre corridas". Fuente: tarea 008.
- **BR-038** — "Cuando `sdd task verify <id> <paso>` parsea la línea `Verificación:` de `plan.md`, si el valor está envuelto en un code span (`` `cmd: ...` ``, con o sin texto adicional después del cierre), el sistema extrae el contenido del code span antes de chequear el prefijo `cmd:` — así `Verificación: cmd: <comando>` y `` Verificación: `cmd: <comando>` `` (con o sin prosa final) ejecutan el comando literal (exit code = resultado), en vez de degradar siempre a verificación manual (exit 3)". Fuente: fix directo post-tarea 009 (retro).
- **BR-039** — "Toda tarea SDD que modifica código DEBE ejecutarse en una rama dedicada (no en `main`/`develop`). La rama se crea automáticamente en `sdd task execute` Paso 1 (`git checkout -b <rama>`, auto-generado por `sdd task plan` según `.sdd/branching.md`); si el Paso 1 falla o la rama activa resultante no coincide con la esperada, la ejecución se detiene y los pasos 2+ no corren (gate bloqueante, `runExecuteGate` en `src/commands/execute.js`)". Fuente: tarea 010.
- **BR-040** — "La política de branching de un proyecto se define una sola vez en `.sdd/branching.md` (creado por `sdd init`/`sdd setup`, vía `ensureBranchingPolicy` en `src/lib/branching.js`); si el archivo ya existe, no se pregunta de nuevo ni se sobrescribe. El archivo versiona el histórico de cambios de política en un array `versions` (cada entrada con `date`, `author`, `convención`, `flujo`, `patrón`) más un índice `active` que apunta a la versión vigente; cambios futuros a la política se documentan agregando una nueva entrada a `versions` con timestamp y autor, sin borrar las anteriores". Fuente: tarea 010.
- **BR-041** — "Cuando `sdd task close <id>` crea un PR, el sistema verifica primero que la rama actual está pusheada a `origin` (`verifyBranchPushed`); si no lo está, avisa y no intenta nada más. Si está pusheada, detecta la plataforma del remoto `origin` (`detectGitPlatform`: GitHub, Azure DevOps, GitLab o `unknown`) e intenta usar el tool nativo correspondiente (`gh`, `az`, `gl`) vía `buildPRCommand`/`isPRToolAvailable`. SI el tool no está instalado, no está disponible, o la plataforma es `unknown`, el sistema DEBE degradar a `buildManualPRInstructions` (\"PR ready to create manually\" + URL/instrucción) SIN fallar — el reporte final siempre documenta `# PR: …` y termina con `# Próximo: revisión manual y merge del PR (no automático)`". Fuente: tarea 010. _Nota (tarea 011): `buildPRCommand` ahora devuelve `{cmd, args}` (no un string) y la ejecución del comando de PR usa `spawnSync` SIN shell, pasando title/body/rama/base como argumentos literales (defensa contra inyección de shell). El contrato de degradación a `buildManualPRInstructions` y el reporte `# PR: …` quedan intactos._
- **BR-042** — "Los commits dentro de una tarea SDD DEBEN seguir la convención de commits definida en `.sdd/branching.md` (campo `convención`: Conventional Commits, Semantic Commit Messages, Gitmoji, u otra). sddkit NO fuerza esta convención con hooks (fuera de alcance Fase 1): `sdd task verify`/`sdd task close` pueden avisar (warning, no bloqueante) si detectan commits que no siguen el patrón esperado, documentándolo en el reporte de cierre". Fuente: tarea 010.

## Flujos clave del negocio

> Los 3-5 recorridos que explican el sistema (qué pasa cuándo, en términos de negocio — no de código).

- [ ] ❓ ¿Cuáles son los flujos principales? (p.ej. alta de cliente → activación → primera medición → facturación)

## ❓ VALIDAR con el equipo

- [ ] ¿El glosario cubre los términos que un dev nuevo malinterpretaría?
- [ ] ¿Las reglas de negocio listadas son todas las vigentes? ¿Falta alguna que hoy solo vive en la cabeza de alguien?

<!-- sdd:manual — todo lo que está debajo de esta línea se preserva en regeneraciones -->

## Notas del equipo

_(esta sección no se pisa al regenerar)_
