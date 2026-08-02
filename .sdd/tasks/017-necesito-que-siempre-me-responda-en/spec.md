# Spec — tarea 017: necesito que siempre me responda en pocas palabras simples, …

> Estado: borrador. Su presupuesto es de **≤ 300 palabras** — un criterio por comportamiento observable, sin repetir la historia ni el análisis. `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como dev quiero recibir el análisis en pocas palabras y con opciones para elegir, mientras el detalle queda guardado, para poder decidir de a poco sin leer un informe entero ni perder lo investigado al cortar la sesión.

**Criterios de aceptación (formato EARS):**

- CUANDO el agente entrega un análisis (modo tarea o standalone), EL SISTEMA DEBE responder en el chat con ≤ 150 palabras: hallazgo principal + 2-4 opciones numeradas, y esperar la elección del dev antes de continuar.
- CUANDO el resumen describe un flujo de 3+ pasos o actores, EL SISTEMA DEBE usar un diagrama Mermaid en lugar de prosa.
- CUANDO el dev elige una opción, EL SISTEMA DEBE expandir solo ese tema con el mismo presupuesto, y ofrecer de nuevo los temas que queden abiertos.
- CUANDO corre `sdd-analyze` standalone, EL SISTEMA DEBE persistir el análisis extendido en `.sdd/notes/<slug>.md`.
- CUANDO ya existe una nota del mismo tema, EL SISTEMA DEBE leerla y continuarla, no crear otra.
- SI el dev pide explícitamente el análisis completo, EL SISTEMA DEBE volcarlo sin recortar.

**Reglas de negocio afectadas:** BR-064, BR-065, BR-066 (nuevas, ya en `.sdd/domain.md`). Respeta BR-059 y BR-061.

**Fuera de alcance:**

- Validación automática de longitud de la respuesta en chat (`sdd validate` no la ve).
- Cambiar los presupuestos de `spec.md`/`plan.md` u otras skills SDD.
- Comando nuevo para listar o abrir notas (`.sdd/notes/` se navega a mano).

**Impacto en arquitectura/catálogo:** skill `sdd-analyze` (SKILL.md, `references/formatos-respuesta.md`, ejemplos) y `src/lib/agentsmd.js` (`buildBlock`). Sin ADR: no contradice ninguno vigente. C4 sin cambios.

---
_Aprobación del dev: pendiente_
