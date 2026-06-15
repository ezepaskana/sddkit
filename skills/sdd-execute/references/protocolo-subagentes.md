# Protocolo de subagentes

## Prompt mínimo para el worker

El prompt del worker es el output de `sdd task brief <id> <paso>` — nada más. El brief ya contiene: el paso exacto, la spec refinada, las reglas BR citadas, el catálogo y las reglas de conducta del worker. **No agregues "leé spec.md/plan.md completos"**: eso multiplica el costo de los archivos por la cantidad de pasos; el brief es el recorte determinístico que reemplaza esas lecturas.

Excepción: si el worker reporta que el brief no le alcanzó para una decisión, ahí sí indicale el archivo puntual a leer (o frená y consultá al dev si es una ambigüedad de la spec).

## Por qué el orquestador verifica

El reporte del subagente es un claim, no una prueba. El orquestador corre la verificación del paso (tests, check, comando) y solo con evidencia marca el checkbox. Esto convierte el plan.md en un registro confiable para reanudar y auditar.

## Modelo por nivel

`rapido`/`medio`/`fuerte` → `.sdd/config.json → models`. La primera vez, verificá que esos modelos existan en tu runtime; si no, corregí el archivo con los disponibles.
