---
name: sdd-test
description: Ejecución reproducible de tests del repo. Usar siempre que haya que correr tests, verificar un paso del plan, o comprobar "tests en verde" — antes de razonar comandos de test manualmente.
---

# sdd-test — tests reproducibles, baratos en tokens

**Principio**: determinar cómo correr los tests de un repo es un problema que se resuelve UNA vez y se congela en un script determinístico. Re-razonarlo en cada verificación quema tokens en algo que no necesita un LLM.

## Protocolo

1. **¿Existe `.sdd/run-tests.mjs`?**
   - **SÍ** → corré `sdd test` (o `node .sdd/run-tests.mjs`). NO razones comandos de test, NO inspecciones package.json/pom.xml para deducirlos: el script ya lo sabe. Leé solo el resumen final y los fallos.
   - **NO** → crealo (paso 2), verificá que funciona, commitealo. A partir de ahí vale el caso "SÍ" para siempre.
2. **Crear el script** (una sola vez por repo):
   - Copiá `templates/run-tests.mjs` de esta skill a `.sdd/run-tests.mjs`.
   - El template ya autodetecta stacks comunes (npm/maven/gradle/go/pytest) y la estrategia Docker. Solo ajustá el bloque `CONFIG` si el repo es especial (comando de test custom, imagen específica, servicios necesarios).
   - Verificá corriéndolo: tiene que terminar con exit 0 (tests verdes) o el exit code real de los tests.
   - Si el repo necesita servicios (DB, redis) para los tests, la estrategia correcta es un servicio `test` en docker-compose — ver `references/docker.md` — y que el script lo use.
3. **Prioridad de ejecución** (el script la implementa; no la dupliques):
   1. `Dockerfile.test` → build + run (máxima reproducibilidad)
   2. servicio `test` en docker-compose → `docker compose run --rm test`
   3. Docker disponible → imagen estándar del stack con el repo montado
   4. Sin Docker → comando nativo (con aviso de que el entorno puede contaminar)

## Checks completos (lint + build + tests)

Mismo patrón con `templates/run-checks.mjs` → `.sdd/run-checks.mjs` → `sdd check`. Crealo cuando el repo tenga lint o build relevantes; delega los tests en run-tests.mjs.

## Reglas

- El script es **determinístico**: nada de lógica que requiera juicio adentro; eso va en CONFIG o en la skill.
- Exit code = verdad. 0 = verde. No interpretes "casi pasan".
- Si el script falla por entorno (no por tests), arreglá el script — no vuelvas al modo manual.
- En la fase de ejecución (sdd-execute): toda verificación "tests en verde" se hace con `sdd test`.
