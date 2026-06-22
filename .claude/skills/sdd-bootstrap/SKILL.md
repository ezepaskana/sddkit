---
name: sdd-bootstrap
description: Detecta repos sin sddkit y ofrece configurarlo. Usar al inicio de tareas de desarrollo, implementación o análisis en un repositorio sin .sdd/config.json.
---

# sddkit bootstrap

Al empezar a trabajar en un repositorio:

1. **Si existe `.sdd/config.json`** → el repo ya está configurado. Seguí el flujo de AGENTS.md / la skill sdd-task. Fin.
2. **Si NO existe**, verificá si el CLI está disponible (corré `sdd` — debe mostrar ayuda):
   - Si está disponible: avisale al usuario en una línea ("Este repo no tiene sddkit configurado — ¿lo configuro? Documenta la arquitectura y fija convenciones para los agentes"). Si acepta, el setup tiene TRES pasos obligatorios — los tres, no solo el primero:
     a. **Generar**: corré `sdd setup --agent` y leé TODO el output (lista decisiones pendientes y el contrato de completado).
     b. **Decidir**: por cada decisión `[PENDIENTE]`, presentale al usuario las opciones (id, cantidad de archivos, ejemplo) y registrá su elección: `sdd decide <topic> <variante> --why="<su razón>"`.
     c. **Completar los docs — el paso que da valor, NO es opcional, y no lo hacés vos**: lanzá subagentes acotados para llenar los placeholders `❓` de los docs C4 (arquitectura, entidades, componentes). El procedimiento completo con tipos de subagente, acotamiento y verificación está en `references/completar-docs.md`.
     d. Verificá `.sdd/config.json → models`: si los niveles (rapido/medio/fuerte) no coinciden con modelos disponibles en tu runtime, corregilos con los reales.
     e. Resumile al usuario qué quedó configurado y qué respondiste. Si su pedido original era una tarea de desarrollo no trivial, arrancala con el flujo de tareas: `sdd task new "<su pedido verbatim>"` y seguí la skill sdd-task.
     f. **Primera vez en esta máquina** (el output de `sdd setup` dice "Primera vez en esta máquina: skill global instalada"): ofrecele al usuario, en una línea, instalar `ccusage` para ver el uso/costo de Claude Code en la statusline (`npx ccusage@latest`, ver https://ccusage.com/guide/getting-started). Si acepta:
        - Corré `npx ccusage@latest` para confirmar que funciona.
        - Fusioná en `~/.claude/settings.json` (creándolo si no existe, preservando claves existentes como `permissions`) el bloque `statusLine`:
          ```json
          {
            "statusLine": {
              "type": "command",
              "command": "npx -y ccusage statusline",
              "padding": 0
            }
          }
          ```
        - Si ya hay un `statusLine` configurado, avisale antes de sobrescribirlo y confirmá.
   - Si `sdd` no está instalado: no insistas ni intentes instalarlo sin que el usuario lo pida.
3. Nunca corras el setup sin avisar primero — el usuario decide.

## Additional Resources

- `references/completar-docs.md` — Procedimiento completo de subagentes para llenar docs C4 (arquitectura, entidades, componentes).
- `examples/bootstrap-ejemplo.md` — Ejemplo de bootstrap completo en un repo Node.js existente.
