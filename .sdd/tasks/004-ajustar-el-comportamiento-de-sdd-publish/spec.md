# Spec — tarea 004: Ajustar el comportamiento de `sdd publish` según el driver d…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** El grafo SQLite local (perfil "dev individual con varios repos propios", ADR-0002) solo se actualiza si el dev corre `sdd publish` a mano. Si lo olvida, `sdd impact`/`sdd context` quedan con datos stale — reduce la utilidad del caso de uso que motivó ADR-0002 (visibilidad cross-repo "gratis", sin disciplina extra).
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** Sí, parcialmente: `src/lib/hooks.js::installPreCommit` ya instala y mantiene un pre-commit hook (`sdd validate --hook || exit 1`), con toggle `cfg.hooks.preCommit` en `.sdd/config.json`, soporte en `uninstall.js` y reporte en `doctor.js`. Además `validate.js` ya implementa el patrón "`--hook`: lee `.sdd/config.json` en runtime y degrada en silencio si no aplica" (líneas 8-13). Ese mismo patrón es directamente reusable para `publish.js`.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí: agregar una segunda línea al hook existente (`sdd publish --hook || true`) con un flag `--hook` nuevo en `publish.js` que decide en runtime si hace algo según `cfg.graph?.driver`. Cero infraestructura nueva de instalación/desinstalación de hooks — se extiende `HOOK_LINE`/`installPreCommit` y se actualiza `uninstall.js` para reconocer la línea nueva.
- **Supuestos del dev que podrían no ser ciertos:**
  1. "Pre-commit" como punto de disparo: **técnicamente problemático para `commitHash`**. `publish.js:47` hace `git rev-parse HEAD` para el snapshot. En un hook **pre-commit**, ese comando corre ANTES de que git cree el nuevo commit → devuelve el commit PADRE, no el que se está creando. Resultado: `publishedAt` reflejaría el working tree que se está commiteando, pero `commitHash` apuntaría al commit anterior — los dos campos que BR-013 documenta como pareja ("hash de commit y timestamp") quedarían desalineados en cada publish automático. Un hook **post-commit** no tiene este problema (`git rev-parse HEAD` ya apunta al commit recién creado).
  2. "MySQL es la opción corporativa, SQLite la individual" — correcto, así está documentado en ADR-0002. No es un supuesto falso.
  3. Implícito: que el publish automático debe ser **no bloqueante** (si falla el gate de calidad o falta `better-sqlite3`, el commit debe seguir). Si se pone en pre-commit con exit≠0 en esos casos, se rompería el commit por documentación C4 incompleta — un cambio de comportamiento mucho más agresivo que lo pedido.
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento):
  - **Desalineamiento commitHash/publishedAt** si se usa pre-commit (ver supuesto 1) — riesgo de arquitectura/correctness del dato publicado.
  - **Ruido en cada commit** si `better-sqlite3` no está instalada (driver sqlite configurado pero dependencia opcional ausente): hoy `sdd publish` imprime "Falta una dependencia opcional...". Si el hook lo invoca en cada commit, ese mensaje se repetiría siempre — debe degradar en silencio en modo `--hook` (igual patrón que `validate --hook` con `cfg.hooks?.preCommit===false`).
  - El switch `cfg.graph.driver` debe leerse en CADA ejecución del hook (no fijarse en instalación), porque el dev puede configurar/cambiar el driver después de instalar el hook.
  - Mantenimiento: `uninstall.js` y `doctor.js` deben actualizarse para reconocer/limpiar/reportar la línea nueva del hook.
  - Performance: escritura SQLite local adicional por commit — despreciable (archivo local, ya se abre/cierra en `sdd publish` manual hoy).
- **¿Qué pasa si NO se hace?** Nada se rompe (BR-012/ADR-0004: todo informativo, degrada en silencio), pero el grafo local queda desactualizado salvo disciplina manual — reduce el valor práctico del caso de uso "dev individual" de ADR-0002.

**Sobre ADR-0003:** su alcance ("`sdd publish` no desde máquinas de dev") está motivado por no ensuciar un GRAFO COMPARTIDO con estado de branches no mergeados — preocupación que aplica al driver `mysql` (grafo de equipo), no a `sqlite` (grafo local de un solo dev, sin "compartido" que ensuciar). Conclusión: no se "reemplaza" 0003, se **acota su alcance a `driver=mysql`** vía un ADR nuevo (0010) que lo referencia — siguiendo el patrón ya usado en ADR-0008 ("no se edita este archivo para cambiar la historia").

