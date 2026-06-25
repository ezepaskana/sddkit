# Spec — tarea 006: Ajustar el flujo post-ejecución SDD para que: (1) los worker…

> Estado: borrador. El agente completa este archivo con la spec formal. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como desarrollador usando el flujo SDD, quiero que el agente no commitee durante la ejecución y me guíe a probar localmente antes de commitear, para poder ver los diffs limpios y validar la feature manualmente antes de que entre al historial de git.

**Criterios de aceptación (formato EARS):**

- CUANDO un worker subagente completa la implementación de un paso, EL SISTEMA (skill sdd-execute / protocolo de subagentes) DEBE instruir al worker a NO ejecutar `git add` ni `git commit` — los cambios quedan como modificaciones locales (unstaged/untracked).
- CUANDO el orquestador completa y verifica todos los pasos del plan (todos los checkboxes marcados en plan.md), EL SISTEMA DEBE analizar qué tipo de cambio se hizo (comando CLI nuevo/modificado, función de librería, config/docs, skill) y presentar al dev instrucciones concretas de cómo probarlo localmente (ej: "corré `sdd doctor` y verificá que el output incluye X" para un comando CLI; "importá la función y probá con estos args" para una lib).
- CUANDO el dev confirma que probó localmente y está OK, EL SISTEMA DEBE commitear los cambios (con mensaje convencional según `.sdd/branching.md`) y recién entonces transicionar a la skill sdd-close.
- SI el dev reporta un problema durante la prueba local, EL SISTEMA DEBE ayudar a corregir sin commitear, y volver a pedir confirmación de prueba local antes de commitear.
- MIENTRAS haya pasos pendientes de verificación en plan.md, EL SISTEMA NO DEBE commitear cambios de pasos anteriores ya verificados — los cambios se acumulan como diffs locales hasta la confirmación final del dev.

**Reglas de negocio afectadas**: Ninguna BR existente se modifica. No se crean BRs nuevas — las instrucciones viven en las skills (que son la fuente autoritativa para el comportamiento del agente, no el dominio del CLI).

**Fuera de alcance:**

- No se modifica código fuente de sddkit (ningún `.js`).
- No se modifica el comando `sdd task close` (la lógica de PR/push en `src/commands/task.js` queda intacta).
- No se cambia el pre-commit hook ni `sdd validate`.
- No se agrega lógica programática de "detectar tipo de cambio" — el agente lo infiere leyendo el plan/spec (es instruccional, no algorítmico).

**Impacto en arquitectura/catálogo:** Ninguno. Los 4 archivos afectados son documentación de skills, no módulos de components.md:
- `skills/sdd-execute/SKILL.md` — agregar fase "prueba local" post-verificación y regla de no-commit para el orquestador
- `skills/sdd-execute/references/protocolo-subagentes.md` — agregar regla explícita de no-commit para workers
- `skills/sdd-execute/examples/ejecucion-ejemplo.md` — agregar sección "Prueba local" entre último paso y cierre
- `skills/sdd-close/SKILL.md` — ajustar para que asuma que el commit ya se hizo (no intentar push/PR como primera acción)

---
_Aprobación del dev: aprobada (2026-06-24)_
