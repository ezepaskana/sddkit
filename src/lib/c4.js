import { join } from 'node:path';
import { listDirs } from './fsutil.js';

export const MANUAL_MARK = '<!-- sdd:manual — todo lo que está debajo de esta línea se preserva en regeneraciones -->';

/** Conserva la sección manual de un doc generado anterior. */
export function preserveManual(oldContent, generated) {
  if (oldContent) {
    const i = oldContent.indexOf(MANUAL_MARK);
    if (i !== -1) return generated + '\n' + oldContent.slice(i);
  }
  return generated + '\n' + MANUAL_MARK + '\n\n## Notas del equipo\n\n_(esta sección no se pisa al regenerar)_\n';
}

function mermaidSafe(s) {
  return String(s).replace(/"/g, "'").replace(/\n/g, ' ').slice(0, 120);
}

function sanitizeId(s) {
  return String(s).replace(/[^a-zA-Z0-9]/g, '_');
}

export function buildContainers(root, stack) {
  const containers = [];
  if (stack.monorepo && stack.workspaces.length) {
    for (const pat of stack.workspaces) {
      if (pat.endsWith('/*')) {
        const base = pat.slice(0, -2);
        for (const d of listDirs(join(root, base))) {
          containers.push({ id: sanitizeId(base + '_' + d), name: `${base}/${d}`, tech: 'workspace' });
        }
      } else {
        containers.push({ id: sanitizeId(pat), name: pat, tech: 'workspace' });
      }
    }
  }
  if (!containers.length) {
    containers.push({
      id: 'app',
      name: stack.name,
      tech: stack.frameworks.slice(0, 3).join(', ') || (stack.languages[0]?.lang ?? 'app'),
    });
  }
  return containers;
}

export function genContext(stack, date) {
  const questions = [
    '¿Quiénes son los usuarios / actores externos del sistema?',
    ...(stack.description ? [] : ['¿Cuál es el propósito del sistema en una frase?']),
    '¿Con qué sistemas externos se integra (APIs de terceros, colas, webhooks)?',
  ];
  return `# C4 — Nivel 1: Contexto

> Generado por sddkit el ${date}. Regenerado por \`sdd scan\` — escribí tus notas debajo de la marca manual.

**Sistema:** ${stack.name}
**Descripción:** ${stack.description || '_(pendiente — ver preguntas abajo)_'}
**Stack detectado:** ${stack.languages.map((l) => `${l.lang} (${l.files})`).join(', ') || 's/d'}${stack.frameworks.length ? ' · ' + stack.frameworks.join(', ') : ''}

\`\`\`mermaid
flowchart LR
  user(["Usuario<br/><i>rol por validar</i>"])
  sys["<b>${mermaidSafe(stack.name)}</b><br/>${mermaidSafe(stack.description || 'descripción pendiente')}"]
  user -- usa --> sys
\`\`\`

## ❓ VALIDAR con el equipo

${questions.map((q) => '- [ ] ' + q).join('\n')}

> Agente: si trabajás en este repo y podés responder alguna pregunta con certeza a partir del código, respondela y marcá el checkbox. Si no, preguntale al dev.
`;
}

export function genContainers(stack, containers, consumptions, date) {
  const dbLines = stack.dataStores.map((d, i) => `  db${i}[("${mermaidSafe(d)}")]`);
  const contLines = containers.map((c) => `    ${c.id}["<b>${mermaidSafe(c.name)}</b><br/>${mermaidSafe(c.tech)}"]`);
  const relLines = [];
  if (containers.length && stack.dataStores.length) {
    stack.dataStores.forEach((_, i) => relLines.push(`  ${containers[0].id} -- lee/escribe --> db${i}`));
  }
  const table = containers.map((c) => `| \`${c.name}\` | ${c.tech} | ❓ responsabilidad por validar |`).join('\n');
  const consumptionsTable = consumptions.length
    ? `| Método | Destino | Archivo |\n|---|---|---|\n${consumptions.map((c) => `| ${c.method ?? '?'} | ${c.target} | ${c.file} |`).join('\n')}`
    : '_Sin dependencias salientes detectadas._';
  return `# C4 — Nivel 2: Contenedores

> Generado por sddkit el ${date}.

| Contenedor | Tecnología | Responsabilidad |
|---|---|---|
${table}
${stack.dataStores.map((d) => `| _(store)_ \`${d}\` | ${d} | persistencia |`).join('\n')}

\`\`\`mermaid
flowchart TB
  subgraph sistema["${mermaidSafe(stack.name)}"]
${contLines.join('\n')}
  end
${dbLines.join('\n')}
${relLines.join('\n')}
\`\`\`

## Dependencias salientes

${consumptionsTable}

## ❓ VALIDAR con el equipo

- [ ] ¿Las responsabilidades de cada contenedor son correctas?
- [ ] ¿Falta algún contenedor que no se deduce del repo (workers, crons, lambdas)?
`;
}

/** Agrupa archivos por módulo de primer nivel (bajo src/, app/, lib/ o raíz). */
export function componentGroups(files) {
  const srcRoot = ['src', 'app', 'lib'].find((d) => files.some((f) => f.startsWith(d + '/'))) || '';
  const groups = {};
  for (const f of files) {
    if (srcRoot && !f.startsWith(srcRoot + '/')) continue;
    const rest = srcRoot ? f.slice(srcRoot.length + 1) : f;
    const seg = rest.includes('/') ? rest.split('/')[0] : '(raíz)';
    groups[seg] = (groups[seg] || 0) + 1;
  }
  return { srcRoot, groups };
}

const ROLES = {
  routes: 'Capa de rutas / API HTTP', controllers: 'Controladores', services: 'Lógica de negocio',
  models: 'Modelos de datos', middleware: 'Middleware', middlewares: 'Middleware',
  utils: 'Utilidades', helpers: 'Utilidades', components: 'Componentes UI', pages: 'Páginas',
  views: 'Vistas', hooks: 'React hooks', store: 'Estado global', stores: 'Estado global',
  db: 'Acceso a datos', repositories: 'Repositorios (acceso a datos)', config: 'Configuración',
  tests: 'Tests', test: 'Tests', api: 'Capa API', schemas: 'Esquemas / validación',
  types: 'Tipos', migrations: 'Migraciones de DB', jobs: 'Jobs / workers', workers: 'Jobs / workers',
  commands: 'Comandos', lib: 'Librería interna', core: 'Núcleo',
};

export function genComponents(root, files, date) {
  const { srcRoot, groups } = componentGroups(files);
  const rows = Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .map(([d, n]) => `| \`${srcRoot && d !== '(raíz)' ? srcRoot + '/' + d : d}\` | ${n} | ${ROLES[d] || '❓ por validar'} |`);
  const pending = Object.keys(groups).filter((d) => !ROLES[d]);
  return `# C4 — Nivel 3: Componentes

> Generado por sddkit el ${date}. Base: \`${srcRoot || '(raíz del repo)'}\`.

| Módulo | Archivos | Rol |
|---|---|---|
${rows.join('\n')}

## ❓ VALIDAR con el equipo

${pending.length
    ? pending.map((d) => `- [ ] ¿Cuál es el rol del módulo \`${d}\`?`).join('\n')
    : '- [x] Todos los módulos tienen rol asignado (heurístico — revisar).'}
`;
}
