---
name: sdd-analyze
description: Fase de análisis crítico y clarificación de una tarea SDD. Usar al iniciar una tarea creada con sdd task new, antes de escribir la spec. Usar automáticamente cuando el usuario haga preguntas para entender el sistema — si detectás "¿", "cómo", "por qué", "investigar", "entender", "verificar" SIN palabras clave de cambio (agregar/crear/implementar/cambiar/refactor/bug).
---

# sdd-analyze — análisis crítico y clarificación

**El requisito del dev es una HIPÓTESIS, no una orden.** El dev puede equivocarse y tu trabajo es detectarlo ANTES de construir. La complacencia acá es un bug, no cortesía.

## Análisis (completar la sección "Análisis crítico" de spec.md)

Arrancá con `sdd context` (destilado) y, para "¿ya existe?", con `sdd find <término>` — busca en el índice de endpoints, módulos, reglas y aprendizajes sin explorar el repo. Solo explorá código a mano si `find` no alcanza. Después respondé:

1. ¿Qué problema real resuelve?
2. ¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?
3. ¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?
4. ¿Qué supuestos trae el dev que podrían no ser ciertos?
5. ¿Riesgos y efectos secundarios? (arquitectura, performance, seguridad, mantenimiento)
6. ¿Qué pasa si NO se hace?
7. Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (logs, métricas, alertas, mensajes de error) y cómo debería reaccionar el sistema (reintento, fallback, mensaje al dev/usuario, degradación)? Si no aplica (sin lógica nueva que pueda fallar), decilo explícitamente.

Cerrá con una **recomendación honesta**: `proceder | proceder con cambios | reconsiderar`. Si es "reconsiderar", presentale tus argumentos al dev antes de seguir — no construyas algo que creés incorrecto sin decirlo. Ver `examples/analisis-ejemplo.md` para el nivel de profundidad esperado.

**¿A quién impacto?** Si `.sdd/config.json` → `graph` está configurado y la tarea menciona un endpoint/ruta/recurso que existe en tu índice (corre `sdd find` o mirá `capabilities.endpoints`), corré `sdd impact <MÉTODO> <ruta>` (o `sdd impact <sistema>` para el sentido inverso) y citá el resultado — es informativo, no bloquea (BR-014). Si la tarea menciona un recurso de infraestructura (bucket, cola, topic, tabla, ARN) y el grafo tiene sistemas con `infraEdges` publicados, `sdd impact <ARN-o-nombre>` también puede responder qué depende de ese recurso (BR-021) — mismo espíritu informativo. Sin grafo, omití este paso (degrada en silencio).

## Clarificación

Preguntale al dev **todo lo que haga falta, sin límite de cantidad**: ambigüedades, casos borde, comportamiento en error, y los supuestos que tu análisis puso en duda. Priorizá las que cambian el alcance o invalidan el enfoque; hacelas en tandas razonables (no de a una). Registrá cada respuesta en spec.md.

## Calibración: qué amerita objeción y qué no

- ❌ NO objetar por objetar: preferencias de estilo, micro-optimizaciones, "yo lo haría distinto".
- ✅ SÍ objetar: duplicación de algo existente, violación de una regla BR-NNN o un ADR, complejidad desproporcionada al valor, supuestos falsos verificables en el código.

Cuando termines: seguí con la skill **sdd-specify**.
