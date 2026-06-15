import { join } from 'node:path';
import { read, write } from './fsutil.js';
import { renderCatalogMd } from './catalog.js';

const BEGIN = '<!-- sddkit:begin -->';
const END = '<!-- sddkit:end -->';

export function buildBlock(stack, cat, date) {
  return `${BEGIN}
<!-- Bloque gestionado por sddkit (se regenera con \`sdd scan\`). Todo lo de afuera del bloque es del equipo y nunca se toca. Última actualización: ${date} -->

## Triggers automáticos de skills

Cuando el usuario escriba un mensaje, ejecutá automáticamente:

- **\`/sdd-task\`** si detectás palabras clave de cambio: _agregar, crear, implementar, cambiar, refactor, bug_
- **\`/sdd-analyze\`** si detectás palabras clave de pregunta SIN cambio: _¿, cómo, por qué, investigar, entender, verificar_

## Ante dudas o incongruencias: preguntale al dev

Preguntar no es una falla — es la respuesta correcta cuando algo no cierra. Si encontrás un requisito que contradice el código existente, una instrucción que violaría una convención del catálogo o una regla de negocio/ADR ya documentada, información que falta o es ambigua, o cualquier otra cosa que simplemente no tiene sentido, **frená y preguntale al dev antes de seguir** — no avances con una suposición. Las decisiones menores que el buen juicio normal resuelve no necesitan esto: esas resolvélas vos y seguí.

## Arquitectura (modelo C4 vivo)

Antes de hacer cambios estructurales, leé la documentación de arquitectura en \`.sdd/c4/\`:

- \`.sdd/LEARNINGS.md\` — aprendizajes curados de tareas anteriores (LEELO PRIMERO si existe)
- \`.sdd/domain.md\` — glosario, entidades y **reglas de negocio (BR-NNN): vinculantes igual que el catálogo**; las specs las citan por ID
- \`.sdd/decisions/\` — ADRs: el porqué de las decisiones de arquitectura; no contradigas una aceptada sin ADR nuevo
- \`.sdd/c4/context.md\` — qué es el sistema y con qué se integra
- \`.sdd/c4/containers.md\` — unidades desplegables y stores de datos
- \`.sdd/c4/components.md\` — módulos internos y sus roles

Si tu cambio modifica la arquitectura (nuevo módulo, nueva dependencia externa, nuevo store de datos), **actualizá esos archivos como parte del mismo cambio**. Las preguntas abiertas del proyecto están indexadas en \`.sdd/QUESTIONS.md\` junto con las fuentes de documentación existente del repo: usá esas fuentes (y el código) para responderlas cuando tengas contexto, escribiendo las respuestas en los docs C4. Lo que no puedas responder con certeza, preguntáselo al dev.

## Catálogo de convenciones validadas

Estas decisiones fueron validadas por el equipo. **Cumplilas siempre** — no introduzcas variantes nuevas de un topic ya decidido:

${renderCatalogMd(cat)}

Hay candidatos pendientes de decisión en \`.sdd/patterns.json\`. Si tu tarea toca un topic pendiente (hay más de una forma de hacerlo en el código), **preguntale al dev cuál variante usar antes de implementar** y sugerile registrarla con \`sdd decide\`.

## Flujo SDD (spec-driven development)

Para cualquier tarea no trivial (feature, endpoint, módulo, refactor), aplicá este flujo **automáticamente, sin que te lo pidan**:

El flujo deja artefactos en \`.sdd/tasks/<id>/\` (requirement.md verbatim, spec.md refinada, plan.md con pasos) que permiten pausar, retomar en otra sesión y auditar:

1. **Capturar** — \`sdd task new "<requisito verbatim del dev>"\` y seguí el contrato que imprime.
2. **Spec** — análisis CRÍTICO primero (el requisito es una hipótesis: ¿ya existe?, ¿hay algo más simple?, ¿riesgos? — recomendación honesta, incluso "reconsiderar"), clarificación sin límite de preguntas (en tandas, registradas en spec.md), spec refinada con criterios EARS + **métrica de impacto** (baseline → resultado esperado) → **aprobación del dev** → \`sdd task status <id> specified\`.
3. **Plan** — pasos chicos verificables en plan.md (tests antes que implementación; nivel de modelo por paso: \`rapido\`/\`medio\`/\`fuerte\`, mapeados a modelos concretos en \`.sdd/config.json → models\`) → **aprobación del dev** → \`sdd task status <id> planned\`.
4. **Ejecutar (orquestador/workers)** — \`sdd task status <id> in-progress\`. El agente principal NO implementa: lanza cada paso (incluidos los \`fuerte\`) en un subagente fresco con el modelo de su nivel, que lee los archivos de la tarea por sí mismo. El orquestador verifica cada resultado y recién entonces marca el checkbox. Subagente bloqueado → devuelve la pregunta, el orquestador la resuelve con el dev y la registra en spec.md. Pausar: \`sdd task status <id> paused\`. Retomar: \`sdd task show <id>\`.
5. **Cierre con retro** — \`sdd task status <id> done\` exige retro.md completa: resultado de la métrica vs baseline, desvíos del plan, aprendizajes. Cosechá los generales a \`.sdd/LEARNINGS.md\` (curado, máx ~30) y promové lo reusable al catálogo o los docs C4. Así cada tarea mejora a las siguientes. El pre-commit corre \`sdd validate\` solo.
${END}`;
}

/** Crea o actualiza AGENTS.md sin tocar contenido ajeno al bloque gestionado. */
export function upsertAgentsMd(root, stack, cat, date) {
  const p = join(root, 'AGENTS.md');
  const block = buildBlock(stack, cat, date);
  const existing = read(p);
  let next;
  let action;
  if (existing === null) {
    next = `# AGENTS.md — ${stack.name}\n\n${stack.description ? stack.description + '\n\n' : ''}${block}\n`;
    action = 'creado';
  } else if (existing.includes(BEGIN) && existing.includes(END)) {
    next = existing.slice(0, existing.indexOf(BEGIN)) + block + existing.slice(existing.indexOf(END) + END.length);
    action = 'bloque gestionado actualizado (el resto quedó intacto)';
  } else {
    next = existing.trimEnd() + '\n\n' + block + '\n';
    action = 'bloque gestionado agregado al final (contenido previo intacto)';
  }
  write(p, next);
  return action;
}
