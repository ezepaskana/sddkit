# Spec: Branching Modeling para proyectos que usan sddkit

## Requerimiento de entrada
Ver `requirement.md`

---

## Análisis crítico

### 1. ¿Qué problema real resuelve?

**Problema genuino:** Proyectos que instalan sddkit comienzan tareas SDD sin saber:
- En qué rama trabajar (¿desde `main`? ¿desde `develop`?)
- Cómo nombrar la rama (¿`feature/x`? ¿`task/010-x`?)
- Qué formato de commit usar (¿Conventional Commits? ¿Ninguno?)

Esto genera fricción y divergencia — cada team toma decisiones ad-hoc.

**Valor:** Un proyecto que instala sddkit puede documentar SU política una vez, y luego todos los flujos SDD la respetan automáticamente. Claridad + consistencia.

### 2. ¿Ya existe algo que lo resuelva total o parcialmente?

**En sddkit:** Ningún código de branching/git policy hoy. ✗

**En librerías externas:** `gh` (GitHub CLI) existe y puede crear PRs, pero:
- Requiere autenticación GitHub
- No soporta GitLab/Gitea/Bitbucket
- `gh pr create` requiere que la rama ya esté pusheada

**En el catálogo BR-XXX o ADRs:** Ninguno menciona branching. La tarea actual sería **la primera**.

### 3. ¿Hay alternativa más simple que logre 80% del valor con 20% del esfuerzo?

**Alternativa A:** Documentación + template `.sdd/branching.example.md` que el user copia a `.sdd/branching.md` a mano.
- ✅ Cero código nuevodependencias
- ❌ Manual, requiere disciplina
- ❌ sddkit no lo respeta (no integración)

**Alternativa B:** Lo propuesto — pregunta interactiva en `sdd init`, guarda en `.sdd/branching.md`, integrado en `sdd-plan`/`sdd-execute`/`sdd-close`.
- ✅ Automático, sddkit lo respeta
- ✅ 100% del valor
- ❌ Más código

**Recomendación:** Proceder con Alternativa B (lo propuesto). Vale el esfuerzo.

### 4. ¿Qué supuestos trae el dev que podrían no ser ciertos?

#### Supuesto A: "Crear PR en draft es viable desde CLI"
**¿Es cierto?**
- Para GitHub: sí, via `gh pr create --draft`
- Para GitLab: existe `gl` CLI o API nativa
- Para Gitea: API nativa, pero no hay tool de CLI estándar
- Para Bitbucket: API nativa, pero no estándar

**Riesgo:** El requirement dice "crear PR en draft" pero no especifica cómo. Está implícito que es GitHub + `gh` CLI, pero:
- ¿Qué pasa con proyectos en GitLab?
- ¿Qué pasa en un repo local sin push a origin?
- ¿Es un blocker o un "best effort"?

**Pregunta para el dev:** ¿Suportamos solo GitHub + `gh` CLI? ¿O es out-of-scope "crear el PR" y sddkit solo prepara la rama/commits?

---

#### Supuesto B: "La política es fija una vez creada"
**¿Es cierto?**
La spec no dice qué pasa si el team decide cambiar política. ¿Se crea una nueva rama?

**Pregunta para el dev:** Si el team cambia de política (ej: `task/NNN-slug` → `feature/slug`), ¿se migra a tareas futuras o se deja `.sdd/branching.md` como histórico?

---

#### Supuesto C: "sddkit debe integrar Conventional Commits + GitHub Flow por default"
**¿Es cierto?**
El requirement asume que si el user no sabe, ofrecemos "CC + GH Flow + task/NNN-slug" como default. Pero:
- ¿Todos los equipos son Git Flow compatible? (algunos usan Trunk-based)
- ¿Qué tan opinionado debería ser sddkit?

**Pregunta para el dev:** ¿Es aceptable ser opinionado con ese default? ¿O debería ser "educación" + "user elige" sin defaults sugeridos?

---

#### Supuesto D: "Los subagentes de `sdd-execute` trabajarán en la rama correcta"
**¿Es cierto?**
Cuando `sdd task execute 010` lanza subagentes (orquestador pattern), ¿cómo se asegura que cada subagente:
1. Está en la rama correcta (`task/010-...`)?
2. Hace commits en esa rama?
3. No pushea hasta que sddkit haya hecho todas las verificaciones?

**Riesgo:** El plan dice "Paso 1: crear rama" pero los pasos 2+ asumen que ya existe. Si un subagente corre Step 2 antes de que Step 1 haya creado la rama, falla.

**Pregunta para el dev:** ¿Cómo coordinan los pasos secuenciales en `sdd-execute` para garantizar que la rama existe antes de que los subagentes la usen?

---

