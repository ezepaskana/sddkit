# Spec — tarea 005: Necesito una funcionalidad para actualizar los skills en un …

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Cuando el dev actualiza la versión de `sddkit` (npm), las skills instaladas en un repo (local en `.claude/skills/sdd-*` o global en `~/.claude/skills/sdd-*`) y `.sdd/config.json` quedan con el contenido/version de la versión vieja. `sdd doctor` ya detecta esto ("Skills desactualizadas…", "Config vX vs CLI vY") pero el único remedio que sugiere es `sdd setup`.
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** Sí, parcialmente. `sdd init` (y por extensión `sdd setup`, que lo llama) en cada corrida:
  - reinstala TODAS las skills vía `installSkills()` (`src/lib/skills.js`), que hace `cpSync(PKG_SKILLS/<n>, dest/<n>, {recursive:true})` — sobreescribe con el contenido de la versión actual del paquete instalado;
  - migra `.sdd/config.json` (bumpea `version` al `VERSION` del CLI, agrega campos faltantes como `hooks.autoPublish`, BR-029);
  - regenera el bloque gestionado de `AGENTS.md` con `upsertAgentsMd` (usa `detectStack` + catálogo, NO requiere el scan pesado de patrones);
  - reinstala/migra hooks pre-commit y post-commit.
  Es decir: correr `sdd init` en un repo ya configurado YA actualiza skills + config + AGENTS.md + hooks a la versión del CLI instalado. La pieza que falta es exponerlo de forma explícita, liviana (sin el scan + wizard de convenciones de `setup`) y comunicativa ("v0.9.2 → v0.10.1").
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí: en vez de construir un mecanismo de actualización desde cero, exponer `sdd sync` como una capa fina sobre la lógica que `init` ya tiene (sin el scan de `scan.js` ni el wizard interactivo de `setup`), que reporta la transición de versión y deja un resumen claro. Reusar, no reimplementar.
- **Supuestos del dev que podrían no ser ciertos:**
  - "No existe ningún mecanismo de actualización" — falso: existe pero no se comunica como tal y vive detrás de `sdd setup` (que hace de más: scan completo + wizard de convenciones, que no tienen nada que ver con "actualizar a la versión nueva del CLI").
  - Gap real encontrado (no asumido por el dev, pero relevante): `installSkills` usa `cpSync` que es un **merge**, no un **mirror**. Si una versión nueva del paquete ELIMINA un archivo dentro de una carpeta de skill (p.ej. un template viejo), ese archivo queda huérfano en el destino después de "actualizar" — ni `init` ni `setup` lo limpian hoy. Para que "sync" sea sync de verdad, esto debería corregirse.
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento):
  - Si se corrige `installSkills` a "mirror" (borrar la carpeta destino y copiar de nuevo), cualquier edición manual hecha a mano sobre `.claude/skills/sdd-*` se perdería. Es consistente con que esas carpetas son 100% gestionadas por sddkit (igual que el bloque `<!-- sddkit:begin -->` de AGENTS.md), pero es un cambio de comportamiento de `installSkills` que también afecta a `init`/`setup` existentes — hay que confirmarlo.
  - Si `cfg.skills === 'global'`, sincronizar UN repo toca `~/.claude/skills/sdd-*`, que es compartido por TODOS los repos de la máquina. Esto ya es el comportamiento actual de `init`/`setup`, pero "sync" lo hace más frecuente/explícito — vale la pena confirmarlo y comunicarlo en el output.
  - Bajo riesgo de regresión en `init`/`setup` si "sync" reusa su lógica con tests existentes (`init.test.js`, `doctor.test.js`) como red de seguridad.
- **¿Qué pasa si NO se hace?** El dev sigue corriendo `sdd setup` para ponerse al día tras un upgrade de sddkit: dispara el wizard interactivo de convenciones (puede no querer decidir nada en ese momento) y corre `scan` completo (más lento en repos grandes), todo para lo que en esencia es "traer 5 archivos a la versión nueva". No es bloqueante, pero la UX de "actualicé sddkit, ¿y ahora?" es pesada y poco clara — y el gap de `cpSync` (merge) hace que ni siquiera `setup` garantice una sync 100% limpia.

