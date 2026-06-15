# ADR 0010 — `sdd publish` automático vía hook post-commit para `driver=sqlite`

- **Fecha:** 2026-06-14 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/004

## Contexto

ADR-0002 estableció dos perfiles de storage para el grafo: `sqlite` (default, local, "dev individual con varios repos propios") y `mysql` (equipo, infraestructura compartida). ADR-0003 decidió que `sdd publish` "no corre desde máquinas de dev" — está pensado para CI sobre `main` — porque correrlo manualmente publicaría estado de branches no mergeados, ensuciando un **grafo compartido** con código que podría no llegar a `main`.

Para el perfil `sqlite` (ADR-0002), esa motivación no aplica: el grafo es **local a una sola máquina de un solo dev**, no hay "compartido" que ensuciar con branches ajenas — el snapshot publicado es siempre el propio working tree del dev, en su propio grafo. Sin embargo, hoy ese snapshot solo se actualiza si el dev recuerda correr `sdd publish` a mano, lo que en la práctica deja `sdd impact`/`sdd context` con datos stale (BR-012) la mayor parte del tiempo, reduciendo el valor del caso de uso "visibilidad cross-repo gratis" que motivó la opción `sqlite` de ADR-0002.

## Decisión

Para `.sdd/config.json → graph.driver === "sqlite"`, `sdd setup`/`sdd init` instalan un hook **post-commit** (además del pre-commit existente, ADR previo de validate) que ejecuta `sdd publish --hook || true` (BR-023). En cada commit, `sdd publish --hook`:

- si `graph.driver` no es `"sqlite"` (no configurado, o `"mysql"`), termina sin publicar y sin imprimir nada — exit 0 (BR-024);
- si `.sdd/config.json → hooks.autoPublish === false`, termina igual, sin publicar ni imprimir nada — exit 0 (BR-024);
- si el gate de calidad (BR-013) rechaza la publicación, o falta la dependencia opcional `better-sqlite3` (ADR-0008), degrada en silencio — exit 0; el dev diagnostica con `sdd publish`/`sdd doctor` (BR-025);
- si publica con éxito, imprime una línea corta de confirmación con nombre canónico, hash corto de commit y timestamp (BR-026).

`hooks.autoPublish` se agrega a `.sdd/config.json` con default `true` (BR-029), análogo a `hooks.preCommit`. `sdd doctor` reporta el estado del hook post-commit (BR-027) y `sdd uninstall` lo limpia (BR-028), siguiendo el mismo patrón ya existente para `pre-commit`.

**ADR-0003 NO se edita.** Su alcance ("`sdd publish` no desde máquinas de dev") queda **acotado a `graph.driver === "mysql"`** (grafo compartido de equipo, donde la motivación original de ADR-0003 — no ensuciar el grafo con branches no mergeados — sigue aplicando sin cambios: `sdd publish --hook` no hace nada para `mysql`, BR-024). Para `driver === "sqlite"`, el publish automático desde la máquina del dev pasa a ser el flujo soportado, vía el hook post-commit descripto arriba — siguiendo el patrón de ADR-0008 ("no se edita este archivo para cambiar la historia").

## Alternativas consideradas

- **Editar ADR-0003 para excluir `sqlite` de su alcance:** descartado — reescribiría retroactivamente una decisión ya aceptada y borraría el contexto de por qué se tomó para el caso `mysql` (que sigue vigente). Mismo razonamiento que llevó a ADR-0008 a no editar decisiones previas.
- **Hook pre-commit en vez de post-commit:** descartado — `sdd publish` usa `git rev-parse HEAD` para `commitHash` (BR-013). En pre-commit ese comando devuelve el commit PADRE (el nuevo commit todavía no existe), desalineando `commitHash` del `publishedAt`/contenido recién commiteado. Post-commit no tiene este problema.
- **Auto-publish también para `driver=mysql`:** descartado — extendería el publish automático al grafo compartido de equipo, exactamente el escenario que ADR-0003 buscó evitar (estado de branches no mergeados ensuciando un grafo compartido). El hook post-commit simplemente no hace nada cuando `driver=mysql`; el flujo de CI de ADR-0003 sigue siendo el soportado para ese driver.
- **Publish automático bloqueante (exit≠0 si falla el gate o falta `better-sqlite3`):** descartado — rompería el commit del dev por motivos de documentación C4 incompleta o de una dependencia opcional, un cambio de comportamiento mucho más agresivo que "mantener el grafo local al día". El publish automático es siempre no bloqueante (BR-025), degradando en silencio igual que `validate --hook` (BR-012).

## Consecuencias

- `src/lib/hooks.js` gana `installPostCommit`, espejo no destructivo de `installPreCommit`: no pisa hooks post-commit existentes, agrega la línea de sddkit al final.
- `src/commands/publish.js` gana el flag `--hook` con la lógica de silencio/confirmación de BR-024/BR-025/BR-026; el modo sin `--hook` (`sdd publish` manual) no cambia.
- `sdd init`/`sdd setup`, `sdd doctor` y `sdd uninstall` se actualizan para instalar/reportar/limpiar el hook post-commit y el campo `hooks.autoPublish`, análogo al tratamiento existente de `hooks.preCommit`/pre-commit.
- Repos con `driver=mysql` (o sin `graph` configurado) no ven ningún cambio de comportamiento — el hook post-commit, si está instalado, no hace nada (BR-024), preservando ADR-0003 íntegro para ese perfil.
- Si en el futuro el perfil `mysql` necesita su propio mecanismo de publish automático, eso requiere un ADR nuevo que evalúe explícitamente el riesgo de "grafo compartido ensuciado con branches no mergeados" que motivó ADR-0003 — no se asume aquí.