**Recomendación:** `proceder con cambios` — el enfoque general (auto-publish condicionado a `graph.driver===sqlite`, reusando la infraestructura de hooks existente vía un flag `--hook` en `publish.js`) es sólido y de bajo esfuerzo. Pero recomiendo:
  1. **post-commit en vez de pre-commit** por la corrección de `commitHash` (a menos que el dev prefiera aceptar el desalineamiento de 1 commit a cambio de reusar el hook pre-commit existente sin agregar infraestructura post-commit nueva).
  2. El publish-en-hook es **siempre no bloqueante** (gate de calidad y dependencia faltante degradan en silencio, nunca exit≠0).
  3. ADR-0003 se acota a `mysql` vía ADR nuevo (0010), no se edita.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: El requisito pide pre-commit, pero `git rev-parse HEAD` en pre-commit devuelve el commit PADRE (commitHash quedaría desalineado del contenido publicado por 1 commit). ¿pre-commit (con ese desalineamiento conocido) o post-commit (commitHash correcto, requiere instalar un hook nuevo en `src/lib/hooks.js`)?
  - Respuesta: **post-commit**.
- [x] P2: ¿toggle de `.sdd/config.json` para activar/desactivar el auto-publish: nuevo `hooks.autoPublish` (independiente de `hooks.preCommit`) o reusar `hooks.preCommit`?
  - Respuesta: **nuevo `hooks.autoPublish`** (default `true`).
- [x] P3: ¿feedback del auto-publish en cada commit: silencioso (igual que `validate --hook` en éxito) o una línea corta de confirmación?
  - Respuesta: **línea corta en éxito** (p.ej. `✓ grafo local actualizado (sqlite) → commit <hash corto> @ <timestamp>`).

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** Lag entre el HEAD del repo y el snapshot publicado en el grafo local, para repos con `graph.driver=sqlite`. Operacionalizado como: tras un commit, ¿`querySystem(canonicalName).commitHash === git rev-parse HEAD` (sin lag) y `publishedAt` es de ese mismo momento?
- **Baseline actual:** Lag indefinido / 0% de los commits actualizan el grafo — `sdd publish` es 100% manual, depende de que el dev se acuerde de correrlo.
- **Resultado esperado:** 100% de los commits en un repo con `graph.driver=sqlite`, hook post-commit instalado, `hooks.autoPublish !== false` y C4 sin pendientes (`- [ ] ` bajo `## ❓ VALIDAR`) dejan `commitHash`/`publishedAt` sincronizados con el HEAD recién creado — sin acción manual.
- **Cómo se mide después:** test de integración (`src/lib/hooks.test.js` y/o `publish.test.js`, paso del plan) que: instala el hook post-commit en un repo temporal con `graph.driver=sqlite`, hace un commit real, corre el hook, y verifica `querySystem(...).commitHash === git rev-parse HEAD`. Validación manual adicional: aplicar `sdd setup` en `sddkit` (que ya tiene `graph.driver=sqlite` en `.sdd/config.json`), hacer un commit real de esta tarea, y confirmar con `sdd context` que el snapshot quedó al día.

## Spec refinada

**Historia:** Como dev individual que usa sddkit con `graph.driver=sqlite` (varios repos propios, ADR-0002), quiero que el snapshot del grafo local se actualice automáticamente al hacer un commit, para que `sdd impact`/`sdd context` reflejen el estado real de mis repos sin tener que recordar correr `sdd publish` a mano.

**Criterios de aceptación (formato EARS):**

