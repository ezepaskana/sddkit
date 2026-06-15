# Requisito original — tarea 004

> Capturado verbatim el 2026-06-13. **No editar este archivo**: el refinamiento va en spec.md.

Ajustar el comportamiento de `sdd publish` según el driver del graphstore configurado: cuando `graph.driver === "sqlite"` (perfil 'un dev individual con grafo local', ADR-0002), la publicación debería dispararse automáticamente en pre-commit (git hook), ya que es un entorno local sin CI compartido. Cuando `graph.driver === "mysql"` (perfil de equipo/corporativo), se mantiene el comportamiento actual de ADR-0003 (publish desde CI sobre main, no desde máquinas de dev). Esto requiere revisar/reemplazar ADR-0003 (que hoy aplica 'no desde dev machines' sin distinguir por driver) y diseñar el mecanismo de hook de pre-commit (instalación, gate de calidad existente, etc.).
