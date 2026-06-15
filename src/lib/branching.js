/**
 * branching.js — Gestión de políticas de branching
 *
 * Lee, valida y genera políticas de branching (.sdd/branching.md) y nombres
 * de rama según el patrón configurado (o los defaults de sddkit).
 */

import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { userInfo } from 'node:os';
import { read, write, existsSync } from './fsutil.js';

const JSON_BLOCK_RE = /```json\n([\s\S]*?)\n```/;

const BRANCH_NAME_MAX = 40;

/**
 * Lee `${rootPath}/.sdd/branching.md`, extrae el bloque ```json embebido y
 * retorna la versión activa "aplanada" (convención/flujo/patrón) junto con
 * `versions` (array completo) y `active` (índice).
 *
 * Retorna `null` si el archivo no existe, no contiene un bloque ```json o el
 * JSON está malformado (nunca lanza excepción).
 */
export function readPolicy(rootPath) {
  const content = read(join(rootPath, '.sdd', 'branching.md'));
  if (content === null) return null;

  const match = content.match(JSON_BLOCK_RE);
  if (!match) return null;

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }

  if (!data || !Array.isArray(data.versions)) return null;

  const active = data.active;
  const activeVersion = data.versions[active];
  if (!activeVersion) return null;

  return {
    ...activeVersion,
    versions: data.versions,
    active,
  };
}

/**
 * Valida que `policy` tenga los campos requeridos: `convención`, `flujo` y
 * `patrón`, todos strings no vacíos.
 *
 * Retorna `{valid: true, errors: []}` o `{valid: false, errors: [...]}`.
 * Nunca lanza excepción, incluso si `policy` es `null`/`undefined`.
 */
export function validatePolicy(policy) {
  if (!policy) {
    return { valid: false, errors: ['policy is null or undefined'] };
  }

  const errors = [];
  if (!policy.convención || typeof policy.convención !== 'string') errors.push('Missing field: convención');
  if (!policy.flujo || typeof policy.flujo !== 'string') errors.push('Missing field: flujo');
  if (!policy.patrón || typeof policy.patrón !== 'string') errors.push('Missing field: patrón');

  return { valid: errors.length === 0, errors };
}

/**
 * Retorna la policy default de sddkit: Conventional Commits + GitHub Flow +
 * patrón de ramas `task/{numero}-{slug}`.
 */
export function getBranchingDefaults() {
  return {
    convención: 'Conventional Commits',
    flujo: 'GitHub Flow',
    patrón: 'task/{numero}-{slug}',
  };
}

/**
 * Retorna la policy activa del repo: lo que devuelva `readPolicy(rootPath)`
 * si existe, o los defaults de sddkit si no hay `.sdd/branching.md` (o está
 * malformado).
 */
export function getActiveBranching(rootPath) {
  const policy = readPolicy(rootPath);
  return policy ?? getBranchingDefaults();
}

/** Slugifica un texto: lowercase, espacios → guiones, elimina no-alfanumérico (excepto guión). */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Opciones propuestas para cada pregunta de `setupBranchingPolicy()`. */
const BRANCHING_OPTIONS = {
  convención: ['Conventional Commits', 'Semantic Commit Messages', 'Gitmoji'],
  flujo: ['GitHub Flow', 'Git Flow', 'Trunk Based Development'],
  patrón: ['task/{numero}-{slug}', 'feature/{numero}-{slug}', '{numero}-{slug}'],
};

/**
 * Pregunta (interactivamente, si hay `rl`) la política de branding del repo:
 * convención de commits, flujo de ramas y patrón de nombres de rama.
 *
 * - `rl`: instancia de `readline/promises` interface ya abierta (no se cierra
 *   acá; el caller es responsable de cerrarla). Si es `null`/`undefined`, no
 *   se pregunta nada y se retornan los defaults de sddkit directamente
 *   (modo agente / no interactivo).
 *
 * Retorna `{convención, flujo, patrón}` (siempre válido según
 * `validatePolicy()`).
 */
export async function setupBranchingPolicy(rl) {
  const defaults = getBranchingDefaults();
  if (!rl) return defaults;

  const result = {};
  for (const field of ['convención', 'flujo', 'patrón']) {
    const options = BRANCHING_OPTIONS[field];
    const def = defaults[field];
    console.log(`\n¿Qué ${field} de branding usás?`);
    options.forEach((opt, i) => console.log(`   ${i + 1}) ${opt}${opt === def ? ' (default)' : ''}`));
    console.log(`   ${options.length + 1}) otro (escribir manualmente)`);
    const defIdx = options.indexOf(def) + 1;
    const ans = (await rl.question(`   Elegí 1-${options.length + 1} [Enter=${defIdx}]: `)).trim();

    if (ans === '') {
      result[field] = def;
      continue;
    }
    const idx = parseInt(ans, 10) - 1;
    if (idx >= 0 && idx < options.length) {
      result[field] = options[idx];
    } else if (idx === options.length) {
      const custom = (await rl.question(`   Escribí tu ${field}: `)).trim();
      result[field] = custom || def;
    } else {
      result[field] = def;
    }
  }

  return result;
}

