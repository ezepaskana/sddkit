# Spec — tarea 002: Fase 2 del grafo de impacto cross-sistema (ver REQUISITO-gra…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Fase 1 (tarea 001, cerrada) dio visibilidad de consumos salientes DENTRO de un repo (`capabilities.consumptions`). Pero la pregunta central del requisito — "¿a quién impacto si toco esto?" — es CROSS-repo (sección 1), y eso hoy vive en la cabeza de la gente. Fase 2 agrega el grafo central (proyección publicada, ADR-0001) + `sdd publish`/`sdd impact` para responder eso en segundos sin explorar otros repos (objetivos 1-2 de la sección 2).
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** `capabilities.endpoints`/`capabilities.consumptions` (Fase 1) son la materia prima y ya están validados (retro 001) — pero son por-repo, sin cruce. No hay storage compartido, ni `publish`/`impact`, ni tabla `systems` — `sdd find` no encuentra coincidencias para ninguno de estos términos. No hay evidencia de CI configurado en sddkit ni en los repos piloto, así que "publish desde CI" (ADR-0003) es por ahora comando + documentación, validable corriéndolo a mano.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí, y conviene aplicarla DENTRO de esta misma tarea (no como tarea aparte, para no romper "una tarea por fase"): el caso de uso primario de SQLite (ADR-0002) es "un dev con varios repos propios" — y sddkit + los 2 pilotos (`backend-service`, `frontend-app`) son exactamente eso: 3 repos de UN dev. El 80% del valor para ESTE entorno es interfaz + driver SQLite + `publish` (SQLite, a mano) + `impact` + matching + tabla `systems` de 3 filas, validable end-to-end con los repos reales. El driver MySQL + snippet CI + integración con `sdd-analyze`/`sdd context` son el 20% restante (necesario para "equipo", no para validar el flujo). Propuesta: secuenciar el plan SQLite-primero; si al final el plan resulta demasiado grande para una sesión, lo señalo en el gate de `plan.md` para evaluar partirlo — no lo decido unilateralmente ahora.
- **Supuestos del dev que podrían no ser ciertos:**
  - "`node:sqlite` (Node ≥22) ... evaluar en la spec" (sección 8) — el entorno de desarrollo ACTUAL corre **Node v20.20.2** (`engines` hoy `>=18`). Si se elige `node:sqlite`, ni este agente ni el dev podrían correr/testear la feature sin actualizar Node — bloqueante práctico HOY, no un detalle a futuro. → pregunta de clarificación P1.
  - "Publish desde CI sobre main" (ADR-0003) asume CI existente — no hay evidencia de eso hoy. El comando tiene sentido igual (corrible a mano); la métrica F2 se puede medir publicando a mano desde los 3 repos reales.
  - "Nombre canónico curado (tabla `systems`)" (ADR-0007) — con 3 repos es trivial (3 filas a mano). La spec debe dejar claro que es DATA en el storage, no un mecanismo de gestión nuevo — sobre-diseñar esto sería complejidad desproporcionada.
  - "Matching por método+ruta normalizada" (ADR-0007) asume que `capabilities.endpoints` y `capabilities.consumptions` ya usan formatos compatibles. Hoy NO: Express conserva `:id` literal en `endpoints` (`/plants/:id`), mientras `consumptions` usa `:param` genérico (Fase 1, ADR-0007). Fase 2 necesita una función de normalización nueva que lleve ambos formatos (`:id`, `:param`, `{id}`) a una forma común — no está detallada en el requisito, la resuelvo en la spec refinada.
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento):
  - **Dependencias nuevas**: cualquier camino para SQLite (incluso `better-sqlite3` opcional) y `mysql2` (ADR-0002, opcional) son las PRIMERAS dependencias npm de sddkit — afecta `domain.md`/catálogo (hoy documentan "cero dependencias" como hecho real). Mitigación: dependencias OPCIONALES con `import()` perezoso, degradando con mensaje claro si no están instaladas (ya exigido por ADR-0002/0003).
  - **Ubicación del archivo SQLite**: es CROSS-repo por naturaleza (agrega N repos de un dev) — no puede vivir dentro del `.sdd/` de un solo repo. Default propuesto: `~/.sddkit/graph.db` (home del dev), configurable en `.sdd/config.json → graph.sqlite.path`; todos los repos del mismo dev deben apuntar al mismo archivo para que el grafo sea útil. Es implementación de ADR-0002, no requiere ADR nuevo — se documenta en la spec refinada.
  - **Secretos de MySQL en `.sdd/config.json`** (versionado en git): la config de conexión no puede llevar credenciales en texto plano. Necesita indirección a env var (p.ej. `graph.mysql.url` lee `process.env.SDDKIT_GRAPH_MYSQL_URL`). Se agrega como regla nueva a `domain.md`.
  - **Gate de calidad de `sdd publish`** (rechazar si C1 tiene placeholders) podría bloquear publish de repos recién creados — es el comportamiento PEDIDO (sección 3); se implementa con mensaje de guía ("corré `sdd setup --agent` y completá `.sdd/c4/context.md`").
  - **Driver MySQL sin entorno real para validar**: no hay MySQL disponible en este entorno. Se implementa la interfaz completa con tests unitarios (construcción de queries/config), sin test de integración contra MySQL real — gap documentado explícitamente (mismo espíritu que BR-011: "mejor esfuerzo, sin garantía de cobertura total").
