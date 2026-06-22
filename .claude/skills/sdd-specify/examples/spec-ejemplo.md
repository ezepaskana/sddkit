# Ejemplo: Spec del comando sdd sync

> Ejemplo concreto de una spec EARS completa para `spec.md`.
> Escenario: tarea 005 de sddkit. Solo muestra la spec refinada,
> no el analisis critico ni las preguntas de clarificacion.

## Prompt del usuario que disparo la tarea

> "Necesito un comando `sdd sync` que actualice skills, config y hooks cuando el dev hace `npm update sddkit` -- sin correr el wizard de scan/convenciones."

---

## Spec refinada

**Historia:** Como desarrollador que ya tiene sddkit configurado en mi repo quiero correr `sdd sync` tras actualizar el paquete para que mis skills locales, config, AGENTS.md y hooks se pongan al dia con la nueva version, sin tener que volver a pasar por el wizard de setup completo.

### Criterios de aceptacion (formato EARS)

1. **Sync con version nueva** --
   CUANDO se corre `sdd sync` en un repo con `.sdd/config.json` existente
   y `cfg.version` es menor que `VERSION` del paquete instalado,
   EL SISTEMA DEBE ejecutar `init` en modo silencioso (flags `quiet` y
   `silent`: sin `scan`, sin wizard de convenciones), actualizar
   `cfg.version` a `VERSION`, e imprimir un resumen con la transicion
   de version: `vANTERIOR -> vNUEVA: skills, config, AGENTS.md y hooks
   actualizados.`

2. **Sync con config migrado** --
   CUANDO se corre `sdd sync` y `cfg.version === VERSION` pero `init`
   migro `.sdd/config.json` (p.ej. agrego campos nuevos como
   `hooks.autoPublish` por BR-029),
   EL SISTEMA DEBE imprimir `vX.Y.Z: config migrado (campos nuevos) --
   skills, AGENTS.md y hooks revisados.` en vez de "ya estas al dia".

3. **Sync ya actualizado** --
   CUANDO se corre `sdd sync` y `cfg.version === VERSION` y no hubo
   migracion de config,
   EL SISTEMA DEBE imprimir `ya estas al dia en vX.Y.Z (skills, config,
   AGENTS.md y hooks revisados).` y terminar con exit 0.

4. **Mirror de skills** --
   CUANDO `installSkills` actualiza una carpeta `sdd-*` que ya existe en
   el destino (scope local o global),
   EL SISTEMA DEBE reemplazarla completamente (mirror: borra la carpeta
   existente via `rmSync` y copia la del paquete via `cpSync`),
   eliminando archivos o subcarpetas que ya no existan en la version
   nueva. Aplica a `sync`, `init` y `setup` por igual (misma funcion
   `installSkills` en `src/lib/skills.js`).

5. **Aviso de skills globales** --
   CUANDO `cfg.skills === 'global'`,
   EL SISTEMA DEBE imprimir un aviso explicito indicando la ruta completa
   de las skills globales actualizadas (`~/.claude/skills/sdd-*`) y que
   el cambio afecta a todos los repos de la maquina.

6. **Repo no inicializado** --
   SI se corre `sdd sync` en un repo SIN `.sdd/config.json`,
   EL SISTEMA DEBE informar que el repo no esta inicializado, sugerir
   `sdd setup`, no crear ni modificar ningun archivo, y terminar sin error.

7. **Doctor sugiere sync** --
   SI `sdd doctor` detecta que `config.version !== VERSION`, hooks
   pre-commit/post-commit ausentes, o skills `sdd-*` faltantes o
   desactualizadas en el scope configurado,
   EL SISTEMA DEBE sugerir `sdd sync` (no `sdd setup`) como remedio
   en su reporte de diagnostico.

### Reglas de negocio afectadas

_(citadas por ID desde `.sdd/domain.md`)_

- **BR-030** -- Comportamiento de `sdd sync` en repo no inicializado:
  informar y no modificar nada.
- **BR-031** -- Comportamiento principal de `sdd sync`: ejecutar `init`
  silencioso, mostrar transicion de version, cubrir caso de migracion
  de config sin cambio de version.
- **BR-032** -- `installSkills` como mirror real (no merge): aplica a
  `sync`, `init` y `setup` por igual.
- **BR-033** -- Aviso explicito cuando el scope de skills es global.
- **BR-034** -- `sdd doctor` sugiere `sdd sync` (no `sdd setup`) cuando
  detecta version desactualizada o skills/hooks faltantes.

### Fuera de alcance

- Correr `sdd scan` ni el wizard de convenciones dentro de `sync` --
  es una actualizacion liviana, no un setup completo.
- Migracion automatica de `graph.driver` / `graph.sqlite.path` (eso lo
  maneja `sdd setup` exclusivamente, ver BR-035).
- Auto-deteccion de actualizaciones del paquete npm (notificar al dev
  que hay una version nueva disponible sin que corra `sync`).

### Impacto en arquitectura/catalogo

- **Modulos afectados:** `src/commands/sync.js` (nuevo), `src/lib/skills.js`
  (`installSkills` refactorizado a mirror real), `src/commands/doctor.js`
  (sugerencia de `sdd sync`), `src/commands/init.js` (flags `quiet`/`silent`).
- **Convenciones:** `module-system -> esm` (imports con extension `.js`).
- **C4:** agregar `sync.js` a `.sdd/c4/components.md` como comando CLI.
- **ADR:** no requiere ADR nuevo; consistente con la arquitectura de
  comandos CLI que delegan a `init`.

---
_Aprobacion del dev: pendiente_
