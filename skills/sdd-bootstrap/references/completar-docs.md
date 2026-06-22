# Completar docs C4 — el paso que da valor

Después de `sdd setup --agent` y las decisiones de catálogo, los docs C4 quedan con placeholders (`❓`). Este paso los llena usando subagentes con contexto acotado.

## 1. Arquitectura y negocio (un subagente medio/fuerte)

Lanzá un subagente nivel `medio` o `fuerte` (de `.sdd/config.json → models`, con lectura y escritura) acotado a las fuentes listadas en `.sdd/QUESTIONS.md` (doc/, docs/, README, ADRs).

**Encargo:** responder las preguntas `- [ ]` de `context.md`, `containers.md` y las secciones de `domain.md` distintas de "Entidades principales" (actores, integraciones externas, responsabilidades de contenedores, glosario, reglas de negocio BR-NNN, flujos clave). Reemplazar placeholders, actualizar mermaid, marcar checkboxes respondidos. NO debe leer código del repo más allá de esas fuentes.

## 2. Entidades de negocio (subagentes rapido, read-only, en paralelo)

Cada línea `- **Nombre** — ❓ ¿qué representa en el negocio y cuál es su ciclo de vida?` en `domain.md → "Entidades principales"` es una entidad candidata (sembrada desde `models/`, `entities/` o `domain/`).

Por cada entidad, lanzá un subagente nivel `rapido` (solo lectura, sin Edit/Write) acotado a esas carpetas. **Encargo:** "buscá el archivo de la entidad `Nombre` y devolvé 1-2 líneas: qué representa en el negocio y cuál es su ciclo de vida". En paralelo si son muchas (en tandas).

## 3. Componentes (subagentes rapido, read-only, en paralelo)

`.sdd/QUESTIONS.md` trae una pregunta "¿Cuál es el rol del módulo `X`?" por cada fila `❓ por validar` en `components.md`.

Por cada módulo `X`, lanzá un subagente nivel `rapido` (solo lectura, sin Edit/Write) acotado SOLO a los archivos bajo `X/` (para `(raíz)`, solo los archivos sueltos en la raíz del `srcRoot`, sin entrar a otras carpetas). **Encargo:** "¿cuál es el rol de este módulo, en una frase corta?". En paralelo si son muchos (en tandas).

## 4. Edits mecánicos (el orquestador)

Con todas las respuestas recolectadas, hacé VOS los edits:
- En `.sdd/domain.md`: reemplazá cada `❓ ¿qué representa en el negocio y cuál es su ciclo de vida?` por la descripción devuelta.
- En `.sdd/c4/components.md`: reemplazá cada `❓ por validar` por la frase devuelta y marcá el checkbox en "## ❓ VALIDAR con el equipo".

## 5. Verificación

Corré `sdd validate` — el conteo de preguntas abiertas debe bajar. **Definition of done: cero placeholders que las fuentes o el código puedan responder.** El subagente de arquitectura puede devolver hasta 3 preguntas sin responder (quedan en QUESTIONS.md) — hacéselas al usuario ahora.
