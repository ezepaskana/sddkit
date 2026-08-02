# Spec — tarea 015: Que el bloque generado por sdd scan o las skills instruyan a…

> Estado: borrador. Su presupuesto es de **≤ 300 palabras** — un criterio por comportamiento observable, sin repetir la historia ni el análisis. `N/A: <motivo>` es respuesta válida en cualquier sección que no aplique. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como dev quiero que los archivos que me muestran (agente y CLI) se abran según mi contexto — en el IDE si trabajo en su terminal embebida, con `ui.opener` si estoy en terminal standalone — para no saltar de app.

**Criterios de aceptación (formato EARS):**

- CUANDO `buildBlock` genera el bloque gestionado, EL SISTEMA DEBE incluir en `## Preferencias de respuesta` la instrucción contextual de BR-063: terminal embebida de IDE (`TERMINAL_EMULATOR=JetBrains-JediTerm` o `TERM_PROGRAM=vscode`) → mostrar en ese IDE; standalone → `ui.opener` si existe; sin opener → default.
- CUANDO `openFile` (CLI) corre en terminal embebida de IDE, EL SISTEMA DEBE abrir el artefacto en el IDE anfitrión (`open -b $__CFBundleIdentifier "<ruta>"` en macOS), ignorando `ui.opener`.
- SI está en terminal embebida pero sin `__CFBundleIdentifier` (Linux/Windows), EL SISTEMA DEBE degradar al default del SO (nunca fallar la apertura).
- CUANDO `openFile` corre en terminal standalone, EL SISTEMA DEBE mantener el comportamiento actual (`ui.opener` → default del SO).
- CUANDO se regenera el bloque (`sdd scan`/`sync`/`init`/`decide`), EL SISTEMA DEBE propagar la instrucción sin tocar contenido fuera del bloque; el CLAUDE.md de este repo queda regenerado en el mismo cambio (dogfooding).

**Reglas de negocio afectadas:** BR-063 (nueva, en `.sdd/domain.md`). No modifica BR-036/BR-060.

**Fuera de alcance:**

- Cambios en skills `sdd-*` (cargan solo al invocarse).
- Detección de otros IDEs/terminales fuera de JetBrains y VS Code.
- Regenerar CLAUDE.md de otros repos (nido-be): lo hace el dev con `sdd sync`.

**Impacto en arquitectura/catálogo:** `src/lib/agentsmd.js` y `src/lib/open.js` (Librería interna) + tests (`open.test.js`); convención `esm`; sin ADR ni cambios C4.

---
_Aprobación del dev: aprobado 2026-08-01_