- **¿Qué pasa si NO se hace?** Fase 1 sigue siendo útil de forma aislada (ya cerrada y medida), pero el objetivo central del requisito (impacto cross-repo) queda sin resolver — ese conocimiento sigue viviendo "en la cabeza de la gente". Fase 3 (Terraform) tampoco tendría a quién publicar sus aristas de infra.

**Recomendación:** `proceder con cambios` — proceder con Fase 2 como UNA tarea SDD (002), pero: (1) resolver AHORA la elección de librería SQLite (bloqueante práctico por la versión de Node del entorno — pregunta P1 abajo); (2) secuenciar el plan SQLite-primero (validable end-to-end con sddkit + los 2 pilotos = 3 sistemas reales), MySQL/CI-snippet/integración con `sdd-analyze`+`sdd context` después; (3) agregar a `domain.md` la regla de indirección de secretos ANTES de implementar el driver MySQL; (4) si el plan resulta demasiado grande para una sesión, señalarlo en el gate de aprobación de `plan.md` para evaluar partirlo — no antes.

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] **P1 (bloqueante, requiere decisión del dev — sección 8 del requisito pide ADR propio):** ¿`node:sqlite` (built-in, requiere bump de `engines.node` de `>=18` a `>=22`) o `better-sqlite3` (dependencia OPCIONAL con `import()` perezoso, Node se mantiene en `>=18`)? El entorno actual corre Node v20.20.2 — con `node:sqlite` ni el agente ni el dev podrían correr/testear esta feature sin actualizar Node.
  - Respuesta: **`better-sqlite3` como dependencia OPCIONAL** (`optionalDependencies`, `import()` perezoso solo si `graph.driver=sqlite`). `engines.node` se mantiene en `>=18`. Si no está instalada, `sdd publish`/`sdd impact` con driver sqlite avisan con un mensaje claro de instalación (`npm i better-sqlite3`) y degradan sin romper el resto de los comandos. Registrado como ADR-0008.

- [ ] P2 — Ubicación del archivo SQLite del grafo (es cross-repo, no puede vivir en el `.sdd/` de un solo repo): propuesta default `~/.sddkit/graph.db` (home del dev), configurable por repo en `.sdd/config.json → graph.sqlite.path` (todos los repos del mismo dev deben apuntar al mismo archivo).
  - Respuesta: Resuelto por el agente (propuesta arriba) — a confirmar en el gate de aprobación de esta spec.

