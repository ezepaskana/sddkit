# Skill-creator checklist — best practices de Anthropic

Checklist de auditoría para evaluar y mejorar una skill de Claude Code. Adaptado de las best practices oficiales de Anthropic para crear skills. Cada sección lista qué buscar (PASS), qué corregir (IMPROVE) y qué anti-patterns evitar.

---

## 1. Frontmatter y metadata

El frontmatter YAML es lo único que Claude ve antes de decidir si carga la skill. Es el contrato de activación.

**Campos requeridos:**

- `name` — kebab-case, único, descriptivo del propósito (no del mecanismo). Coincide con el nombre del directorio.
- `description` — el trigger. Determina cuándo se dispara la skill.

**Best practices de la `description`:**

- Empezá describiendo QUÉ hace la skill, seguido de CUÁNDO usarla.
- Incluí las **frases naturales** que el usuario realmente escribiría ("mejorar skill", "optimizar skill"), no jerga interna.
- Cubrí sinónimos clave del trigger sin volverla genérica.
- Mantenela bajo ~200 chars: específica pero no exhaustiva.
- Escribila en tercera persona / forma imperativa ("Analizar y mejorar...", "Usar cuando...").

**Anti-patterns:**

- Description vaga ("ayuda con skills") → se dispara de más o de menos.
- Description que solo dice QUÉ y nunca CUÁNDO → el modelo no sabe activarla.
- Listar 20 sinónimos → ruido; elegí los 3-5 que importan.
- Mezclar el contenido de la skill dentro de la description.

---

## 2. Estructura de directorio

Layout recomendado:

```
skill-name/
  SKILL.md            # siempre — entrada lean
  references/         # documentación profunda, cargada bajo demanda
  examples/           # input/output concretos
  scripts/            # automatización / validación reusable
  assets/             # plantillas, archivos estáticos
  template.md         # plantilla de salida (si aplica)
```

**Cuándo se necesita cada directorio:**

- `references/` — cuando hay contenido detallado que no todas las invocaciones necesitan (guías largas, tablas de referencia, checklists). Mantiene el `SKILL.md` lean.
- `examples/` — cuando ver un input/output concreto vale más que describirlo.
- `scripts/` — cuando hay un paso repetible que conviene automatizar/validar en vez de describir en prosa.
- `assets/` — cuando la skill produce o usa archivos estáticos (plantillas, esquemas).

**Anti-patterns:**

- Todo metido en `SKILL.md` aunque haya 3000 words de referencia.
- Crear `references/` / `examples/` vacíos o "por las dudas".
- Referenciar archivos que no existen.

---

## 3. Progressive disclosure

**Principio:** el `SKILL.md` se carga entero cada vez que la skill se activa; debe ser lean (objetivo: **bajo ~1800 words**). El contenido profundo se carga bajo demanda desde `references/`.

**Qué se queda en `SKILL.md`:**

- Cuándo usar la skill.
- El procedimiento principal en pasos accionables.
- Decisiones y reglas que aplican siempre.
- Punteros a los archivos de `references/`.

**Qué se mueve a `references/`:**

- Guías detalladas paso a paso de casos específicos.
- Tablas de referencia largas, checklists exhaustivos.
- Documentación de fondo que no toda invocación necesita.

**Cómo referenciar:**

- En el `SKILL.md`, reemplazá la sección movida por un resumen de 2-4 líneas + un puntero explícito: `Ver references/<archivo>.md para X`.
- Nunca borres el contenido al mover: se reubica, no se elimina.

**Anti-patterns:**

- `SKILL.md` de 3000+ words con todo inline → caro de cargar, diluye lo importante.
- Mover contenido a `references/` sin dejar el puntero → el modelo no sabe que existe.

---

## 4. Calidad de contenido (escrito para Claude)

La skill se escribe PARA el modelo, no para un humano que aprende desde cero.

**Qué incluir:**

- **Procedural** — pasos accionables y verificables, no descripciones abstractas.
- **Domain-specific** — convenciones, formatos y nombres propios del dominio/repo que el modelo no puede adivinar.
- **Decision criteria** — cuándo elegir A vs B, con la regla explícita.
- **Stop/ask** — condiciones bajo las cuales el modelo debe frenar y preguntar en vez de suponer.
- **Failure modes** — qué puede salir mal y cómo recuperarse.

**Qué NO incluir:**

- Información obvia que el modelo ya sabe (explicar qué es YAML, qué es Markdown).
- Relleno motivacional o prosa genérica.
- Contradicciones con otras skills/convenciones del repo.

**Claridad de instrucciones:**

- Imperativo directo ("Leé X", "Verificá Y"), no condicionales vagos.
- Evitá "según corresponda" / "si es necesario" sin definir el criterio.
- Una instrucción = una acción inequívoca.

---

## 5. Ejemplos y recursos reutilizables

**Por qué importan:** un ejemplo concreto de input→output desambigua más que tres párrafos de descripción y le da al modelo un patrón reusable literalmente.

**Características de un buen ejemplo:**

- Input realista y output esperado completo.
- Basado en el propósito real de la skill, no en placeholders.
- Muestra el caso típico y, si ayuda, un edge case.

**Convenciones de nombres:**

- `examples/` con nombres descriptivos en kebab-case (`example-report-output.md`).
- `references/` igual, por tema (`skill-creator-checklist.md`).

**Anti-patterns:**

- Ejemplos con `foo`/`bar`/`lorem ipsum` → no enseñan el patrón real.
- Ejemplos desactualizados respecto del procedimiento actual de la skill.
- "Ejemplo" que en realidad es solo una descripción sin input/output.

---

## 6. Robustez y manejo de errores

**Validación de inputs:**

- Definí qué inputs espera la skill y qué hacer si faltan o son ambiguos.
- Si falta un input crítico, preguntá (p. ej. con `AskUserQuestion`) en vez de suponer.

**Prerequisites:**

- Listá precondiciones (archivos que deben existir, comandos disponibles) y verificalas antes de actuar.

**Condiciones de stop/ask:**

- Definí explícitamente cuándo el modelo debe frenar y consultar al usuario (ambigüedad, contradicción con una convención, decisión irreversible).

**Failure recovery:**

- Para cada paso riesgoso, indicá el mensaje de fallo y el camino de recuperación.
- Nunca dejes que un paso fallido siga silenciosamente al siguiente.

---

## 7. Ciclo de iteración

Mejorar una skill es iterativo, no de una sola pasada:

1. **Use** — observá la skill en uso real (o leela contra este checklist).
2. **Identify** — detectá la categoría más débil (trigger, disclosure, ejemplos, robustez...).
3. **Determine** — decidí la mejora concreta y su prioridad (Alto/Medio/Bajo).
4. **Implement** — aplicá una mejora a la vez, moviendo contenido en vez de borrarlo.
5. **Test** — releé, verificá referencias, recontá word count, confirmá que sigue disparándose bien.

Repetí el ciclo hasta que las 6 categorías estén en PASS.
