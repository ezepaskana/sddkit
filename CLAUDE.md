# CLAUDE.md — sddkit

Spec-driven development para Claude: documentación C4 viva, catálogo de convenciones validadas y flujo SDD auto-disparado.

<!-- sddkit:begin -->
<!-- Bloque gestionado por sddkit (se regenera con `sdd scan`). Todo lo de afuera del bloque es del equipo y nunca se toca. Última actualización: 2026-08-02 -->

## Triggers automáticos de skills

Ejecutá `/sdd-task` ante pedidos de cambio (agregar, crear, implementar, arreglar, mejorar, refactor, "quiero que X haga Y") y `/sdd-analyze` ante preguntas sin pedido de cambio (¿, cómo, por qué, investigar, explicar). Ambiguo → preguntale al dev: (a) implementar, (b) investigar, (c) solo charlar.

## Preferencias de respuesta

Responde siempre de forma breve y directa. Evitá explicaciones largas o preámbulos salvo que se pidan explícitamente. Priorizá código y respuestas cortas sobre prosa extensa.

Entregá el hallazgo en ≤ 150 palabras y 2-4 opciones numeradas; esperá que el dev elija antes de seguir. El detalle largo va a un archivo, nunca al chat: expandí de a un tema, a pedido.

Para mostrarle un archivo al dev, mirá el contexto de terminal: si es la terminal embebida de un IDE (`TERMINAL_EMULATOR=JetBrains-JediTerm` o `TERM_PROGRAM=vscode`), mostralo en ese mismo IDE; si es una terminal standalone, abrilo con el comando de `.sdd/config.json → ui.opener` si está configurado (`<opener> "<ruta>"`); sin `ui.opener`, usá tu comportamiento default.

## Ante dudas o incongruencias: preguntale al dev

Preguntar no es una falla. Si un requisito contradice el código, una instrucción violaría el catálogo o una regla BR/ADR documentada, falta información o algo no tiene sentido, **frená y preguntale al dev antes de seguir** — no avances con una suposición. Las decisiones menores resolvélas con buen juicio normal y seguí.

## Arquitectura (modelo C4 vivo)

Antes de cambios estructurales, leé `.sdd/c4/` (context, containers, components), `.sdd/domain.md` (glosario + **reglas BR-NNN, vinculantes**), `.sdd/decisions/` (ADRs: no contradigas una aceptada sin ADR nuevo) y `.sdd/LEARNINGS.md` (leelo primero si existe). Si tu cambio toca la arquitectura, **actualizá esos docs en el mismo cambio**. Preguntas abiertas en `.sdd/QUESTIONS.md`: respondelas con el código si podés, si no preguntale al dev.

## Catálogo de convenciones validadas

Decisiones ya validadas por el equipo. **Cumplilas siempre** — no introduzcas variantes nuevas de un topic decidido:

- **module-system** → usar siempre `esm` _(decidido 2026-06-12)_. Razón: package.json declara type=module y 25/26 archivos son ESM; el único CJS (src/lib/patterns.js) son strings de detectores de patrones, no código real.. Existe código legacy con otras variantes (cjs: 1 archivos): NO lo migres salvo pedido explícito, pero NUNCA escribas código nuevo con esas variantes.
- **http-endpoints** → usar siempre `jaxrs` _(decidido 2026-06-12)_. Razón: No aplica: sddkit es CLI Node sin servidor HTTP. Ambas variantes son strings literales de ENDPOINT_STYLES en src/lib/patterns.js (detectores para otros repos), no endpoints reales; jaxrs elegido arbitrariamente para resolver el pendiente.. Existe código legacy con otras variantes (spring-mapping: 1 archivos): NO lo migres salvo pedido explícito, pero NUNCA escribas código nuevo con esas variantes.

Topics pendientes en `.sdd/patterns.json`: preguntale al dev cuál variante usar y sugerile `sdd decide`.

## Flujo SDD (spec-driven development)

Para tarea no trivial, aplicá **automáticamente**: `sdd task new "<requisito verbatim>"` y seguí el contrato que imprime. El detalle de cada fase vive en las skills `sdd-task`/`sdd-analyze`/`sdd-specify`/`sdd-plan`/`sdd-execute`/`sdd-close` — seguilas, no lo repitas de memoria.
<!-- sddkit:end -->
