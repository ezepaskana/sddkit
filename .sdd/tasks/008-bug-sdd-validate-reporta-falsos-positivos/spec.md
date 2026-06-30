# Spec — tarea 008: Fix falso positivo de drift en sdd validate con tablas secundarias

> Estado: borrador. El agente completa este archivo con la spec formal. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como desarrollador que usa sddkit en un proyecto Java (o cualquier proyecto donde un agente enriquece `components.md` con tablas secundarias), quiero que `sdd validate` no reporte warnings de drift por las entradas de esas tablas secundarias, para que el pre-commit solo muestre drift real y no noise permanente que oscurezca problemas genuinos.

**Criterios de aceptación (formato EARS):**

- CUANDO `sdd validate` corre y `.sdd/c4/components.md` existe, EL SISTEMA DEBE extraer los módulos documentados (`docDirs`) únicamente de la primera sección del archivo — el texto que precede al primer encabezado de nivel 2 o 3 (`##`/`###`) — sin importar el contenido que aparezca después de ese primer encabezado.

- CUANDO `components.md` contiene una o más tablas en secciones secundarias (después del primer `##` o `###`, incluyendo la sección manual `<!-- sdd:manual -->` o `## ❓ VALIDAR con el equipo`), EL SISTEMA NO DEBE incluir las entradas de esas tablas en `docDirs` ni emitir warnings de drift por ellas.

- CUANDO todos los módulos devueltos por `componentGroups(files)` están presentes en la tabla principal de `components.md` y no hay módulos en la tabla principal que no existan en el repo, EL SISTEMA DEBE reportar 0 warnings de drift (ni falsos positivos por tablas secundarias).

- CUANDO un módulo que figura en la tabla principal de `components.md` ya no existe en el repo, EL SISTEMA DEBE emitir el warning `Drift: "X" figura en .sdd/c4/components.md pero ya no existe en el repo → corré \`sdd scan\`` (comportamiento sin cambios respecto al actual).

- CUANDO un módulo detectado por `componentGroups(files)` no figura en la tabla principal de `components.md`, EL SISTEMA DEBE emitir el warning `Drift: el módulo "X" existe en el repo pero no figura en .sdd/c4/components.md → corré \`sdd scan\`` (comportamiento sin cambios respecto al actual).

- CUANDO `components.md` no contiene ningún encabezado `##`/`###` (archivo solo con tabla principal, sin secciones), EL SISTEMA DEBE comportarse idéntico al caso con secciones — toma todo el archivo como primera sección y extrae la tabla normalmente.

**Reglas de negocio afectadas:** BR-043 (nueva — define el scope de extracción de `docDirs`). Sin impacto en BR-037 (sdd scan preserva el archivo existente).

**Fuera de alcance:**

- No se modifica `genComponents` ni la estructura generada de `components.md`.
- No se agrega soporte para que el check de drift considere múltiples tablas de forma intencional (ej: validar también las subcapas). Si se quiere eso, es una tarea separada.
- No se cambia el comportamiento del check de catálogo, check de preguntas abiertas, ni reporte de tareas activas en `validate.js`.
- No se modifica `componentGroups` para que drille más de un nivel de profundidad en estructuras Java.

**Impacto en arquitectura/catálogo:**

- Módulo afectado: `src/commands` (`validate.js`) — cambio de 2 líneas en la extracción de `docDirs`.
- Módulo de test: se agrega `src/commands/validate.test.js` (nuevo, sin test previo para drift check).
- Convención `module-system → esm` aplica (el archivo ya es ESM, no cambia).
- No requiere ADR ni cambios en C4 — el cambio es un fix de un extractor, no un cambio arquitectural.

---
_Aprobación del dev: confirmada 2026-06-29_
