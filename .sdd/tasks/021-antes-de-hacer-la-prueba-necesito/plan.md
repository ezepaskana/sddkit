# Plan — tarea 021

> Lista de pasos ejecutables. El detalle técnico está en `design.md`. Tope: 45 líneas.

- [x] **1. ADR-0017: termaid como dependencia opcional** — matiza BR-079 sin contradecir ADR-0016. `cmd: test -f .sdd/decisions/0017-termaid-dependencia-opcional.md`
- [x] **2. Reglas en `domain.md`** — BR-063 reescrita (volcado en terminal, sin apps externas), BR-057/058/059 actualizadas (calibración, artefactos por riesgo, tope en líneas) y BR-082 a BR-087 nuevas (topes, artefactos, aprendizajes, termaid). `cmd: grep -q 'vuelca su contenido en la terminal' .sdd/domain.md && test $(grep -cE '^- \*\*BR-08[2-7]\*\*' .sdd/domain.md) -eq 6` _(desvío: el `cmd:` original exigía que `ui.opener` no apareciera, pero BR-063 debe nombrarlo para declararlo obsoleto)_
- [x] **3. Template `analysis.md`** `[P]` — tres secciones: entendimiento, diagrama si aplica, hasta 5 huecos con respuesta sugerida (CA-6). `cmd: grep -qi 'máximo 5' skills/sdd-analyze/templates/analysis.md` _(desvío: el `cmd:` original era case-sensitive)_
- [x] **4. Template `spec.md`** `[P]` — criterios numerados `CA-N`, supuestos, sin impacto en arquitectura (CA-7). `cmd: grep -q 'CA-1' skills/sdd-specify/templates/spec.md && ! grep -q 'Impacto en arquitectura' skills/sdd-specify/templates/spec.md`
- [x] **5. Templates `plan.md` y `design.md`** `[P]` — el plan como lista de una línea por paso; el design recibe arquitectura, archivos y dependencias (CA-8). `cmd: test -f skills/sdd-plan/templates/design.md && grep -q '45 líneas' skills/sdd-plan/templates/plan.md`
- [x] **6. Borrar los tres templates muertos** `[P]` — `nota.md`, `reproduccion.md`, `retro.md` (CA-9). `cmd: ! test -e skills/sdd-task/templates/nota.md && ! test -e skills/sdd-task/templates/reproduccion.md && ! test -e skills/sdd-close/templates/retro.md`
- [x] **7. `artefactos.md`: formato canónico completo** — artefactos por riesgo, estados, gates sin retro, volcado en terminal con tope y aviso, y el protocolo de termaid (CA-1 a CA-5, CA-12 a CA-14). Depende de 2. `cmd: grep -q 'termaid' skills/sdd-task/references/artefactos.md && grep -q 'Nunca lances una aplicación externa' skills/sdd-task/references/artefactos.md` _(desvío: mismo caso que el paso 2 — el archivo nombra `ui.opener` para declararlo obsoleto)_
- [x] **8. `sdd-task`: flujo por tipo y calibración** — un solo camino que se profundiza con el riesgo; preguntar la expectativa solo ante señales ambiguas (CA-11). Depende de 7. `cmd: ! grep -qE 'nota\.md|reproduccion\.md' skills/sdd-task/SKILL.md`
- [x] **9. `sdd-analyze` y `sdd-specify`** — tres secciones y tope de 5 huecos; spec solo en riesgo alto, criterios numerados. Depende de 3, 4. `cmd: grep -q 'riesgo alto' skills/sdd-specify/SKILL.md`
- [x] **10. `sdd-plan` y `sdd-execute`** — plan como lista, design cuando corresponde, brief que cita el design. Depende de 5. `cmd: grep -q 'design.md' skills/sdd-plan/SKILL.md && grep -q 'design' skills/sdd-execute/references/protocolo-subagentes.md`
- [x] **11. `sdd-close` sin retro** — chequeos, commit, PR, `done`, y aprendizajes directo a `LEARNINGS.md` (CA-10). Depende de 6. `cmd: ! test -e skills/sdd-close/templates && ! test -e skills/sdd-close/examples && grep -q 'No hay documento de cierre' skills/sdd-close/SKILL.md` _(desvío: tercer `cmd:` de ausencia que falla porque el doc nombra lo que elimina)_
- [x] **12. Hook de termaid al arrancar** — `hooks/termaid.md` + detección en `hooks.json`, que no dispara si el dev ya respondió (CA-13). `cmd: grep -q 'termaid' hooks/hooks.json && test -f hooks/termaid.md`
- [x] **13. Bloque de `CLAUDE.md` y `config.json`** — mostrar en terminal reemplaza al opener; se agrega la preferencia de termaid. Depende de 7. `cmd: ! grep -q 'ui.opener' CLAUDE.md`
- [x] **14. README y C4** — artefactos nuevos, estructura del repo y prerrequisito opcional. Depende de 13. `cmd: ! grep -qE 'nota\.md|retro\.md' README.md && grep -q 'termaid' README.md`
- [x] **16. Ejemplos de las skills al formato nuevo** — `analisis-ejemplo`, `plan-ejemplo`, `tipos-ejemplo` y `flujo-ejemplo` mostraban artefactos eliminados y presupuestos en palabras. _(paso agregado durante la ejecución: los ejemplos fijan el estándar que el agente copia, más que las instrucciones)_ `cmd: ! grep -rqE 'nota\.md|reproduccion\.md|retro\.md|350 palabras' skills/*/examples/`
- [ ] **15. Prueba en una tarea real** — abrir una tarea de prueba y confirmar que los tres artefactos se leen en la terminal, que el diagrama renderiza y que ningún archivo supera su tope. _Verificación manual del dev._

---
_Aprobación del dev: aprobada 2026-08-14_
