# Notas persistentes (`.sdd/notes/`) — modo standalone

La nota es la versión **extendida** del análisis: el destinatario es el agente (vos, en esta sesión o en la próxima), no el dev. El dev lee el resumen del chat; si quiere el detalle, abre la nota.

Sirve para lo que motivó BR-065: investigaciones largas que el dev corta a la mitad y retoma otro día sin volver a pagar la exploración.

## Slug y ubicación

`.sdd/notes/<slug>.md` — el slug describe el **tema**, no la pregunta: `zones-pois`, `flujo-publish`, `bug-verify-codespan`. Kebab-case, sin fecha ni número (el histórico va adentro, en sesiones).

Antes de crear una nota nueva, buscá una existente del mismo tema (`ls .sdd/notes/`). Si existe: **leela y continuala**. Nunca abras `tema-2.md`.

## Estructura

```markdown
# <Tema>

**Estado:** en curso | cerrado · **Última sesión:** <fecha>

## Conclusión hasta ahora
<2-4 líneas: lo que ya sabemos y no hay que volver a investigar>

## Decisiones del dev
- <fecha> — <qué eligió y por qué>

## Detalle
<evidencia con archivo:línea, tablas, opciones descartadas con su motivo, fuentes>

## Abierto
- [ ] <pregunta o tema que quedó sin resolver>
```

`## Abierto` es lo que más rinde al retomar: son las opciones que le vas a volver a ofrecer al dev.

## Al continuar una nota

1. Leela entera antes de investigar: puede que la respuesta ya esté ahí.
2. Agregá al final de cada sección; **no reescribas las decisiones ya tomadas** — si una cambió, agregá la nueva con su fecha y marcá la anterior como superada.
3. Actualizá `Conclusión hasta ahora` y `Última sesión` en cada pasada.
4. Resumí en el chat qué había abierto y ofrecé las opciones, en ≤ 150 palabras (BR-064).

## Límites

- Es la **única** escritura permitida en standalone (BR-065): nada de código, artefactos de tarea ni commits.
- Si la investigación converge en un cambio, el destino es `/sdd-task` — la nota no reemplaza `analysis.md`, pero el análisis de la tarea puede citarla.
