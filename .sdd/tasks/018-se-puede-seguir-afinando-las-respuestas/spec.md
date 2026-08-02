# Spec — tarea 018: cero jerga sin traducir y opciones que digan qué se gana

> Estado: borrador. Su presupuesto es de **≤ 300 palabras** — un criterio por comportamiento observable, sin repetir la historia ni el análisis. `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como dev quiero que el resumen se entienda sin abrir la nota y que su cierre me diga qué contestar, para poder decidir sin pedir aclaraciones ni releer contexto que no tengo.

**Criterios de aceptación (formato EARS):**

- CUANDO el resumen menciona un código interno del agente (ID de roadmap, `BR-NNN`, `ADR-NNNN`, nombre de entidad propuesto), EL SISTEMA DEBE traducirlo en 3-4 palabras la primera vez que aparece, o no mencionarlo.
- CUANDO el resumen usa vocabulario técnico del dominio o rutas de archivo reales, EL SISTEMA DEBE dejarlos como están.
- CUANDO el resumen ofrece opciones, EL SISTEMA DEBE declarar en cada una el resultado que produce elegirla, no el nombre técnico de la tarea.
- CUANDO el resumen termina, EL SISTEMA DEBE cerrar con una pregunta explícita y respondible.
- SI la traducción de los códigos no entra en las 150 palabras de BR-064, EL SISTEMA DEBE recortar el detalle del hallazgo, nunca omitir la traducción.

**Reglas de negocio afectadas:** BR-067, BR-068 (nuevas, ya en `.sdd/domain.md`). Complementan BR-064; no la contradicen.

**Fuera de alcance:**

- Cambiar el presupuesto de 150 palabras o la cantidad de opciones (BR-064 queda igual).
- Validación automática: `sdd validate` no ve las respuestas del chat.
- La nota extendida (`.sdd/notes/`) sigue con jerga y códigos: su destinatario es el agente.

**Impacto en arquitectura/catálogo:** skill `sdd-analyze` (`SKILL.md`, `references/formatos-respuesta.md`, los dos ejemplos standalone) en `skills/` + mirror `.claude/skills/`, y `src/lib/agentsmd.js` (`buildBlock`). Sin ADR. C4 sin cambios.

---
_Aprobación del dev: aprobado 2026-08-02_
