# Retro — tarea 002: Agregar fallback de 3 opciones en los triggers de skills SDD

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-17.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** Prompts con intención mixta (investigar + cambiar) no disparaban ninguna skill SDD — el LLM quedaba en limbo entre sdd-task y sdd-analyze.
- **Resultado medido después:** Pendiente de validar en uso real. El AGENTS.md ahora incluye una tercera regla explícita que instruye al LLM a preguntar al usuario cuando no pueda clasificar el prompt con certeza.
- **¿Se cumplió lo esperado?:** No medible aún (requiere probar en otro proyecto con el prompt original). El cambio es de instrucciones (texto), no de lógica ejecutable — 210/210 tests pasan.

## Qué anticipó bien la spec y qué no

El diagnóstico previo identificó correctamente la causa raíz (keywords de cambio demasiado estrechas + ausencia de fallback para ambigüedad). No hubo sorpresas en la implementación.

## Desvíos del plan

Ninguno significativo. El flujo SDD formal (analyze → specify → plan → execute) se acortó porque el análisis completo ya estaba hecho en la conversación antes de crear la tarea.

## Aprendizajes accionables

- Los triggers basados en keywords exactas son frágiles para español — las expresiones naturales de cambio ("quiero que X haga Y") no caen en listas cerradas. Mejor combinar keywords con un fallback de pregunta al usuario.
- Cuando un prompt tiene intención dual (entender + cambiar), el LLM no aplica literalmente las reglas "SIN cambio" sino que interpreta semánticamente, generando un conflicto con ambas reglas.

## ¿Algo para el catálogo, el dominio o la arquitectura?

No. El cambio es texto de instrucciones, no estructura ni convención nueva.
