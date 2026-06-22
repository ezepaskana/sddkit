# Formatos de respuesta por tipo de pregunta

Cada tipo de pregunta tiene un formato de salida definido. Usá estas secciones exactas — no inventés secciones extras ni omitas ninguna.

## Bug / comportamiento inesperado

### Qué está pasando
Descripción concisa del comportamiento observado vs. el esperado.

### Por qué sucede
Causa raíz con referencias concretas a `archivo:línea`. Si hay más de una causa contribuyente, listalas en orden de impacto.

### Archivos involucrados
Lista con el rol de cada archivo en el problema:
- `src/lib/foo.js` — donde se origina el error (línea N)
- `src/commands/bar.js` — donde se manifiesta el síntoma

### Fix sugerido
Describí la corrección sin implementarla. Incluí qué cambiar y por qué, pero NO escribas el código.

### Handoff
> ¿Querés implementar el fix? Corré `/sdd-task` con: _"<requisito verbatim sugerido>"_

---

## Comprensión (¿cómo funciona X?)

### Resumen de alto nivel
2-3 oraciones que expliquen qué hace el componente/flujo y por qué existe.

### Flujo paso a paso
1. `archivo.js:función()` — qué hace este paso
2. `otro.js:método()` — siguiente paso
3. ...

### Archivos clave y sus roles

| Archivo | Rol |
|---|---|
| `src/lib/foo.js` | Lógica principal de X |
| `src/commands/bar.js` | Entry point del comando |

### Detalles no obvios o gotchas
Cosas que no son evidentes al leer el código por primera vez: side effects, dependencias implícitas, orden de ejecución importante, variables de entorno requeridas.

---

## Brainstorm (¿cómo podríamos hacer X?)

### Contexto actual
Cómo funciona hoy la parte relevante, con archivos clave. Si no existe funcionalidad previa, decilo explícitamente.

### Opciones

**Opción A: _nombre descriptivo_**
- Pros: ...
- Contras: ...

**Opción B: _nombre descriptivo_**
- Pros: ...
- Contras: ...

(2-4 opciones; más de 4 diluye la discusión)

### Recomendación
Cuál elegirías y por qué, citando trade-offs concretos del proyecto.

### Pregunta de cierre
> ¿Alguna de estas opciones te convence, o hay constraints que no estoy viendo?

---

## Revisión (¿está bien cómo está X?)

### Qué está bien
Patrones, decisiones o prácticas que vale la pena mantener. Sé específico — no "el código es limpio" sino "el manejo de errores en `validate.js` cubre los 3 casos borde documentados en BR-004".

### Qué preocupa
Gaps, riesgos o deuda técnica encontrada. Cada item con referencia a archivo y descripción del riesgo.

### Sugerencias priorizadas

| Prioridad | Sugerencia | Archivo(s) | Razón |
|---|---|---|---|
| High | Descripción del cambio | `foo.js` | Por qué importa |
| Medium | Descripción del cambio | `bar.js` | Por qué importa |
| Low | Descripción del cambio | `baz.js` | Por qué importa |

Las sugerencias se describen, NO se implementan.

---

## Análisis de impacto (¿qué se rompe si cambio X?)

### Dependientes directos
Archivos que importan o usan directamente lo que se va a tocar:
- `src/commands/init.js` — usa `createConfig()` de este módulo
- `tests/init.test.js` — testea la función afectada

### Efectos indirectos
Cambios de comportamiento que no son imports directos: contratos de API, formatos de output que otros consumen, side effects en filesystem o estado global.

### Estimación de esfuerzo de migración
Cuántos archivos hay que tocar, si requiere migración de datos, si hay tests que actualizar. Expresalo en magnitud (1 archivo trivial / 5-10 archivos moderado / refactor amplio).

### Riesgo neto
**Alto / Medio / Bajo** — con justificación en una oración que cite la evidencia encontrada.
