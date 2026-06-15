# Spec — tarea 006: En el setup es importante que me pregunte la ubicación del a…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Hoy, para usar el grafo de impacto (`sdd publish`/`sdd impact`/`sdd context`, Fase 1-3), el dev tiene que editar `.sdd/config.json` a mano agregando `"graph": {"driver": "sqlite", "sqlite": {"path": "..."}}` (o solo `{"driver":"sqlite"}` para el default `~/.sddkit/graph.db`). Nada en `sdd setup` — "el único comando" — menciona ni ofrece esta opción: la feature queda invisible salvo que el dev lea el README a fondo. Preguntarlo en `setup` la hace descubrible y la configura sin pasos manuales, coherente con "sin comandos manuales del dev".
- **¿Ya existe algo en el repo que lo resuelve total o parcialmente?** El driver sqlite YA tiene un default sensato (`resolveDbPath` en `src/lib/graphstore/sqlite.js` → `~/.sddkit/graph.db` si `sqlite.path` no está seteado). Lo que falta es el switch `graph.driver` en sí: hoy NINGÚN flujo de `init`/`setup` lo setea — `cfg.graph` queda `undefined` para siempre salvo edición manual.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí: activar `graph.driver: "sqlite"` con el path default (`~/.sddkit/graph.db`), SIN preguntar nada — ya es "cero-config" por diseño (ADR-0002). Pero esto NO cumple el pedido literal del dev ("que me pregunte la ubicación"), y activar el grafo por default es en sí un cambio de comportamiento de fondo (ver riesgos) que merece ser una decisión explícita, no un efecto colateral de "simplificar".
- **Supuestos del dev que podrían no ser ciertos:**
  - Que "el archivo de sqlite" = `graph.sqlite.path` (la DB del grafo de impacto). Es la única referencia a sqlite en `.sdd/config.json`, así que es la lectura más razonable, pero vale confirmarlo explícitamente.
  - Que preguntar la ubicación implica ACTIVAR el grafo (`graph.driver: "sqlite"`) para todo repo nuevo. Hoy esto es opt-in silencioso ("Sin configuración, todo degrada en silencio" — README). Convertirlo en algo que `setup` pregunta por default cambia ese comportamiento para TODOS los repos nuevos, no solo para quien ya conocía/quería la feature.
  - Que cada repo puede elegir su propio path independientemente. El valor del grafo es ser "central" (BR-014, cruza repos para "¿a quién impacto?"). Si cada `sdd setup` pregunta el path por repo y el dev pone valores distintos (o defaults distintos) sin darse cuenta, el grafo se fragmenta y `sdd impact` deja de ver el otro repo — silenciosamente.
- **Riesgos y efectos secundarios:**
  - **Hook post-commit ya instalado siempre** (`installPostCommit`, BR-023): hoy `sdd publish --hook` degrada en silencio porque `graph.driver !== 'sqlite'` (BR-024). Si `setup` activa `graph.driver: "sqlite"` por default, CADA commit en CADA repo nuevo empieza a publicar automáticamente al grafo local — antes no pasaba nada. Es "local" y silencioso en éxito (BR-026), pero es un cambio de comportamiento real, no documentado como tal.
  - **Dependencia opcional con bindings nativos** (ADR-0008, `better-sqlite3`): activar el driver por default aumenta cuántos repos/devs se topan con "Falta una dependencia opcional. Instalala con: npm i better-sqlite3" al correr `sdd publish` manualmente, aunque el hook post-commit ya degrada en silencio si falta (BR-025).
  - **Modo `--agent` / no interactivo**: `setup --agent` no puede hacer una pregunta de `readline`. Necesita una estrategia — default silencioso, o tratarlo como "decisión pendiente" (mismo patrón que `patterns.json` → `sdd decide`) para que el agente le pregunte al dev.
  - **Re-ejecución de `setup`**: si `cfg.graph` ya existe (de una corrida anterior, o editado a mano), no debería re-preguntar — mismo patrón que la pregunta de scope de skills (`!cfg0.skills`).
- **¿Qué pasa si NO se hace?** El dev sigue editando `.sdd/config.json` a mano para activar el grafo (fricción documentada, pero real). La feature de Fase 1-3 (con varias BRs y ADRs ya implementados) sigue sub-descubierta. Nada se rompe.

**Recomendación:** `proceder con cambios` — preguntar la ubicación tiene valor (descubribilidad de una feature ya construida), pero antes de implementar hay que decidir junto al dev: (1) si la pregunta es "¿activás el grafo? y si sí, ¿dónde?" (preservando opt-in) vs. "activalo siempre, elegí dónde" (cambia el default), (2) qué pasa en modo `--agent`, y (3) si re-preguntar cuando ya está configurado. Estas decisiones cambian el alcance del paso de implementación — van como preguntas de clarificación.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: Confirmás que "la ubicación del archivo de sqlite" se refiere a `.sdd/config.json → graph.sqlite.path` (la DB del grafo de impacto, Fase 1-3), ¿no a otra cosa?
  - Respuesta: Sí (asumido — única referencia a sqlite en el config; no objetado).
- [x] P2: ¿El wizard debe preguntar "¿querés activar el grafo de impacto (sqlite local)?" con la opción de declinar, o activar `graph.driver: "sqlite"` siempre y solo personalizar el path?
  - Respuesta: Activar siempre `graph.driver: "sqlite"` (alineado a ADR-0002, "default cero-config"); solo se pregunta el path, con default `~/.sddkit/graph.db` (Enter lo acepta).