#### Supuesto E: "sddkit puede crear PR sin tener .git"
**¿Es cierto?**
sddkit HOY no tiene `.git` (BR-037/task 008). Las tareas ejecutándose dentro de sddkit no pueden hacer `git checkout -b ...` hasta que `git init` se corra.

**Riesgo:** La tarea 010 se ejecuta en sddkit mismo (dogfooding). ¿Cuándo se corre `git init`? ¿Es blocker para esta tarea?

**Pregunta para el dev:** ¿La tarea 010 (Branching Model) debe incluir `git init` como primer paso? ¿O es out-of-scope?

---

### 5. ¿Riesgos y efectos secundarios?

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| Pregunta de política en `sdd init` agrega fricción (user no sabe responder) | Media | Bajo | Defaults claros + opción "más tarde" |
| `.sdd/branching.md` versionado pero team cambia política → inconsistencia histórica | Baja | Medio | Documentar: es un snapshot, no vinculante retroactivamente |
| `gh` CLI no instalado → `sdd-close` falla al crear PR | Media | Alto | Detectar ausencia de `gh`, avisar con `sdd doctor`, documento sobre requisitos |
| Subagentes en `sdd-execute` no respetan la rama → commits en rama incorrecta | Alta | Crítico | Pasar `branchName` como contexto a subagentes en `sdd-execute` |
| Integración en 3 comandos (`sdd-plan`, `sdd-execute`, `sdd-close`) × múltiples workflows (GitHub Flow, Git Flow, Trunk-based) = complejidad combinatoria | Media | Medio | Empezar solo con GitHub Flow + CC; Git Flow como fase 2 |

### 6. ¿Qué pasa si NO se hace?

- **Corto plazo:** Proyectos que instalan sddkit siguen sin guía clara. Fricción cada vez que crean una rama.
- **Medio plazo:** Inconsistencia en naming de ramas y commits across tareas del mismo proyecto.
- **Largo plazo:** Adopción de sddkit sesgada hacia teams que ya tienen política fija. Teams nuevos siguen siendo friccionosos.

**Costo de no hacer:** Bajo overhead para el framework, pero deja un gap de UX real.

### 7. ¿Cómo nos enteraríamos de fallos?

**Si la rama no se crea:**
- `sdd task execute` tira error en Step 1
- Mensaje claro: `Error: No se pudo crear rama 'task/010-...'` + sugerir `git status` / `git init`

**Si el PR no se crea (`sdd-close`):**
- Requiere `gh` CLI instalado
- `sdd doctor` debería avisar si `gh` no está disponible
- Error en `sdd task close`: `Error: gh CLI no encontrado. Instala con: brew install gh`

**Si la rama no se respeta (Supuesto D):**
- Subagentes crean commits fuera de la rama esperada
- `sdd task verify` chequea rama actual + commits; puede detectar inconsistencias
- Advertencia: `Commits detectados en rama incorrecta: XXX`

**Si la política es ambigua:**
- User intenta ejecutar plan, primeros pasos fallan
- Mensajes de error claros: `Política no definida en .sdd/branching.md. Correr: sdd branching-policy --setup`

---

## Clarificaciones (respondidas)

### ✅ Creación de PRs
**Respuesta:** Best effort — intenta detectar y usar tool nativo del platform (GitHub → `gh`, Azure DevOps → `az`, etc.), pero degrada a "rama + commits listos para PR manual" si no hay tool disponible.

**Implicación:** 
- En GitHub, `sdd-close` ejecuta `gh pr create --draft`
- En Azure DevOps, intenta `az repos pr create`
- Si ninguno disponible, avisa: "PR ready to create manually at: `<URL>`"
- Docfile dedicado: "Cómo crear PR en tu plataforma" (GitHub, Azure DevOps, GitLab)

### ✅ Mutabilidad de política
**Respuesta:** Versionado — histórico de políticas. `.sdd/branching.md` documenta cambios con fecha/autor.

**Implicación:**
- Estructura: array de versiones con timestamp
- Tareas futuras leen la **versión activa** (última)
- Histórico es read-only (audit trail)
- Format: facilita "qué cambió y cuándo"

### ✅ git init timing
**Respuesta:** SÍ, tarea 010 incluye `git init` como primer paso.

**Implicación:**
- Paso 0 del plan: `git init` en sddkit
- Tarea 010 se ejecuta en vivo sobre sddkit real
- Después de 010, sddkit tiene `.git` + primera tarea (la 010 misma) versionada

### ✅ Workflows soportados (Fase 1)
**Respuesta:** GitHub Flow + Git Flow.

**Implicación:**
- `.sdd/branching.md` permite elegir entre ambos
- Parámetros específicos por workflow (ej: rama de origen en Git Flow es `develop`, no `main`)
- Trunk-based queda para Fase 2

