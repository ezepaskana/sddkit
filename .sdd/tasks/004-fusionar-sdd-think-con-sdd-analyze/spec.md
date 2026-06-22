# Spec — tarea 004: Fusionar sdd-think con sdd-analyze: eliminar sdd-think como …

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Dos skills (sdd-think y sdd-analyze) hacen esencialmente lo mismo: análisis crítico sobre una propuesta o pregunta del dev. La separación crea confusión sobre cuál usar, duplica contenido de mantenimiento (7 preguntas críticas en analyze vs 5 tipos de investigación en think), y requiere lógica de routing en AGENTS.md para elegir entre una u otra. Además la separación fue introducida en tarea 003 hace pocos días — todavía no tiene inercia.
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** Sí: ambas skills ya existen y se solapan. Las 7 preguntas de analyze son un caso particular de investigación (tipo "revisión crítica") que think ya categoriza. Ambas usan `sdd context`, leen código, y cierran con recomendación.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** La fusión ES la opción simple. Una skill con dos modos (dentro-de-tarea vs standalone) elimina la duplicación sin perder funcionalidad. sdd-analyze ya tiene nombre de fase SDD; basta agregarle el modo standalone de think.
- **Supuestos del dev que podrían no ser ciertos:** Ninguno riesgoso. El dev creó ambas skills, conoce sus límites y quiere consolidar.
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento): Riesgo bajo. Es contenido de skills (prompts .md), no código runtime. Impacto: AGENTS.md (triggers), settings.local.json (permisos de copia), las carpetas sdd-think (eliminar en skills/ y .claude/skills/), sdd-analyze (ampliar). Los resources de think (examples/, references/formatos-respuesta.md) se migran a analyze. El código JS (src/) no tiene ninguna referencia a sdd-think.
- **¿Qué pasa si NO se hace?** Dos skills solapadas conviven, el routing en AGENTS.md sigue siendo frágil (lista cerrada de keywords para elegir entre think y task, con fallback de preguntar), y el mantenimiento se duplica.
- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (detección) y cómo debería reaccionar el sistema (manejo)?** No aplica — es reorganización de documentación/prompts, sin lógica nueva que pueda fallar en runtime.

**Recomendación:** `proceder` — la fusión es directa, el riesgo es bajo, y elimina complejidad innecesaria. sdd-think fue creada hace días (tarea 003), no tiene usuarios externos ni inercia.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: La restricción de read-only de sdd-think (prohibir Edit/Write/Bash destructivo), ¿la mantenés cuando sdd-analyze se usa en modo standalone (investigación pura)? En modo tarea escribe en spec.md, pero en modo standalone sería read-only.
  - Respuesta: Sí, read-only en standalone.
- [x] P2: ¿El nombre queda `sdd-analyze` o preferís otro?
  - Respuesta: Queda `sdd-analyze`.
- [x] P3: Los triggers de AGENTS.md hoy tienen sdd-think para preguntas y sdd-task para cambios. Con la fusión, el trigger de preguntas puras pasaría a `/sdd-analyze`. ¿Ok?
  - Respuesta: Sí, auto-trigger a sdd-analyze.

## Metrica de impacto

No hay metrica cuantificable directa. Impacto cualitativo: reducir de 2 skills solapadas a 1 unificada. Antes: 2 skills (sdd-think + sdd-analyze) con contenido duplicado y routing fragil en AGENTS.md. Despues: 1 skill (sdd-analyze) con modo dual (tarea/standalone), sin duplicacion.

- **Metrica proxy:** cantidad de skills de analisis/investigacion = 2 -> 1.
- **Como se mide:** `ls skills/sdd-think 2>/dev/null && echo "existe" || echo "eliminada"` + verificar que sdd-analyze tiene ambos modos.

## Spec refinada

**Historia:** Como desarrollador usando sddkit quiero una sola skill de analisis critico (sdd-analyze) que sirva tanto como fase 2 del flujo SDD como para investigacion standalone, para no tener que elegir entre dos skills solapadas.

**Criterios de aceptacion (formato EARS):**

- CUANDO el usuario invoque `/sdd-analyze` sin una tarea SDD activa (o haga una pregunta pura sin pedir cambio), EL SISTEMA DEBE activar sdd-analyze en **modo standalone**: investigacion read-only, categorizacion por tipo de pregunta (bug, comprension, brainstorm, revision, impacto), formatos de respuesta estructurados, y handoff a `/sdd-task` si el dev decide implementar.
- CUANDO sdd-analyze se active en modo standalone, EL SISTEMA DEBE prohibir Edit, Write y Bash destructivo (misma restriccion que tenia sdd-think).
- CUANDO sdd-analyze se active como fase 2 de una tarea SDD (tras `sdd task new`), EL SISTEMA DEBE comportarse como hoy: completar analisis critico (7 preguntas) y clarificacion en spec.md, con recomendacion honesta, y seguir con sdd-specify.
- CUANDO el trigger automatico de AGENTS.md detecte una pregunta pura (sin pedido de cambio), EL SISTEMA DEBE disparar `/sdd-analyze` (no `/sdd-think`).
- CUANDO el trigger de AGENTS.md no este seguro (mezcla investigacion con cambio), EL SISTEMA DEBE preguntar con opciones: (a) Implementar un cambio -> sdd-task, (b) Investigar/analizar -> sdd-analyze, (c) Solo charlar sin SDD.
- DESPUES de la fusion, las carpetas `skills/sdd-think/` y `.claude/skills/sdd-think/` NO DEBEN existir.
- DESPUES de la fusion, los resources de sdd-think (examples/, references/formatos-respuesta.md) DEBEN estar migrados a sdd-analyze.

**Reglas de negocio afectadas:** Ninguna BR existente. No se crean BRs nuevas (es reorganizacion de skills, no logica de negocio).

**Fuera de alcance:**

- Cambios al codigo JS de sddkit (src/) -- no hay referencias a sdd-think en codigo.
- Cambios a skills que no sean sdd-analyze y sdd-think.
- Cambios al CLI `sdd` o sus comandos.

**Impacto en arquitectura/catalogo:**

- No requiere ADR (reorganizacion de documentacion, no decision de arquitectura).
- No requiere cambios en C4 (skills no estan modeladas como componentes en components.md).
- Archivos afectados: `skills/sdd-analyze/SKILL.md`, `AGENTS.md`, `.claude/settings.local.json`, carpetas `sdd-think` (eliminar), carpeta `sdd-analyze` (ampliar con examples/references migrados).

---
_Aprobacion del dev: APROBADA (2026-06-22)_
