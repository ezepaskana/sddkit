# Requisito original — tarea 008

> Capturado verbatim el 2026-06-28. **No editar este archivo**: el refinamiento va en spec.md.

Bug: sdd validate reporta falsos positivos de drift para proyectos Java porque el regex de extracción de docDirs matchea todas las tablas de components.md (incluida la tabla de subcapas de packages Java), pero componentGroups solo agrupa por el primer segmento después de srcRoot — haciendo que los packages Java aparezcan como módulos documentados pero nunca encontrados en el repo. Fix: limitar la extracción de docDirs a la primera tabla del archivo (antes del primer encabezado ## o ###).