### ✅ Sequenciamiento en `sdd-execute`
**Respuesta:** Primer paso OBLIGATORIO = crear rama.

**Implicación:**
- Plan generado por `sdd-plan` tiene Paso 1 = `git checkout -b <rama>` (immutable)
- Pasos 2+ pueden asumir rama existe
- Si Paso 1 falla, plan se detiene (sin continuar)
- Subagentes de Pasos 2+ heredan el estado del repo con rama ya creada

---

## Estado del análisis
✅ **Clarificaciones completadas.**

Recomendación: **Proceder** — gaps críticos están resueltos, diseño es viable.

---

## Métrica de impacto

- **Métrica:** % de proyectos que usan sddkit CON política de branching clara (`.sdd/branching.md` válido)
- **Baseline actual:** 0% — no existe el feature hoy
- **Resultado esperado:** 100% post-tarea — todos los proyectos que corren `sdd init` / `sdd setup` tienen `.sdd/branching.md`
- **Cómo se mide después:**
  - Test: `sdd init` en repo vacío → `.sdd/branching.md` existe y es válido JSON/YAML
  - Test: `sdd task plan 001` → sección "Rama de trabajo" está en el plan generado
  - Test: `sdd task execute` → detecta y respeta rama definida en policy
  - Manual (dogfooding): ejecutar tarea 010 en sddkit mismo, verificar flujo completo

---

## Spec refinada

**Historia:** Como _developer que instala sddkit en su proyecto_, quiero _definir y respetar automáticamente una política de branching_ para _que todas mis tareas SDD sigan convenciones consistentes (naming de ramas, commits, PR) sin fricción_.

**Criterios de aceptación (formato EARS):**

### Fase 1: Definición de política

- CUANDO un proyecto corre `sdd init` o `sdd setup` CON `.sdd/branching.md` inexistente, EL SISTEMA DEBE preguntar (modo interactivo) qué convención de commits, flujo de ramas y patrón de nombres prefiere el team, y DEBE guardar la respuesta en `.sdd/branching.md` (versionado con git).
- CUANDO el usuario no sabe qué responder, EL SISTEMA DEBE ofrecer defaults: Conventional Commits + GitHub Flow + `task/{numero}-{slug}`.
- SI la política ya existe en `.sdd/branching.md`, EL SISTEMA DEBE no preguntar nuevamente (no sobrescribir).
- CUANDO la política se actualiza manualmente en `.sdd/branching.md`, EL SISTEMA DEBE incluir un campo `versions` con histórico: `[{date, author, convención, flujo, patrón}]` y una sección `active` que apunta a la versión actual.

### Fase 2: Integración con `sdd-plan`

- CUANDO se corre `sdd task plan <id>`, EL SISTEMA DEBE leer `.sdd/branching.md` (si existe) y auto-generar una sección "Rama de trabajo" en el plan que documente: nombre de rama esperada, origen (main/develop), destino, y patrón de commits esperado.
- EL SISTEMA DEBE asegurar que el Paso 1 del plan sea crear la rama: `git checkout -b <nombre-segun-politica>`.
- SI no existe `.sdd/branching.md`, EL SISTEMA DEBE usar defaults (GitHub Flow + CC + task/NNN-slug) y documentar esto en el plan con nota: "⚠️ Política de branching no definida. Usamos defaults. Correr `sdd branching-policy --define` para personalizarlo."

### Fase 3: Integración con `sdd-execute`

- CUANDO se corre `sdd task execute <id>`, ANTES de ejecutar el Paso 1, EL SISTEMA DEBE verificar que el repo tiene `.git` (si no, fallar con instrucción clara: "git init required").
- CUANDO el Paso 1 es crear rama (`git checkout -b ...`), EL SISTEMA DEBE ejecutarlo y verificar que `git branch --show-current` retorna el nombre esperado. SI falla, parar ejecución con mensaje claro.
- CUANDO los Pasos 2+ se ejecutan, EL SISTEMA DEBE validar que siguen en la rama correcta (warning si desvío, pero no bloquear).

### Fase 4: Integración con `sdd-close`

- CUANDO se corre `sdd task close <id>`, EL SISTEMA DEBE verificar: rama está pusheada a origin, todos los commits están versionados.
- CUANDO ambas verificaciones pasan, EL SISTEMA DEBE intentar crear un PR en draft, detectando automáticamente la plataforma:
  - SI detecta GitHub (remoto `origin` es `github.com`), EL SISTEMA DEBE ejecutar `gh pr create --draft --title="..." --body="..."` e incluir link a la tarea.
  - SI detecta Azure DevOps, EL SISTEMA DEBE ejecutar `az repos pr create --draft` con parámetros equivalentes.
  - SI detecta GitLab, EL SISTEMA DEBE ejecutar `gl mr create --draft` (si disponible).
  - SI no detecta o tool de PR no está instalado, EL SISTEMA DEBE avisar: "PR ready to create manually. Ir a: `<URL de repo>/pull/new/<rama>`" e incluir descripción pre-generada.
