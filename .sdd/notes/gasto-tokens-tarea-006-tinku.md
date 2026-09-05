# Gasto de tokens — tarea 006 de tinku (2026-09-04)

Primera medición real con la instrumentación de la tarea 025. Fuentes: los archivos de
`.sdd/tasks/006-*/debug/`, los transcripts de las dos sesiones de tinku del día y los 20
transcripts propios de los workers (`<tmp>/<sesión>/tasks/<agent_id>.output`).

> **Corrección de una versión anterior de esta nota.** Decía que las 283 llamadas habían
> corrido todas en `claude-opus-5` y que el nivel del plan no se respetaba. Era falso: salía
> de leer, en los archivos de fin, el renglón del contexto de la sesión en vez del del
> subagente. Con los transcripts propios, los modelos se respetan.

## Lo que se gastó

| | Entrada | % | Llamadas | % | Salida |
|---|---|---|---|---|---|
| **Workers** | 58.921.644 | 61 % | 766 | 73 % | 195.939 |
| **Agente principal** | 38.410.755 | 39 % | 286 | 27 % | 227.979 |
| **Total** | **97.332.399** | | **1.052** | | **423.918** |

El 97,3 % de la entrada se sirve desde cache (`cache_read`); `cache_creation` fue 1,03 M
solo en la sesión principal.

## Los modelos se respetan

Los 20 workers con transcript propio: **13 en `claude-sonnet-5`, 5 en `claude-opus-5`,
2 en `claude-haiku-4-5`**. Coincide exactamente con los alias que pedían los briefs
(13 `sonnet`, 5 `opus`, 2 `haiku`). El mapeo nivel → modelo funciona y no hay ahorro ahí.

## Dónde está el gasto de verdad

**Los workers crecen 4x durante su paso.** Arrancan todos en ~34.000 tokens (system prompt
+ tools + brief) y los siete más grandes cierran entre 118.000 y 168.000. Ese crecimiento
—lo que el worker lee y produce mientras trabaja— es el 61 % de la entrada total.

Los siete workers más caros consumieron 38,4 M de entrada entre ellos, con 55 a 69 llamadas
al modelo cada uno. **Un paso que necesita 69 llamadas no es un paso chico**: la regla de
descomposición de `sdd-plan` (un paso verificable, completable en una sesión corta) no se
cumplió en esta tarea.

Los dos workers en haiku, en cambio, cerraron en ~30.000 con 15 llamadas: pasos realmente
chicos, y se nota en la factura.

## Lo que NO hay que tocar

- **Los briefs**: 20 medidos, 28.778 tokens estimados, mediana ~1,4 k. Es el 0,03 % de la
  entrada total. Recortar prompts no mueve la aguja.
- **Los artefactos**: `CLAUDE.md` 952 tokens, los cinco artefactos de la tarea 4.226, el
  hook caveman 164. Juntos, 5.342 del arranque de 38.473 del principal (14 %). El
  presupuesto de 45 líneas ya hizo su trabajo.

## Recomendaciones, por impacto

1. **Partir los pasos gordos.** Siete workers con 55-69 llamadas y cierre de 130-168 k son
   el 40 % de todo el gasto. Si el plan los hubiera partido en dos o tres pasos de 20
   llamadas, cada uno arrancaría limpio en 34 k en vez de arrastrar 130 k hasta el final.
   El cuello no es cuántos workers hay: es cuánto crece cada uno.
2. **Bajar el arranque de 34 k que paga cada worker.** Son ~680 k solo en bootear los 20, y
   casi todo es overhead fijo: system prompt, schemas de tools y servidores MCP. Podar los
   MCP que la tarea no usa lo baja para todos los workers a la vez.
3. **Cortar la sesión del principal entre fases.** 286 llamadas con 134 k de contexto
   promedio: el orquestador arrastra toda la historia. Arrancar `execute` en sesión nueva
   deja fuera analyze/specify/plan.
4. **Revisar los 5 pasos en opus.** Consumieron 10,3 M entre cinco. Si alguno era
   implementación estándar y no diseño, sonnet hace lo mismo mucho más barato.

## Estado de la instrumentación

Los transcripts propios de los workers existen y el script los encuentra: 20 de los archivos
de fin traen `base: transcript propio del subagente` con números reales. Los demás caen en
la base de la sesión porque el archivo del worker ya no existía al momento de escribir.

Dos defectos abiertos, ninguno bloqueante:

- **En un archivo con base `propio`, el renglón `- Modelo:` y la sección de totales exactos
  siguen saliendo del transcript de la sesión, no del worker.** Los datos del worker están
  en su propia sección, pero conviven con los de la sesión y se prestan a confusión — es
  justo el error que cometí al leer estos archivos.
- Los archivos del agente principal cayeron en la carpeta de la tarea 005: el destino se
  resuelve por el índice al momento de escribir, y al arrancar la sesión la 006 todavía no
  era la última actualizada.
