# CLAUDE.md — sddkit

Spec-driven development para Claude: documentación C4 viva, catálogo de convenciones validadas y flujo SDD auto-disparado.

<!-- sddkit:begin -->
<!-- Bloque gestionado por sddkit (lo mantiene el agente al escanear el repo). Todo lo de afuera del bloque es del equipo y nunca se toca. Última actualización: 2026-08-11 -->

## Triggers automáticos de skills

Ejecutá `/sdd-task` ante pedidos de cambio (crear, implementar, arreglar, mejorar, refactor, "quiero que X haga Y") y `/sdd-analyze` ante preguntas sin pedido de cambio (cómo, por qué, investigar, explicar). Ambiguo → preguntale al dev: (a) implementar, (b) investigar, (c) charlar.

## Preferencias de respuesta

Respondé breve y directo, sin preámbulos: código y respuestas cortas antes que prosa. Entregá el hallazgo en ≤ 150 palabras + 2-4 opciones numeradas, cada una con el resultado que da; cerrá con una pregunta respondible y esperá. Traducí en 3-4 palabras todo código tuyo (`Z3`, `BR-004`) o no lo uses. El detalle largo va a un archivo, nunca al chat.

Para mostrarle un archivo al dev: en terminal embebida de un IDE (`TERMINAL_EMULATOR=JetBrains-JediTerm` o `TERM_PROGRAM=vscode`) mostralo en ese IDE; en terminal standalone usá `.sdd/config.json → ui.opener` (`<opener> "<ruta>"`) si está configurado, y sin él tu default.

## Ante dudas o incongruencias: preguntale al dev

Preguntar no es una falla. Si un requisito contradice el código, una instrucción violaría el catálogo o una BR/ADR, falta información o algo no tiene sentido, **frená y preguntale al dev antes de seguir** — no avances con una suposición. Las decisiones menores resolvélas con buen juicio y seguí.

## Arquitectura (modelo C4 vivo)

Antes de cambios estructurales, leé `.sdd/c4/`, `.sdd/domain.md` (glosario + **reglas BR-NNN, vinculantes**), `.sdd/decisions/` (ADRs: no contradigas una aceptada sin ADR nuevo) y `.sdd/LEARNINGS.md` (leelo primero si existe). Si tu cambio toca la arquitectura, **actualizá esos docs en el mismo cambio**. Preguntas abiertas en `.sdd/QUESTIONS.md`: respondelas con el código si podés, si no preguntale al dev.

## Catálogo de convenciones validadas

Decisiones ya validadas por el equipo. **Cumplilas siempre** — no introduzcas variantes nuevas de un topic decidido.

Este repo no tiene ninguna: dejó de tener código en la tarea 020 (ADR-0016), es markdown y JSON. Si aparecen topics pendientes en `.sdd/patterns.json`, preguntale al dev cuál variante usar y registrala en `.sdd/catalog.json`.

## Convenciones por capa y módulo

Acá va solo lo transversal; lo específico se carga al tocarlo: convenciones de cada capa en `.claude/rules/sdd-layer-<capa>.md`, responsabilidad de cada módulo en el `CLAUDE.md` de su raíz. Una convención de una sola capa o módulo va ahí, **no** acá.

## Flujo SDD (spec-driven development)

Para tarea no trivial, aplicá **automáticamente** el flujo de `/sdd-task`: capturá el requisito verbatim en `.sdd/tasks/<id>-<slug>/requirement.md`, clasificá y seguí. El detalle de cada fase vive en las skills `sdd-*` — seguilas, no lo repitas de memoria. No hay CLI: los artefactos los escribís vos, con el formato canónico de `sdd-task → references/artefactos.md`.
<!-- sddkit:end -->
