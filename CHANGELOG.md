# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Skill `sdd-bootstrap`**: el procedimiento completo para configurar un repo por
  primera vez — investigar (stack, módulos, capas, entidades, documentación
  existente), preguntar solo lo que no se deduce del código, y escribir `.sdd/`
  con el C4, el dominio, el catálogo y el bloque de `CLAUDE.md`. Incluye el caso
  del repo todavía sin código. La invoca el hook de arranque, no `sdd-task`
  (tarea 024, BR-092).
- **Skill `caveman`**: estilo de respuesta comprimido en español para el chat con el
  dev, con la sustancia técnica intacta. **Activo por default** vía un tercer hook
  `SessionStart`; nunca toca artefactos, docs, commits ni PR, y las reglas de
  brevedad existentes (BR-064/066/067/068) mandan por encima. Se apaga por turno
  diciendo `basta caveman`, o para siempre con `ui.caveman: "no"` en
  `.sdd/config.json` (BR-091).

### Changed

- **`hooks/bootstrap.md` dejó de ser un placeholder** (tarea 024). Ahora instruye al
  agente a ofrecer la configuración en una línea **como primer acto del turno**,
  antes de atender el pedido del dev, e invocar `sdd-bootstrap` si acepta. Si el dev
  dice que no, no se escribe nada y el ofrecimiento vuelve en la próxima sesión.
  Antes el texto se anunciaba como incompleto y el agente lo ignoraba: el repo
  quedaba sin configurar sesión tras sesión (BR-080 reescrita).
- **sddkit se distribuye solo como plugin de Claude Code.** Se instala con
  `/plugin marketplace add` + `/plugin install`: no hay paquete npm, ni comando
  `sdd`, ni pasos de instalación en el repo. Un repo sin configurar lo detecta un
  hook `SessionStart` y el agente lo configura solo (ADR-0016, BR-079/BR-080).

### Removed

- **El CLI completo** (`bin/`, `src/`, `package.json`, CI): todos los comandos
  (`setup`, `init`, `scan`, `validate`, `sync`, `decide`, `doctor`, `publish`,
  `impact`, `context`, `uninstall` y el flujo `task`). Lo que hacían ahora lo hace
  el agente siguiendo las skills.
- **Las skills `sdd-test` y `sdd-bootstrap`**: la primera dependía de scripts del
  paquete, la segunda quedó reemplazada por el hook de arranque.
- **Los tres gates deterministas** que solo un exit code podía dar: conteo de
  variantes del catálogo, validación bloqueante en pre-commit y verificación de
  paso por exit code. Ahora los sostiene el agente (la condición de reversión está
  en ADR-0016).
- **El grafo de impacto** y los living docs por LLM en pre-commit, junto con las
  reglas que los definían (BR-044 a BR-050, BR-055/056 derogadas).

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

[Unreleased]: https://github.com/ezepaskana/sddkit/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/ezepaskana/sddkit/releases/tag/v0.0.1
