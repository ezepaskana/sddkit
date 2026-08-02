# Ejemplo: brainstorm de diseño (standalone, read-only)

> `/sdd-analyze ¿cómo podríamos hacer que las skills se actualicen con sdd sync sin perder customizaciones del usuario?`

## Contexto actual

`sdd sync` copia `skills/` del paquete a `.claude/skills/` como **mirror ciego** (`src/lib/skills.js:installSkills`): borra el destino y copia. No hace diff ni detecta ediciones locales, así que cualquier ajuste del dev se pierde sin aviso. LEARNINGS ya registra ese drift, y hoy la única protección es no correr sync — lo que anula el valor del comando. El fondo: el mirror trata el destino como descartable y el dev lo trata como editable.

## Opciones

**A. 3-way merge (base/upstream/local).**
- Pros: preserva ediciones arbitrarias; modelo mental de git.
- Contras: hay que guardar la versión base (estado extra); conflictos a resolver a mano, ruidosos en prosa Markdown.

**B. Bloques protegidos (`<!-- user:start/end -->`).**
- Pros: simple, sin estado extra, el dev ve qué se preserva.
- Contras: solo se puede customizar donde upstream marcó; si upstream reestructura, los marcadores quedan huérfanos.

**C. Overlay `SKILL.local.md` (upstream inmutable).**
- Pros: garantía en ambos sentidos (upstream nunca pierde, local nunca se pisa); cero conflictos; el repo ya usa base+overlay en `settings.json`/`settings.local.json`.
- Contras: el overlay agrega, no edita en el lugar; requiere que el loader lo entienda.

## Recomendación

**C.** Es la única con garantía dura para los dos lados, y es coherente con el patrón base+overlay que el repo ya usa. A y B dejan casos donde el dev pierde trabajo. El costo real está en el loader, no en sync.

## Pregunta de cierre

¿Las skills las lee Claude Code directo de `.claude/skills/` o hay loader nuestro? Si es lo primero, C no es implementable y caemos a B.

> ¿Listo para implementar? Corré `/sdd-task` con: "que `sdd sync` actualice skills sin pisar customizaciones, vía \<opción elegida\>".