- [ ] P3 — Tabla `systems` (nombre canónico curado, ADR-0007): se modela como DATA dentro del storage (`{id, canonicalName, repoPath}`), una fila por sistema. `sdd publish` crea/actualiza la fila del sistema que publica (usando el nombre de `.sdd/c4/context.md` como nombre canónico inicial); el dev puede editar el nombre canónico a mano (vía SQL directo en v1 — sin comando `sdd graph systems` nuevo, sería sobre-ingeniería para 3 filas).
  - Respuesta: Resuelto por el agente (propuesta arriba) — a confirmar en el gate de aprobación de esta spec.

- [ ] P4 — Driver MySQL sin servidor real disponible en este entorno: se implementa la interfaz completa (mismo contrato que SQLite) con tests unitarios (construcción de SQL/config, sin mockear el contrato en sí), sin test de integración contra MySQL real — gap documentado explícitamente, mismo espíritu que BR-011.
  - Respuesta: Resuelto por el agente (propuesta arriba) — a confirmar en el gate de aprobación de esta spec.

- [ ] P5 — Normalización de rutas para matching endpoints↔consumos (`/plants/:id` vs `/plants/:param` vs `/plants/{id}`): nueva función `normalizeRoute(path)` (en `src/lib/patterns.js`, reusable) que reemplaza cualquier segmento `:xxx` o `{xxx}` por un placeholder común — aplicada a ambos lados antes de comparar en `queryImpact`/matching.
  - Respuesta: Resuelto por el agente (propuesta arriba) — a confirmar en el gate de aprobación de esta spec.

- [ ] P6 — **Hallazgo del análisis** (no es pregunta, es una limitación a documentar): probé `normalizeRoute` mentalmente contra los datos reales de Fase 1. `backend-service` expone `GET /api/v1/public/invitations/{token}`; `frontend-app` consume `GET env:VITE_API_URL/public/invitations/:param`. Con matching por **igualdad exacta de método+ruta normalizada completa**, esto NO matchea (`/api/v1/public/invitations/:param` ≠ `env:VITE_API_URL/public/invitations/:param`) porque el prefijo `env:VITE_API_URL` no se resuelve a `/api/v1` (eso es Fase 3, BR-009). Propuesta v1: `queryImpact` hace matching por **igualdad exacta de método + ruta normalizada** (simple, correcto para microservicios con el mismo prefijo de mount), Y ADEMÁS por **sufijo de ruta normalizada** (el consumo matchea si la ruta del endpoint TERMINA con la ruta normalizada del consumo, ambas con placeholders) — esto sí matchea el caso real de arriba (`/api/v1/public/invitations/:param` termina en `/public/invitations/:param`). El match por sufijo se etiqueta como `posible` (vs `exacto`) en la salida de `sdd impact`, mismo espíritu que `potencial` de ADR-0006. Para la métrica F2 se usa este ejemplo real (`backend-service` ↔ `frontend-app`, invitations) como caso de validación end-to-end.
  - Respuesta: Resuelto por el agente (propuesta arriba) — a confirmar en el gate de aprobación de esta spec.

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica (F2, sección 6 del requisito):** tiempo de respuesta a la pregunta "¿quién consume X?" (un endpoint/ruta dado).
- **Baseline actual:** no hay tooling previo — la pregunta se responde hoy con exploración manual cross-repo (grep/búsqueda en cada repo candidato). Es un baseline cualitativo ("minutos, variable según cuántos repos haya que mirar"); no se instrumenta un número exacto porque no existe un proceso repetible que medir — el PRIMER dato comparable es el que produce `sdd impact` una vez implementado.
- **Resultado esperado:** `sdd impact <método+ruta>` responde en **menos de 5 segundos** (sección 6), corriendo contra el grafo SQLite local.
- **Cómo se mide después:** con el grafo SQLite local configurado (`graph.sqlite.path` por defecto), correr `sdd publish` en los 3 sistemas reales (`sddkit`, `backend-service`, `frontend-app` — cada uno con su `.sdd/c4/*` sin placeholders pendientes). Desde `sddkit`, correr `sdd impact GET /api/v1/public/invitations/{token}` (el endpoint real publicado por `backend-service`) y verificar dos cosas: (1) tiempo de respuesta <5s (`time sdd impact ...`), y (2) el resultado incluye el consumo de `frontend-app` (`src/.../invitations.ts`, `GET env:VITE_API_URL/public/invitations/:param`) etiquetado como match `posible` (P6) — caso real validado durante el análisis crítico.

