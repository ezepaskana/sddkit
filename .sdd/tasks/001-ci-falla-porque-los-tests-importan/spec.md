# Spec — tarea 001: CI falla porque los tests importan better-sqlite3 (optionalD…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** El CI está rojo en `main` y en los PRs de Dependabot (#1 checkout, #2 setup-node), en node 18/20/22. Diagnóstico confirmado (reproducido localmente quitando el nativo): el suite importa `better-sqlite3` —declarada como `optionalDependency`— de forma dura, y en el runner ese módulo no queda instalado. `npm ci` tolera el fallo de un opcional y sigue (exit 0), pero `npm test` revienta: `sqlite.test.js:6` hace `import Database from 'better-sqlite3'` (top-level → tira el archivo entero, ERR_MODULE_NOT_FOUND) y `impact/context/publish.test.js` asumen `store.ok` sin chequear. Resultado: 13 tests caídos, `npm test` exit 1. El problema real es la **incoherencia entre el contrato de producción (degradar elegante si falta el opcional, ADR-0008/BR-025) y los tests (que lo exigen presente)**.
- **¿Ya existe algo en el repo que lo resuelve total o parcialmente?** Sí, y es clave: **el patrón resiliente ya existe en el propio repo**. Los tests `publish --hook` (`publish.test.js:208,238,271,307`) hacen `const store = await createGraphStore(cfg); if (!store.ok) { t.skip(\`graphstore no disponible: ${store.reason}\`); return; }`. La parte de tests de esta tarea es **replicar ese patrón establecido** en los tests que aún no lo aplican — no se introduce un mecanismo nuevo. El código de producción (`graphstore/index.js`, `sqlite.js` con `importSqlite` inyectable) ya degrada a `{ok:false, reason:'missing-dependency'}` por ADR-0008.
- **¿Hay una alternativa más simple (80/20)?** Alternativas descartadas: (a) mover `better-sqlite3`/`mysql2` a `devDependencies` → rompe el modelo runtime (el graph store es opt-in para el usuario final vía `npm i better-sqlite3`, ADR-0008); (b) sólo arreglar `ci.yml` (instalar el nativo) sin tocar los tests → deja el suite frágil: cualquier dev sin el opcional instalado ve 13 tests rojos en local, y no respeta el contrato de degradación. El enfoque elegido (C) es el correcto: tests resilientes (robustez) + `ci.yml` garantiza el nativo (cobertura). La mitad "tests resilientes" es de bajo esfuerzo y alto valor.
- **Supuestos del dev que podrían no ser ciertos:** el requisito asume que en `ci.yml` se puede "garantizar que el nativo se instale/compile". Esto es cierto sólo si conocemos **por qué** hoy no se instala. Reproduje el síntoma (nativo ausente) pero NO la causa raíz en el runner: localmente `better-sqlite3@11.10.0` instala bien en WSL/linux (ABI 115); que fallen las 3 versiones de Node sugiere una causa global (descarga del prebuilt, build-tools, o que npm omita opcionales), no un prebuilt faltante por versión puntual. **Sin los logs del job de CI no puedo afirmar la causa** — y de ella depende el arreglo correcto de `ci.yml`.
- **Riesgos y efectos secundarios:** (1) Si los tests skipean cuando falta el nativo, se puede **perder cobertura de sqlite en silencio** — por eso la mitad de `ci.yml` es necesaria (garantizar presencia en CI para que el skip sólo ocurra en dev sin el opcional). (2) Tensión de objetivos: si en alguna versión de Node el nativo genuinamente no puede instalarse, "garantizar cobertura ruidosa" (CI rojo si falla) choca con "CI verde". Hay que decidir el trade-off. (3) Bajo riesgo de arquitectura: no se toca código de producción, sólo tests y workflow.
- **¿Qué pasa si NO se hace?** CI queda rojo permanentemente; Dependabot y futuros PRs no tienen señal de verde; mala primera impresión del repo recién hecho público.
- **Si puede fallar en uso real, ¿detección y manejo?** El "uso" acá es el propio CI y `npm test` en dev. Detección: el exit code del CI y de `sdd test`. Manejo: tests degradan a `t.skip` con motivo legible (`graphstore no disponible: missing-dependency`) — el dev ve por qué se saltó, no un falso verde mudo. En CI, un step de verificación debe confirmar que el nativo está presente para que el skip NO oculte regresiones.

**Recomendación:** `proceder con cambios` — el enfoque C es correcto y coherente con ADR-0008/BR-025. La mitad "tests resilientes" está clara y replica un patrón existente. La mitad "ci.yml garantiza el nativo" requiere **conseguir los logs del job de CI** para conocer la causa raíz (o un fallback: que `ci.yml` fuerce el build y exponga el error en la próxima corrida). Pendiente de clarificación con el dev antes de especificar el plan de `ci.yml`.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: No tengo `gh`/token ni pude reproducir la causa raíz (sólo el síntoma) de por qué `better-sqlite3` no se instala en el runner. ¿Cómo conseguimos la causa para arreglar `ci.yml`?
  - Respuesta: **Que `ci.yml` fuerce el build y exponga el error** (p.ej. `npm rebuild better-sqlite3 mysql2 --foreground-scripts`). No depende de pasar logs/token; la próxima corrida muestra el error real y de ahí ajustamos (build-tools/python si hiciera falta).