- EL SISTEMA DEBE documentar el estado: `# PR: <#ID> (draft) — <URL>` en el reporte final de cierre.

### Casos borde y error

- SI `sdd task plan` pero `.sdd/branching.md` tiene formato inválido (JSON/YAML malformado), EL SISTEMA DEBE avisar: "`.sdd/branching.md` is malformed. Correr `sdd doctor` para diagnosticar."
- SI `sdd task execute` pero la rama ya existe localmente (de una ejecución anterior fallida), EL SISTEMA DEBE ofrecer: "Rama exists. (a) use existing, (b) delete and recreate, (c) abort".
- SI `sdd task close` pero la rama no está pusheada, EL SISTEMA DEBE avisar: "Branch not pushed to origin. Push con `git push origin <rama>` y vuelve a correr `sdd task close`."
- SI `sdd task close` pero no hay cambios committeados, EL SISTEMA DEBE advertir pero permitir crear PR vacío (el dev puede haber querido abandonar el trabajo).

**Reglas de negocio nuevas (a agregar en `.sdd/domain.md`):**

- **BR-039:** Toda tarea SDD que modifica código DEBE ejecutarse en una rama dedicada (no en `main` o `develop`). La rama se crea automáticamente en `sdd-execute` Paso 1, basándose en la política definida en `.sdd/branching.md`.
- **BR-040:** La política de branching de un proyecto se define una sola vez en `.sdd/branching.md` (creado por `sdd init`/`sdd setup`). El archivo versionea el histórico de cambios de política (campo `versions`). Cambios futuros a la política se documentan en `versions` con timestamp y autor.
- **BR-041:** Cuando `sdd task close` crea un PR, EL SISTEMA DEBE intentar usar el tool nativo de la plataforma (GitHub → `gh`, Azure → `az`, GitLab → `gl`). SI el tool no está disponible, DEBE degradar a "rama lista para PR manual" SIN fallar.
- **BR-042:** Los commits dentro de una tarea SDD DEBEN seguir la convención definida en `.sdd/branching.md` (Conventional Commits, Semantic Commit, u otra). `sdd task verify` DEBE avisar (no forzar) si detecta commits que no siguen la convención.

**Fuera de alcance:**

- ❌ Merge automático a `main`/`develop` (es decisión manual + revisión humana)
- ❌ Delete rama remota automático (el dev o sistema de CI lo hace post-merge)
- ❌ Validación forzada de commits (solo avisos; hooks de git son documentados, no instalados por sddkit)
- ❌ Soporte para Trunk-based en Fase 1 (Fase 2)
- ❌ Soporte para todas las plataformas (GitHub, Azure DevOps, GitLab en Fase 1; otras como Bitbucket en Fase 2)
- ❌ Rebase/squash automático (decisión del team en el PR review)
- ❌ Integración con CI/CD (GitHub Actions, Azure Pipelines, etc.) — fuera de alcance de branching policy

**Impacto en arquitectura/catálogo:**

- **Módulos nuevos:** `src/lib/branching.js` — lectura/validación/generación de `.sdd/branching.md`
- **Módulos afectados:**
  - `src/commands/plan.js` — leer branching policy, agregar sección "Rama de trabajo" al plan
  - `src/commands/execute.js` — validar rama antes de ejecutar pasos
  - `src/commands/task.js` (subcommand `close`) — crear PR en draft, avisar sobre rama
  - `src/lib/hooks.js` — (opcional Fase 2) instalación de hooks de validación de commits
- **Archivos nuevos en proyectos:**
  - `.sdd/branching.md` — política del proyecto (versionado con git)
  - `.sdd/branching-guide.md` — documentación de "cómo crear PR en tu plataforma" (GitHub, Azure, GitLab, etc.)
- **Catálogo (no cambia):**
  - module-system: ESM (no aplica)
  - http-endpoints: (no aplica, sddkit es CLI)
- **C4 (no requiere cambios):** sddkit sigue siendo un CLI, diagrama actual sigue siendo válido
- **ADRs:** 
  - Posible nuevo ADR-0011: "Branching policy como configuración versionada, no hardcoded en sddkit"
  - Posible actualización a ADR-0003 (publish desde CI) para documentar cómo aplica branching a la política de publish

---

_Aprobación del dev: **PENDIENTE** — revisar spec.md antes de proceder a planificación._
