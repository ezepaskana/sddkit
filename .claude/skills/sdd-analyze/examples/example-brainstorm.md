# Ejemplo: brainstorm de diseño (read-only)

**Prompt del usuario:**

> `/sdd-analyze cómo podríamos hacer que las skills se actualicen automáticamente al hacer sdd sync sin perder customizaciones del usuario?`

---

## Contexto actual

Investigué cómo funciona `sdd sync` hoy:

- El comando copia las skills canónicas del paquete (`skills/`) hacia el proyecto del usuario (`.claude/skills/`) como un **mirror**: lo que está upstream pisa lo que está en destino.
- Es un mirror "ciego": no hace diff, no detecta si el usuario tocó un `SKILL.md`. Si el dev editó una skill para su repo, el próximo `sdd sync` la sobrescribe sin avisar.
- En `.sdd/LEARNINGS.md` ya hay registro de **drift**: cuando upstream y la copia local divergen, el sync silenciosamente gana upstream y se pierden ajustes locales. Hoy la única "protección" es no correr sync, lo cual rompe la propuesta de valor del comando (mantener las skills al día).

El problema de fondo: el mirror trata el destino como descartable, pero el usuario lo trata como editable. Hay que reconciliar esas dos visiones.

## Opciones

### Opción 1 — Merge-based sync (diff + merge)

Antes de copiar, hacer un 3-way merge: base (versión upstream anterior), upstream nuevo, local actual. Como `git merge` pero para los archivos de skills.

- **Pros**: preserva ediciones arbitrarias del usuario en cualquier parte del archivo; es el modelo mental conocido (merge de git).
- **Cons**: necesita guardar la versión base de cada skill para el 3-way (más estado); genera conflictos que el dev tiene que resolver a mano; complejidad alta para archivos que son prosa Markdown (los merges de texto libre son ruidosos).

### Opción 2 — Marker-based protection (bloques protegidos)

Definir bloques `<!-- user:start -->` ... `<!-- user:end -->` dentro de cada `SKILL.md`. El sync sobrescribe todo **menos** lo que esté entre marcadores.

- **Pros**: simple de implementar (parsear y reinyectar bloques); sin estado extra; el usuario sabe exactamente qué se preserva.
- **Cons**: el usuario solo puede customizar dentro de las zonas que upstream marcó de antemano; cambios fuera de los marcadores se pierden igual; ensucia el Markdown con comentarios HTML; si upstream reestructura el archivo, los marcadores pueden quedar huérfanos.

### Opción 3 — Override files + `.local` overlay

Upstream es **canónico e inmutable**: `sync` siempre pisa `skill-name/SKILL.md` sin preguntar. Las customizaciones del usuario van en un archivo aparte, `skill-name/SKILL.local.md`, que el sync **nunca toca** y que el loader concatena/superpone sobre el canónico.

- **Pros**: separación total y limpia (upstream nunca pierde, local nunca se pisa); cero conflictos; modelo de "config base + overlay" ya familiar (tipo `settings.json` + `settings.local.json` que el repo ya usa); fácil de razonar.
- **Cons**: el overlay solo puede agregar/anexar, no es trivial "editar en el lugar" una línea del canónico; requiere que el loader de skills entienda el overlay (cambio en cómo se cargan, no solo en sync).

## Recomendación

Iría por la **Opción 3 (override + `.local` overlay)**. Razones:

1. Es la única que da una garantía dura en ambos sentidos: upstream nunca pierde una actualización, local nunca pierde una customización. Las opciones 1 y 2 dejan casos donde el usuario igual pierde trabajo.
2. El repo **ya tiene** el patrón base+overlay para settings, así que es coherente con el modelo mental existente y con la convención de "lo canónico viene del paquete".
3. Evita por completo los conflictos, que en archivos de prosa Markdown (opción 1) serían frecuentes y molestos.

El costo real está en el loader de skills, no en el sync. Vale la pena confirmar cómo se cargan hoy las skills antes de comprometerse: si el loader es de Claude Code y no nuestro, la opción 3 podría no ser implementable y habría que caer a la 2.

## Pregunta de cierre

¿Las skills se cargan con un loader nuestro o directamente las lee Claude Code desde `.claude/skills/`? De eso depende si el overlay `.local` es viable o si conviene la protección por marcadores. Si querés, sigo investigando el loader antes de elegir.

> ¿Listo para implementar? Cuando definamos el enfoque, corré `/sdd-task` con esta descripción: "Hacer que `sdd sync` actualice las skills sin pisar customizaciones del usuario, vía \<opción elegida\>".
