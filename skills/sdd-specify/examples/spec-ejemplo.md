# Ejemplo: spec del comando `sdd sync` (tarea 005 — 270 palabras)

> Requisito: _"necesito un `sdd sync` que actualice skills, config y hooks tras `npm update sddkit`, sin correr el wizard de scan/convenciones"_. Tipo `feature`, riesgo bajo.

## Spec refinada

**Historia:** Como dev con sddkit ya configurado quiero correr `sdd sync` tras actualizar el paquete para que skills, config, bloque gestionado y hooks queden al día sin volver a pasar por el setup completo.

**Criterios de aceptación (EARS):**

1. CUANDO se corre `sdd sync` con `cfg.version < VERSION`, EL SISTEMA DEBE ejecutar `init` en modo silencioso (sin `scan` ni wizard), actualizar `cfg.version` e imprimir la transición `vANTERIOR → vNUEVA`.
2. CUANDO `cfg.version === VERSION` pero `init` migró campos de config, EL SISTEMA DEBE reportar "config migrado (campos nuevos)" en vez de "ya estás al día".
3. CUANDO `cfg.version === VERSION` y no hubo migración, EL SISTEMA DEBE imprimir "ya estás al día en vX.Y.Z" y terminar con exit 0.
4. CUANDO `installSkills` actualiza una carpeta `sdd-*` existente, EL SISTEMA DEBE reemplazarla completa (mirror: borra y copia), eliminando archivos que ya no existan upstream.
5. CUANDO `cfg.skills === 'global'`, EL SISTEMA DEBE avisar la ruta global afectada (`~/.claude/skills/sdd-*`) y que impacta a todos los repos.
6. SI no existe `.sdd/config.json`, EL SISTEMA DEBE informarlo, sugerir `sdd setup`, no modificar nada y terminar sin error.
7. SI `sdd doctor` detecta versión desactualizada o skills/hooks faltantes, EL SISTEMA DEBE sugerir `sdd sync` (no `sdd setup`).

**Reglas de negocio afectadas:** BR-030 a BR-034 (ya escritas en `.sdd/domain.md`).

**Fuera de alcance:** correr `scan`/wizard dentro de `sync`; migración de `graph.*` (es de `setup`, BR-035); auto-detección de versiones nuevas en npm.

**Impacto:** `src/commands/sync.js` (nuevo), `src/lib/skills.js` (mirror real), `doctor.js`, `init.js` (flags `quiet`/`silent`). Convención `esm`. Agregar `sync.js` a `components.md`. ADR: no requiere.

---
_Aprobación del dev: pendiente_
