# Retro — tarea 008: Fix falso positivo de drift en validate.js con tablas secundarias

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-30.

## Resultado de la métrica de impacto

- **Baseline (de analysis.md):** 9 warnings de drift en cada commit en `nido-be/` (proyectos Java con tabla secundaria de packages en `components.md`).
- **Resultado medido después:** 0 warnings de drift producidos por la tabla secundaria. El test `sdd validate: no reporta drift para entradas de sub-secciones de components.md` pasa con exit 0, confirmando que `domain/model` y `adapter/controller` ya no aparecen en `docDirs`.
- **Se cumplió lo esperado:** Sí. La métrica exacta (9 warnings eliminados) no fue medida en el repo real porque el fix es en sddkit; la verificación fue el test unitario con fixture equivalente al caso de uso reportado.

## Qué anticipó bien la spec y qué no

**Bien:**
- Los 6 criterios EARS cubrieron todos los casos relevantes: tabla secundaria ignorada, sin secciones (archivo solo tabla), y los dos casos de drift genuino sin cambio de comportamiento.
- El fix de 2 líneas fue exactamente el alcance correcto — no hubo tentación de "mejorar" de más.
- Detectar en el análisis que `genComponents` NO genera la tabla secundaria (lo hace un agente de IA) fue importante para no ir por el fix incorrecto.

**No anticipó bien:**
- La spec podría haber explicitado el workaround conocido del título `…` en `retro.md` como paso del plan (ya son 5 tareas con el mismo workaround manual). No es un fallo de la spec de esta tarea, pero sí evidencia que el fix del gate sigue pendiente.

## Desvíos del plan

Ninguno. Los 4 pasos se ejecutaron en orden, sin replanificación ni bloqueos:
1. Rama creada sin inconvenientes.
2. Test escrito en primera pasada — el worker entendió el fixture y el mock de console.log correctamente.
3. Fix aplicado en 2 líneas exactas según la spec.
4. Suite completa (214 tests) en verde sin tocar nada más.

## Aprendizajes accionables

- **Extractores de "módulos documentados" sobre Markdown multi-tabla: acotar siempre a la primera sección.** Un regex `/^\| \`...\` \|/gm` sobre el documento completo matchea tablas en cualquier parte del archivo. Si el formato tiene una "tabla principal" seguida de secciones secundarias (subcapas, notas, VALIDAR), el extractor debe hacer `split(/^#{2,3}\s/m)[0]` antes de matchear — de lo contrario, cualquier enriquecimiento posterior del doc genera falsos positivos permanentes. Patrón a aplicar en cualquier futuro extractor similar.

- **Fix de bug de pre-commit en sddkit requiere test de regresión en la misma tarea.** `validate.js` no tenía ningún test antes de esta tarea. En proyectos como sddkit (herramienta de desarrollo, no de producción), el pre-commit es la única señal que el dev ve en cada commit — un falso positivo allí es ruido constante que erosiona la confianza en toda la herramienta. Cualquier fix de `validate.js` debe venir con test.

- **Workaround de `…` en título de retro.md sigue activo (5 tareas acumuladas).** Este workaround manual (editar el título para quitar `…`) se repite desde la tarea 005. El fix real está documentado en LEARNINGS pero no se planificó. Próxima oportunidad: incluirlo como deuda técnica explícita o resolverlo en la primera tarea que toque `task.js`.

## Que para el catalogo, el dominio o la arquitectura

- **BR-043 ya agregada a `.sdd/domain.md`** durante la fase de spec. Define el scope de `docDirs` en el check de drift — vinculante para futuros cambios a `validate.js`.
- Sin convenciones nuevas para el catálogo.
- Sin cambios estructurales en C4 — el fix es interno a `src/commands`, sin nuevos módulos ni dependencias.
- Sin ADR necesario — no es una decisión de arquitectura, es un fix de extractor.