/**
 * Genera el nombre de rama según `policy.patrón` (ej: `task/{numero}-{slug}`),
 * reemplazando `{numero}` por `taskId` y `{slug}` por el slug de `taskTitle`.
 * El slug se trunca para que la rama completa no exceda `BRANCH_NAME_MAX`
 * caracteres (40).
 */
export function formatBranchName(taskId, taskTitle, policy) {
  const pattern = policy?.patrón ?? getBranchingDefaults().patrón;
  const numero = String(taskId);
  const slugFull = slugify(taskTitle);

  // Largo disponible para el slug = total - resto del patrón con {numero} ya
  // sustituido y {slug} vacío.
  const withoutSlug = pattern.replace('{numero}', numero).replace('{slug}', '');
  const available = Math.max(0, BRANCH_NAME_MAX - withoutSlug.length);

  let slug = slugFull.slice(0, available);
  // Evitar que el truncado deje un guión colgando al final.
  slug = slug.replace(/-+$/, '');

  return pattern.replace('{numero}', numero).replace('{slug}', slug);
}

/**
 * Detecta el autor para registrar en `.sdd/branching.md`: `git config
 * user.name` si está disponible, o el usuario del sistema operativo.
 * Nunca lanza excepción.
 */
export function getGitAuthor(rootPath) {
  try {
    const name = execSync('git config user.name', {
      cwd: rootPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (name) return name;
  } catch { /* sin git o sin user.name configurado */ }

  try {
    return userInfo().username;
  } catch {
    return 'unknown';
  }
}

/**
 * Escribe `${rootPath}/.sdd/branching.md` con `policy` como primera (y única)
 * versión del histórico: `{versions: [{date, author, ...policy}], active: 0}`.
 *
 * `meta` admite `{date, author}` (con defaults: hoy y `getGitAuthor()`).
 */
export function writeBranchingPolicy(rootPath, policy, meta = {}) {
  const date = meta.date ?? new Date().toISOString().slice(0, 10);
  const author = meta.author ?? getGitAuthor(rootPath);

  const data = {
    versions: [{ date, author, ...policy }],
    active: 0,
  };

  const content = [
    '# Branching Policy',
    '',
    '```json',
    JSON.stringify(data, null, 2),
    '```',
    '',
  ].join('\n');

  write(join(rootPath, '.sdd', 'branching.md'), content);
  return data;
}

/**
 * Asegura que `${rootPath}/.sdd/branching.md` exista, preguntando (si
 * `rl` está presente) o usando los defaults de sddkit (si no).
 *
 * - Si `.sdd/branching.md` YA existe, no hace nada y retorna
 *   `{created: false, policy: getActiveBranching(rootPath)}`.
 * - Si NO existe, llama a `setupBranchingPolicy(rl)`, escribe el archivo con
 *   `writeBranchingPolicy()` (versión 1, `active: 0`, `date` de hoy y
 *   `author` detectado vía `getGitAuthor()`) y retorna
 *   `{created: true, policy}`.
 *
 * Usada por `sdd setup` y `sdd init` para compartir la misma lógica.
 */
export async function ensureBranchingPolicy(rootPath, { rl } = {}) {
  if (existsSync(join(rootPath, '.sdd', 'branching.md'))) {
    return { created: false, policy: getActiveBranching(rootPath) };
  }

  const policy = await setupBranchingPolicy(rl);
  writeBranchingPolicy(rootPath, policy);
  return { created: true, policy };
}

/**
 * Retorna el nombre de la rama actual (`git branch --show-current`) en
 * `rootPath`, o `null` si falla (sin `.git`, git no disponible, etc.).
 * Nunca lanza excepción.
 */
export function getCurrentBranch(rootPath) {
  try {
    const out = execSync('git branch --show-current', {
      cwd: rootPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

/**
 * Valida que la rama actual del repo (`git branch --show-current`) sea
 * `branchName`. Pensada para correr DESPUÉS de ejecutar el Paso 1 (`git
 * checkout -b <branchName>`) de `sdd task execute`.
 *
 * Retorna `{valid: boolean, current: string|null, expected: string}`.
 * Nunca lanza excepción.
 */
export function validateBranchBeforeExecute(rootPath, branchName) {
  const current = getCurrentBranch(rootPath);
  return { valid: current === branchName, current, expected: branchName };
}

/**
 * Verifica si `branchName` existe en `origin` (`git branch -r`).
 *
 * Retorna `{pushed: boolean}`. Si no se puede determinar (sin `.git`, sin
 * `origin`, git no disponible), retorna `{pushed: false}`. Nunca lanza
 * excepción.
 */
export function verifyBranchPushed(rootPath, branchName) {
  try {
    const out = execSync('git branch -r', {
      cwd: rootPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const refs = out.split('\n').map((l) => l.trim());
    const pushed = refs.some((l) => l === `origin/${branchName}` || l.endsWith(`/${branchName}`));
    return { pushed };
  } catch {
    return { pushed: false };
  }
}

/**
 * Detecta la plataforma git del remoto `origin` (`git remote get-url
 * origin`): `'github' | 'azure' | 'gitlab' | 'unknown'`.
 *
 * Soporta URLs HTTPS y SSH. Si no hay remoto `origin` o git no está
 * disponible, retorna `'unknown'`. Nunca lanza excepción.
 */
export function detectGitPlatform(rootPath) {
  let url;
  try {
    url = execSync('git remote get-url origin', {
      cwd: rootPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
  if (!url) return 'unknown';

  const lower = url.toLowerCase();
  if (lower.includes('github.com')) return 'github';
  if (lower.includes('dev.azure.com') || lower.includes('visualstudio.com')) return 'azure';
  if (lower.includes('gitlab.com') || lower.includes('gitlab')) return 'gitlab';
  return 'unknown';
}

/**
 * Genera el comando de CLI para crear un PR/MR en draft, según `platform`
 * (`'github' | 'azure' | 'gitlab'`), como `{ cmd, args }` para ejecutar con
 * `spawnSync` SIN shell:
 *
 * - `github`: `gh pr create --draft --title=<title> --body=<body> --head=<rama> --base=<destino>`
 * - `azure`: `az repos pr create --source-branch <rama> --target-branch <destino> --draft --title <title> --description <body>`
 * - `gitlab`: `gl mr create --source-branch <rama> --target-branch <destino> --draft --title <title> --description <body>`
 *
 * Para cualquier otra plataforma (`'unknown'` u otra) retorna `null` — el
 * caller debe degradar a instrucciones de PR manual.
 *
 * `title`/`body`/`branch`/`base` se pasan como argumentos LITERALES (sin
 * escaping ni comillas): al ejecutarse sin shell no hay interpretación de
 * metacaracteres (defensa contra inyección).
 */
export function buildPRCommand(branchName, baseBranch, title, body, platform) {
  const strTitle = String(title);
  const strBody = String(body);

  if (platform === 'github') {
    return {
      cmd: 'gh',
      args: ['pr', 'create', '--draft', `--title=${strTitle}`, `--body=${strBody}`, `--head=${branchName}`, `--base=${baseBranch}`],
    };
  }
  if (platform === 'azure') {
    return {
      cmd: 'az',
      args: ['repos', 'pr', 'create', '--source-branch', branchName, '--target-branch', baseBranch, '--draft', '--title', strTitle, '--description', strBody],
    };
  }
  if (platform === 'gitlab') {
    return {
      cmd: 'gl',
      args: ['mr', 'create', '--source-branch', branchName, '--target-branch', baseBranch, '--draft', '--title', strTitle, '--description', strBody],
    };
  }
  return null;
}

/**
 * Mapa `platform -> nombre del binario de CLI` requerido por `buildPRCommand()`.
 */
const PLATFORM_CLI = {
  github: 'gh',
  azure: 'az',
  gitlab: 'gl',
};

/**
 * Verifica si el tool de CLI requerido por `platform` (`gh`/`az`/`gl`) está
 * disponible en el PATH (`<tool> --version`). Retorna `boolean`. Para
 * `platform` desconocida o sin tool asociado, retorna `false`. Nunca lanza
 * excepción.
 */
export function isPRToolAvailable(platform, rootPath) {
  const bin = PLATFORM_CLI[platform];
  if (!bin) return false;
  try {
    execSync(`${bin} --version`, { cwd: rootPath, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Genera las instrucciones de PR manual cuando no hay tool de CLI
 * disponible (o la plataforma es desconocida). Incluye una URL "best
 * effort" de creación de PR (`<repo>/pull/new/<rama>` estilo GitHub) cuando
 * se puede derivar del remoto `origin`; si no, indica crear el PR/MR a mano
 * en el hosting del proyecto.
 *
 * Retorna `{manual: true, message: string, url: string|null}`.
 */
export function buildManualPRInstructions(rootPath, branchName, baseBranch) {
  let repoUrl = null;
  try {
    const origin = execSync('git remote get-url origin', {
      cwd: rootPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (origin) repoUrl = toHttpsRepoUrl(origin);
  } catch { /* sin remoto origin */ }

  const url = repoUrl ? `${repoUrl}/pull/new/${branchName}` : null;
  const message = url
    ? `PR ready to create manually. Ir a: ${url}`
    : `PR ready to create manually. Crear PR/MR para \`${branchName}\` → \`${baseBranch}\` en tu plataforma de git.`;

  return { manual: true, message, url };
}

/** Convierte una URL de remoto git (HTTPS o SSH) a su forma `https://host/owner/repo` (sin `.git`). */
function toHttpsRepoUrl(remoteUrl) {
  let url = remoteUrl.trim().replace(/\.git$/, '');
  const sshMatch = url.match(/^(?:ssh:\/\/)?git@([^:/]+)[:/](.+)$/);
  if (sshMatch) return `https://${sshMatch[1]}/${sshMatch[2]}`;
  if (/^https?:\/\//.test(url)) return url;
  return null;
}
