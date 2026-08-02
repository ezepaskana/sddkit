#!/usr/bin/env node
// .sdd/run-tests.mjs — generado por la skill sdd-test (sddkit).
// Script DETERMINÍSTICO para correr los tests del repo. Prioridad: Docker (reproducible) > nativo.
// Ajustá CONFIG si el repo lo necesita; la lógica de abajo no debería requerir cambios.
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const CONFIG = {
  nativeCmd: null,   // comando de test nativo; null = autodetectar
  dockerImage: null, // imagen para correr tests cuando no hay Dockerfile.test; null = autodetectar
  mode: null,        // forzar 'docker' | 'native' | null (auto: docker si está disponible)
};

const sh = (cmd) => spawnSync(cmd, { shell: true, stdio: 'inherit' }).status ?? 1;
const can = (cmd) => { try { execSync(cmd, { stdio: 'ignore' }); return true; } catch { return false; } };

function detectNative() {
  if (CONFIG.nativeCmd) return CONFIG.nativeCmd;
  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    if (pkg.scripts && pkg.scripts.test && !/no test specified/.test(pkg.scripts.test)) return 'npm test --silent';
  }
  if (existsSync('pom.xml')) return existsSync('mvnw') ? (process.platform === 'win32' ? 'mvnw -q test' : './mvnw -q test') : 'mvn -q test';
  if (existsSync('build.gradle') || existsSync('build.gradle.kts')) return existsSync('gradlew') ? (process.platform === 'win32' ? 'gradlew test' : './gradlew test') : 'gradle test';
  if (existsSync('go.mod')) return 'go test ./...';
  if (existsSync('pyproject.toml') || existsSync('pytest.ini') || existsSync('setup.py')) return 'pytest -q';
  return null;
}

function detectImage() {
  if (CONFIG.dockerImage) return CONFIG.dockerImage;
  if (existsSync('pom.xml')) return 'maven:3-eclipse-temurin-21';
  if (existsSync('build.gradle') || existsSync('build.gradle.kts')) return 'gradle:8-jdk21';
  if (existsSync('go.mod')) return 'golang:1.22';
  if (existsSync('pyproject.toml') || existsSync('pytest.ini')) return 'python:3.12';
  if (existsSync('package.json')) return 'node:20';
  return null;
}

const composeHasTest = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']
  .some((f) => existsSync(f) && /^\s{2,4}test:\s*$/m.test(readFileSync(f, 'utf8')));

const dockerOk = CONFIG.mode !== 'native' && can('docker info');
const native = detectNative();
let code;

if (dockerOk && existsSync('Dockerfile.test')) {
  console.log('[sdd-test] Dockerfile.test → build + run (reproducible)');
  code = sh('docker build -q -f Dockerfile.test -t sdd-test-local .');
  if (code === 0) code = sh('docker run --rm sdd-test-local');
} else if (dockerOk && composeHasTest) {
  console.log('[sdd-test] docker compose run --rm test (reproducible, con servicios)');
  code = sh('docker compose run --rm test');
} else if (dockerOk && native && detectImage()) {
  const img = detectImage();
  console.log(`[sdd-test] docker ${img} → ${native} (reproducible)`);
  const cwd = process.cwd().replace(/\\/g, '/');
  code = sh(`docker run --rm -v "${cwd}:/app" -w /app ${img} sh -c "${native.replace(/"/g, '\\"')}"`);
} else if (native) {
  if (CONFIG.mode !== 'native') console.log('[sdd-test] ⚠ Docker no disponible — corriendo NATIVO (el entorno local puede afectar el resultado)');
  console.log(`[sdd-test] → ${native}`);
  code = sh(native);
} else {
  console.error('[sdd-test] ✖ No pude determinar cómo correr los tests. Completá CONFIG.nativeCmd en .sdd/run-tests.mjs');
  code = 2;
}
process.exit(code);
