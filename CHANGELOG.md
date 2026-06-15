# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Aún sin cambios registrados.

## [0.0.1] - 2026-06-15

Línea base: estado consolidado del proyecto al inicio del historial de changelog.

### Added

- CLI `sdd` con los comandos `setup`, `init`, `scan`, `validate`, `sync`, `decide`,
  `doctor`, `publish`, `impact`, `context`, `uninstall` y el flujo `task`
  (`new`/`spec`/`plan`/`execute`/`close`).
- Flujo spec-driven (SDD) por tarea, con artefactos persistentes en
  `.sdd/tasks/<id>/` y skills para Claude Code, Cursor y AGENTS.md.
- Documentación C4 viva (`.sdd/c4/`), catálogo de convenciones validadas,
  reglas de negocio (BR-NNN) y ADRs.
- Grafo de impacto con storage enchufable SQLite/MySQL (`sdd publish` / `sdd impact`).
- Scanner de infraestructura Terraform (recursos compartibles y aristas).
- Modelo de branching configurable (`.sdd/branching.md`) y hooks pre-commit / post-commit.
- Política de seguridad (`SECURITY.md`) y modelo de amenaza documentado.
