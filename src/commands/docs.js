import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { read, write } from '../lib/fsutil.js';
import { replaceSection } from '../lib/livingDocs.js';

/**
 * Categorías documentables (BR-052) y dónde vive cada una: archivo destino
 * (relativo a la raíz del repo) + heading de nivel 2 exacto dentro de él.
 */
const TARGETS = [
  { category: 'inputs', file: ['.sdd', 'c4', 'components.md'], heading: 'Inputs' },
  { category: 'outputs', file: ['.sdd', 'c4', 'components.md'], heading: 'Outputs' },
  { category: 'entidades', file: ['.sdd', 'domain.md'], heading: 'Entidades principales' },
  { category: 'casos_de_uso', file: ['.sdd', 'domain.md'], heading: 'Casos de uso' },
];

/**
 * Archivos stageados en el index de git. Best-effort: si no hay `.git`, git no
 * está instalado o el comando falla por cualquier motivo, devuelve `[]` en vez
 * de tirar (el hook nunca puede romper un commit — BR-053).
 */
function stagedFiles(root) {
  let out;
  try {
    out = execSync('git diff --cached --name-only', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return [];
  }
  return String(out).split('\n').map((l) => l.trim()).filter((l) => l !== '');
}

/** Lee del working tree los archivos stageados; descarta los ilegibles (borrados, binarios). */
function readStaged(root, paths) {
  const files = [];
  for (const path of paths) {
    const content = read(join(root, path));
    if (typeof content === 'string') files.push({ path, content });
  }
  return files;
}

function reasonOf(result, err) {
  if (err) return err?.message ? err.message : String(err);
  const reason = result?.reason;
  return typeof reason === 'string' && reason.trim() !== '' ? reason : 'el LLM no devolvió una sección válida';
}

/**
 * `sdd docs`: hook pre-commit que documenta los cambios stageados con el LLM
 * (BR-051 a BR-054).
 *
 * Manda los archivos del index a `generateSection` una vez por categoría
 * (`inputs`, `outputs`, `entidades`, `casos_de_uso`) y escribe SOLO la sección
 * correspondiente de `.sdd/c4/components.md` / `.sdd/domain.md`, preservando
 * intacto el resto del archivo (BR-054, via `replaceSection`).
 *
 * Nunca tira ni bloquea el commit (BR-053): si no hay nada stageado no hace
 * nada, y si una categoría falla (o el cliente LLM explota) deja esa sección en
 * su última versión válida, loguea una advertencia y sigue con las demás.
 *
 * @param {string} root Raíz del repo.
 * @param {object} flags Flags de la CLI (hoy sin uso; reservado).
 * @param {object} [deps] Inyección para tests (`generateSection`).
 */
export async function docs(root, flags, deps = {}) {
  const paths = stagedFiles(root);
  if (paths.length === 0) return;

  const files = readStaged(root, paths);
  if (files.length === 0) return;

  const generateFn = deps.generateSection ?? (await import('../lib/llmClient.js')).generateSection;

  for (const target of TARGETS) {
    let result;
    let err;
    try {
      result = await generateFn(target.category, files);
    } catch (e) {
      err = e;
    }

    if (!err && result?.status === 'ok' && typeof result.markdown === 'string') {
      const path = join(root, ...target.file);
      const current = read(path);
      if (current === null) {
        console.log(`⚠ ${target.category}: no se pudo leer ${target.file.join('/')} — sección sin actualizar`);
        continue;
      }
      try {
        write(path, replaceSection(current, target.heading, result.markdown));
      } catch (e) {
        console.log(`⚠ ${target.category}: no se pudo escribir ${target.file.join('/')} (${reasonOf(null, e)}) — sección sin actualizar`);
      }
      continue;
    }

    console.log(`⚠ ${target.category}: ${reasonOf(result, err)} — sección sin actualizar`);
  }
}
