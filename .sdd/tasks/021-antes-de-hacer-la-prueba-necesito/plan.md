# Plan — tarea 021

> Lista de pasos ejecutables. El detalle técnico está en `design.md`. Tope: 45 líneas.

- [ ] **1. ADR-0017: termaid como dependencia opcional** — matiza BR-079 sin contradecir ADR-0016. `cmd: test -f .sdd/decisions/0017-termaid-dependencia-opcional.md`
- [ ] **2. Reglas en `domain.md`** — BR-063 reescrita (volcado en terminal, sin apps externas), BR-058/059 actualizadas (artefactos por tipo, tope en líneas) y BR nuevas de topes, artefactos y termaid. `cmd: ! grep -n 'ui.opener' .sdd/domain.md && grep -c 'BR-08[2-9]' .sdd/domain.md`
- [ ] **3. Template `analysis.md`** `[P]` — tres secciones: entendimiento, diagrama si aplica, hasta 5 huecos con respuesta sugerida (CA-6). `cmd: grep -q 'máximo 5' skills/sdd-analyze/templates/analysis.md`
- [ ] **4. Template `spec.md`** `[P]` — criterios numerados `CA-N`, supuestos, sin impacto en arquitectura (CA-7). `cmd: grep -q 'CA-1' skills/sdd-specify/templates/spec.md && ! grep -q 'Impacto en arquitectura' skills/sdd-specify/templates/spec.md`
- [ ] **5. Templates `plan.md` y `design.md`** `[P]` — el plan como lista de una línea por paso; el design recibe arquitectura, archivos y dependencias (CA-8). `cmd: test -f skills/sdd-plan/templates/design.md && grep -q '45 líneas' skills/sdd-plan/templates/plan.md`
- [ ] **6. Borrar los tres templates muertos** `[P]` — `nota.md`, `reproduccion.md`, `retro.md` (CA-9). `cmd: ! test -e skills/sdd-task/templates/nota.md && ! test -e skills/sdd-task/templates/reproduccion.md && ! test -e skills/sdd-close/templates/retro.md`
- [ ] **7. `artefactos.md`: formato canónico completo** — artefactos por tipo, estados, gates sin retro, volcado en terminal con tope y aviso, y el protocolo de termaid (CA-1 a CA-5, CA-12 a CA-14). Depende de 2. `cmd: grep -q 'termaid' skills/sdd-task/references/artefactos.md && ! grep -q 'ui.opener' skills/sdd-task/references/artefactos.md`
- [ ] **8. `sdd-task`: flujo por tipo y calibración** — un solo camino que se profundiza con el riesgo; preguntar la expectativa solo ante señales ambiguas (CA-11). Depende de 7. `cmd: ! grep -qE 'nota\.md|reproduccion\.md' skills/sdd-task/SKILL.md`
- [ ] **9. `sdd-analyze` y `sdd-specify`** — tres secciones y tope de 5 huecos; spec solo en riesgo alto, criterios numerados. Depende de 3, 4. `cmd: grep -q 'riesgo alto' skills/sdd-specify/SKILL.md`
- [ ] **10. `sdd-plan` y `sdd-execute`** — plan como lista, design cuando corresponde, brief que cita el design. Depende de 5. `cmd: grep -q 'design.md' skills/sdd-plan/SKILL.md && grep -q 'design' skills/sdd-execute/references/protocolo-subagentes.md`
- [ ] **11. `sdd-close` sin retro** — chequeos, commit, PR, `done`, y aprendizajes directo a `LEARNINGS.md` (CA-10). Depende de 6. `cmd: ! grep -q 'retro' skills/sdd-close/SKILL.md`
- [ ] **12. Hook de termaid al arrancar** — `hooks/termaid.md` + detección en `hooks.json`, que no dispara si el dev ya respondió (CA-13). `cmd: grep -q 'termaid' hooks/hooks.json && test -f hooks/termaid.md`
- [ ] **13. Bloque de `CLAUDE.md` y `config.json`** — mostrar en terminal reemplaza al opener; se agrega la preferencia de termaid. Depende de 7. `cmd: ! grep -q 'ui.opener' CLAUDE.md`
- [ ] **14. README y C4** — artefactos nuevos, estructura del repo y prerrequisito opcional. Depende de 13. `cmd: ! grep -qE 'nota\.md|retro\.md' README.md && grep -q 'termaid' README.md`
- [ ] **15. Prueba en una tarea real** — abrir una tarea de prueba y confirmar que los tres artefactos se leen en la terminal, que el diagrama renderiza y que ningún archivo supera su tope. _Verificación manual del dev._

---
_Aprobación del dev: aprobada 2026-08-14_
