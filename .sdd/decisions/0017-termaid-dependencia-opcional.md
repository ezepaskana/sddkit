# ADR 0017 — termaid como dependencia opcional para renderizar diagramas en la terminal

- **Fecha:** 2026-08-14 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/021-antes-de-hacer-la-prueba-necesito

## Contexto

Los artefactos del flujo SDD se leen y se aprueban en el chat, pero para mostrarlos el agente lanzaba una aplicación externa (`.sdd/config.json → ui.opener`, BR-063). Eso saca al dev de la terminal en cada gate: tres veces por tarea `feature`.

Los diagramas Mermaid son contenido de primera clase del framework (BR-061): `components.md`, los flujos de `domain.md` y el `analysis.md` los llevan. Volcados como texto en una terminal, son ilegibles — un bloque ` ```mermaid ` crudo no comunica nada.

[termaid](https://github.com/fasouto/termaid) renderiza Mermaid como ASCII/Unicode en la terminal, cubre 18 tipos de diagrama (flowchart y sequence incluidos) y acepta archivo o stdin. Es Python puro, sin dependencias: `pip install termaid`, o `uvx termaid` sin instalar nada.

El problema es que ADR-0016 declaró, nueve días atrás, que instalar sddkit **no requiere Node ni ninguna otra runtime**. termaid es Python: adoptarlo como requisito contradice esa decisión aceptada.

## Decisión

Adoptar termaid como **dependencia opcional con degradación**, no como requisito:

- Si `termaid` está disponible, el agente renderiza los diagramas al volcar un artefacto en la terminal.
- Si no está y el dev no lo rechazó antes, se le ofrece instalarlo **una sola vez**.
- Su respuesta —incluido el "no"— se persiste en `.sdd/config.json`, y no se vuelve a preguntar.
- Sin termaid, el bloque Mermaid se muestra crudo y el flujo sigue sin error.

El plugin **no instala nada por su cuenta**: un plugin de Claude Code es markdown y JSON, y su único punto de ejecución es el one-liner del hook. La instalación siempre la ejecuta el dev, informado.

Esto **matiza** ADR-0016 sin revertirlo: sddkit sigue sin requerir ninguna runtime para funcionar. Lo que gana una runtime opcional es la calidad de la presentación.

## Alternativas consideradas

- **Instalar termaid junto con el plugin**, como pidió el dev originalmente. Descartada: técnicamente imposible — el plugin manager de Claude Code instala markdown, no ejecuta instaladores de paquetes.
- **Requisito duro documentado en el README.** Descartada: contradice ADR-0016 de frente y rompe sddkit en cualquier máquina sin Python.
- **Renderizar Mermaid con un renderer propio en markdown.** Descartada: reintroduce código ejecutable al repo, que es exactamente lo que ADR-0016 eliminó.
- **Dejar el Mermaid crudo y no adoptar nada.** Es el comportamiento de fallback, no la decisión: descartada como estado permanente porque vuelve inútiles los diagramas del `analysis.md`, donde el dev decidió que son más valiosos.
- **Preguntar en cada sesión si falta.** Descartada: ruido recurrente. De ahí que la respuesta negativa se persista igual que la positiva.

## Consecuencias

**Se gana:** el dev lee y aprueba los artefactos sin cambiar de ventana, con los diagramas legibles. `ui.opener` queda obsoleto y BR-063 se reescribe.

**Se sacrifica:** la experiencia deja de ser uniforme — dos devs del mismo equipo ven cosas distintas según tengan termaid o no. Y aparece la primera dependencia externa del proyecto, con su mantenimiento asociado (una herramienta de terceros que puede quedar sin soporte).

**Condición de reversión:** si termaid queda abandonado, si su render resulta ilegible para los diagramas reales del framework, o si el ofrecimiento molesta más de lo que aporta, se vuelve al bloque crudo — que ya es el camino de fallback y por lo tanto siempre está probado.
