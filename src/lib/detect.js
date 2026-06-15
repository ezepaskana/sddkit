import { basename, join } from 'node:path';
import { read, readJSON, existsSync } from './fsutil.js';

const JS_FRAMEWORKS = {
  express: 'Express', fastify: 'Fastify', '@nestjs/core': 'NestJS', next: 'Next.js',
  react: 'React', vue: 'Vue', svelte: 'Svelte', koa: 'Koa', '@angular/core': 'Angular',
  'react-native': 'React Native', electron: 'Electron', astro: 'Astro', remix: 'Remix',
};
const JS_DATA = {
  prisma: 'Prisma', mongoose: 'MongoDB (mongoose)', pg: 'PostgreSQL (pg)', mysql2: 'MySQL',
  redis: 'Redis', ioredis: 'Redis', sqlite3: 'SQLite', 'better-sqlite3': 'SQLite',
  typeorm: 'TypeORM', sequelize: 'Sequelize', knex: 'Knex', mongodb: 'MongoDB',
};
const PY_MARKERS = {
  django: 'Django', flask: 'Flask', fastapi: 'FastAPI', sqlalchemy: 'SQLAlchemy',
  celery: 'Celery', psycopg: 'PostgreSQL (psycopg)', pymongo: 'MongoDB (pymongo)',
};
const EXT_LANG = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript',
  cjs: 'JavaScript', py: 'Python', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin',
  rb: 'Ruby', php: 'PHP', cs: 'C#', swift: 'Swift',
};

export function detectStack(root, files) {
  const s = {
    name: basename(root), description: '', languages: [], frameworks: [],
    dataStores: [], workspaces: [], monorepo: false,
  };
  const pkg = readJSON(join(root, 'package.json'));
  if (pkg) {
    s.name = pkg.name || s.name;
    s.description = pkg.description || '';
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const d of Object.keys(deps)) {
      if (JS_FRAMEWORKS[d]) s.frameworks.push(JS_FRAMEWORKS[d]);
      if (JS_DATA[d]) s.dataStores.push(JS_DATA[d]);
    }
    if (pkg.workspaces) {
      s.monorepo = true;
      s.workspaces = Array.isArray(pkg.workspaces) ? pkg.workspaces : (pkg.workspaces.packages || []);
    }
  }
  const pyTxt = ((read(join(root, 'pyproject.toml')) || '') + (read(join(root, 'requirements.txt')) || '')).toLowerCase();
  if (pyTxt) {
    for (const [k, v] of Object.entries(PY_MARKERS)) if (pyTxt.includes(k)) s.frameworks.push(v);
  }
  const javaTxt = ((read(join(root, 'pom.xml')) || '') + (read(join(root, 'build.gradle')) || '') + (read(join(root, 'build.gradle.kts')) || '')).toLowerCase();
  if (javaTxt) {
    for (const [k, v] of Object.entries({
      'spring-boot': 'Spring Boot', 'spring-webmvc': 'Spring MVC', quarkus: 'Quarkus', javalin: 'Javalin',
      micronaut: 'Micronaut', hibernate: 'Hibernate', 'spring-data-jpa': 'Spring Data JPA',
    })) if (javaTxt.includes(k)) s.frameworks.push(v);
    for (const [k, v] of Object.entries({
      postgresql: 'PostgreSQL', mysql: 'MySQL', 'mongodb-driver': 'MongoDB', h2database: 'H2', redis: 'Redis',
    })) if (javaTxt.includes(k)) s.dataStores.push(v);
  }
  const counts = {};
  for (const f of files) {
    const ext = f.split('.').pop();
    const lang = EXT_LANG[ext];
    if (lang) counts[lang] = (counts[lang] || 0) + 1;
  }
  s.languages = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([lang, n]) => ({ lang, files: n }));
  s.frameworks = [...new Set(s.frameworks)];
  s.dataStores = [...new Set(s.dataStores)];
  return s;
}

const AGENT_MARKERS = [
  ['AGENTS.md', 'AGENTS.md (estandar multi-agente)'],
  ['CLAUDE.md', 'CLAUDE.md (Claude Code)'],
  ['.claude/skills', 'Skills de Claude Code'],
  ['.claude/commands', 'Comandos de Claude Code'],
  ['.claude/settings.json', 'Settings de Claude Code'],
  ['.cursor/rules', 'Rules de Cursor'],
  ['.cursorrules', 'Rules de Cursor (legacy)'],
  ['.github/copilot-instructions.md', 'Instrucciones de Copilot'],
  ['.windsurfrules', 'Rules de Windsurf'],
  ['GEMINI.md', 'GEMINI.md (Gemini CLI)'],
];

/** Detecta configuracion de agentes ya existente en el repo (modo merge vs desde cero). */
export function detectAgentEnv(root) {
  return AGENT_MARKERS
    .filter(([p]) => existsSync(join(root, p)))
    .map(([path, label]) => ({ path, label }));
}

/** Detecta documentación existente en el repo (fuente para responder preguntas pendientes). */
export function detectDocs(root, files) {
  const sources = [];
  for (const d of ['docs', 'doc', 'documentation', 'wiki', 'adr', 'adrs', '.adr']) {
    const inside = files.filter((f) => f.startsWith(d + '/'));
    if (inside.length) {
      const md = inside.filter((f) => /\.(md|markdown|txt|adoc|rst)$/i.test(f));
      sources.push({ path: d + '/', files: inside.length, docs: md.slice(0, 15) });
    }
  }
  if (files.includes('README.md')) sources.push({ path: 'README.md', files: 1, docs: ['README.md'] });
  return sources;
}
