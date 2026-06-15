# Spec — tarea 012: Cerrar los gaps de buenas prácticas OSS detectados en la rev…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

Contexto: la revisión de buenas prácticas OSS (post-tarea 011) detectó 6 gaps de higiene/comunidad, todos de **infraestructura y documentación** — ninguno toca el código de producción de sddkit (`src/`, `bin/`). La tarea 011 ya cerró lo legal/seguridad (LICENSE, SECURITY.md, sección Seguridad en README). Esto es la capa de "comunidad y CI".

- **¿Qué problema real resuelve?** Seis artefactos que un contribuyente nuevo y un revisor de OSS esperan encontrar: (1) **CI propio** — hoy hay 210 tests que NO corren en push/PR; un workflow de GitHub Actions con `node --test` los corre automáticamente y da la insignia "build passing". (2) **CONTRIBUTING.md** — cómo correr tests y qué flujo (SDD) se espera de un contribuyente. (3) **CODE_OF_CONDUCT.md** — estándar esperado, señal de proyecto serio. (4) **CHANGELOG.md** — el paquete está en `0.12.3` con varias features y no hay registro legible de cambios. (5) **Templates de issues/PR** — higiene del tracker. (6) **dependabot.yml** — alertas de seguridad de deps (aunque solo hay `optionalDependencies`).
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** No existe `.github/` en el repo (el `sdd-publish.yml` del README es un EJEMPLO que sddkit genera para SUS usuarios, no CI de este repo). No hay CONTRIBUTING/CODE_OF_CONDUCT/CHANGELOG ni templates. El proyecto ya tiene convenciones consolidadas que estos docs solo deben **referenciar, no reinventar**: Conventional Commits + GitHub Flow + `task/{n}-{slug}` (`.sdd/branching.md`), el flujo SDD (AGENTS.md), `npm test` → `node --test`, `engines.node >=18`. CODE_OF_CONDUCT usa el texto estándar Contributor Covenant (no se redacta a mano). CHANGELOG sigue el formato Keep a Changelog.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** El 80% del valor está en **CI + CONTRIBUTING** (lo que un revisor/contribuyente nota primero). Los otros 4 son baratos y de bajo riesgo, así que vale hacerlos todos en una tanda — pero conviene priorizar y mantener cada artefacto MÍNIMO: CONTRIBUTING corto que enlaza a AGENTS.md (no duplica el flujo SDD), CHANGELOG que arranca en la versión actual sin backfillear todo el historial verboso, CI sin lint (no hay linter configurado — agregarlo sería scope creep).
- **Supuestos del dev que podrían no ser ciertos:** (1) Que "varias versiones de Node" implica una matriz amplia — con `engines.node >=18` el set razonable es 18/20/22 (LTS vigentes); más sería ruido. (2) Que conviene backfillear el CHANGELOG con las 12 tareas históricas — costoso y de bajo valor; lo correcto es arrancar el changelog "de ahora en adelante" con una entrada inicial que consolide el estado `0.12.3`. (3) Que CI debe publicar al grafo — NO: el `sdd-publish.yml` es para repos de USUARIOS; el CI de ESTE repo solo debe correr la suite de tests.
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento): Riesgo bajísimo — ningún archivo de `src/`/`bin/` cambia, no se toca ninguna BR ni ADR ni la arquitectura C4. El único riesgo real es **el workflow de CI fallando en el primer push** (sintaxis YAML, versión de Node, comando de test). Mitigación: copiar el patrón canónico de `actions/setup-node` con matriz y validar el YAML localmente. Mantenimiento: estos archivos son casi estáticos; el CHANGELOG es el único que requiere disciplina de actualización continua (se documenta en CONTRIBUTING). Nota: `package.json → files` es una whitelist, así que los nuevos docs NO viajan al paquete npm salvo que se agreguen — y NO deberían (son dev-facing).
- **¿Qué pasa si NO se hace?** El repo se abre sin CI (los tests no se verifican en PRs ajenos → riesgo de regresiones), sin guía de contribución (fricción para el primer contribuyente), y sin los artefactos que GitHub linkea automáticamente (Code of Conduct, templates). No es bloqueante para publicar, pero baja la percepción de madurez y la calidad de las contribuciones externas.
- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (detección) y cómo debería reaccionar el sistema (manejo)?** No hay lógica nueva de producto que pueda fallar en runtime. El único componente "ejecutable" es el workflow de CI: si falla, GitHub lo reporta en la pestaña Actions y marca el PR/commit en rojo (detección inmediata y visible). No requiere fallback — un CI rojo ES la señal correcta. El resto son archivos estáticos Markdown/YAML sin ejecución.