**Recomendación:** `proceder con cambios` — no reconstruir la actualización de skills desde cero (ya existe en `installSkills`/`init`); en cambio: (1) agregar `sdd sync` como capa fina y explícita sobre la lógica de `init` (config + AGENTS.md + skills + hooks, SIN scan ni wizard) que reporta "vX.Y.Z → vA.B.C" y un resumen de qué cambió; (2) corregir `installSkills` para que sea mirror real (limpia archivos huérfanos); (3) actualizar los mensajes de `sdd doctor` (skills desactualizadas / config vieja) para sugerir `sdd sync` en vez de `sdd setup` cuando el problema es solo drift de versión.

## Preguntas de clarificación

- [x] P1: ¿Qué debe sincronizar `sdd sync`: todo lo que `init` ya sincroniza (config + AGENTS.md + skills + hooks + cursor rule) o solo las skills?
  - Respuesta: Todo lo de `init` (recomendado por el análisis). Sin scan ni wizard de convenciones.
- [x] P2: ¿Corregir `installSkills` a "mirror" real (borra archivos huérfanos de versiones viejas) en vez del merge actual (`cpSync`)?
  - Respuesta: Sí, mirror real. Aplica también a `init`/`setup` existentes (las carpetas `sdd-*` son 100% gestionadas por sddkit).
- [x] P3: Cuando `cfg.skills === 'global'`, `sync` toca `~/.claude/skills/sdd-*` (compartido por todos los repos de la máquina). ¿Cómo comunicarlo?
  - Respuesta: Aviso explícito en el output (informativo, no bloquea).
- [x] P4: ¿Actualizar los mensajes de `sdd doctor` para sugerir `sdd sync` en vez de `sdd setup` cuando el problema es drift de versión?
  - Respuesta: Sí, donde `sync` efectivamente resuelve el problema (config desactualizado, hooks pre/post-commit ausentes, skills faltantes/desactualizadas). La advertencia de `sdd-bootstrap` global (solo la instala `setup`) sigue sugiriendo `sdd setup`.

## Métrica de impacto

- **Métrica:** Cantidad de comandos / pasos interactivos necesarios para poner un repo al día tras `npm update -g sddkit` (skills + config + AGENTS.md + hooks a la versión nueva del CLI), y si `sdd doctor` queda sin warnings de versión/skills/hooks después.
- **Baseline actual:** 1 comando (`sdd setup`), pero dispara: (a) scan completo de patrones, (b) wizard interactivo de convenciones pendientes — ambos ajenos al objetivo "actualizar a la versión nueva". Además `installSkills` (merge, no mirror) no garantiza limpiar archivos eliminados en versiones nuevas del paquete, por lo que ni `setup` deja una sync 100% limpia hoy.
- **Resultado esperado:** 1 comando (`sdd sync`), no interactivo, sin scan ni wizard, que deja `cfg.version === VERSION`, las skills `sdd-*` idénticas byte-a-byte a las del paquete instalado (incluyendo limpieza de huérfanos) y los hooks pre/post-commit instalados/migrados. `sdd doctor` no reporta más "Config vX vs CLI vY", "Skills desactualizadas/faltantes" ni hooks ausentes tras correrlo.
- **Cómo se mide después:** test de integración con fixture: `.sdd/config.json` con `version` vieja + una carpeta `.claude/skills/sdd-test/` con (a) un `SKILL.md` con contenido distinto al del paquete y (b) un archivo extra que NO existe en `skills/sdd-test/` del paquete → correr `sync` → asserts: `cfg.version === VERSION`, `SKILL.md` instalado === `SKILL.md` del paquete, el archivo extra ya no existe, hooks presentes. Más un caso "ya al día" (mismo `VERSION`, skills idénticas) → `sync` no rompe nada y lo informa.

## Spec refinada

