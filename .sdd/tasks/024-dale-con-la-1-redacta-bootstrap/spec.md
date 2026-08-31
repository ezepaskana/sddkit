# Spec — tarea 024: Dale con la 1, redactá bootstrap.md en serio

**Historia:** Como dev que instala sddkit en un repo nuevo, quiero que el agente me ofrezca configurarlo apenas abro la sesión, para no descubrir tres sesiones después que el framework nunca se activó.

## Criterios de aceptación

**Ofrecimiento (el bug de tinku)**

- **CA-1** — CUANDO se abre una sesión en un repo sin `.sdd/config.json`, EL SISTEMA DEBE ofrecer configurar sddkit en **una línea**, como primer acto del turno, **antes** de atender el pedido del dev.
- **CA-2** — CUANDO el dev acepta, EL SISTEMA DEBE invocar la skill `sdd-bootstrap` y seguir su procedimiento.
- **CA-3** — SI el dev rechaza o pospone, EL SISTEMA DEBE atender el pedido sin insistir en esa sesión y **sin escribir nada** en el repo (el "no" no se persiste: se re-ofrece en la próxima sesión).

**Contenido del hook**

- **CA-4** — `hooks/bootstrap.md` DEBE entrar en **≤ 25 líneas** y contener solo el ofrecimiento, la invocación a la skill y el criterio de decisión; el procedimiento NO va ahí.
- **CA-5** — `hooks/bootstrap.md` NO DEBE contener ninguna marca `PLACEHOLDER` ni diferir instrucciones a una tarea futura.
- **CA-6** — La skill `sdd-bootstrap` DEBE existir (`SKILL.md` + `references/`) con el procedimiento completo, y ninguna de sus instrucciones puede citar un comando `sdd …` inexistente (BR-081).

**Lo que el bootstrap escribe**

- **CA-7** — CUANDO el dev acepta, EL SISTEMA DEBE escribir `.sdd/config.json`, `.sdd/{domain,QUESTIONS,LEARNINGS,branching}.md`, `.sdd/{catalog,patterns}.json`, los tres niveles de `.sdd/c4/` y el bloque gestionado de `CLAUDE.md` — sin tocar el contenido propio del dev en `CLAUDE.md`.
- **CA-8** — SI el repo tiene capas detectables (BR-070), EL SISTEMA DEBE escribir una rule por capa (BR-071); SI tiene 2+ módulos (BR-069), además un `CLAUDE.md` por módulo (BR-073). SI no tiene ni capas ni módulos, no escribe ninguno de los dos.
- **CA-9** — SI el repo no tiene código todavía (recién creado), EL SISTEMA DEBE escribir `.sdd/` mínimo a partir de lo que el dev declare que va a construir, dejar los huecos como `❓ VALIDAR` y NO inventar C4 ni catálogo.
- **CA-10** — CUANDO el agente escribe `.sdd/config.json`, EL SISTEMA DEBE ofrecer termaid una sola vez y persistir la respuesta —incluido el "no"— en `ui.termaid` (BR-087).
- **CA-11** — CUANDO el bootstrap termina y el pedido original era una tarea no trivial, EL SISTEMA DEBE arrancar el flujo de `/sdd-task` con ese pedido **verbatim**.

## Reglas de negocio afectadas

BR-080 (se **reescribe**: el hook ofrece e invoca la skill, no lleva el procedimiento), BR-092 (**nueva**: qué investiga, qué pregunta y qué escribe la skill `sdd-bootstrap`). Citadas sin cambio: BR-069 a BR-074, BR-078, BR-081, BR-087, BR-088 a BR-090.

## Supuestos

- **S-1** — La skill se llama `sdd-bootstrap`, igual que la borrada en la tarea 020. El repo pasa a tener 8 skills `sdd-*` + `caveman`: `components.md`, `CLAUDE.md` y `README.md` se actualizan en consecuencia.
- **S-2** — El tope de 25 líneas de CA-4 sale de que ese texto entra al contexto de **toda** sesión sin configurar; es más estricto que BR-082 a propósito.
- **S-3** — La verificación de cada paso es textual (`grep` sobre los archivos escritos): no hay exit codes desde ADR-0016.

## Fuera de alcance

- Configurar `tinku` (o cualquier repo de terceros): se hace aparte, con el plugin ya actualizado.
- Reactivar `sdd-test` o cualquier otra capacidad eliminada en la tarea 020.
- Tocar los hooks de termaid y caveman, o el `hooks.json`: el one-liner de bootstrap ya funciona y no se modifica.

---
_Aprobación del dev: aprobada 2026-08-17_
