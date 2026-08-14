# Spec — tarea 021: artefactos que entran en la terminal

> Continúa `analysis.md` (no lo repite). Escrita en el formato que esta misma tarea define.

**Historia:** Como dev quiero leer y aprobar los artefactos sin salir de la terminal, con los diagramas legibles, para no cortar el foco en cada gate.

## Criterios de aceptación

**Mostrar en la terminal**

- **CA-1** — CUANDO el agente tiene que mostrarle un artefacto al dev, EL SISTEMA DEBE volcar su contenido en la respuesta del chat, sin lanzar ninguna aplicación externa.
- **CA-2** — SI el artefacto excede el tope de pantalla, EL SISTEMA DEBE avisar que es largo, volcar solo lo esencial e indicar la ruta para que el dev lo abra explícitamente.
- **CA-3** — EL SISTEMA DEBE dejar de usar `.sdd/config.json → ui.opener`; el campo queda obsoleto y BR-063 se reescribe.

**Topes**

- **CA-4** — Cada template DEBE declarar su tope **en líneas** (no en palabras), y el agente DEBE chequearlo antes de mostrar el archivo.
- **CA-5** — CUANDO un artefacto supera su tope, EL SISTEMA DEBE tratarlo como señal de que la tarea es demasiado grande y proponer partirla, además de aplicar CA-2.

**Artefactos**

- **CA-6** — `analysis.md` DEBE tener exactamente tres secciones: entendimiento en pocas palabras, diagrama Mermaid si aplica, y hasta **5 huecos** preguntados de a uno con respuesta sugerida.
- **CA-7** — `spec.md` y `design.md` SOLO se escriben cuando la tarea es de riesgo alto; en el resto los criterios van en el plan y no hay diseño técnico escrito.
- **CA-8** — `plan.md` DEBE ser una lista de pasos de una línea, cada uno con su `cmd:` de verificación; el detalle técnico va a `design.md`.
- **CA-9** — `nota.md`, `reproduccion.md` y `retro.md` DEBEN eliminarse: una tarea `simple` usa analysis + plan, y en un `bug` la reproducción va en el analysis y el test de regresión es el primer paso del plan.
- **CA-10** — CUANDO se cierra una tarea, EL SISTEMA DEBE escribir los aprendizajes directo en `.sdd/LEARNINGS.md`, sin documento intermedio.
- **CA-11** — SI las señales del pedido son ambiguas o contradictorias, EL SISTEMA DEBE preguntarle al dev su expectativa (tipo, tamaño, profundidad) antes de clasificar; si no lo son, clasifica solo y lo anuncia en una línea.

**Diagramas con termaid**

- **CA-12** — CUANDO el agente vuelca un artefacto con un bloque Mermaid y `termaid` está disponible, EL SISTEMA DEBE renderizar el diagrama en la terminal.
- **CA-13** — SI `termaid` no está disponible y el dev no lo rechazó antes, EL SISTEMA DEBE ofrecerle instalarlo **una sola vez** (`pip install termaid`), y persistir su respuesta —incluido el "no"— en `.sdd/config.json`.
- **CA-14** — SI `termaid` no está disponible, EL SISTEMA DEBE mostrar el bloque Mermaid crudo y seguir sin error.

## Reglas de negocio afectadas

BR-057 (clasificación → suma la calibración), BR-058 (flujo por tipo → cambian los artefactos), BR-059 (presupuesto → pasa a líneas), BR-061 (Mermaid → suma el render), BR-063 (apertura de archivos → se reescribe), BR-079 (cero runtime → se matiza con dependencia opcional). Las reglas nuevas se agregan a `.sdd/domain.md` antes de implementar.

## Supuestos

- **S-1** — El tope de pantalla es **45 líneas** para todos los artefactos. Es el número que salió de la medición, no una preferencia del dev.
- **S-2** — La detección de termaid es `command -v termaid`; el ofrecimiento propone `pip install termaid` y menciona `uvx termaid` como alternativa sin instalar.
- **S-3** — Los artefactos ya escritos (tareas 010 a 020) NO se migran al formato nuevo: quedan como registro histórico.
- **S-4** — La dependencia opcional necesita ADR propia, porque matiza una decisión aceptada.

## Fuera de alcance

- El contexto en MySQL para el análisis — el dev lo marcó como "a explorar más adelante".
- Reinstaurar retro y métricas (decisión reversible, pero no en esta tarea).
- Redactar el contenido real de `hooks/bootstrap.md`, que sigue siendo un placeholder de la tarea 020.

---
_Aprobación del dev: pendiente_
