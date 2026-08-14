# Protocolo de subagentes

## Prompt mínimo para el worker

Antes lo armaba el CLI; ahora **lo componés vos** (ADR-0016), siempre con las mismas cinco partes y nada más:

1. **El paso**, copiado literal de `plan.md`: título, nivel, qué hace, archivos y su `cmd:` de verificación.
2. **El contexto de la tarea**: id, tipo, riesgo y el objetivo en una línea (de `spec.md`, `nota.md` o `reproduccion.md`).
3. **Solo las secciones de la spec que ese paso toca** — criterios EARS y fuera de alcance relevantes, no la spec entera. En `bug`, la reproducción; en `refactor`, los dependientes mapeados.
4. **Las reglas BR citadas por esas secciones**, transcritas de `.sdd/domain.md`, más el catálogo de `.sdd/catalog.json`. Transcribilas: el worker no debería tener que abrir domain.md.
5. **Las reglas de conducta**: no commitear (ver abajo), no salirse de los archivos del paso, y devolver la pregunta en vez de suponer si algo no está definido.

**No agregues "leé spec.md/plan.md completos"**: eso multiplica el costo de los archivos por la cantidad de pasos; el brief es el recorte que reemplaza esas lecturas. Y no lo inflés "por las dudas" — cada línea de más la pagás una vez por paso.

Excepción: si el worker reporta que el brief no le alcanzó para una decisión, ahí sí indicale el archivo puntual a leer (o frená y consultá al dev si es una ambigüedad de la spec).

## Por qué el orquestador verifica

El reporte del subagente es un claim, no una prueba. El orquestador corre la verificación del paso (tests, check, comando) y solo con evidencia marca el checkbox. Esto convierte el plan.md en un registro confiable para reanudar y auditar.

## Modelo por nivel

`rapido`/`medio`/`fuerte` → `.sdd/config.json → models`. La primera vez, verificá que esos modelos existan en tu runtime; si no, corregí el archivo con los disponibles.

## NO commitear

Los workers **NO deben ejecutar** `git add`, `git commit`, `git push` ni ningún comando git que modifique el historial. Los cambios quedan como modificaciones locales: archivos modificados sin staged (unstaged) y archivos nuevos sin tracking (untracked).

El dev necesita ver los diffs limpios para probar localmente antes de que se commitee. El commit lo hace el orquestador **solo después** de que el dev confirme que probó y está OK.
