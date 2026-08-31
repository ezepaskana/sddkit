# Design — tarea 024: Dale con la 1, redactá bootstrap.md en serio

## Impacto en arquitectura y catálogo

Aparece un componente nuevo en `.sdd/c4/components.md`: la skill `sdd-bootstrap`, primera skill `sdd-*` **fuera del flujo de tareas** (no la invoca `sdd-task`, la invoca el hook). El resto del C4 no se mueve: no hay contenedor nuevo ni integración externa nueva. Catálogo: sin impacto (el repo no tiene topics; es markdown y JSON, ADR-0016).

**ADR:** no hace falta uno nuevo. ADR-0016 sigue vigente y esto no lo contradice — la skill no ejecuta nada, la lee el agente. Sí hay que reescribir BR-080, porque hoy dice que `bootstrap.md` lleva "instrucciones de qué investigar" y pasa a llevar solo el ofrecimiento.

`CLAUDE.md` de la raíz **no se toca**: no enumera las skills, solo dice que el detalle vive en las `sdd-*`. `README.md` sí (dice "las 7 skills `sdd-*`").

## Archivos por área

| Área | Archivos |
|---|---|
| Hook | `hooks/bootstrap.md` (reescritura completa) |
| Skill nueva | `skills/sdd-bootstrap/SKILL.md`, `references/investigar-repo.md`, `references/escribir-sdd.md`, `references/completar-docs.md` |
| Reglas | `.sdd/domain.md` (BR-080 reescrita, BR-092 nueva) |
| Docs | `.sdd/c4/components.md`, `README.md`, `CHANGELOG.md` |

`hooks/hooks.json` **no se modifica**: el one-liner ya hace lo correcto (verificado contra `tinku`).

## Dependencias entre pasos

- **BR-092 antes que la skill**: el `SKILL.md` la cita por ID; escribirla después obliga a volver sobre el archivo.
- **La skill antes que el hook**: `bootstrap.md` invoca `sdd-bootstrap` por nombre; escribir el hook primero deja una referencia colgada durante la ejecución.
- **`escribir-sdd.md` es el cuello de botella**: es la referencia larga (los esqueletos de los 9 archivos que genera el bootstrap) y de la que dependen la verificación final y el ejemplo del `SKILL.md`.
- El smoke test del hook (paso 10) va último: necesita el `bootstrap.md` definitivo.

## Riesgos de la ejecución

- **Auto-modificación**: la tarea toca el plugin que esta sesión tiene cargado. Las skills viejas ya están en contexto y no se recargan (LEARNINGS, tareas 006 y 021) — seguimos el flujo conocido y **no** damos por hecho que el `sdd-bootstrap` nuevo esté invocable hasta reinstalar el plugin.
- **Verificación indirecta**: ningún `cmd:` prueba que el agente *obedezca* el texto nuevo, solo que el texto exista y esté bien formado. La prueba real es abrir una sesión en un repo sin configurar (`tinku`) con el plugin actualizado — queda como verificación manual del dev al cerrar.
- **Tope de 45 líneas de `components.md`**: agregar filas suele pasarlo (LEARNINGS, tarea 023). Si pasa, colapsar aristas del Mermaid con `&` antes de recortar contenido.

## Rama de trabajo

`task/024-dale-con-la-1-redacta-bootstrap`, sobre `main` (GitHub Flow, patrón `task/{numero}-{slug}` de `.sdd/branching.md`). Ya creada.
