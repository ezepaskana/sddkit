# Requisito original — tarea 006

> Capturado verbatim el 2026-06-24. **No editar este archivo**: el refinamiento va en spec.md.

Ajustar el flujo post-ejecución SDD para que: (1) los workers NO hagan commit al implementar cada paso — dejan los cambios unstaged para que el dev los vea como diffs limpios, (2) al completar todos los pasos, el agente guía al dev a probar localmente según el tipo de cambio (CLI command, lib, config, etc.) con instrucciones concretas, (3) recién cuando el dev confirma que probó y está OK, el agente commitea y procede al cierre (sdd-close)