**Recomendación:** `proceder con cambios` — hacer los 6 artefactos en una tanda (todos baratos y de bajo riesgo), pero con tres ajustes al requisito: (a) matriz de Node 18/20/22 alineada con `engines`, sin lint; (b) CI de ESTE repo corre solo `npm test`, NO publica al grafo (eso es para repos de usuarios); (c) CONTRIBUTING/CODE_OF_CONDUCT/CHANGELOG mínimos que REFERENCIAN las convenciones ya consolidadas (Conventional Commits, GitHub Flow, flujo SDD, Contributor Covenant, Keep a Changelog) en vez de reinventarlas, y CHANGELOG que arranca en `0.12.3` sin backfill verboso. Confirmar estos puntos con el dev antes de especificar.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: ¿Versiones de Node en la matriz de CI?
  - Respuesta: **18, 20, 22** (LTS vigentes, alineado con `engines.node >=18`).
- [x] P2: ¿Alcance del CHANGELOG.md?
  - Respuesta: **Arrancar el versionado en `0.0.1`** y considerar todo lo existente hasta hoy como baseline. La primera entrada `[0.0.1]` consolida el estado actual; formato Keep a Changelog.
- [x] P3: El versionado a 0.0.1 baja la versión real del paquete (hoy 0.12.3, nunca publicada en npm). ¿Alcance?
  - Respuesta: **Resetear a `0.0.1` en todo** — `package.json`, `package-lock.json` y `.sdd/config.json`. CHANGELOG arranca con `[0.0.1]` consolidando lo hecho como baseline. (Nota: `src/version.js` lee la versión solo de `package.json`; `version.test.js` solo verifica string no vacío → no se rompe. `.sdd/config.json` se alinea para no disparar el aviso de `sdd doctor`/`sync` de BR-034.)
- [x] P4: ¿El CI corre solo tests o algo más?
  - Respuesta: **Solo `npm test`** (`node --test`) sobre la matriz. No hay CI hoy; se crea desde cero, mínimo, sin lint y sin publicar al grafo (el `sdd-publish.yml` del README es para repos de USUARIOS, no para este repo).
