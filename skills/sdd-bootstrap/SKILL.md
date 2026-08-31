---
name: sdd-bootstrap
description: Configura sddkit en un repo que todavía no lo tiene. La invoca el hook de arranque (o el dev) cuando falta .sdd/config.json: investiga el repo, pregunta lo que no se deduce del código y escribe .sdd/ con el C4, el dominio y el catálogo.
---

# sdd-bootstrap — dejar el repo configurado

Esta skill se ejecuta **una sola vez por repo** (BR-092). No es una fase del flujo de tareas: la dispara el hook de arranque cuando falta `.sdd/config.json`, o el dev pidiéndolo. Cuando termina, el repo tiene su documentación viva y el flujo SDD queda operativo.

**El dev ya dijo que sí** (el hook se lo ofreció en una línea) — no vuelvas a pedir permiso para arrancar. Lo que sí se pregunta es lo que no se deduce del código, y de a poco.

**Regla que manda sobre todas:** documentá lo que el repo dice, no lo que te gustaría que dijera. Un `❓ VALIDAR` honesto vale más que una descripción inventada, y es lo que después el dev corrige barato.

## Fase 1 — Encuadre (1 pregunta, no más)

Antes de leer nada, mirá si hay código: `ls` de la raíz + `git log --oneline -5`.

- **Repo con código** → no preguntes nada todavía. Pasá a la Fase 2.
- **Repo vacío o recién creado** (sin fuentes, o solo scaffolding) → no hay nada que investigar. Preguntale al dev **en una línea** qué va a construir (stack y propósito) y saltá directo a la Fase 4 en modo mínimo: `.sdd/` con lo que te haya dicho, el resto como `❓ VALIDAR`. **No inventes** C4, entidades ni catálogo de un repo que todavía no existe: se completan al cerrar la primera tarea.

## Fase 2 — Investigar (barato primero)

El procedimiento completo, con el orden de detección y qué buscar en cada nivel, está en `references/investigar-repo.md`. El resumen:

1. **La documentación que ya existe** (`README`, `docs/`, `doc/`, ADRs, `CONTRIBUTING`) antes que el código: es donde el equipo ya escribió lo que vos ibas a deducir.
2. **Manifiestos** para el stack y los módulos (BR-069): `package.json` + workspaces, `pom.xml`, `build.gradle`, `go.work`, `pyproject.toml`, `Cargo.toml`.
3. **Capas** (BR-070): directorios con nombre de rol (`controllers`, `services`, `repositories`, `models`, `jobs`…) **a cualquier profundidad**, no solo bajo `src/`.
4. **Entidades y reglas de negocio**: `models/`, `entities/`, `domain/`, migraciones y esquema de base.
5. **Convenciones repetidas** que admitan más de una variante — candidatas a topic de `patterns.json`.

Anotá lo que **no** puedas responder. Eso es material de `❓ VALIDAR`, no motivo de una pregunta al dev todavía.

## Fase 3 — Preguntar (poco y junto)

Juntá los huecos de la Fase 2 y preguntá **hasta 5, de a uno, cada uno con tu respuesta sugerida** — confirmar es más rápido que redactar. Solo lo que cambia lo que vas a escribir: si se deduce del código, es trabajo tuyo, no una pregunta.

Pasado el quinto, dejá de preguntar: escribí tu supuesto como `❓ VALIDAR` en el archivo que corresponda y seguí. Los topics de convenciones sin decidir van a `patterns.json`, no al catálogo: el catálogo solo lleva lo que el dev eligió explícitamente.

## Fase 4 — Escribir `.sdd/`

Qué archivo, con qué esqueleto y con qué contenido mínimo: `references/escribir-sdd.md`. Los condicionales importan — las rules de capa solo si hay capas, los `CLAUDE.md` de módulo solo si hay 2+ módulos.

Dos cuidados:

- **`CLAUDE.md` de la raíz**: escribís **solo** el bloque gestionado, entre sus marcas. Lo que el dev ya tenía no se toca ni se reordena.
- **Nada de placeholders vacíos**: cada `…` que dejes es una sección que nadie va a completar. O lo respondés, o lo escribís como pregunta `❓ VALIDAR` con checkbox.

## Fase 5 — Completar los huecos y cerrar

1. Llená los `❓` que el código puede responder con subagentes acotados: `references/completar-docs.md`.
2. **Ofrecé termaid una sola vez** (BR-087, ADR-0017), en una línea, junto con el resto de lo que confirmes: `pip install termaid`, o `uvx termaid <archivo>` sin instalar nada. Persistí la respuesta —**incluido el "no"**— en `.sdd/config.json → ui.termaid`. Si el dev no contesta, dejá el campo sin escribir. No instales nada por tu cuenta.
3. **Verificá `models`**: los alias de `.sdd/config.json → models` tienen que existir en tu runtime. Si no, corregilos por los reales.
4. **Resumile al dev en ≤ 150 palabras**: qué quedó configurado, qué asumiste y cuántas preguntas quedaron abiertas en `.sdd/QUESTIONS.md`.
5. **Retomá su pedido original.** Si el dev había pedido una tarea no trivial antes del bootstrap, arrancá el flujo de `sdd-task` con ese pedido **verbatim** — el bootstrap fue una interrupción, no el reemplazo de lo que quería hacer.

## Additional Resources

- `references/investigar-repo.md` — Qué detectar y en qué orden: stack, módulos, capas, entidades, documentación existente.
- `references/escribir-sdd.md` — Los archivos que genera el bootstrap, con su esqueleto y sus condicionales.
- `references/completar-docs.md` — Subagentes acotados para llenar los `❓` que el código puede responder.
