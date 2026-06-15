#!/usr/bin/env node
// .sdd/run-checks.mjs — generado por la skill sdd-test (sddkit).
// Checks completos en orden: lint → build → tests. Determinístico, exit code = verdad.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const CONFIG = {
  lint: null,  // null = autodetectar; '' = saltar
  build: null,
  // tests: siempre delega en .sdd/run-tests.mjs
};

const sh = (cmd) => spawnSync(cmd, { shell: true, stdio: 'inherit' }).status ?? 1;
const pkg = existsSync('package.json') ? JSON.parse(readFileSync('package.json', 'utf8')) : null;

function detectLint() {
  if (CONFIG.lint !== null) return CONFIG.lint || null;
  if (pkg?.scripts?.lint) return 'npm run lint --silent';
  return null;
}
function detectBuild() {
  if (CONFIG.build !== null) return CONFIG.build || null;
  if (pkg?.scripts?.build) return 'npm run build --silent';
  if (existsSync('pom.xml')) return existsSync('mvnw') ? (process.platform === 'win32' ? 'mvnw -q compile' : './mvnw -q compile') : 'mvn -q compile';
  if (existsSync('go.mod')) return 'go build ./...';
  return null;
}

const steps = [
  ['lint', detectLint()],
  ['build', detectBuild()],
  ['tests', existsSync('.sdd/run-tests.mjs') ? `node .sdd/run-tests.mjs` : null],
];
for (const [name, cmd] of steps) {
  if (!cmd) { console.log(`[sdd-check] ${name}: (sin comando — salteado)`); continue; }
  console.log(`[sdd-check] ${name} → ${cmd}`);
  const code = sh(cmd);
  if (code !== 0) { console.error(`[sdd-check] ✖ falló en ${name} (exit ${code})`); process.exit(code); }
}
console.log('[sdd-check] ✓ todos los checks en verde');
