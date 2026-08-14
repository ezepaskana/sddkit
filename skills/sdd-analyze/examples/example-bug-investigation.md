# Ejemplo: investigación de bug (standalone, read-only)

> `/sdd-analyze ¿por qué el reporte mensual sale con totales en cero para algunos clientes?`

---

## 1. Al chat

> `buildMonthlyReport` (`src/reports/monthly.js:88`) agrupa por `clientId` leyéndolo de la factura, pero las facturas migradas en enero lo tienen en `client.id` y el campo viejo quedó `null`. Esos clientes caen en un grupo huérfano y su total se pierde — por eso falla solo en algunos.
>
> Ya nos pasó: quedó anotado en los aprendizajes de la tarea 004 y se arregló para el listado. El reporte quedó afuera.
>
> ¿Qué querés ver?
>
> 1. El arreglo que propongo, con su test
>    → sabés cuánto trabajo es antes de decidir
> 2. Cómo reproducirlo
>    → lo confirmás vos en dos minutos
> 3. Qué otros reportes leen ese mismo campo
>    → te enterás si hay más números mal en silencio
>
> **¿Con cuál sigo?** Detalle en `.sdd/notes/totales-en-cero-reporte-mensual.md`.

**128 palabras.** Causa raíz con `archivo:línea`, opciones con lo que dan, y una pregunta al final. No adelanta el arreglo hasta que el dev lo pide.

Las rutas y nombres de función reales (`buildMonthlyReport`, `src/reports/monthly.js`) **se quedan**: ubican al dev en su propio código. Lo que se tradujo fue "inconsistencia de esquema post-migración" → "las facturas migradas lo tienen en otro campo" (BR-067).

---

## 2. A la nota (`.sdd/notes/totales-en-cero-reporte-mensual.md`)

```markdown
# Totales en cero para clientes con facturas migradas

**Estado:** en curso · **Última sesión:** 2026-08-02

## Conclusión hasta ahora
Causa raíz confirmada: `buildMonthlyReport` agrupa por el campo viejo `clientId`,
que quedó `null` en las facturas migradas en enero.
Es la misma clase de bug de la tarea 004, en un consumidor que no se había tocado.

## Decisiones del dev
- (pendiente)

## Detalle
### Síntoma
El reporte mensual muestra total 0 para clientes que sí tienen facturas emitidas.

### Archivos
- `src/reports/monthly.js:88` → `buildMonthlyReport` (el agrupado ocurre acá)
- otros lectores del campo viejo: `src/reports/annual.js:40` (mismo riesgo, sin confirmar)
- `.sdd/LEARNINGS.md` → entrada de la tarea 004 con la receta

### Fix sugerido (descrito, NO aplicado — standalone es read-only)
1. Reproducir con una factura migrada (campo viejo en `null`).
2. Resolver el id con el mismo helper que ya usa el listado, en vez de leer el campo crudo.
3. Test de regresión con las dos formas de factura mezcladas: el total debe incluir ambas.

## Abierto
- [ ] ¿Conviene normalizar los datos migrados de una vez en vez de parchear cada lector?
```

---

## Handoff

Cuando el dev decide arreglarlo:

> Corré `/sdd-task` con: "que el reporte mensual no pierda las facturas migradas al agrupar por cliente, con test de regresión". Es un `bug`: reproducción + test rojo + fix.
