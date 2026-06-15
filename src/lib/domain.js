import { MANUAL_MARK } from './c4.js';

/** Candidatos a entidades del dominio: nombres de archivo bajo models/, entities/, domain/. */
function entityCandidates(files) {
  const set = new Set();
  for (const f of files) {
    const m = f.match(/(?:^|\/)(?:models?|entities|domain|entity)\/([^/]+)\.(?:js|ts|java|kt|py|go|rb|cs)$/i);
    if (m) {
      const name = m[1].replace(/\.(model|entity|schema)$/i, '');
      if (!/^(index|types?|utils?|base)$/i.test(name)) set.add(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }
  return [...set].slice(0, 20);
}

export function genDomain(stack, files, date) {
  const entities = entityCandidates(files);
  return `# Dominio y lógica de negocio — ${stack.name}

> Generado por sddkit el ${date}. Complemento del C4: \`.sdd/c4/\` dice CÓMO está construido el sistema; este archivo dice QUÉ reglas gobiernan el negocio y QUÉ significan los términos. **Las reglas de negocio son vinculantes para los agentes, igual que el catálogo de convenciones.** Las specs deben citar las reglas afectadas por su ID (BR-NNN).

## Glosario (lenguaje del dominio)

> Términos que en este negocio significan algo específico. Evita que cada agente invente su propia interpretación.

| Término | Significado en este sistema |
|---|---|
| _(completar)_ | … |

## Entidades principales

> Qué son y qué relación tienen entre sí (no su estructura técnica — eso está en el código).

${entities.length
    ? entities.map((e) => `- **${e}** — ❓ ¿qué representa en el negocio y cuál es su ciclo de vida?`).join('\n')
    : '_(no se detectaron candidatos automáticamente — completar desde el código y la documentación)_'}

## Reglas de negocio

> Numeradas y citables (BR-001, BR-002…). Cada regla: condición + comportamiento obligado + de dónde sale (doc, dev, código). Si una tarea cambia una regla, este archivo se actualiza en el mismo cambio.

- **BR-001** — _(ejemplo de formato: "Una planta sin medidor activo no puede generar facturación. Fuente: doc/negocio.md")_ ❓ completar

## Flujos clave del negocio

> Los 3-5 recorridos que explican el sistema (qué pasa cuándo, en términos de negocio — no de código).

- [ ] ❓ ¿Cuáles son los flujos principales? (p.ej. alta de cliente → activación → primera medición → facturación)

## ❓ VALIDAR con el equipo

- [ ] ¿El glosario cubre los términos que un dev nuevo malinterpretaría?
- [ ] ¿Las reglas de negocio listadas son todas las vigentes? ¿Falta alguna que hoy solo vive en la cabeza de alguien?
`;
}

export const ADR_TEMPLATE = `# ADR NNNN — (título de la decisión)

- **Fecha:** AAAA-MM-DD · **Estado:** propuesta | aceptada | reemplazada por ADR-XXXX
- **Tarea relacionada:** .sdd/tasks/NNN (si aplica)

## Contexto

_(qué problema o fuerza llevó a decidir; qué restricciones había)_

## Decisión

_(qué se decidió, en una frase imperativa)_

## Alternativas consideradas

_(qué más se evaluó y por qué se descartó — esto es lo que más valor tiene a futuro)_

## Consecuencias

_(qué se gana, qué se sacrifica, qué deuda se asume, qué se vuelve más difícil)_
`;

export const ADR_README = `# Decisiones de arquitectura (ADRs)

> Una decisión = un archivo \`NNNN-titulo-corto.md\` (numeración secuencial), basado en \`0000-plantilla.md\`. Las escribe el agente cuando una tarea toma una decisión arquitectónica (elección de tecnología, patrón estructural, trade-off importante) — el "por qué" que el código no puede contar. NUNCA se editan para cambiar la historia: una decisión revertida se marca "reemplazada por" y se crea un ADR nuevo.

${MANUAL_MARK}
`;