1. CUANDO se corre `sdd setup`/`sdd init` en un repo con `.git`, EL SISTEMA DEBE instalar (además del pre-commit existente) un hook **post-commit** que ejecute `sdd publish --hook || true` — sin pisar hooks post-commit existentes (agrega al final, mismo patrón no destructivo que `installPreCommit`, vía nueva `installPostCommit` en `src/lib/hooks.js`) (BR-023).
2. CUANDO se ejecuta `sdd publish --hook` y `.sdd/config.json → graph.driver` NO es `"sqlite"` (no configurado, o `"mysql"`), EL SISTEMA DEBE terminar sin publicar y sin imprimir nada (exit 0) — preserva ADR-0003 sin cambios para `mysql` (BR-024).
3. CUANDO se ejecuta `sdd publish --hook` y `.sdd/config.json → hooks.autoPublish === false`, EL SISTEMA DEBE terminar sin publicar y sin imprimir nada (exit 0) (BR-024).
4. SI `sdd publish --hook` corre con `graph.driver === "sqlite"` y `hooks.autoPublish !== false`, pero el gate de calidad (BR-013, checkboxes `- [ ]` pendientes en `.sdd/c4/`) rechaza la publicación o falta la dependencia opcional `better-sqlite3` (ADR-0008), EL SISTEMA DEBE degradar en silencio (sin imprimir nada, exit 0) — el dev puede diagnosticar con `sdd publish`/`sdd doctor`, que sí muestran el detalle (BR-025).
5. CUANDO `sdd publish --hook` publica exitosamente (mismas condiciones de éxito que `sdd publish` manual, BR-013), EL SISTEMA DEBE imprimir una línea corta de confirmación con nombre canónico, hash corto y timestamp (p.ej. `✓ grafo local actualizado (sqlite) → commit <hash corto> @ <timestamp>`) (BR-026).
6. CUANDO se corre `sdd doctor`, EL SISTEMA DEBE reportar el estado del hook post-commit (instalado / ausente — sugiere `sdd setup` / desactivado por `hooks.autoPublish === false`), análogo al reporte existente del pre-commit (BR-027).
7. CUANDO se corre `sdd uninstall`, EL SISTEMA DEBE remover la línea del hook post-commit agregada por sddkit (o el archivo `.git/hooks/post-commit` completo si era solo de sddkit), análogo al manejo existente de `pre-commit` (BR-028).
8. CUANDO `sdd init`/`sdd setup` crea o migra `.sdd/config.json`, EL SISTEMA DEBE incluir `hooks.autoPublish: true` junto a `hooks.preCommit: true` (configs existentes sin el campo se migran agregándolo) (BR-029).

**Reglas de negocio afectadas:** BR-012 (degradar en silencio si el grafo no está configurado — extendido a `--hook`), BR-013 (gate de calidad + upsert — reusado sin cambios por `--hook`), ADR-0003 (acotado a `driver=mysql` vía ADR-0010 nuevo, no se edita), ADR-0008 (mensaje de dependencia faltante — en `--hook` degrada en silencio, BR-025). Nuevas (se agregan a `.sdd/domain.md`): **BR-023** a **BR-029** (criterios 1-8 arriba).

**Fuera de alcance:**

- Soporte real de `sdd publish`/hook para `driver=mysql` — el hook simplemente no hace nada en ese caso (BR-024). El gap conocido de `wrap()` no async-aware para mysql (LEARNINGS tarea 002) no se toca.
- Cambios al hook `pre-commit`/`sdd validate --hook` existentes — quedan tal cual.
- Migración retroactiva de hooks ya instalados en OTROS repos que corrieron `sdd setup` con versiones anteriores de sddkit — se actualizan la próxima vez que corran `sdd setup` (mismo patrón "merge, no se pisa nada" ya existente).
- Un comando nuevo tipo `sdd graph systems` para editar el nombre canónico — sigue fuera de alcance (ya documentado en tarea 002).

**Impacto en arquitectura/catálogo:**

- `src/lib/hooks.js`: nueva función `installPostCommit` (espejo de `installPreCommit`), nueva constante de línea de hook (`sdd publish --hook || true`).
- `src/commands/publish.js`: nuevo flag `--hook` con la lógica de silencio/confirmación (BR-024 a BR-026).
- `src/commands/init.js` (y `setup.js` si aplica): instala el hook post-commit + agrega `hooks.autoPublish: true` al config default y a la migración de configs existentes (BR-029).
- `src/commands/doctor.js`: nuevo bloque de reporte para el hook post-commit (BR-027).
- `src/commands/uninstall.js`: limpieza del hook post-commit (BR-028).
- `.sdd/decisions/0010-*.md`: ADR nuevo que acota ADR-0003 a `driver=mysql` y documenta el hook post-commit para `driver=sqlite` (no se edita 0003, mismo patrón que ADR-0008).
- `.sdd/domain.md`: agrega BR-023 a BR-029.
- `README.md`: documentar el nuevo comportamiento en la sección "Grafo de impacto" (sqlite = auto-publish vía hook; mysql = sigue ADR-0003/CI).
- Catálogo de convenciones: ninguna convención nueva (reusa el patrón `--hook` ya existente en `validate.js`).

---
_Aprobación del dev: aprobada (2026-06-13)_
