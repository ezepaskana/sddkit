# Design — tarea 022

> Detalle técnico del plan. Tope: 45 líneas (BR-082).

## Impacto en arquitectura y catálogo

No aparecen módulos nuevos: sddkit es markdown y JSON. El cambio es de **formato y ubicación** de lo que el agente escribe en el repo del dev. No requiere ADR: no contradice ADR-0015 (progressive disclosure), lo **extiende** al nivel 3 del C4.

El propio `.sdd/c4/components.md` de sddkit es el primer caso de uso (CA-4: un solo módulo), así que sirve de ejemplo canónico y de verificación.

## Archivos por área

| Área | Archivos |
|---|---|
| Reglas | `.sdd/domain.md`: BR-073 ampliada (símbolos de entrada), BR-077 extendida (frontera capa/módulo), BR nuevas de formato máquina e índice |
| Formato | `skills/sdd-task/references/` — dónde se documenta la estructura de `components.md` y del `CLAUDE.md` de módulo |
| Skills | `skills/sdd-analyze/SKILL.md` (leer los tres niveles, CA-8) |
| Dogfood | `.sdd/c4/components.md`, `context.md`, `containers.md` del propio repo |
| Docs | `README.md` (sección de progressive disclosure) |

## Dependencias entre pasos

- **Las reglas primero**: el resto las cita por ID.
- **El formato antes que el dogfood**: no tiene sentido reescribir el `components.md` de sddkit antes de decidir cómo se ve una fila.
- `sdd-analyze` (CA-8) es **independiente** de todo lo demás: es una línea en la skill, puede ir en paralelo.
- El README va último: describe el estado final.

## Riesgos de la ejecución

- **Auto-modificación**: la tarea reescribe el `components.md` que ella misma usa como referencia. Se escribe primero el formato, después el archivo.
- **Doble fuente**: si la frontera capa/módulo (CA-6) queda ambigua, se generan dos archivos que dicen lo mismo. Es el riesgo principal y por eso la regla se escribe explícita, con ejemplo de qué va en cada uno.
- **S-3 (no migrar)**: los repos ya configurados quedan con formato viejo hasta su próximo escaneo. Aceptado.

## Rama de trabajo

Se continúa en `task/019-vamos-a-actualizar-esto-ya-que`, como las tareas 020 y 021: la prueba end-to-end sigue pendiente y las tres cierran en el mismo PR. **No** se abre rama nueva ni hay Paso 1 de `git checkout -b`.
