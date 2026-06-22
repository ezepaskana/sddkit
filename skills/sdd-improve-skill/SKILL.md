---
name: sdd-improve-skill
description: Analizar y mejorar una skill existente de Claude Code según best practices oficiales de Anthropic. Usar cuando el usuario diga "mejorar skill", "optimizar skill", "revisar skill", o proporcione una ruta a un SKILL.md para mejorar.
---

# sdd-improve-skill — auditoría y mejora de skills

Meta-skill que analiza una skill existente contra el checklist de best practices de Anthropic y aplica las mejoras aprobadas por el usuario. No reescribe a ciegas: evalúa, reporta, pide aprobación y recién entonces edita — de forma incremental y preservando la voz de la skill original.

## Cuándo usar

- El usuario pide "mejorar skill", "optimizar skill", "revisar skill" o "auditar skill".
- El usuario pasa una ruta a un `SKILL.md` (o a un directorio de skill) y quiere que la dejes mejor.
- Acabás de crear una skill nueva y querés validarla contra el checklist antes de darla por terminada.
- Una skill existente "no se dispara" cuando debería, o es demasiado larga / ambigua / sin ejemplos.

No usar para crear una skill desde cero (eso es otra tarea) ni para editar código de producción que no sea una skill.

## Cómo mejorar una skill

### Step 1: Identificar la skill target

Si el usuario proporcionó una ruta (a un `SKILL.md` o a un directorio de skill), usala directamente. Si NO la proporcionó, preguntá con `AskUserQuestion` cuál skill quiere mejorar (ofrecé las skills detectadas en el repo como opciones, más una opción "otra ruta").

Normalizá la ruta al **directorio** de la skill (la carpeta que contiene `SKILL.md`).

### Step 2: Leer la skill completa

Leé TODOS los archivos del directorio de la skill antes de evaluar nada:

- `SKILL.md` (siempre)
- `template.md` (si existe)
- todo lo que haya en `references/`
- todo lo que haya en `examples/`
- todo lo que haya en `scripts/`
- todo lo que haya en `assets/`

No evalúes con información parcial: una sección "faltante" puede estar en `references/`.

### Step 3: Leer el checklist de referencia

Leé `references/skill-creator-checklist.md` de ESTA skill (la carpeta de `sdd-improve-skill`, no la de la skill target). Es la fuente de verdad de la auditoría.

### Step 4: Evaluar contra cada categoría

Para cada una de las 6 categorías, determiná: **Estado** (`PASS` / `IMPROVE` / `MISSING`), **Hallazgo** (qué encontraste, concreto) y **Recomendación** (qué harías).

a. **Frontmatter y trigger description** — ¿la `description` usa frases naturales que el usuario realmente diría? ¿es lo bastante específica para no dispararse de más? ¿lo bastante amplia para cubrir sinónimos? ¿bajo ~200 chars y en tercera persona / forma imperativa?

b. **Estructura y progressive disclosure** — ¿el `SKILL.md` es lean (bajo ~1800 words)? ¿el contenido detallado vive en `references/` y se referencia, en vez de estar inline?

c. **Completitud de directorio** — ¿tiene `references/` cuando hay contenido profundo? ¿`examples/` cuando ayudaría ver input/output? ¿`scripts/` cuando hay validación o automatización repetible? (cada uno según aplique al propósito de la skill)

d. **Calidad de contenido (escrito para Claude)** — ¿la info es no-obvia (no repite lo que el modelo ya sabe)? ¿es procedural (pasos accionables)? ¿inequívoca (sin "según corresponda" vago)? ¿cubre edge cases y condiciones de parada?

e. **Ejemplos y recursos** — ¿hay ejemplos concretos de input/output? ¿son realistas (no `foo`/`bar`)? ¿muestran patrones que Claude puede reusar literalmente?

f. **Robustez y manejo de errores** — ¿maneja inputs faltantes? ¿valida prerequisites? ¿tiene condiciones claras de stop/ask cuando algo no cierra?

### Step 5: Presentar el reporte

Mostrá una tabla de evaluación concisa y, debajo, las mejoras recomendadas priorizadas:

```
## Evaluación: {skill name}

| Categoría                    | Estado  | Hallazgo                         |
|------------------------------|---------|----------------------------------|
| Trigger Description          | PASS    | Clara y natural                  |
| Progressive Disclosure       | IMPROVE | SKILL.md tiene 3200 words...     |
| Completitud de directorio    | MISSING | Sin directorio examples/         |
| Calidad de contenido         | PASS    | Bien estructurado para Claude    |
| Ejemplos y recursos          | MISSING | Sin ejemplos concretos de output |
| Robustez                     | IMPROVE | Falta validación para...         |

### Mejoras recomendadas
1. [Alto] Mover secciones X e Y a `references/guia-detallada.md` (~1200 words)
2. [Alto] Agregar `examples/` con un ejemplo concreto de output
3. [Medio] Mejorar trigger description para incluir "optimizar", "mejorar"
4. [Bajo] Agregar `scripts/validate.sh` para chequear estructura del output
```

Después preguntá con `AskUserQuestion`: **"¿Qué mejoras querés que aplique? (todas / números específicos / ninguna)"**. No apliques nada sin esta aprobación.

### Step 6: Aplicar las mejoras aprobadas

Aplicá SOLO las mejoras aprobadas, una por vez. Según el tipo:

- **Progressive disclosure** — extraé la sección larga a un archivo nuevo en `references/` (nombre descriptivo en kebab-case). En el `SKILL.md` reemplazá la sección por un resumen de 2-4 líneas + un puntero explícito al archivo (`Ver references/<archivo>.md para X`). Nunca borres el contenido: se mueve, no se elimina.
- **Agregar ejemplos** — generá ejemplos realistas basados en el propósito real de la skill (input concreto → output concreto esperado), en `examples/`. Nada de `foo`/`bar`.
- **Mejorar trigger description** — reescribí la `description` con frases naturales que el usuario diría, bajo 200 chars, cubriendo sinónimos clave sin volverla genérica.
- **Mejorar calidad de contenido** — reescribí instrucciones ambiguas en forma procedural e inequívoca; agregá edge cases y condiciones de stop/ask que falten.
- **Mejorar robustez** — agregá validación de inputs, chequeo de prerequisites y mensajes claros de fallo/parada.

### Step 7: Verificar los cambios

- Releé el `SKILL.md` modificado.
- Verificá que cada referencia (`references/...`, `examples/...`, `scripts/...`) apunte a un archivo que existe de verdad.
- Recontá el word count del `SKILL.md` y confirmá que quedó bajo el umbral si la mejora era de progressive disclosure.

### Step 8: Reportar resultados

Mostrá: archivos creados/modificados, word count antes/después del `SKILL.md`, y la nueva estructura de directorio de la skill.

## Notas importantes

- **Nunca borres contenido sin moverlo a otro lado.** Progressive disclosure mueve texto, no lo elimina.
- **Preservá la voz y el estilo de la skill.** No reescribas el tono; mejorá estructura, claridad y completitud.
- **Los ejemplos tienen que ser realistas** — basados en el propósito real de la skill, no placeholders.
- **Una mejora a la vez (incremental).** Aplicá, verificá, seguí con la próxima.
- **Respetá el scope de la skill.** No le agregues responsabilidades nuevas; mejorá lo que ya intenta hacer.

## Idioma

Escribí todos los reportes en el mismo idioma que usó el usuario.

## Additional Resources

- `references/skill-creator-checklist.md` — Checklist completo de best practices de Anthropic.
- `examples/auditoria-ejemplo.md` — Auditoría real trabajada paso a paso (sdd-execute).
