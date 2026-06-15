# Retro — tarea 006: configuración de graph.sqlite.path en sdd setup

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-15.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** 0% — ningún flujo de `init`/`setup` escribía `graph`; requería edición manual documentada en README.
- **Resultado medido después:** 100% — `sdd setup` (interactivo o `--agent`/sin TTY) ahora siempre termina con `graph: {driver:'sqlite', sqlite:{path:...}}` cuando no estaba configurado, con la ruta elegida por el dev o el default `~/.sddkit/graph.db`. Validado por los 3 casos de `src/commands/setup.test.js` (repo nuevo → graph default; graph mysql preexistente y graph sqlite preexistente sin `sqlite.path` quedan intactos) y por un smoke test manual con `sdd setup --agent` en un repo temporal, que confirmó la línea `✓ Grafo de impacto: sqlite local → ~/.sddkit/graph.db` y el `.sdd/config.json` resultante.
- **¿Se cumplió lo esperado?:** Sí.

## Qué anticipó bien la spec y qué no

Bien: el plan propuso replicar el patrón del bloque existente de scope de skills (líneas ~23-41 de `setup.js`) — mismo check `!cfg0?.graph`, mismo split interactivo/no-interactivo con `readline` y mismo estilo de mensaje informativo en modo agente. Resultó directamente reusable, sin fricción.

No anticipado (sin impacto): el plan decía "DESPUÉS de `init()`" para la escritura de `cfg.graph`, sin precisar el orden relativo a `scan()`. El worker la ubicó entre `init()` y `scan()`, lo cual es correcto (scan no depende de `graph`) y no requirió ajuste.

## Desvíos del plan

Ninguno en los 4 pasos (orden y alcance ejecutados tal cual el plan aprobado). Único ajuste, fuera del plan de implementación: al generar este retro.md, el título truncado por `sdd task` incluía el carácter de elipsis (gotcha ya documentado en LEARNINGS de la tarea 005, que hace fallar el gate `sdd task status <id> done`); se reescribió el título sin ese carácter antes de cerrar.

## Aprendizajes accionables

- **Patrón "wizard condicional de setup" confirmado y replicable**: para cualquier nuevo campo opcional de `.sdd/config.json` que `setup` deba ofrecer, alcanza con: (1) leer `cfg0` antes de `init()`, (2) si el campo no existe, preguntar con `readline` en modo interactivo / usar un default e imprimir una línea informativa en modo agente, (3) después de `init()`, releer `.sdd/config.json`, setear el campo con `writeJSON` e imprimir una línea `✓ <Campo>: <valor>`. Es el mismo esqueleto del bloque de scope de skills y del nuevo bloque de `graph.sqlite.path`.
- El gotcha del carácter de elipsis en el título de `retro.md` (tarea 005) volvió a aparecer. Sigue sin arreglarse el check real en `task.js`; si reaparece una tercera vez vale la pena arreglarlo de raíz en lugar de seguir reescribiendo títulos.

## ¿Algo para el catálogo, el dominio o la arquitectura?

BR-035 ya fue agregada a `.sdd/domain.md` durante la fase de spec (no requiere acción adicional). Sin convenciones nuevas, sin ADR nuevo (implementa ADR-0002 ya existente), sin cambios estructurales en `.sdd/c4/` más allá de lo ya descrito en spec.md.