## Spec refinada

**Historia:** Como dev que mantiene varios repos relacionados (sddkit + `backend-service` + `frontend-app`), quiero publicar el snapshot de arquitectura de cada repo a un grafo central y consultar `sdd impact <ruta|sistema|recurso>` desde cualquiera de ellos, para responder "¿a quién impacto si toco esto?" en segundos, sin explorar los otros repos a mano.

**Criterios de aceptación (formato EARS):**

1. CUANDO se corre `sdd publish` en un repo con `.sdd/config.json → graph.driver` configurado y `.sdd/c4/{context,containers,components}.md` sin checkboxes `- [ ]` pendientes bajo `## ❓ VALIDAR`, EL SISTEMA DEBE publicar al storage configurado: nombre canónico (de `context.md → **Sistema:**`), C1 (containers + relaciones), `capabilities.endpoints`, `capabilities.consumptions`, hash de commit (`git rev-parse HEAD`) y timestamp (BR-013).
2. SI `sdd publish` se corre y alguno de esos docs tiene checkboxes `- [ ]` pendientes bajo `## ❓ VALIDAR`, EL SISTEMA DEBE rechazar la publicación e indicar archivo + checkbox(es) faltantes, sin escribir nada al storage (BR-013).
3. SI `sdd publish`/`sdd impact` se corren y `.sdd/config.json → graph.driver` no está configurado, EL SISTEMA DEBE informar "grafo no configurado" con instrucciones mínimas de configuración, sin afectar al resto de los comandos (BR-012).
4. SI el driver configurado es `sqlite` y `better-sqlite3` no está instalada (o es `mysql` y `mysql2` no está instalada), EL SISTEMA DEBE informar el comando de instalación correspondiente y terminar sin error fatal del resto del CLI (BR-012, ADR-0008).
5. CUANDO se corre `sdd impact <método> <ruta>` (p.ej. `sdd impact GET /api/v1/public/invitations/{token}`), EL SISTEMA DEBE normalizar la ruta con `normalizeRoute()` y listar, para cada sistema publicado cuyo `capabilities.consumptions` matchea (BR-014): nombre canónico, archivo, método/target original, fecha del snapshot y nivel de confianza (`exacto` | `posible`).
6. CUANDO se corre `sdd impact <ruta>` y NINGÚN sistema publicado tiene un consumo que matchee, EL SISTEMA DEBE informarlo explícitamente como "sin consumidores publicados hasta la fecha" (BR-014).
7. CUANDO se corre `sdd impact <nombre-de-sistema>`, EL SISTEMA DEBE reportar, para cada endpoint expuesto por ese sistema (`capabilities.endpoints` de su snapshot), los sistemas consumidores que matcheen (mismo formato que el criterio 5).
8. CUANDO se corre `sdd context` en un repo con snapshot publicado (`querySystem` por su `canonicalName`), EL SISTEMA DEBE mostrar fecha + hash corto del último `sdd publish`; SI nunca se publicó, EL SISTEMA DEBE mostrar "Sin publicar — correr `sdd publish`" (BR-016).
9. CUANDO la skill `sdd-analyze` corre con el grafo configurado y la tarea menciona una ruta/endpoint/recurso existente en `capabilities.*`, EL AGENTE DEBE correr `sdd impact` sobre esa ruta/recurso como parte del análisis crítico y citar el resultado (advertencia, no bloquea — BR-014/BR-016).
10. CUANDO se publica un sistema cuyo `canonicalName` no existe en la tabla `systems` del storage, EL SISTEMA DEBE crearlo (insert); CUANDO ya existe, EL SISTEMA DEBE actualizar su snapshot (update) — upsert por `canonicalName` (BR-013).
11. SI `graph.driver = "mysql"` y la env var indicada en `graph.mysql.urlEnv` no está seteada, EL SISTEMA DEBE informarlo claramente sin exponer ningún valor de configuración sensible (BR-015).

