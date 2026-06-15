---
name: sdd-bootstrap
description: Detecta repositorios sin sddkit configurado al empezar cualquier tarea de desarrollo y ofrece configurarlo automáticamente. Usar al inicio de tareas de programación, implementación o análisis de código en un repositorio.
---

# sddkit bootstrap

Al empezar a trabajar en un repositorio:

1. **Si existe `.sdd/config.json`** → el repo ya está configurado. Seguí el flujo de AGENTS.md / la skill sdd-task. Fin.
2. **Si NO existe**, verificá si el CLI está disponible (corré `sdd` — debe mostrar ayuda):
   - Si está disponible: avisale al usuario en una línea ("Este repo no tiene sddkit configurado — ¿lo configuro? Documenta la arquitectura y fija convenciones para los agentes"). Si acepta, el setup tiene TRES pasos obligatorios — los tres, no solo el primero:
     a. **Generar**: corré `sdd setup --agent` y leé TODO el output (lista decisiones pendientes y el contrato de completado).
     b. **Decidir**: por cada decisión `[PENDIENTE]`, presentale al usuario las opciones (id, cantidad de archivos, ejemplo) y registrá su elección: `sdd decide <topic> <variante> --why="<su razón>"`.
     c. **Completar los docs — el paso que da valor, NO es opcional, y no lo hacés vos**:
        - **Arquitectura y negocio** (`context.md`, `containers.md`, `domain.md` salvo "Entidades principales"): lanzá un subagente nivel `medio`/`fuerte` (de `.sdd/config.json → models`, con lectura y escritura) acotado a las fuentes listadas en `.sdd/QUESTIONS.md` (doc/, docs/, README, ADRs). Encargo: responder las preguntas `- [ ]` de `context.md`/`containers.md` y las secciones de `domain.md` distintas de "Entidades principales" (actores, integraciones externas, responsabilidades de contenedores, contenedores faltantes, glosario, reglas de negocio BR-NNN, flujos clave) — reemplazando placeholders, actualizando los mermaid y marcando los checkboxes respondidos. NO debe leer el código del repo más allá de esas fuentes: las entidades y los módulos los cubren los pasos siguientes.
        - **Entidades de negocio** (`domain.md` → "Entidades principales") — **un subagente de solo lectura por entidad**: cada línea `- **Nombre** — ❓ ¿qué representa en el negocio y cuál es su ciclo de vida?` es una entidad candidata (sembrada desde `models/`, `entities/` o `domain/`). Por cada entidad, lanzá un subagente nivel `rapido` (solo lectura, sin Edit/Write) acotado a esas carpetas, con el encargo "buscá el archivo de la entidad `Nombre` y devolvé 1-2 líneas: qué representa en el negocio y cuál es su ciclo de vida". Devuelve solo esas líneas. En paralelo (si son muchas, en tandas).
        - **Componentes** (`components.md`) — **un subagente de solo lectura por módulo pendiente**: `.sdd/QUESTIONS.md` trae una pregunta "¿Cuál es el rol del módulo `X`?" por cada fila `❓ por validar`. Por cada módulo `X`, lanzá un subagente nivel `rapido` (solo lectura, sin Edit/Write) acotado SOLO a los archivos bajo `X/` (para `(raíz)`, solo los archivos sueltos en la raíz del `srcRoot`, sin entrar a otras carpetas), con el encargo "¿cuál es el rol de este módulo, en una frase corta?". Devuelve solo esa frase. En paralelo (si son muchos, en tandas).
        - Con todas las respuestas recolectadas, hacé VOS los edits mecánicos: en `.sdd/domain.md` reemplazá, por cada entidad, `❓ ¿qué representa en el negocio y cuál es su ciclo de vida?` por la descripción devuelta; en `.sdd/c4/components.md` reemplazá cada `❓ por validar` por la frase devuelta y marcá el checkbox correspondiente en "## ❓ VALIDAR con el equipo".
        - Verificá con `sdd validate` que el conteo de preguntas abiertas bajó (**Definition of done: cero placeholders que las fuentes o el código puedan responder**). El subagente de arquitectura/negocio puede devolver hasta 3 preguntas sin responder (el resto queda en QUESTIONS.md) — hacéselas al usuario ahora; sus respuestas son ediciones chicas en los docs, directo.
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
