# Plan — tarea 007: Agregar una regla al bloque gestionado de AGENTS.md (generad…

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. El dev debe APROBAR este plan antes de ejecutar.

Estructura de cada paso — el checkbox de la **primera línea** es lo que `sdd task` trackea; el detalle va en sub-ítems indentados:

```markdown
- [ ] **N. Título corto del paso** `[P]` _(rapido)_
  - **Hace:** qué se construye o cambia en este paso
  - **Archivos:** `ruta/uno`, `ruta/dos`
  - **Depende de:** paso M (o —)
  - **Verificación:** cómo se comprueba que quedó bien
```

`[P]` = paralelizable · Nivel de modelo por paso: _(rapido)_ mecánico/boilerplate · _(medio)_ implementación estándar · _(fuerte)_ diseño, lógica compleja, edge cases. Los modelos concretos de cada nivel están en `.sdd/config.json → models`.

## Pasos

- [x] **1. Test (rojo) para la nueva sección "regla cero" en `buildBlock`** _(rapido)_
  - **Hace:** crea `src/lib/agentsmd.test.js` (nuevo, primer test de contenido para este módulo). Importa `buildBlock` desde `./agentsmd.js` y llama `buildBlock({name:'demo'}, {decisions:[]}, '2026-06-15')`. Dos asserts: (1) el resultado `includes` el texto exacto de la nueva sección — título `## Ante dudas o incongruencias: preguntale al dev` seguido del párrafo `Preguntar no es una falla — es la respuesta correcta cuando algo no cierra. Si encontrás un requisito que contradice el código existente, una instrucción que violaría una convención del catálogo o una regla de negocio/ADR ya documentada, información que falta o es ambigua, o cualquier otra cosa que simplemente no tiene sentido, **frená y preguntale al dev antes de seguir** — no avances con una suposición. Las decisiones menores que el buen juicio normal resuelve no necesitan esto: esas resolvélas vos y seguí.`; (2) el índice de esa nueva sección es MENOR que el índice de `## Arquitectura (modelo C4 vivo)` (queda primera, antes de Arquitectura).
  - **Archivos:** `src/lib/agentsmd.test.js` (nuevo)
  - **Depende de:** —
  - **Verificación:** `cmd: node --test src/lib/agentsmd.test.js` — el archivo existe y el test falla (texto todavía no existe en `buildBlock`).

- [x] **2. Agregar la sección "regla cero" a `buildBlock`** _(rapido)_
  - **Hace:** en `src/lib/agentsmd.js`, dentro del template literal de `buildBlock`, inserta la nueva sección completa (título + párrafo, texto EXACTO citado en spec.md/paso 1) inmediatamente después de la línea del comentario `<!-- Bloque gestionado por sddkit... -->` y ANTES de `## Arquitectura (modelo C4 vivo)`. No modifica las tres menciones puntuales existentes de "preguntale al dev" (arquitectura, catálogo, flujo SDD) ni ninguna otra sección.
  - **Archivos:** `src/lib/agentsmd.js`
  - **Depende de:** paso 1
  - **Verificación:** `cmd: node --test src/lib/agentsmd.test.js` (ambos asserts en verde) y `cmd: node --test` (suite completa sigue en verde).

- [x] **3. Regenerar AGENTS.md de sddkit, suite completa y bump de versión** _(rapido)_
  - **Hace:** corre `sdd scan` en este repo para regenerar el bloque gestionado de `AGENTS.md` (queda con la nueva sección al inicio y fecha actualizada). Corre la suite completa de tests. Sube `package.json`/`package-lock.json` de `0.11.0` a `0.12.0` (cambio de contenido de las reglas instaladas en todo repo que use sddkit — análogo en impacto al bump de la tarea 006).
  - **Archivos:** `AGENTS.md`, `package.json`, `package-lock.json`
  - **Depende de:** paso 2
  - **Verificación:** `cmd: node --test` (todo verde), `cmd: grep -q '"version": "0.12.0"' package.json`, y revisión visual de `AGENTS.md` — la nueva sección `## Ante dudas o incongruencias: preguntale al dev` aparece como primera sección del bloque gestionado, antes de `## Arquitectura (modelo C4 vivo)`.

---

_Aprobación del dev: aprobado 2026-06-15_