- [x] P3: En modo `--agent` (no interactivo), ¿cómo se resuelve la ruta?
  - Respuesta: Default sin preguntar (`~/.sddkit/graph.db`, sin entrada en `sqlite.path` — mismo default que ya resuelve `resolveDbPath`). No se agrega como "decisión pendiente".
- [x] P4: Si `.sdd/config.json → graph` ya existe (corrida anterior o edición manual), ¿`setup` NO debe re-preguntar?
  - Respuesta: Sí (asumido — mismo patrón idempotente que el scope de skills `!cfg0.skills`; no objetado).
- [x] P5: ¿El wizard se limita a sqlite (MySQL sigue siendo edición manual)?
  - Respuesta: Sí, solo sqlite. MySQL sigue documentado en README como edición manual de `.sdd/config.json` + variable de entorno (BR-015).
- [x] P6: ¿El path sugerido por default debería ser el mismo en todas las máquinas (`~/.sddkit/graph.db`)?
  - Respuesta: Sí (asumido — coincide con el default ya existente en `resolveDbPath`; no objetado).

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** % de corridas de `sdd setup` desde cero que terminan con `.sdd/config.json → graph.driver === "sqlite"` y `graph.sqlite.path` seteado, sin edición manual del config.
- **Baseline actual:** 0% — hoy ningún flujo de `init`/`setup` escribe `graph`; requiere edición manual documentada en README ("Configuración: agregá a `.sdd/config.json` una clave `graph`...").
- **Resultado esperado:** 100% — todo `sdd setup` desde cero (interactivo o `--agent`/sin TTY) termina con `graph: {driver: "sqlite", sqlite: {path: ...}}`, con la ruta elegida por el dev o el default `~/.sddkit/graph.db`.
- **Cómo se mide después:** `src/commands/setup.test.js` — caso A: repo nuevo + `setup(root, {agent:true, ...})` → `readJSON('.sdd/config.json').graph` === `{driver:'sqlite', sqlite:{path:'~/.sddkit/graph.db'}}`. Caso B: repo con `cfg.graph` preexistente (sqlite o mysql) → tras `setup`, `cfg.graph` queda byte-a-byte igual (no se pregunta ni se pisa).

## Spec refinada

**Historia:** Como dev que corre `sdd setup` por primera vez en un repo, quiero que el wizard active el grafo de impacto local (SQLite) y me deje elegir (o aceptar un default) dónde vive el archivo, para no tener que descubrir y editar `.sdd/config.json` a mano antes de poder usar `sdd publish`/`sdd impact`/`sdd context`.

**Criterios de aceptación (formato EARS):**

- CUANDO `sdd setup` corre en modo interactivo (TTY, sin `--agent`) y `.sdd/config.json → graph` no está configurado, EL SISTEMA DEBE preguntar la ruta del archivo SQLite del grafo de impacto, mostrando `~/.sddkit/graph.db` como valor por default.
- CUANDO el dev responde esa pregunta con una cadena vacía (Enter), EL SISTEMA DEBE usar `~/.sddkit/graph.db` como ruta.
- CUANDO `sdd setup --agent` (o sin TTY) corre y `.sdd/config.json → graph` no está configurado, EL SISTEMA DEBE usar `~/.sddkit/graph.db` sin preguntar.
- CUANDO se determina la ruta (por respuesta interactiva o default), EL SISTEMA DEBE persistir `graph: {driver: "sqlite", sqlite: {path: <ruta>}}` en `.sdd/config.json` e imprimir una línea de confirmación con la ruta resuelta.
- SI `.sdd/config.json → graph` ya está configurado (cualquier `driver`, de una corrida anterior o edición manual), EL SISTEMA DEBE NO preguntar ni modificar `graph`.

**Reglas de negocio afectadas:** BR-035 (nueva, agregada a `.sdd/domain.md` en este cambio).

**Fuera de alcance:**

- `sdd init` y `sdd sync` corridos standalone no agregan ni migran `graph` — solo `sdd setup` lo hace (BR-035).
- Configuración de MySQL (`graph.mysql`): sigue siendo edición manual de `.sdd/config.json` + variable de entorno (BR-015), sin wizard.
- Validar que la ruta sea escribible/exista — ya lo maneja `createSqliteStore` (mkdir recursivo) en el primer `sdd publish`.
- Detectar/sugerir reusar un path de grafo ya configurado en otro repo de la misma máquina (riesgo de fragmentación mencionado en el análisis, pero fuera de esta tarea).
- Expansión de `~` en la ruta: ya la maneja `resolveDbPath` (sin cambios necesarios).

**Impacto en arquitectura/catálogo:**

- `src/commands/setup.js`: nuevo bloque de wizard (antes de `init()`, análogo al bloque existente de scope de skills) que determina la ruta, y escritura de `cfg.graph` (después de `init()`) si no existía.
- `.sdd/domain.md`: BR-035 agregada (este cambio).
- `README.md`, sección "Grafo de impacto": actualizar la frase "Sin configuración, todo lo que sigue degrada en silencio" — aclarar que `sdd setup` (desde esta versión) activa sqlite local por default con ruta configurable; MySQL sigue siendo manual.
- No requiere ADR nuevo: implementa el comportamiento ya decidido en ADR-0002 ("SQLite — default, cero-config, archivo local"); esta tarea es la pieza de wiring que faltaba.
- Nuevo archivo de test: `src/commands/setup.test.js` (no existía).

---
_Aprobación del dev: aprobado 2026-06-14_