**Reglas de negocio afectadas:** BR-001 (preservar secciones manuales si `sdd context`/C4 cambian), BR-005 (orquestador/subagentes para la ejecución), BR-007 (que `sdd validate`/pre-commit no se rompan si `graph` no está configurado), BR-009 (destinos `env:*` sin resolver → límite del matching, criterio "posible"), BR-010/BR-011 (capacidades consumidas por `queryImpact`), BR-012 a BR-016 (nuevas, agregadas en este cambio — ver arriba), ADR-0001/0002/0003/0004/0006/0007/0008.

**Fuera de alcance:**

- UI/visualización del grafo (sección 4 del requisito) — todo vía CLI.
- Resolución de destinos `env:*` a recursos/hosts reales (Fase 3, BR-009) — por eso existe el nivel de match `posible` (BR-014).
- gRPC/GraphQL/websockets (sección 4, ya fuera de alcance desde Fase 1).
- `sdd impact` como gate de CI/commits (ADR-0004) — solo informativo en esta fase.
- Auth/multi-tenant del driver MySQL (sección 4, deuda anotada — red confiable del equipo en v1).
- Configurar/aplicar CI real (GitHub Actions) en sddkit ni en los repos piloto — se documenta el snippet (ADR-0003), no se despliega.
- Test de integración del driver MySQL contra un servidor real (P4) — interfaz + tests unitarios de construcción de SQL/config únicamente; gap documentado.
- Comando de gestión dedicado para la tabla `systems` (`sdd graph systems` o similar) — v1 es upsert automático en `publish` (P3); edición manual a futuro si la curación de >3 sistemas lo justifica.
- Mejoras de matching más allá de `exacto`/`posible` (p.ej. resolución de prefijos `env:*` vía heurística) — candidato a aprendizaje para Fase 3.

**Impacto en arquitectura/catálogo:**

- **Nuevo módulo `src/lib/graphstore/`**: `index.js` (factory según `graph.driver`, interfaz `{ publishSystem, querySystem, queryImpact, queryCapability }`), `sqlite.js` (driver `better-sqlite3`, `import()` perezoso, ADR-0008), `mysql.js` (driver `mysql2`, `import()` perezoso, BR-015 para credenciales).
- **`src/lib/patterns.js`**: nueva función exportada `normalizeRoute(path)` (mapea `:xxx`/`{xxx}` → placeholder común), reusable por el matching de `queryImpact`.
- **Nuevos comandos**: `src/commands/publish.js` (`sdd publish`, BR-013) y `src/commands/impact.js` (`sdd impact`, BR-014).
- **`src/commands/context.js`**: `context()` extendido para mostrar estado de publicación (BR-016, criterio 8); `find()` sin cambios.
- **`skills/sdd-analyze/SKILL.md`**: agrega el paso "¿a quién impacto?" → `sdd impact` cuando el grafo está configurado (criterio 9, BR-016).
- **`.sdd/config.json`**: nueva sección `graph` (`driver`, `sqlite.path` default `~/.sddkit/graph.db`, `mysql.urlEnv`) — BR-012/BR-015.
- **`package.json`**: `optionalDependencies: { "better-sqlite3": "...", "mysql2": "..." }`, `engines.node` sin cambios (`>=18`, ADR-0008).
- **`.sdd/domain.md`**: BR-012 a BR-016 + entradas de glosario (ya agregadas en este cambio).
- **`.sdd/c4/components.md`**: nuevo módulo `graphstore` + comandos `publish`/`impact` documentados.
- **Documentación**: snippet de GitHub Actions para `sdd publish` en CI sobre main (README o nota en `.sdd/c4/containers.md`, ADR-0003) — solo documentación, sin aplicar.
- **ADR-0008** ya registrado (driver SQLite, este cambio).

---
_Aprobación del dev: aprobada (2026-06-13)_
