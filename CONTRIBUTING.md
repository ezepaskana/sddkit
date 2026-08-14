# Contribuir a sddkit

Gracias por tu interés en mejorar sddkit. Las contribuciones son bienvenidas.

## Probar un cambio

Este repo **no tiene código ni tests**: es un plugin de Claude Code hecho de markdown y JSON (ADR-0016). Un cambio se prueba usándolo:

1. Instalá el plugin desde tu clon local (`/plugin marketplace add /ruta/a/tu/clon`, después `/plugin install sddkit@sddkit`).
2. Abrí una sesión en un repo de prueba y recorré el flujo que tocaste, de punta a punta.
3. Contá lo que observaste en el PR — es la única verificación que existe.

## Flujo de trabajo

Este repo usa **spec-driven development (SDD)** sobre sí mismo — para cualquier tarea no trivial (feature, bug, refactor), el agente crea `.sdd/tasks/<id>/` con el requisito original, la spec refinada y un plan en pasos trackeables.

Mirá [CLAUDE.md](CLAUDE.md) para entender los triggers automáticos de skills, cómo funciona el flujo y qué artefactos deja en tu repo.

## Commits y ramas

- **Commits:** seguir [Conventional Commits](https://www.conventionalcommits.org).
- **Flujo:** [GitHub Flow](https://guides.github.com/introduction/flow/).
- **Patrón de rama:** `task/{numero}-{slug}` (ej: `task/001-agregar-validacion`).

La política completa está en [`.sdd/branching.md`](.sdd/branching.md).

## CHANGELOG

Si tu cambio es visible al usuario (feature, fix, enhancement), actualizá [`CHANGELOG.md`](CHANGELOG.md) siguiendo el formato [Keep a Changelog](https://keepachangelog.com).

## Reportar bugs o proponer features

Abrí un issue usando los templates en [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).

## Código de conducta

Lee [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Esperamos un ambiente respetuoso y profesional.

---

Duda o algo no cierra? Abrí un issue o escribí al maintainer.
