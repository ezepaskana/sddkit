import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * `sdd test` — corre el script reproducible del repo (.sdd/run-tests.mjs).
 * El script lo crea la skill sdd-test una sola vez; después, correr tests
 * no cuesta tokens de razonamiento: es un exit code.
 */
export async function test(root, pos) {
  const script = join(root, '.sdd', 'run-tests.mjs');
  if (!existsSync(script)) {
    throw new Error(
      'No existe .sdd/run-tests.mjs.\nAGENTE: crealo siguiendo la skill sdd-test (template en skills/sdd-test/templates/run-tests.mjs), verificá que funcione y commitealo. Desde entonces, correr tests = `sdd test`, cero razonamiento.'
    );
  }
  const r = spawnSync(process.execPath, [script, ...pos], { stdio: 'inherit', cwd: root });
  process.exit(r.status ?? 1);
}

/** `sdd check` — lint + build + tests desde .sdd/run-checks.mjs (o fallback a run-tests). */
export async function check(root, pos) {
  const script = join(root, '.sdd', 'run-checks.mjs');
  if (existsSync(script)) {
    const r = spawnSync(process.execPath, [script, ...pos], { stdio: 'inherit', cwd: root });
    process.exit(r.status ?? 1);
  }
  console.log('(sin .sdd/run-checks.mjs — corriendo solo tests; la skill sdd-test puede crear el de checks completos)');
  await test(root, pos);
}
