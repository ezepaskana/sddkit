# Requisito original — tarea 008

> Capturado verbatim el 2026-06-15. **No editar este archivo**: el refinamiento va en spec.md.

Arreglar sdd scan: genDomain/preserveManual sobrescriben y borran la sección '## Reglas de negocio' (y cualquier otro contenido curado por agentes/dev arriba del marcador <!-- sdd:manual -->) de .sdd/domain.md en cada regeneración, perdiendo las BR-NNN ya documentadas. Encontrado al ejecutar 'sdd scan' en el paso 3 de la tarea 007: BR-001 a BR-035 quedaron reemplazadas por el esqueleto vacío del template.
