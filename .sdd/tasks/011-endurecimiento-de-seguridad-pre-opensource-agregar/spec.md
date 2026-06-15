# Spec — tarea 011: Endurecimiento de seguridad pre-opensource: agregar nota de …

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

Contexto: auditoría de seguridad previa a abrir el repo. La auditoría ya concluyó que **no hay bloqueantes** (sin secrets en código ni historial, sin archivos sensibles trackeados, cero deps de producción, sin SQL injection). Esta tarea cubre las 3 mejoras de robustez/comunicación que surgieron, no un agujero crítico.

- **¿Qué problema real resuelve?** Tres cosas distintas: (1) **README** — comunicar el modelo de amenaza real de la herramienta: sddkit ejecuta comandos shell definidos en archivos del repo (`Verificación: cmd: …` de `plan.md` vía `sdd task verify`, y el `git checkout -b` del Paso 1 vía `sdd task execute`), por lo que correrlo sobre un repo no confiable ejecuta esos comandos. Es por diseño, pero un usuario que abre el código debe saberlo. (2) **SECURITY.md** — canal de reporte de vulnerabilidades, esperado en proyectos OSS (GitHub lo linkea en la pestaña Security). (3) **`buildPRCommand`** — hoy arma un string que corre por shell (`execSync`) escapando solo `"`; `$(…)`, backticks y `branchName`/`baseBranch` sin comillas siguen siendo interpretables por el shell.
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** No hay `SECURITY.md`. El README no menciona el modelo de ejecución de comandos. `buildPRCommand` (`src/lib/branching.js:346`) ya escapa `"` parcialmente. No hace falta librería: todo es stdlib (`node:child_process`).
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Las docs (README + SECURITY.md) son el 80% del valor de seguridad real de cara a abrir el repo y son triviales. El fix de `buildPRCommand` es el 20% de valor / 80% del riesgo de la tarea porque toca código con tests y la BR-041. Dos enfoques para el fix:
  - **(A) Array + `spawnSync` sin `shell`**: elimina la clase entera de injection. Costo: `buildPRCommand` deja de devolver string → devolver `{cmd, args}`; reescribir el consumidor en `task.js:385` (de `execSync(cmd)` a `spawnSync(cmd, args, {encoding})` + leer `result.stdout`); reescribir 5 tests unitarios que afirman formato string.
  - **(B) Seguir devolviendo string pero escapar bien** (`$`, `` ` ``, `\`, y comillar `branchName`/`baseBranch`). Costo mínimo, preserva consumidor y contrato, pero es "escaping whack-a-mole" — frágil ante el próximo caso borde.
  - Recomiendo **(A)**: es el fix genuinamente correcto y el costo extra (1 consumidor + 5 tests) es acotado y razonable para una tarea cuyo objetivo es robustez.
- **Supuestos del dev que podrían no ser ciertos:** el requisito asume que `buildPRCommand` es explotable. En la práctica **todos los inputs son locales y los controla el dev**: `title` viene del título de la tarea (lo escribe el dev), `body` de un template fijo, `branchName` de `git branch --show-current`, `baseBranch` de la config de branching. No hay superficie de ataque remota. ⇒ el fix es robustez defensiva (defensa en profundidad), no el parche de un agujero activo. Vale aclararlo para calibrar prioridad.
- **Riesgos y efectos secundarios:** (1) Romper BR-041 / el flujo de `sdd task close`: el consumidor parsea `stdout` buscando la URL del PR (`out.match(/https?:\/\/\S+/)`) — con `spawnSync({encoding:'utf8'})` `result.stdout` da lo mismo, hay que preservar ese parseo. (2) Los 5 tests de `close.test.js` (líneas 167-200) afirman el string — hay que migrarlos a afirmar `{cmd, args}`. (3) Azure/GitLab usan otra forma de flags (`--title "x"` separado) — al pasar a args desaparece el problema de quoting uniformemente. (4) Documentación: BR-041 menciona `buildPRCommand` por comportamiento (degradación), no por tipo de retorno — el cambio de string→objeto es compatible con la BR; igual conviene una nota.
- **¿Qué pasa si NO se hace?** README/SECURITY.md: el repo se abre sin comunicar el modelo de amenaza ni canal de reporte — gap de higiene OSS. `buildPRCommand`: queda una debilidad teórica de bajo riesgo (inputs locales) pero que un revisor de seguridad marcaría.
- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos y cómo reacciona el sistema?** El único código nuevo es `buildPRCommand` + su consumidor. Si falla, `sdd task close` ya degrada a instrucciones de PR manual (BR-041) y `execSync`/`spawnSync` ya está envuelto en `try/catch` (`task.js:384`). Cobertura: los tests unitarios de `buildPRCommand` + el e2e de `task close`. README/SECURITY.md no introducen lógica que pueda fallar.

**Recomendación:** `proceder con cambios` — las docs sin objeción. Para `buildPRCommand` recomiendo el enfoque (A) array+`spawnSync` (fix correcto de raíz) en vez de (B) escaping. Es robustez defensiva, no un agujero activo (inputs locales), así que la prioridad es media — pero el costo es acotado y cierra la observación de forma definitiva. Confirmar con el dev el enfoque y un par de detalles de las docs antes de especificar.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: ¿Enfoque del fix de `buildPRCommand`: (A) array + `spawnSync` sin shell, o (B) mejorar el escaping del string?
  - Respuesta: **(A) array + `spawnSync`**. `buildPRCommand` devuelve `{cmd, args}`; el consumidor en `task.js` pasa a `spawnSync(cmd, args, {encoding:'utf8'})` sin `shell:true`. Elimina la injection de raíz.
- [x] P2: ¿Contacto de reporte de vulnerabilidades para SECURITY.md?
  - Respuesta: **eze.paskana@gmail.com** (mismo email del `author` en package.json).
- [x] P3 (default, no requirió decisión del dev): ubicación de la nota en el README → nueva sección `## Seguridad` cerca del final (antes de `## Licencia`), que resume el modelo de amenaza y linkea a `SECURITY.md`.

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** superficie de inyección de comandos en `buildPRCommand` (nº de caracteres shell-activos que el flujo de PR interpreta sobre input de usuario) + completitud de la higiene OSS de seguridad (presencia de SECURITY.md + nota de modelo de amenaza en README).
- **Baseline actual:** `buildPRCommand` corre por shell (`execSync`) escapando solo `"` → `$`, `` ` ``, `\` y `branchName`/`baseBranch` sin comillar quedan interpretables (≥4 vectores). Sin SECURITY.md. README sin sección de seguridad (0/2 artefactos de higiene OSS).
- **Resultado esperado:** 0 caracteres shell-activos interpretados (el flujo de PR ya no pasa por shell; los args van literales vía `spawnSync`). 2/2 artefactos OSS presentes (SECURITY.md + sección README).
- **Cómo se mide después:** test unitario nuevo que verifica que un `title`/`branch` con `$(...)`/backtick se pasa literal en `args` (no se expande); `grep` confirma SECURITY.md y la sección `## Seguridad` en README; suite `node --test` en verde (incluidos los 5 tests migrados de `buildPRCommand`).

Métrica mayormente cualitativa (hardening defensivo): el impacto cuantificable es "string-por-shell con escaping parcial → args literales sin shell" y "0/2 → 2/2 artefactos OSS".

## Spec refinada

**Historia:** Como mantenedor que abre sddkit como open source quiero (a) comunicar el modelo de amenaza de la herramienta y un canal de reporte de vulnerabilidades, y (b) que el flujo de creación de PR no pase input por el shell, para que usuarios y revisores de seguridad confíen en el proyecto y no quede una debilidad de inyección, aunque sea de bajo riesgo.

**Criterios de aceptación (formato EARS):**

- CUANDO `buildPRCommand(branch, base, title, body, platform)` se invoca con una plataforma conocida (`github`/`azure`/`gitlab`), EL SISTEMA DEBE devolver `{ cmd, args }` donde `cmd` es el binario (`gh`/`az`/`gl`) y `args` es un array de strings con cada flag/valor como elemento literal separado (sin interpolación shell).
- CUANDO la plataforma es `unknown` (o sin tool asociado), EL SISTEMA DEBE devolver `null` (degradación a PR manual preservada, BR-041).
- CUANDO `title`, `body`, `branch` o `base` contienen metacaracteres de shell (`$(…)`, `` ` ``, `"`, `;`, `&&`), EL SISTEMA DEBE pasarlos como texto literal en `args` — el subproceso NO los interpreta ni expande (se corre vía `spawnSync` sin `shell:true`).
- CUANDO `sdd task close <id>` ejecuta el comando de PR sobre una plataforma con tool disponible, EL SISTEMA DEBE usar `spawnSync(cmd, args, {cwd, encoding:'utf8'})`, leer `result.stdout`, y preservar el parseo de la URL del PR (`/https?:\/\/\S+/`) y la línea final de reporte (`# PR: …`).
- SI el subproceso de PR falla (status ≠ 0 o excepción), EL SISTEMA DEBE degradar a `buildManualPRInstructions` sin lanzar (comportamiento BR-041 intacto).
- CUANDO un usuario lee el README, EL SISTEMA DEBE presentar una sección `## Seguridad` que advierta que sddkit ejecuta comandos definidos en `.sdd/tasks/**/plan.md` (`Verificación: cmd: …` vía `sdd task verify`) y el `git checkout -b` del Paso 1 (vía `sdd task execute`), recomiende correrlo solo sobre repos confiables, y linkee a `SECURITY.md`.
- CUANDO un usuario o investigador quiere reportar una vulnerabilidad, EL SISTEMA DEBE proveer `SECURITY.md` en la raíz con el contacto `eze.paskana@gmail.com`, expectativas básicas de divulgación responsable y el alcance (qué es y qué no es una vuln en una herramienta que ejecuta comandos locales por diseño).

**Reglas de negocio afectadas:** **BR-041** (creación de PR en `sdd task close`) — el comportamiento de degradación y el reporte `# PR: …` se preservan; solo cambia el tipo de retorno interno de `buildPRCommand` (string → `{cmd,args}`) y el mecanismo de ejecución (`execSync` shell → `spawnSync` sin shell). No requiere reescribir la BR, pero su redacción menciona `buildPRCommand`; se actualiza la nota si hace falta. No se crean BR nuevas (cambio de implementación, no de contrato de dominio).

**Fuera de alcance:**

- `openFile` (`src/lib/open.js`) — también interpola un path en un comando shell; los paths son internos (dirs de tarea), riesgo bajo, no se toca en esta tarea.
- El `cmd:` de `sdd task verify`/`execute` que corre comandos de `plan.md` por shell — es la feature por diseño (BR-038); NO se sandboxea, solo se documenta en el README como modelo de amenaza.
- Cualquier purga de historial git (no hay nada que purgar — auditoría limpia).
- Habilitar Dependabot / CI de `npm audit` (sugerencia separada, no parte de esta tarea).

**Impacto en arquitectura/catálogo:** Módulo `src/lib` (`branching.js::buildPRCommand`) y `src/commands` (`task.js`, consumidor en `sub === 'close'`). Convención del catálogo: `module-system → esm` (todo el código nuevo en ESM). No cambia la arquitectura C4 (sin módulos/stores/deps nuevos) → no requiere ADR ni actualizar `.sdd/c4/`. Sí toca BR-041 en `.sdd/domain.md` (nota aclaratoria del cambio de implementación). Dos archivos nuevos en la raíz: `SECURITY.md` y la sección en `README.md` (ambos en `files` de package.json para que viajen al paquete — README ya está; SECURITY.md conviene agregarlo a `files`).

---
_Aprobación del dev: APROBADA (2026-06-15)_