**Historia:** Como desarrollador que ya corrió `sdd setup` en un repo y luego actualiza el paquete `sddkit` (npm) a una versión nueva, quiero correr `sdd sync` para traer ese repo (skills, AGENTS.md, config, hooks) a la versión instalada del CLI, sin disparar el scan completo ni el wizard de convenciones de `sdd setup`.

**Criterios de aceptación (formato EARS):**

- SI se corre `sdd sync` en un repo SIN `.sdd/config.json`, EL SISTEMA DEBE informar que el repo no está inicializado, sugerir `sdd setup`, y no crear ni modificar ningún archivo. (BR-030)
- CUANDO se corre `sdd sync` en un repo CON `.sdd/config.json`, EL SISTEMA DEBE ejecutar el equivalente de `sdd init` (migración de config, regeneración del bloque gestionado de AGENTS.md, reinstalación/actualización de skills `sdd-*` en el scope de `cfg.skills`, reinstalación/migración de hooks pre-commit y post-commit, rule de Cursor si aplica) SIN correr `scan` ni el wizard de convenciones, e imprimir un resumen con la transición de versión: `vANTERIOR → vNUEVA` (o "ya estás al día en vX.Y.Z" si `cfg.version === VERSION` antes de sincronizar). (BR-031)
- CUANDO `installSkills` actualiza una carpeta `sdd-*` que ya existe en el destino, EL SISTEMA DEBE dejarla idéntica a la carpeta correspondiente del paquete instalado — incluyendo eliminar del destino cualquier archivo/subcarpeta que ya no exista en el paquete (mirror real, no merge). Aplica a `sync`, `init` y `setup` por igual (misma función compartida). (BR-032)
- CUANDO `cfg.skills === 'global'`, EL SISTEMA DEBE imprimir un aviso explícito indicando que se actualizaron las skills GLOBALES (`~/.claude/skills/sdd-*`), compartidas por todos los repos de la máquina. (BR-033)
- CUANDO `sdd doctor` detecta `config.version !== VERSION`, hooks pre-commit/post-commit ausentes, o skills `sdd-*` faltantes/desactualizadas en el scope configurado, EL SISTEMA DEBE sugerir `sdd sync` (no `sdd setup`) como remedio. La advertencia de `sdd-bootstrap` global (instalada solo por `setup`) sigue sugiriendo `sdd setup`. (BR-034)
- SI el repo no tiene `.git`, EL SISTEMA DEBE comportarse igual que `init` hoy (hooks informan ausencia de `.git`, el resto de la sincronización procede igual).

**Reglas de negocio afectadas:** BR-030 (nueva), BR-031 (nueva), BR-032 (nueva), BR-033 (nueva), BR-034 (nueva) — se agregan a `.sdd/domain.md` como parte del plan.

**Fuera de alcance:**

- Instalar/actualizar la skill global `sdd-bootstrap` (sigue siendo exclusiva de `sdd setup`).
- Correr `sdd scan` o el wizard de convenciones (`sdd decide`) — eso sigue siendo trabajo de `sdd setup`.
- Modo `--dry-run`/`--check` (no pedido; los cambios de `sync` son no destructivos salvo el mirror de carpetas `sdd-*`, que son 100% gestionadas).
- Cambiar el scope de skills (local↔global) — eso es decisión de `sdd setup`/flags `--local`/`--global` en `init`.

**Impacto en arquitectura/catálogo:**

- Nuevo módulo `src/commands/sync.js` (comando), registrado en `bin/sdd.js` (HELP + dispatch).
- `src/lib/skills.js::installSkills` cambia de merge (`cpSync`) a mirror (limpia destino antes de copiar) — afecta también a `init`/`setup`.
- `src/commands/doctor.js`: mensajes de config/hooks/skills desactualizados → sugieren `sdd sync`.
- `.sdd/domain.md`: agregar BR-030..BR-034.
- `README.md`: documentar `sdd sync` (sección breve, análoga a `doctor`).
- No requiere ADR nuevo (es una extensión de patrones ya existentes: `init`, `installSkills`, mensajes de `doctor`).

---
_Aprobación del dev: aprobada 2026-06-14 ("Sí, apruebo, pasá a planificación")_
