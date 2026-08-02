import { join } from 'node:path';
import { read, write } from './fsutil.js';
import { renderCatalogMd } from './catalog.js';

const BEGIN = '<!-- sddkit:begin -->';
const END = '<!-- sddkit:end -->';

export function buildBlock(stack, cat, date) {
  return `${BEGIN}
<!-- Bloque gestionado por sddkit (se regenera con \`sdd scan\`). Todo lo de afuera del bloque es del equipo y nunca se toca. Última actualización: ${date} -->

## Triggers automáticos de skills

Ejecutá \`/sdd-task\` ante pedidos de cambio (agregar, crear, implementar, arreglar, mejorar, refactor, "quiero que X haga Y") y \`/sdd-analyze\` ante preguntas sin pedido de cambio (¿, cómo, por qué, investigar, explicar). Ambiguo → preguntale al dev: (a) implementar, (b) investigar, (c) solo charlar.

## Preferencias de respuesta

Responde siempre de forma breve y directa. Evitá explicaciones largas o preámbulos salvo que se pidan explícitamente. Priorizá código y respuestas cortas sobre prosa extensa.

Entregá el hallazgo en ≤ 150 palabras y 2-4 opciones numeradas; esperá que el dev elija antes de seguir. El detalle largo va a un archivo, nunca al chat: expandí de a un tema, a pedido.

Para mostrarle un archivo al dev, mirá el contexto de terminal: si es la terminal embebida de un IDE (\`TERMINAL_EMULATOR=JetBrains-JediTerm\` o \`TERM_PROGRAM=vscode\`), mostralo en ese mismo IDE; si es una terminal standalone, abrilo con el comando de \`.sdd/config.json → ui.opener\` si está configurado (\`<opener> "<ruta>"\`); sin \`ui.opener\`, usá tu comportamiento default.

## Ante dudas o incongruencias: preguntale al dev

Preguntar no es una falla. Si un requisito contradice el código, una instrucción violaría el catálogo o una regla BR/ADR documentada, falta información o algo no tiene sentido, **frená y preguntale al dev antes de seguir** — no avances con una suposición. Las decisiones menores resolvélas con buen juicio normal y seguí.

## Arquitectura (modelo C4 vivo)

Antes de cambios estructurales, leé \`.sdd/c4/\` (context, containers, components), \`.sdd/domain.md\` (glosario + **reglas BR-NNN, vinculantes**), \`.sdd/decisions/\` (ADRs: no contradigas una aceptada sin ADR nuevo) y \`.sdd/LEARNINGS.md\` (leelo primero si existe). Si tu cambio toca la arquitectura, **actualizá esos docs en el mismo cambio**. Preguntas abiertas en \`.sdd/QUESTIONS.md\`: respondelas con el código si podés, si no preguntale al dev.

## Catálogo de convenciones validadas

Decisiones ya validadas por el equipo. **Cumplilas siempre** — no introduzcas variantes nuevas de un topic decidido:

${renderCatalogMd(cat)}

Topics pendientes en \`.sdd/patterns.json\`: preguntale al dev cuál variante usar y sugerile \`sdd decide\`.

## Flujo SDD (spec-driven development)

Para tarea no trivial, aplicá **automáticamente**: \`sdd task new "<requisito verbatim>"\` y seguí el contrato que imprime. El detalle de cada fase vive en las skills \`sdd-task\`/\`sdd-analyze\`/\`sdd-specify\`/\`sdd-plan\`/\`sdd-execute\`/\`sdd-close\` — seguilas, no lo repitas de memoria.
${END}`;
}

const LAST_UPDATED_RE = /Última actualización: \d{4}-\d{2}-\d{2}/;

/** Normaliza la fecha del comentario "Última actualización: YYYY-MM-DD" para poder
 *  comparar dos versiones del bloque gestionado sin que la fecha cuente como cambio. */
function normalizeLastUpdated(text) {
  return text.replace(LAST_UPDATED_RE, 'Última actualización: 0000-00-00');
}

/** Crea o actualiza CLAUDE.md sin tocar contenido ajeno al bloque gestionado.
 *  Migración: si AGENTS.md tiene un bloque gestionado previo (legacy), se limpia
 *  de ahí (preservando su contenido manual) y el bloque vigente pasa a CLAUDE.md.
 *
 *  Retorno: `string | null`. Si ya existía CLAUDE.md con bloque gestionado y el
 *  contenido nuevo es idéntico al existente (ignorando la fecha de "Última
 *  actualización:"), no escribe nada (se preserva la fecha vieja) y devuelve
 *  `null` como señal de "sin cambios". En cualquier otro caso (creado, agregado
 *  al final, o bloque gestionado con contenido distinto) escribe y devuelve el
 *  string de acción. */
export function upsertAgentsMd(root, stack, cat, date) {
  const agentsPath = join(root, 'AGENTS.md');
  const claudePath = join(root, 'CLAUDE.md');
  const block = buildBlock(stack, cat, date);

  const agentsExisting = read(agentsPath);
  if (agentsExisting !== null && agentsExisting.includes(BEGIN) && agentsExisting.includes(END)) {
    const cleaned = agentsExisting.slice(0, agentsExisting.indexOf(BEGIN))
      + agentsExisting.slice(agentsExisting.indexOf(END) + END.length);
    write(agentsPath, cleaned);
  }

  const existing = read(claudePath);
  let next;
  let action;
  if (existing === null) {
    next = `# CLAUDE.md — ${stack.name}\n\n${stack.description ? stack.description + '\n\n' : ''}${block}\n`;
    action = 'creado';
  } else if (existing.includes(BEGIN) && existing.includes(END)) {
    next = existing.slice(0, existing.indexOf(BEGIN)) + block + existing.slice(existing.indexOf(END) + END.length);
    if (normalizeLastUpdated(next) === normalizeLastUpdated(existing)) {
      return null;
    }
    action = 'bloque gestionado actualizado (el resto quedó intacto)';
  } else {
    next = existing.trimEnd() + '\n\n' + block + '\n';
    action = 'bloque gestionado agregado al final (contenido previo intacto)';
  }
  write(claudePath, next);
  return action;
}
