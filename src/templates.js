// Cursor no soporta skills con estructura: recibe una rule plana.
// Las skills reales viven en skills/ (una carpeta por fase del flujo SDD).
export const CURSOR_RULE = `---
description: Flujo SDD con documentación C4 viva y catálogo de convenciones (sddkit)
alwaysApply: true
---

Este repo usa sddkit. Antes de implementar features, endpoints o refactors:

1. Leé \`.sdd/c4/\` (context, containers, components) para ubicar el cambio en la arquitectura.
2. Las convenciones del "Catálogo de convenciones validadas" en AGENTS.md son obligatorias. No introduzcas variantes nuevas de un topic decidido.
3. Si \`.sdd/patterns.json\` muestra un topic con múltiples estilos y sin decisión, mostrale al dev las opciones y registrá su elección con \`sdd decide <topic> <variante> --why="..."\`.
4. Flujo para tareas no triviales (toda tarea con más de un archivo o cualquier ambigüedad): \`sdd task new "<requisito verbatim>"\` → analizá el repo → preguntá al dev lo ambiguo y completá spec.md (criterios EARS) → APROBACIÓN del dev → completá plan.md con pasos chicos verificables → APROBACIÓN → \`sdd task status <id> in-progress\` y ejecutá un paso a la vez marcando checkboxes en plan.md. Pausar: \`sdd task status <id> paused\`; retomar: \`sdd task show <id>\`. Cerrar: \`sdd task status <id> done\` (actualizando .sdd/c4/ si cambió la arquitectura).
5. Cuando puedas, respondé preguntas de \`.sdd/QUESTIONS.md\` usando la documentación existente del repo; escribí las respuestas en los docs C4.
6. No migres código legacy a la convención canónica salvo pedido explícito. No uses --no-verify.
`;
