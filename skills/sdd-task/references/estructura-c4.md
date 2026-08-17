# Estructura de la documentación de arquitectura

Se escribe **para el agente, no para un lector humano** (BR-088): tablas con rutas y símbolos reales, nunca prosa descriptiva. La prueba es simple — si una fila explica lo que se entiende abriendo el archivo, sobra. El doc **ubica y conecta**; el código explica.

## Dónde vive cada nivel

| Nivel C4 | Archivo | Se carga |
|---|---|---|
| 1 · Contexto | `.sdd/c4/context.md` | siempre |
| 2 · Contenedores | `.sdd/c4/containers.md` | siempre |
| 3 · Componentes | `.sdd/c4/components.md` + `<módulo>/CLAUDE.md` | el índice siempre; el detalle al tocar el módulo |
| 4 · Código | no se documenta | — |

**Tope: 45 líneas por archivo** (BR-082). Si un nivel no entra, se parte por módulo — no se lo deja crecer.

## `components.md`: índice o detalle según el repo (BR-089)

**Con 2+ módulos** es un índice, una fila por módulo:

```markdown
| Módulo | Ruta | Responsabilidad | Depende de |
|---|---|---|---|
| `api` | `packages/api` | Endpoints REST y autenticación | `shared` |
| `web` | `packages/web` | SPA de operación | `api` (HTTP) |
| `shared` | `packages/shared` | Contratos entre módulos | — |
```

El detalle de cada uno va a su `CLAUDE.md`. **Con un solo módulo**, el detalle se queda acá y no se genera ningún `CLAUDE.md` anidado.

## `<módulo>/CLAUDE.md`: qué hace y qué expone (BR-073)

Además de su responsabilidad y sus capas, lista los **símbolos de entrada**: lo que otros módulos importan de este. Nunca los internos.

```markdown
## Símbolos de entrada

| Símbolo | Archivo | Lo consume |
|---|---|---|
| `PlantStore` | `src/main/java/com/solar/shared/PlantStore.java` | `battery`, `outage` |
| `DeviceReader` | `src/main/java/com/solar/shared/DeviceReader.java` | `plant` |
```

Con eso el agente sabe qué toca sin abrir el paquete entero.

## La frontera: capa vs módulo (BR-090)

**La capa dice CÓMO se escribe el código. El módulo dice QUÉ hace y de quién depende.** Ninguno repite lo del otro:

| Va en `.claude/rules/sdd-layer-controllers.md` | Va en `packages/api/CLAUDE.md` |
|---|---|
| "Un controller no llama a un repository: pasa por un service" | "`api` expone los endpoints REST y depende de `shared`" |
| "Los DTO de entrada se validan con anotaciones, no a mano" | "`api` no conoce `web`: la relación es HTTP" |
| "El nombre del archivo termina en `Controller`" | "Las capas de este módulo son controllers, services y repositories" |

**Duda típica:** "los controllers de `api` devuelven siempre `ResponseEntity`" — ¿capa o módulo? Es **capa**: describe cómo se escribe. Si aplicara solo a `api` y no a los controllers de otros módulos, entonces es una convención local del módulo y va en su `CLAUDE.md`.

## Regeneración

Quirúrgica (BR-074): se actualiza lo que sigue al código —el frontmatter `paths:` de las rules, la tabla de módulos, los símbolos de entrada— y se preserva todo lo escrito debajo de la marca `<!-- sdd:manual -->`.
