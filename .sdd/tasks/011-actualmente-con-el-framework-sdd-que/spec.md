# Spec — tarea 011: Docs concisos + diagramas + flujo adaptativo por tipo (Claude-only)

> Estado: borrador. El agente completa este archivo con la spec formal. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como dev que usa sddkit con Claude, quiero que el framework genere documentos concisos (con diagramas donde reemplazan prosa) y aplique solo las fases que el tipo de tarea amerita, para leer y aprobar más rápido y gastar menos contexto del agente.

**Criterios de aceptación (formato EARS):**

_Flujo adaptativo (BR-057, BR-058)_

1. CUANDO se corre `sdd task new`, EL SISTEMA DEBE capturar el requisito verbatim como hoy, crear solo `requirement.md`, e imprimir un contrato ≤ 12 líneas que instruya: clasificar tipo+riesgo, anunciarlo en una línea y seguir el flujo del tipo (detalle en las skills, no en el contrato).
2. CUANDO el agente declara el tipo (`sdd task type <id> <tipo> [--riesgo alto]`), EL SISTEMA DEBE registrarlo en la tarea y crear únicamente los templates de artefactos que ese tipo requiere: `simple` → nota única breve; `bug` → reproducción + plan corto (el test de regresión reemplaza la spec); `refactor` → impacto + plan (sin EARS); `feature` → analysis/spec/plan actuales.
3. CUANDO el tipo es `simple`, EL SISTEMA DEBE exigir un único gate: el agente explica en muy pocas palabras qué entendió y qué va a hacer, y con el ok del dev implementa con tests.
4. CUANDO el tipo es `bug`, EL FLUJO DEBE ser: reproducir → test rojo que lo compruebe → fix → test verde; sin `spec.md`.
5. CUANDO el tipo es `refactor` y hay grafo configurado, EL AGENTE DEBE correr `sdd impact` en el análisis y verificar tests verdes antes y después del cambio.
6. SI el alcance muta durante la ejecución (p.ej. una `simple` se complejiza), EL AGENTE DEBE anunciarlo, re-clasificar con `sdd task type` y crear los artefactos faltantes sin perder lo hecho.
7. SI el dev corrige el tipo/riesgo en cualquier momento, EL SISTEMA DEBE re-encaminar el flujo aceptando la corrección sin fricción.

_Concisión (BR-059)_

8. CUANDO se generan artefactos, cada template DEBE declarar su presupuesto: analysis ≤ 350 palabras, spec ≤ 300, retro ≤ 150; plan con ≤ 3 sub-ítems por paso (Hace+Archivos fusionados, Verificación; Depende solo si existe).
9. CUANDO una sección no aplica, `N/A: <motivo>` DEBE satisfacer los gates (incluido el cierre de retro).
10. CUANDO se instalan las skills, sus ejemplos DEBEN respetar los presupuestos (≤ 40 líneas por ejemplo) — son el estándar que el agente copia.

_Claude-only (BR-060, ADR-0013)_

11. CUANDO se corre `init`/`scan`/`setup`/`decide`, el bloque gestionado DEBE escribirse en `CLAUDE.md` con ≤ 450 palabras (progressive disclosure: el detalle vive en las skills); SI existe un bloque gestionado previo en `AGENTS.md`, EL SISTEMA DEBE migrarlo (mover a `CLAUDE.md` y limpiarlo de `AGENTS.md`).
12. EL SISTEMA NO DEBE generar la regla de Cursor (`src/templates.js` se elimina) ni prosa multi-agente.

_Diagramas (BR-061, BR-062)_

13. CUANDO `scan` genera `components.md`, ESTE DEBE incluir un diagrama Mermaid `flowchart` de módulos; los "Flujos clave" de `domain.md` DEBEN ofrecer formato diagrama en su template.
14. CUANDO se corre `sdd context`, el destilado DEBE incluir los bloques Mermaid de los docs C4/domain.
15. Los templates de spec/plan DEBEN ofrecer una sección de diagrama opcional con criterio explícito: solo si reemplaza prosa (flujos de 3+ actores/pasos).
16. SI un bloque Mermaid no declara un tipo de diagrama válido en su primera línea, o un bullet de `LEARNINGS.md` supera 200 caracteres, `sdd validate` DEBE reportarlo y fallar (mismo mecanismo que los checks existentes).

_Demostración (alcance retroactivo acordado en P3)_

17. Los docs vivos de ESTE repo DEBEN re-escribirse al nuevo estándar: `CLAUDE.md` (migrado de AGENTS.md), `LEARNINGS.md` (bullets ≤ 200 chars), `domain.md` (flujos como diagrama), `components.md` (con diagrama). Tareas viejas intactas.

**Reglas de negocio afectadas:** nuevas BR-057 a BR-062 (ya agregadas a `.sdd/domain.md`). No se modifican BRs existentes; BR-036 se re-redacta solo en su soporte (el bloque pasa de AGENTS.md a CLAUDE.md) al ejecutar.

**Fuera de alcance:**

- Migración automática de repos clientes ya instalados (migran cuando corran `sdd init`/`sdd sync`).
- Re-escritura de tareas viejas (`.sdd/tasks/001-010`) y ADRs existentes.
- Cambios al pipeline de living docs LLM (docs.js/llmClient) y al graphstore (tarea 010).
- Soporte para agentes distintos de Claude (decisión explícita, ADR-0013).
- Validación semántica de diagramas (solo chequeo sintáctico barato).

**Impacto en arquitectura/catálogo:** Módulos afectados: `src/commands/task.js` (contrato, `task type`, gates N/A), `scan.js`, `init.js`, `validate.js` (checks nuevos), `context.js` (incluir Mermaid), `src/lib/agentsmd.js` (→ CLAUDE.md), `c4.js`, `domain.js`, `templates.js` (eliminar), `skills/*` (SKILL.md + templates + examples). Requiere ADR-0013 (Claude-only) y ADR-0014 (flujo adaptativo por tipo). Actualizar `.sdd/c4/context.md` (quita "multi-agente"), `components.md` y el catálogo no cambia (esm sigue). Convención esm aplica a todo código nuevo.

---
_Aprobación del dev: aprobada (2026-08-01, en chat)_