- [x] P5: ¿Dónde viven CONTRIBUTING y CODE_OF_CONDUCT?
  - Respuesta: **Raíz, mínimos y referenciados.** `CONTRIBUTING.md` enlaza a `AGENTS.md`/flujo SDD y a `.sdd/branching.md` (Conventional Commits, GitHub Flow) sin duplicarlos; `CODE_OF_CONDUCT.md` = texto estándar Contributor Covenant con contacto `eze.paskana@gmail.com`. Templates de issues/PR y `dependabot.yml` viven en `.github/`.

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** completitud de la higiene OSS de comunidad/CI — nº de artefactos estándar presentes (de un set de 6: workflow de CI, CONTRIBUTING, CODE_OF_CONDUCT, CHANGELOG, templates issue/PR, dependabot) + estado del CI (los 210 tests corren automáticamente: sí/no) + coherencia de versión (`package.json` == `package-lock.json` == `.sdd/config.json`).
- **Baseline actual:** **0/6 artefactos** presentes. CI: **no** (210 tests corren solo localmente, nunca en push/PR). Versión: `0.12.3` (incoherente con el objetivo de primer release público; sin CHANGELOG).
- **Resultado esperado:** **6/6 artefactos** presentes. CI: **sí** (workflow verde corriendo `node --test` en Node 18/20/22). Versión reseteada a `0.0.1` coherente en los 3 archivos, con `CHANGELOG.md [0.0.1]` consolidando el baseline.
- **Cómo se mide después:** `ls` confirma los 6 archivos en sus rutas (`.github/workflows/ci.yml`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`); `npm test` sigue en verde (210 tests, `version.test.js` incluido tras el reset); `grep '"version"'` confirma `0.0.1` en los 3 archivos; validación de sintaxis YAML del workflow (parseo local). El CI verde real se confirma tras el primer push al remoto (fuera del alcance de esta tarea local).

Métrica de higiene/comunicación (no de runtime): es binaria por artefacto (presente/ausente y CI corre/no corre), no admite número continuo. Impacto cualitativo: el repo pasa de "tests invisibles en PRs ajenos + sin guía de contribución" a "CI verificable + onboarding de contribuyentes + versionado público coherente".

## Spec refinada

**Historia:** Como mantenedor que abre sddkit como open source quiero cerrar los gaps de higiene de comunidad y CI (workflow que corra los tests, guía de contribución, código de conducta, changelog, templates de issue/PR y dependabot) y resetear el versionado a `0.0.1` como primer release público coherente, para que contribuyentes y revisores encuentren los artefactos estándar que esperan, los tests se verifiquen automáticamente en cada PR, y el versionado refleje el estado real del proyecto.

**Criterios de aceptación (formato EARS):**

- CUANDO se hace push o se abre un PR contra el repo, EL SISTEMA DEBE ejecutar la suite `node --test` vía un workflow de GitHub Actions (`.github/workflows/ci.yml`) en una matriz de Node `18`, `20` y `22`, usando `actions/checkout@v4` + `actions/setup-node@v4` + `npm ci` + `npm test`, sin pasos de lint ni de publicación al grafo.
- CUANDO un contribuyente quiere participar, EL SISTEMA DEBE proveer `CONTRIBUTING.md` en la raíz que explique cómo correr los tests (`npm test`), referencie el flujo SDD (`AGENTS.md`) y las convenciones ya consolidadas (Conventional Commits + GitHub Flow + patrón de rama `task/{n}-{slug}`, citando `.sdd/branching.md`) SIN reescribirlas, y mencione la disciplina de actualizar `CHANGELOG.md`.
- CUANDO alguien interactúa con la comunidad del proyecto, EL SISTEMA DEBE proveer `CODE_OF_CONDUCT.md` en la raíz con el texto estándar Contributor Covenant y el contacto `eze.paskana@gmail.com`.
- CUANDO se quiere revisar el historial de cambios, EL SISTEMA DEBE proveer `CHANGELOG.md` en formato Keep a Changelog con una primera entrada `[0.0.1]` que consolide el estado actual del proyecto como baseline (sin backfillear el detalle de las 12 tareas internas) y una sección `[Unreleased]` para cambios futuros.
- CUANDO se inspecciona la versión del paquete, EL SISTEMA DEBE reportar `0.0.1` de forma coherente en `package.json`, `package-lock.json` (ambas ocurrencias) y `.sdd/config.json`, y `npm test` DEBE seguir en verde (210 tests, incluido `version.test.js`).
- CUANDO se abre un issue o un PR en GitHub, EL SISTEMA DEBE ofrecer templates en `.github/` (`ISSUE_TEMPLATE/bug_report.md` + `ISSUE_TEMPLATE/feature_request.md` y `PULL_REQUEST_TEMPLATE.md`) que guíen la información mínima esperada (repro/impacto para bugs; motivación/alcance para features; checklist de tests para PRs).
- CUANDO una dependencia tiene una actualización o alerta de seguridad, EL SISTEMA DEBE tener `.github/dependabot.yml` configurado para el ecosistema `npm` (chequeo semanal) y para `github-actions`.
- SI el workflow de CI falla (sintaxis, versión de Node, test rojo), EL SISTEMA DEBE reflejarlo como check fallido en GitHub (Actions + estado del PR/commit) — no requiere fallback; un CI rojo es la señal correcta.

**Reglas de negocio afectadas:** ninguna. No se crea ni modifica ninguna BR-NNN (cambio de infraestructura/docs, no de contrato de dominio). El reset de versión a `0.0.1` mantiene la invariante de BR-034 (coherencia `config.version == VERSION`) al alinear `.sdd/config.json`. No se toca código de `src/`/`bin/`.

**Fuera de alcance:**

- **Linter / formateo** (ESLint, Prettier): no hay ninguno hoy; agregarlo es scope creep — se decide aparte.
- **Workflow de publicación a npm** (`npm publish` en release/tag): la tarea crea CI de tests, no pipeline de release. La publicación al grafo (`sdd-publish.yml`) es para repos de USUARIOS, no para este repo.
- **Backfill verboso del CHANGELOG** con las 12 tareas internas: la primera entrada consolida el estado, no reconstruye el historial.
- **Crear el remote / hacer el push / verificar CI verde real**: la tarea deja los archivos listos; el primer push y la verificación del run en GitHub es acción separada del dev.
- **GitHub Discussions, FUNDING.yml, badges en README**: mejoras posteriores, no parte de esta tanda.

**Impacto en arquitectura/catálogo:** No cambia la arquitectura C4 (sin módulos/stores/deps nuevos en `src/`) → no requiere ADR ni actualizar `.sdd/c4/`. No toca el catálogo de convenciones (los archivos nuevos son YAML/Markdown, no código JS sujeto a `module-system`). Archivos nuevos en `.github/` y raíz + edición de versión en `package.json`/`package-lock.json`/`.sdd/config.json`. Nota: `package.json → files` es whitelist y NO se amplía — los docs de comunidad son dev-facing y no deben viajar al paquete npm.

---
_Aprobación del dev: APROBADA (2026-06-15)_
