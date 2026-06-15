# Requirement: Branching Modeling para proyectos que usan sddkit

## Problema
Proyectos que instalan sddkit no tienen una política clara de branching, nombres de ramas, o convenciones de commits. Esto genera incertidumbre:
- ¿En qué rama trabajar para una tarea SDD?
- ¿Cómo nombrar la rama?
- ¿Qué formato de commit se espera?

## Solución propuesta
sddkit debe:
1. Preguntar al proyecto qué política de branching prefiere (una sola vez)
2. Guardar la decisión en `.sdd/branching.md`
3. Respetar esa política en todo el flujo SDD (plan, execute, close)
4. Crear PRs en draft automáticamente, pero NO mergear ni borrar ramas

## Alcance
- Soportar Conventional Commits, GitHub Flow, y task/{numero}-{slug}
- Otros workflows/convenciones como options
- Integración con `sdd-plan`, `sdd-execute`, `sdd-close`
- Crear PR en draft, pero no mergear

## No incluye
- Validación automática de commits (solo avisos)
- Merge automático o delete de ramas
- Integración con APIs de GitHub (solo crear PR local)
- Configuración de hooks de git (solo documentación)
