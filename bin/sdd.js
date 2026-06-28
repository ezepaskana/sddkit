#!/usr/bin/env node
import { setup } from '../src/commands/setup.js';
import { scan } from '../src/commands/scan.js';
import { init } from '../src/commands/init.js';
import { decide } from '../src/commands/decide.js';
import { validate } from '../src/commands/validate.js';
import { task } from '../src/commands/task.js';
import { uninstall } from '../src/commands/uninstall.js';
import { test, check } from '../src/commands/test.js';
import { context, find } from '../src/commands/context.js';
import { doctor } from '../src/commands/doctor.js';
import { sync } from '../src/commands/sync.js';
import { publish } from '../src/commands/publish.js';
import { impact } from '../src/commands/impact.js';
import { VERSION } from '../src/version.js';

const [, , cmd, ...args] = process.argv;
const flags = {};
const pos = [];
for (const a of args) {
  if (a.startsWith('--')) {
    const eq = a.indexOf('=');
    if (eq === -1) flags[a.slice(2)] = true;
    else flags[a.slice(2, eq)] = a.slice(eq + 1);
  } else {
    pos.push(a);
  }
}
const root = flags.dir ? String(flags.dir) : process.cwd();

const HELP = `
sddkit v${VERSION} — spec-driven development para agentes de IA

Uso: sdd <comando> [opciones]

Única entrada:
  setup      Hace TODO: la primera vez en tu máquina instala además la skill
             global (los próximos repos los configura el agente solo, sin
             comandos). En el repo: detecta tu entorno, instala sin pisar nada,
             escanea, genera docs C4, instala el pre-commit hook y te propone
             las convenciones a decidir (elegís un número).
             Con --agent: modo no interactivo para que lo corra un agente.

Comandos internos (los usan el agente y el pre-commit hook, no vos):
  task       Tareas SDD con artefactos persistentes y reanudables:
             task new "<requisito>"  → crea requirement.md + spec.md + plan.md
             task list / show <id>   → progreso y próximo paso (retomar)
             task status <id> <e>    → draft|specified|planned|in-progress|paused|done
             task brief <id> [paso]  → contexto mínimo del paso para el subagente
             task verify <id> <paso> → ejecuta la verificación cmd: del paso (exit 3 = manual)
             task execute <id>       → gate de pre-ejecución: valida .git y crea/valida la rama (Paso 1)
             task close <id>         → verifica rama pusheada y crea PR (draft) o avisa para manual
  context    One-pager destilado del repo (reglas, catálogo, módulos, aprendizajes)
  find       ¿Ya existe? Busca en endpoints/módulos/dominio/aprendizajes sin explorar
  doctor     Diagnóstico read-only: config, hook, skills al día, scripts, docs
  sync       Trae skills/config/AGENTS.md/hooks de un repo ya configurado a la
             versión instalada de sddkit, sin scan ni wizard (usar tras actualizar
             el paquete npm).
  test       Tests via .sdd/run-tests.mjs (reproducible, prioriza Docker)
  check      lint + build + tests via .sdd/run-checks.mjs
  scan       Re-escanea el repo y actualiza docs C4 + patrones + AGENTS.md
             Con --terraform=<path-a-show.json>: además detecta recursos/aristas de
             infra (S3/SQS/SNS/DynamoDB/RDS/EventBridge) desde \`terraform show -json\`.
  decide     Registra una convención: sdd decide <topic> <variante> --why="..."
  validate   Drift + violaciones del catálogo. Corre solo en cada commit
             via pre-commit hook (desactivable: .sdd/config.json hooks.preCommit=false)
  init       Solo el setup de archivos, sin escaneo ni decisiones
  publish    Publica el snapshot del repo (C1, capacidades, hash+timestamp) al
             grafo de impacto configurado en .sdd/config.json → graph (Fase 2)
  impact     Consulta el grafo: ¿quién consume <método> <ruta>? ¿qué consume
             a <sistema>? o ¿qué depende de <ARN-o-nombre-de-recurso>? (Fase
             2/3, advertencia no gate)

  uninstall  Elimina la skill global de la máquina y te deja la lista de lo
             que quedó en los repos. Con --repo limpia también el repo actual
             (pide confirmación; quita SOLO lo que sddkit instaló).

Opciones: --dir=<path>  --force  --why=<texto>  --agent  --update  --repo  --yes
          --local  --global  (sdd setup: alcance de instalación de skills)
          --terraform=<path>  (sdd scan: ruta a un \`terraform show -json\`)
`;

try {
  if (cmd === 'setup') await setup(root, flags);
  else if (cmd === 'scan') await scan(root, flags);
  else if (cmd === 'init') await init(root, flags);
  else if (cmd === 'decide') await decide(root, pos, flags);
  else if (cmd === 'validate') await validate(root, flags);
  else if (cmd === 'task') await task(root, pos, flags);
  else if (cmd === 'uninstall') await uninstall(root, flags);
  else if (cmd === 'test') await test(root, pos);
  else if (cmd === 'check') await check(root, pos);
  else if (cmd === 'context') await context(root);
  else if (cmd === 'find') await find(root, pos);
  else if (cmd === 'doctor') await doctor(root);
  else if (cmd === 'sync') await sync(root, flags);
  else if (cmd === 'publish') await publish(root, flags);
  else if (cmd === 'impact') await impact(root, pos, flags);
  else {
    console.log(HELP);
    // Comando desconocido (no vacío) es un error de uso: salir ≠0 para que
    // un script que invoque `sdd <typo>` detecte el fallo. `sdd` a secas → 0.
    if (cmd) process.exit(1);
  }
} catch (err) {
  console.error('✖ ' + (err && err.message ? err.message : err));
  process.exit(1);
}