- [x] P2: Si en alguna versión de Node el nativo genuinamente no puede instalarse/compilar en CI, ¿cobertura o verde?
  - Respuesta: **Verde con cobertura ruidosa.** `npm test` debe quedar verde siempre (los tests skipean si falta el nativo), PERO un step de verificación en CI debe avisar/fallar claramente si el nativo no está presente — para no perder cobertura sqlite en silencio. Interpretación operativa: `npm test` nunca rompe por ausencia del opcional; el guardrail ruidoso vive en un step dedicado de CI.

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica:** jobs de CI en verde sobre el total (node 18/20/22) + resultado de `npm test` con y sin el nativo presente.
- **Baseline actual:** 0/3 jobs de CI verdes (rojos en `main` y en PRs #1/#2, las 3 versiones). `npm test` exit 1 cuando falta `better-sqlite3` → 13 tests caídos + `ERR_MODULE_NOT_FOUND` que tumba `sqlite.test.js` entero (medido localmente quitando `node_modules/better-sqlite3`). Con el nativo presente, 210/210 pasan localmente.
- **Resultado esperado:** 3/3 jobs de CI verdes. `npm test` exit 0 **con y sin** el nativo (sin nativo: degrada a `t.skip` con motivo, 0 fallos). Con el nativo presente (caso CI esperado): los tests de sqlite/graph corren de verdad (no skipean) y el step de verificación de CI confirma `require('better-sqlite3')`/`require('mysql2')` OK.
- **Cómo se mide después:** (1) re-correr CI tras el push (3 checks verdes); (2) localmente, reproducir el repro de diagnóstico: `npm test` con el nativo y `rm -rf node_modules/better-sqlite3 node_modules/mysql2 && npm test` — ambos deben dar exit 0; (3) log del step de verificación de CI muestra "native deps OK".

_Métrica binaria/cualitativa: el objetivo es robustez del pipeline, no un número de performance._

## Spec refinada

**Historia:** Como mantenedor de sddkit quiero que el suite de tests y el CI toleren la ausencia de la dependencia opcional nativa `better-sqlite3` (coherente con ADR-0008/BR-025) y que CI a la vez garantice su presencia, para tener el pipeline en verde sin perder cobertura del graph store sqlite.

**Criterios de aceptación (formato EARS):**

- CUANDO se corre `npm test` y `better-sqlite3` NO está instalado, EL SISTEMA DEBE terminar con exit 0, sin `ERR_MODULE_NOT_FOUND`, degradando los tests que requieren un store sqlite/mysql real a `t.skip(<motivo legible>)`.
- CUANDO se corre `npm test` y `better-sqlite3` SÍ está instalado, EL SISTEMA DEBE ejecutar realmente (sin skipear) los tests de `sqlite.test.js`, `impact.test.js`, `context.test.js` y `publish.test.js` que ejercitan el graph store, manteniendo la cobertura actual.
- CUANDO un test necesita el constructor crudo de `better-sqlite3` (p.ej. la migración de DB legacy en `sqlite.test.js`), EL SISTEMA DEBE obtenerlo vía `import()` dinámico y skipear si la importación falla, en vez de un `import` estático top-level que tumbe el archivo entero.
- CUANDO corre el workflow de CI, EL SISTEMA DEBE forzar la instalación/compilación del nativo (`npm rebuild better-sqlite3 mysql2 --foreground-scripts` o equivalente) exponiendo el error de build si lo hubiera.
- SI tras el step de instalación el nativo no puede cargarse en CI, EL SISTEMA DEBE fallar ese job ruidosamente en un step de verificación dedicado (`require('better-sqlite3')`/`require('mysql2')`), con mensaje claro — para no enmascarar la pérdida de cobertura detrás de skips.
- SI el cambio toca sólo tests y workflow, EL SISTEMA DEBE NO modificar código de producción (el contrato de degradación ya existe: `graphstore/index.js`, `sqlite.js`).

**Reglas de negocio afectadas** _(citar por ID desde .sdd/domain.md)_: ninguna BR nueva. Se respeta **BR-025** (degradación silenciosa de producción si falta `better-sqlite3`) y **ADR-0008** (driver sqlite vía `better-sqlite3` opcional). Esta tarea alinea los tests con ese contrato ya vigente.

**Fuera de alcance:**

- Mover `better-sqlite3`/`mysql2` a `devDependencies` o cambiar su naturaleza opcional (rompería ADR-0008).
- Tocar el bump de `setup-node`/`checkout` de Dependabot (PRs #1/#2): son inocentes; PR #2 quedará verde solo cuando rebasee con el fix de `main`.
- Reescribir la estrategia de discovery de `node --test` (el ruido de `src/commands/test.js` como suite vacía ya está documentado como aprendizaje, no es parte de este fix).
- Hacer `wrap()` async-aware para soporte real de mysql (gap conocido, otra tarea).

**Impacto en arquitectura/catálogo:** sin impacto en C4 ni catálogo. Módulos tocados: tests de `src/lib/graphstore/` y `src/commands/` + `.github/workflows/ci.yml`. No requiere ADR nuevo (alinea con ADR-0008). Convención `module-system → esm` aplica (usar `import()` dinámico ESM, no `require`).

---
_Aprobación del dev: APROBADA (2026-06-16, Eze)_
