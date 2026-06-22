# Ejemplo: Retro completa del comando sdd sync

> Este archivo muestra como luce una `retro.md` bien cerrada, con datos reales de la tarea 005.
> Usalo como referencia al escribir la retro de tu propia tarea.

---

## retro.md de la tarea 005 (contenido completo)

```markdown
# Retro — tarea 005: Agregar comando sdd sync para actualizar repos existentes

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje
> del framework: alimenta `.sdd/LEARNINGS.md`, el catalogo y los docs. Creada el 2026-06-17.

## Resultado de la metrica de impacto

- **Metrica:** "Pasos manuales para actualizar sddkit en un repo existente"
- **Baseline (de analysis.md):** 5 pasos manuales — desinstalar sddkit, reinstalar la version
  nueva, correr `sdd init` (que sobreescribe archivos curados), resolver conflictos en
  `AGENTS.md` / skills / hooks, verificar manualmente que no se perdio nada.
- **Resultado medido despues:** 1 paso: `sdd sync`. El comando ejecuta `init(root,
  {quiet:true, silent:true})`, compara `actions` vs `skipped`, e imprime un resumen de
  lo que actualizo y lo que ya estaba al dia. Sin intervencion manual.
- **Se cumplio lo esperado:** Si. El target era "1 paso automatizado" y se alcanzo.
  Confirmado corriendo `sdd sync` en el propio repo de sddkit y en 2 repos piloto
  (`backend-service`, `frontend-app`) que tenian versiones anteriores instaladas.

## Que anticipo bien la spec y que no

- **Bien:** la decision de que `sync` sea una "capa fina sobre `init`" fue acertada.
  Reutilizar `init()` con flags de supresion de output evito duplicar logica de migracion
  de config, regeneracion de AGENTS.md, reinstalacion de skills y migracion de hooks.
  El 80% del codigo de `sync.js` es solo formateo del resumen.
- **Mal / incompleto:** la spec no considero el caso "la version de config es la misma
  pero init hizo cambios igualmente" (p.ej. BR-029 agrega `hooks.autoPublish` sin bumpear
  `version`). Esto obligo a agregar un check adicional sobre `actions` ademas del check
  de `cfg.version === VERSION`.

## Desvios del plan

1. **Se agrego un paso 5 no previsto.** El plan original tenia 4 pasos:
   (1) crear `src/commands/sync.js` con la logica core,
   (2) registrar el comando en `src/cli.js`,
   (3) tests unitarios en `src/commands/sync.test.js`,
   (4) verificacion e2e corriendo `sdd sync` en el propio repo.
   Pero durante el paso 3, el test de "version igual pero campos mutados" fallo porque
   `sync` solo comparaba `cfg.version`. Se agrego un paso 5 para implementar el check
   compuesto (`version + actions`), que quedo como learning permanente.

2. **El flag `--silent` en `init()` no existia.** `init()` ya tenia `{quiet:true}` (suprime
   el banner grande) pero seguia imprimiendo lineas individuales con `console.log`. Se
   necesitaba supresion total para que `sync` controlara su propia salida. Hubo que crear
   `flags.silent` en `src/commands/init.js` primero (paso 1, subtarea no prevista, ~20
   lineas). Esto retraso el paso 1 pero no impacto el timeline general.

## Aprendizajes accionables

- **Patron "capa fina sobre init" para nuevos comandos:** `init(root, flags)` retorna
  `{actions, skipped}` y respeta `flags.silent`. Cualquier comando que necesite el efecto
  completo de `init` sin su banner puede llamarlo asi y construir su propio resumen
  sobre `actions`/`skipped`. `sync.js` es el primer caso de uso, replicable para futuros
  comandos delgados sobre `init` (p.ej. un hipotetico `sdd doctor` o `sdd upgrade`).

- **"Esta al dia" no es solo comparar un campo de version:** si la operacion subyacente
  puede mutar campos por motivos independientes del bump de version, el resumen debe
  chequear tambien si `actions` reporto cambios reales
  (`actions.some(a => a.startsWith('.sdd/config.json'))`), no solo `cfg.version ===
  VERSION`. Sino el mensaje "ya al dia" puede ser falso aunque algo si haya cambiado.

- **Tests de migracion necesitan sentinelas inalcanzables:** usar `0.0.0` como version
  "vieja" en tests de `sync`, no la version real del `package.json` (que puede coincidir
  y anular la migracion). Descubierto al colisionar con `0.0.1` en una regresion posterior.

## Algo para el catalogo, el dominio o la arquitectura

- **LEARNINGS.md:** los 2 primeros aprendizajes (patron "capa fina" y "version check
  no alcanza") se cosecharon a `.sdd/LEARNINGS.md` como entradas generales. Son
  reutilizables por cualquier tarea futura que agregue un comando nuevo o un chequeo
  de "esta al dia".
- **domain.md:** BR-030 a BR-034 (reglas de negocio del comando `sync`: que archivos
  actualiza, cuales respeta, orden de operaciones) ya fueron escritas durante la fase
  de spec (paso 2) y quedaron en `.sdd/domain.md`. No hay BRs pendientes.
- **ADR:** no se necesita ADR nuevo. La decision de implementar `sync` como capa sobre
  `init` (en vez de un mecanismo de diff/patch independiente) quedo documentada en la
  spec como alternativa evaluada y descartada.
- **C4:** `components.md` ya listaba `src/commands/` como directorio de comandos CLI.
  Se agrego `sync.js` a la lista de archivos en ese modulo, sin cambio estructural.
```

---

## Cierre de la tarea

Despues de escribir la retro y verificar que todos los campos estan completos:

```bash
sdd task status 005 done
```

Salida esperada:

```
✓ Retro completa — todos los campos rellenados
✓ Metrica con baseline y resultado
✓ 3 aprendizajes cosechados a LEARNINGS.md
✓ Tarea 005 → done
```

La tarea queda cerrada y sus artefactos (requirement.md, spec.md, plan.md, retro.md)
permanecen en `.sdd/tasks/005-agregar-comando-sdd-sync/` como registro historico.
