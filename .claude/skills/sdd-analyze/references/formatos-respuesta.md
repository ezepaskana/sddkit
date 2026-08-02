# Guías de respuesta por tipo de pregunta (modo standalone)

Cada guía tiene dos columnas: **al chat** (≤ 150 palabras, hallazgo + 2-4 opciones numeradas, y frenás) y **a la nota** (`.sdd/notes/<slug>.md`, sin límite). Investigás todo; mostrás poco. Citá siempre `archivo:línea` en vez de describir de memoria.

Las opciones son lo que el dev puede **elegir a continuación**, no un menú decorativo: cada una debe abrir un tema real.

## Bug / comportamiento inesperado

- **Chat:** observado vs esperado en una línea → causa raíz más probable con `archivo:línea` → opciones: (1) ver el fix, (2) ver las otras causas candidatas, (3) ver cómo reproducirlo.
- **Nota:** todas las causas en orden de impacto, archivos involucrados con su rol, el fix descrito (nunca aplicado), cómo se reproduce.

## Comprensión (¿cómo funciona X?)

- **Chat:** 2-3 oraciones de resumen, con diagrama Mermaid si el flujo tiene 3+ pasos o actores → opciones: (1) el paso N en detalle, (2) los gotchas, (3) quién lo llama.
- **Nota:** flujo paso a paso (`archivo.js:función()` por paso), archivos clave y su rol, gotchas no evidentes (side effects, orden de ejecución, env vars, dependencias implícitas).

## Brainstorm (¿cómo podríamos hacer X?)

- **Chat:** cómo funciona hoy en una línea (si no existe, decilo) → **las opciones SON la respuesta**: 2-4, una línea cada una, con tu recomendación marcada y su motivo en media línea.
- **Nota:** pros y contras concretos del proyecto por opción, las descartadas con su motivo, precedentes en el repo.

## Revisión (¿está bien cómo está X?)

- **Chat:** el hallazgo que más importa, con archivo y riesgo → opciones: (1) el resto de lo que preocupa, (2) qué está bien, (3) cómo lo arreglaría.
- **Nota:** todo lo bueno (específico: no "es limpio" sino "el manejo de errores en `validate.js` cubre los 3 casos de BR-004"), todo lo que preocupa con archivo y riesgo, sugerencias priorizadas alto/medio/bajo, descritas, no implementadas.

## Análisis de impacto (¿qué se rompe si cambio X?)

- **Chat:** riesgo neto (alto/medio/bajo) + esfuerzo en magnitud (1 archivo trivial / 5-10 moderado / refactor amplio) → opciones: (1) ver los dependientes, (2) ver los efectos indirectos, (3) ver el orden de migración.
- **Nota:** dependientes directos (`sdd impact` si hay grafo), efectos indirectos (contratos de API, formato de output que otros consumen, side effects en filesystem o estado global), justificación del riesgo.

## Roadmap o análisis de varios temas

Es el caso que más se desborda. **No enumeres los 9 objetivos en el chat.**

- **Chat:** el bloqueante en una línea → menú de los temas detectados (`schema · licencias · taxonomía · seguridad`) → "¿cuál abrimos?".
- **Nota:** el roadmap completo, la tabla comparativa, las fuentes.
