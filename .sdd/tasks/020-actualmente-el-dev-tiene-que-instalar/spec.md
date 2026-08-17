# Spec — tarea 020: sddkit como plugin de Claude Code, sin CLI ni instalación manual

> Presupuesto ≤ 300 palabras. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como dev que quiere usar sddkit en un repo, quiero no ejecutar ningún comando de instalación ni configuración, para que adoptar el framework cueste cero pasos manuales.

**Criterios de aceptación (formato EARS):**

- EL SISTEMA DEBE distribuirse como plugin de Claude Code, con `.claude-plugin/plugin.json` y `.claude-plugin/marketplace.json` en la raíz del repo (BR-079).
- EL SISTEMA DEBE quedar sin `bin/`, `src/`, `package.json`, `package-lock.json` ni `eslint.config.js`: instalarlo no requiere Node.
- CUANDO se inicia una sesión de Claude en un repo sin `.sdd/config.json`, EL SISTEMA DEBE volcar al contexto del agente el contenido de `hooks/bootstrap.md` (BR-080).
- CUANDO se inicia una sesión en un repo que ya tiene `.sdd/config.json`, EL SISTEMA DEBE no emitir nada.
- CUANDO el agente recibe ese contexto, EL SISTEMA DEBE investigar el repo, generar `.sdd/` y preguntarle al dev solo lo que no pueda deducir del código.
- SI una skill o un doc del framework cita un comando `sdd …` eliminado, EL SISTEMA DEBE reescribir esa instrucción atribuyendo el comportamiento al agente, o eliminarla (BR-081).
- EL SISTEMA DEBE conservar las 7 skills del flujo (`sdd-task`, `sdd-analyze`, `sdd-specify`, `sdd-plan`, `sdd-execute`, `sdd-close`, `sdd-improve-skill`) y eliminar `sdd-test` y `sdd-bootstrap`.
- EL SISTEMA DEBE registrar en un ADR la pérdida de los gates deterministas (conteo de variantes del catálogo, validación bloqueante en pre-commit, verificación de paso por exit code) como decisión consciente y reversible.

**Reglas de negocio afectadas:** BR-079, BR-080, BR-081 (nuevas). Derogadas o a reescribir por BR-081: BR-049 a BR-056, BR-062, BR-069 a BR-078.

**Fuera de alcance:**

- Reimplementar como scripts las capacidades que se pierden. Si hacen falta, es otra tarea.
- Escribir el contenido de `hooks/bootstrap.md`. Esta tarea fija el contrato (cuándo se dispara, qué archivo mira, dónde vive); el texto se redacta después.
- Migrar repos de terceros que hoy tengan sddkit instalado por npm.
- Publicar el marketplace en un índice público.

**Impacto en arquitectura/catálogo:** desaparecen todos los módulos de `.sdd/c4/components.md` (`src/commands`, `src/lib`, `bin`) — C4 y `patterns.json` se regeneran contra el repo nuevo. El catálogo (`module-system`, `http-endpoints`) queda sin objeto: sus decisiones describían código JS que deja de existir. Requiere ADR (pérdida de gates) y actualización completa de `.sdd/c4/`, `CLAUDE.md` y `README.md`.

---
_Aprobación del dev: aprobada 2026-08-09_
