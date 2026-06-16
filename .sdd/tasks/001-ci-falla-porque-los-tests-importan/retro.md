# Retro — tarea 001: CI verde tolerando better-sqlite3 opcional

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-16.

## Resultado de la métrica de impacto

- **Baseline (de spec.md):** 0/3 jobs de CI verdes (rojos en `main` y en PRs #1/#2, las 3 versiones de Node). `npm test` exit 1 sin `better-sqlite3`: 13 tests caídos + `ERR_MODULE_NOT_FOUND` que tumba `sqlite.test.js` entero. Con el nativo presente, 210/210.
- **Resultado medido después:**
  - **Con `better-sqlite3`:** `npm test` → 210 pass, 0 fail, 0 skipped (cobertura completa intacta).
  - **Sin `better-sqlite3`:** `npm test` → 188 pass, 0 fail, **22 skipped**, exit 0 (degrada limpio, sin `ERR_MODULE_NOT_FOUND`).
  - `ci.yml` ahora fuerza el build del nativo (`npm rebuild ... --foreground-scripts`) + step de verificación ruidoso (`require('better-sqlite3')`/`require('mysql2')`).
- **¿Se cumplió lo esperado?:** Sí en lo local (los dos escenarios verdes, criterio central de la spec). La validación final de los 3 jobs de CI en verde se confirma al pushear la rama / mergear — pendiente de la corrida real de GitHub Actions (el step de verificación expondrá la causa raíz del build si todavía fallara en el runner, según lo decidido con el dev).

## Qué anticipó bien la spec y qué no

- **Bien:** el diagnóstico (import duro de un opcional + `npm ci` que tolera fallos de opcionales) fue exacto y reproducible quitando `node_modules/better-sqlite3`. El patrón de skip ya existía en el repo (`publish --hook`), así que no hubo que inventar nada. No se tocó código de producción (ADR-0008/BR-025 intactos).
- **Mal / incompleto:** la spec/plan subestimó el alcance de los guards. Asumió que sólo los tests que abren el store "a mano" necesitaban guard, pero **los tests que invocan un comando (`impact()`, `publish()`) que abre el store INTERNAMENTE también degradan** al warning de dependencia faltante — y el guard puesto DESPUÉS de la llamada al comando no sirve. Esto recién se detectó en el Paso 5 (verificación e2e sin el nativo), no en la verificación per-archivo (que corría con el nativo presente y por eso pasaba).

## Desvíos del plan

- **Paso 5 falló en la primera pasada** (4 fallos residuales sin el nativo: `impact <argumento>`, `publish: publica OK / CON infra / SIN infra`). Causa: guards mal ubicados (después de `publish()`/`impact()` y de la aserción de éxito) o ausentes en un test que sí ejercita el open del store. Se relanzó un worker de corrección: probe `nativeReady` a nivel módulo + `if (!nativeReady) return t.skip(...)` como PRIMERA línea de cada test afectado, antes de llamar al comando. Tras eso, Paso 5 verde.
- **Lección de método:** la verificación per-paso corría con el nativo instalado, así que daba falso verde para la resiliencia. El gate real fue el Paso 5 (correr el suite CON y SIN el nativo). Para fixes de "tolerar ausencia de X", la verificación tiene que ejercitar la ausencia, no sólo la presencia.

## Aprendizajes accionables

- **Tests que llaman a un comando que abre un recurso opcional internamente necesitan el guard de skip ANTES de invocar el comando** (no después): `impact()`/`publish()`/`context()` abren el graphstore sqlite por dentro y, sin `better-sqlite3`, imprimen el warning de dependencia faltante en vez del comportamiento esperado. El guard `if (!store.ok) skip` puesto sobre un store de verificación creado DESPUÉS de la llamada llega tarde. Patrón correcto: probe a nivel módulo (`let nativeReady=false; try{ await import('better-sqlite3'); nativeReady=true }catch{}`) + skip como primera línea del test.
- **Para un fix de "tolerar la ausencia de una optionalDependency", la verificación DEBE correr el suite también SIN esa dependencia** (`mv node_modules/<dep> /tmp/... && npm test`). Verificar sólo con la dep presente da falso verde — fue exactamente lo que ocultó los 4 fallos hasta el Paso 5.
- **`import()` dinámico ESM permite un import estático "opcional"**: reemplazar `import X from 'opt-dep'` (que tumba el módulo entero si falta) por `let X=null; try{ ({default:X}=await import('opt-dep')) }catch{}` en archivos de test, alineado con la convención `module-system → esm`.

## ¿Algo para el catálogo, el dominio o la arquitectura?

- **Nada nuevo para catálogo/dominio/C4.** El fix alinea los tests con ADR-0008 (driver sqlite vía `better-sqlite3` opcional) y BR-025 (degradación silenciosa si falta el nativo) ya vigentes — no introduce convención, BR ni ADR nuevos.
- Los 3 aprendizajes accionables de arriba se cosechan a `.sdd/LEARNINGS.md` (curado).
