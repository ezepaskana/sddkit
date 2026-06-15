# Spec — tarea 003: Fase 3: Scanner de Terraform (aristas de infraestructura)

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de planificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** Hoy el grafo (Fase 1+2) solo conoce dependencias HTTP explícitas (`capabilities.endpoints`/`capabilities.consumptions`, BR-010/BR-014). Las dependencias mediadas por infraestructura compartida — un bucket S3 que un sistema escribe y otro consume vía notificación, una cola SQS, una tabla RDS compartida, permisos IAM cross-sistema — son invisibles para `sdd impact`. Además, los targets simbólicos `env:NOMBRE_VAR` (BR-009, Fase 1) quedan sin resolver: hoy `sdd impact` solo puede inferir `posible` por sufijo de ruta normalizada (validado en tarea 002), nunca sabe a qué recurso real apunta esa env var en el deploy. Fase 3 cierra ambos huecos parseando `terraform show -json` de él/los repo(s) de infraestructura.
- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** `sdd find terraform` → sin coincidencias; no hay ningún detector de Terraform/HCL en `src/lib/patterns.js`. Pero el terreno ya está preparado: ADR-0005/0006/0007 (registrados en Fase 1, **se citan, no se re-discuten**) fijan parsear `terraform show -json` solo metadatos (nunca HCL crudo, nunca `values` sensibles), bindings IAM sin uso corroborado = arista `potencial`, y las tres join keys (ARN/nombre para infra, método+ruta normalizada para HTTP, nombre canónico para sistemas). BR-012 ya define una interfaz de graphstore pluggable (`publishSystem/querySystem/queryImpact/queryCapability`, 2 drivers) y `matching.js` (Fase 2) ya es un módulo puro de correlación sobre `listSystems()` — el mismo patrón sirve para correlacionar infra↔código.
- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Sí, en el modelo de datos: en vez de un subsistema "recursos/aristas" con tablas propias, extender la fila `systems` (ya existe por repo publicado, BR-012) con dos columnas JSON nuevas — `infraResources` e `infraEdges` — que publica un repo de INFRAESTRUCTURA corriendo el mismo `sdd publish` (con `c1`/`endpoints`/`consumptions` vacíos, `canonicalName` = nombre del repo de infra). `queryImpact`/`queryCapability` ganan un tercer modo: dado un ARN/nombre de recurso o un `canonicalName`, recorrer `infraEdges` de TODOS los sistemas publicados y correlacionar contra `consumptions`/`endpoints` de otros sistemas para decidir `confirmado` vs `potencial` (ADR-0006) — en tiempo de consulta, al estilo `matching.js`, no en publish. Esto reusa ~90% de la infraestructura de Fase 2 (BR-012, ambos drivers, `sdd publish`/`sdd impact`) en vez de construir un grafo paralelo.
- **Supuestos del dev que podrían no ser ciertos:**
  - **"El repo de infra existe y se puede escanear hoy"** — NO hay ningún repo Terraform en `/path/to/projects` (`find -iname "*.tf"` → vacío). Los 2 pilotos (`backend-service`, `frontend-app`) son código de aplicación, no infra. La métrica F3 ("aristas de infra no documentadas") no tiene con qué validarse contra datos reales EN ESTA TAREA.
  - **"env-var→recurso resuelve los `env:*` de Fase 1 a nivel de matching HTTP"** — parcialmente cierto. Saber que "la env var `VITE_API_URL`, en el ECS task de tal servicio, vale `https://api.solar.example.com`" es informativo, pero NO sube automáticamente un match `posible`→`exacto` en `matching.js`: eso requeriría que el repo de infra TAMBIÉN declare qué `canonicalName` corresponde a ese recurso desplegado, identidad que no está en la lista de extractores de la sección 3. El valor real de env-var→recurso en v1 es generar aristas NUEVAS infra↔infra e infra↔IAM (ej. "Lambda X tiene `BUCKET_NAME=uploads` + permiso IAM `s3:GetObject` sobre ese bucket → arista `Lambda X →(lee)→ bucket uploads`"), no mejorar el matching HTTP existente.
  - **"`terraform show -json` no tiene tensión con 'nunca extraer values' (ADR-0005)"** — sí la tiene: las env vars de ECS task definitions / Lambda viven en `values.environment` / `values.container_definitions[].environment` del state, que es exactamente el `values` que ADR-0005 dice nunca extraer. Hace falta una excepción acotada y explícita (ver pregunta de clarificación).
- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento):
  - **Seguridad**: la excepción de env-vars (punto anterior) es el ÚNICO lugar donde Fase 3 lee `values` de `terraform show -json` — si no se acota bien puede filtrar secretos (connection strings, API keys puestas como env var literal). Mitigación: restringir a 2 tipos de recurso (ECS task definition, Lambda) + lista de exclusión por nombre/patrón (`*_SECRET`, `*_PASSWORD`, `*_KEY`, `*_TOKEN`, cualquier `valueFrom`/`secretsmanager`/`ssm`).
  - **Arquitectura**: agregar 2 columnas JSON a la tabla `systems` ya existente (con filas reales publicadas en tarea 002, `~/.sddkit/graph.db`) es una migración de esquema sobre datos existentes — distinto de `CREATE TABLE IF NOT EXISTS` (que solo corre en DB nuevas). Ambos drivers (sqlite/mysql) necesitan `ALTER TABLE ... ADD COLUMN` idempotente. Punto a resolver en el plan, no bloqueante.
  - **Performance**: sin impacto esperado — el volumen de recursos/aristas de infra sigue siendo bajo (decenas, no miles) para SQLite/MySQL locales.
  - **Mantenimiento**: 6 tipos de recurso compartible (S3/SQS/SNS/DynamoDB/RDS/EventBridge) + bindings IAM + 3 tipos de cableado de eventos + 2 fuentes de env-var (ECS/Lambda) son ~11 detectores nuevos — superficie comparable o mayor a Fase 1 (HTTP). Candidato a partir el plan en sub-grupos si crece demasiado (mismo espíritu que el "señalar si resulta demasiado grande" de la tarea 002, que en los hechos no hizo falta).
- **¿Qué pasa si NO se hace?** BR-009 (targets `env:*`) y ADR-0005/0006/0007 (ya registrados) quedan sin un consumidor real — referencias "muertas" en domain.md/decisions. `sdd impact` sigue ciego a dependencias mediadas por infra (objetivo #3 de la sección 2 del requisito incumplido). El costo de NO hacerlo AHORA es bajo en el corto plazo (no hay repo de infra real que se beneficie hoy), pero los cimientos ya están puestos específicamente para esto.

**Recomendación:** `proceder con cambios` — proceder con Fase 3 como UNA tarea SDD (003), con estos 4 ajustes a confirmar con el dev antes de especificar (ver preguntas de clarificación P1-P4):
1. Modelo de datos: extender `systems` (no tablas nuevas) con `infraResources`/`infraEdges` — reusa BR-012 al 100%.
2. Validación: sin repo Terraform real disponible, construir y validar contra fixtures armadas a mano (`terraform show -json` sintético cubriendo los 6 tipos de recurso + IAM + 3 cableados + env-vars de ECS/Lambda). La métrica F3 se redefine como cualitativa (cobertura de tipos extraídos correctamente desde fixtures, revisada por el dev) — análogo al baseline=0 cualitativo de F1.
3. Alcance de env-var→recurso: genera aristas NUEVAS infra↔infra e infra↔IAM; NO sube `posible`→`exacto` en matching HTTP existente (documentado como límite conocido, mismo espíritu que BR-011).
4. Excepción acotada a ADR-0005 para `values.environment`/`container_definitions[].environment` de ECS/Lambda, con lista de exclusión de nombres tipo secreto.

`sdd impact <recurso>` para sddkit mismo: N/A — sddkit no publica `endpoints`/`consumptions` propios (es un CLI sin servidor HTTP), así que el paso "¿a quién impacto?" de `sdd-analyze` degrada en silencio para esta tarea (no hay endpoint/recurso propio que consultar).

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1 — **Modelo de datos**: extender la tabla `systems` existente con dos columnas JSON nuevas (`infraResources`, `infraEdges`) en vez de tablas nuevas, reusando `publishSystem`/`queryImpact`/`queryCapability` (BR-012). Requiere `ALTER TABLE` idempotente en ambos drivers sobre datos ya publicados (tarea 002).
  - Respuesta: **Confirmado** — extender `systems` (recomendado). 2 columnas JSON nuevas (`infraResources`, `infraEdges`, default `'[]'`), migración idempotente (`ALTER TABLE ... ADD COLUMN` con manejo de "columna ya existe") en `sqlite.js` y `mysql.js`.

- [x] P2 — **Validación sin repo Terraform real**: no existe ningún `.tf`/`terraform show -json` en `/path/to/projects`. Construir y validar contra fixtures sintéticas (`__fixtures__`, mismo patrón que Fase 1). La métrica F3 se redefine como cualitativa (cobertura de tipos extraídos desde fixtures, revisada por el dev) — la validación contra un repo de infra real queda para cuando exista uno.
  - Respuesta: **Confirmado** — fixtures sintéticas + métrica F3 cualitativa. Validación con infra real queda como aprendizaje/pendiente para cuando exista un repo Terraform.

- [x] P3 — **Alcance de env-var→recurso**: produce aristas NUEVAS infra↔infra e infra↔IAM (vía correlación env-var + permiso IAM en ECS/Lambda). NO intenta subir matches HTTP `posible`→`exacto` existentes (eso requeriría que el repo de infra declare la identidad "recurso desplegado ↔ canonicalName", fuera de los extractores listados en la sección 3). ¿Confirmás esta interpretación más acotada, o querés que `exacto`-vía-infra entre en el alcance de esta tarea (con el riesgo de tamaño/complejidad que implica)?
  - Respuesta: **Confirmado** — alcance acotado. El upgrade `posible`→`exacto` vía infra queda explícitamente fuera de alcance (documentado como límite conocido).

- [x] P4 — **Excepción acotada a ADR-0005 para env-vars de ECS/Lambda**: permitir leer `values.environment`/`values.container_definitions[].environment` SOLO para `aws_ecs_task_definition`/`aws_lambda_function`, excluyendo entradas cuyo nombre matchee `*_SECRET|*_PASSWORD|*_KEY|*_TOKEN|*_CREDENTIAL` (case-insensitive) o cuyo valor referencie `secretsmanager`/`ssm`/`valueFrom`. ¿Confirmás esta excepción + lista de exclusión, o preferís otro criterio?
  - Respuesta: **Confirmado** — excepción + lista de exclusión tal como propuestas.

## Métrica de impacto

> Lo que no se mide no se puede validar. Si el cambio admite una métrica, definila; el "después" se compara contra el baseline.

- **Métrica (F3, redefinida cualitativa — P2):** cobertura de extracción correcta sobre una fixture sintética de `terraform show -json` que cubre los 11 casos del alcance: 6 tipos de recurso compartible (S3, SQS, SNS, DynamoDB, RDS, EventBridge), bindings IAM, 3 tipos de cableado de eventos (notificación S3→Lambda, event source mapping SQS→Lambda, regla EventBridge→target), y env-var→recurso para ECS task definition + Lambda (incluyendo al menos 1 caso de exclusión por secreto, BR-018).
- **Baseline actual:** 0 — `sdd find terraform` no encuentra nada hoy; no existe ningún extractor de Terraform/HCL en el repo (verificado en el análisis crítico).
- **Resultado esperado:** los 11 casos de la fixture aparecen correctamente en `.sdd/patterns.json → infra` (`resources`/`edges`) tras `sdd scan --terraform=<fixture>`, con el `type`/`confidence` esperado por caso (en particular: el caso IAM-sin-corroboración → `potencial`, BR-019; el/los casos de secreto → AUSENTES de `infra.json`, BR-018); el snapshot se publica con `infraResources`/`infraEdges` (BR-020) y es consultable end-to-end con `sdd impact <ARN-o-nombre-del-recurso-de-la-fixture>` (BR-021).
- **Cómo se mide después:** `node --test` sobre los nuevos módulos (cobertura de los 11 casos) + un recorrido manual `scan --terraform=fixture.json` → `publish` → `impact <recurso>` documentado en `retro.md`, igual en espíritu al "Resultado de la métrica" de la tarea 002 pero con datos sintéticos (no hay repo de infra real, P2).
- **Pendiente explícito (no es parte del "hecho" de esta tarea):** validación contra un repo Terraform real — no existe ninguno en `/path/to/projects` hoy. Se registra como aprendizaje para cuando exista uno (mismo patrón que F1, que también arrancó con fixtures antes de validar contra `backend-service`/`frontend-app`).

## Spec refinada

**Historia:** Como agente SDD que analiza el impacto de un cambio (o como dev consultando `sdd impact`), quiero que el grafo también conozca las dependencias mediadas por infraestructura compartida (buckets, colas, topics, tablas, permisos IAM, cableados de eventos) y sepa a qué recurso real apunta cada target simbólico `env:NOMBRE_VAR` registrado en Fase 1, para responder "¿qué interacciones de infraestructura existen entre mis sistemas?" (objetivo #3, sección 2 del requisito) con la misma rapidez que `sdd impact` ya logra para HTTP (Fase 2, tarea 002).

**Criterios de aceptación (formato EARS):**

- CUANDO se corre `sdd scan --terraform=<path-a-show.json>` sobre un archivo `terraform show -json` válido, EL SISTEMA DEBE escribir `.sdd/patterns.json → infra: {resources, edges}` con los recursos compartibles (S3/SQS/SNS/DynamoDB/RDS/EventBridge) y las aristas (IAM/eventos/env-var) detectadas, recorriendo `values.root_module` y `child_modules` recursivamente (BR-017).
- SI el archivo indicado por `--terraform` no existe o no es JSON válido, EL SISTEMA DEBE informar un error claro (sin tirar un stack trace crudo) y no modificar `.sdd/patterns.json`.
- CUANDO el scanner procesa `aws_ecs_task_definition`/`aws_lambda_function`, EL SISTEMA DEBE extraer sus pares env-var→recurso desde `values.environment`/`values.container_definitions[].environment`, EXCLUYENDO las entradas cuyo nombre matchee `/SECRET|PASSWORD|KEY|TOKEN|CREDENTIAL/i` o cuyo valor referencie `secretsmanager`/`ssm`/`valueFrom` — esas entradas NUNCA aparecen en `infra.json` ni se publican (BR-018, única excepción a ADR-0005).
- CUANDO el scanner encuentra un cableado de eventos (`aws_s3_bucket_notification`, `aws_lambda_event_source_mapping`, `aws_cloudwatch_event_rule`+`aws_cloudwatch_event_target`) o un binding IAM corroborado por un env-var coincidente (mismo recurso referenciado por env-var Y por la policy IAM del mismo compute), EL SISTEMA DEBE marcar esa arista como `confirmado` (BR-019).
- CUANDO el scanner encuentra un binding IAM SIN cableado de eventos ni env-var coincidente que lo corrobore, EL SISTEMA DEBE marcar esa arista como `potencial` (ADR-0006, BR-019).
- CUANDO se corre `sdd publish` en un repo con `.sdd/patterns.json → infra` poblado, EL SISTEMA DEBE incluir `infraResources`/`infraEdges` en el snapshot publicado (BR-020).
- CUANDO se corre `sdd publish` en un repo SIN `.sdd/patterns.json → infra` (caso normal de un repo de aplicación), EL SISTEMA DEBE publicar `infraResources: []`/`infraEdges: []` sin error, preservando compatibilidad con snapshots existentes (tarea 002).
- CUANDO se corre `sdd impact <ARN-o-nombre-de-recurso>` y existe al menos una arista publicada (de cualquier sistema) que lo menciona, EL SISTEMA DEBE reportar cada arista con su `type` (`storage`/`queue`/`topic`/`db-compartida`/`event`), `confidence` (`confirmado`/`potencial`) y, cuando el `from`/`to` de la arista coincide con el nombre de un sistema publicado, su `canonicalName` (BR-021).
- SI `sdd impact <algo>` no matchea ni `<MÉTODO> <ruta>`, ni un `canonicalName` publicado, ni un recurso de infra publicado, EL SISTEMA DEBE informarlo explícitamente (sin lanzar excepción), cubriendo las 3 interpretaciones intentadas.
- SI el grafo no está configurado o falta una dependencia opcional del driver, EL SISTEMA DEBE degradar igual que BR-012 para `publish`/`impact` — `sdd scan --terraform` NO depende del grafo y sigue funcionando local (solo escribe `.sdd/patterns.json`).

**Reglas de negocio afectadas / nuevas** (se agregan a `.sdd/domain.md` en el primer paso del plan; citan ADR-0005/0006/0007 ya registrados):

- **BR-017 (nueva)** — Scanner de Terraform (`sdd scan --terraform=<path>`): parsea `terraform show -json` (ADR-0005, solo metadatos — tipos, nombres, ARNs, policies) recorriendo `values.root_module` + `child_modules` recursivamente, y escribe `.sdd/patterns.json → infra: {resources, edges}`.
- **BR-018 (nueva)** — Única excepción a ADR-0005 ("nunca extraer `values`"): env-vars de `aws_ecs_task_definition` (`values.container_definitions[].environment`, JSON embebido) y `aws_lambda_function` (`values.environment.variables`), excluyendo por patrón de nombre (`/SECRET|PASSWORD|KEY|TOKEN|CREDENTIAL/i`) o de valor (`secretsmanager`/`ssm`/`valueFrom`).
- **BR-019 (nueva)** — Forma de las aristas de infra: `{from, to, type, action?, confidence}`, `type` ∈ `storage|queue|topic|db-compartida|event`, `confidence` ∈ `confirmado|potencial` (ADR-0006). Cableados de eventos y bindings IAM corroborados por env-var → `confirmado`; bindings IAM sin corroboración → `potencial`.
- **BR-020 (nueva)** — `infraResources`/`infraEdges` extienden el snapshot publicado (BR-013/BR-012): 2 columnas JSON nuevas en `systems` (`infra_resources`, `infra_edges`, default `'[]'`), con migración idempotente (`ALTER TABLE ... ADD COLUMN`) en ambos drivers sobre datos ya publicados (tarea 002). Decisión registrada en ADR-0009 (extender `systems` en vez de tablas nuevas, P1).
- **BR-021 (nueva)** — `sdd impact <recurso>` extiende BR-014: si el argumento no matchea `<MÉTODO> <ruta>` ni un `canonicalName` publicado, se intenta como ARN/nombre de recurso de infra (ADR-0007) contra `infraResources`/`infraEdges` de todos los sistemas publicados (`queryInfraImpact`), reportando `type`/`confidence` y el `canonicalName` correspondiente cuando el join por nombre lo permite.
- **BR-022 (nueva)** — Límite conocido: la resolución `env:*`→recurso de Fase 3 produce únicamente aristas NUEVAS infra↔infra/IAM; NO mejora la confianza de los matches HTTP `posible` de BR-014 (requeriría que el repo de infra declare "recurso desplegado ↔ canonicalName", fuera de alcance — mismo espíritu que BR-011).

**Fuera de alcance:**

- Correr `terraform`/`terraform show` desde sddkit (requiere el binario + plan/state inicializado) — el dev/CI provee el archivo `-json` como input vía `--terraform=<path>`.
- Subir matches HTTP `posible`→`exacto` vía infra (BR-022) — límite conocido documentado, no se implementa en esta tarea.
- UI/visualización del grafo (sección 4 del requisito, ya fuera de alcance general).
- Integraciones gRPC/GraphQL/websockets (sección 4 del requisito).
- Recursos/providers más allá de los listados en la sección 3 (S3/SQS/SNS/DynamoDB/RDS/EventBridge + IAM + ECS/Lambda, todo AWS) — otros providers (GCP/Azure) o tipos de recurso quedan para una iteración futura.
- Validación contra un repo Terraform real (no existe ninguno en este entorno, P2) — pendiente explícito, ver "Métrica de impacto".
- Comando/UI de curación de recursos (`sdd graph ...`): el join recurso↔sistema es por coincidencia de ARN/nombre (ADR-0007), sin paso de curación manual nuevo.

**Impacto en arquitectura/catálogo:**

- **Nuevo módulo `src/lib/terraform.js`** (extractor puro, sin DB — análogo a `src/lib/patterns.js` para Terraform): `extractResources`, `extractEnvVarResources`, `extractIamBindings`, `extractEventWiring`, `buildInfraEdges`, `extractInfra`. Afecta la fila `src/lib` de `.sdd/c4/components.md` (sumar el archivo nuevo al conteo + descripción).
- **`src/lib/graphstore/{sqlite,mysql}.js`**: 2 columnas nuevas (`infra_resources`/`infra_edges`) + migración idempotente; `publishSystem`/`rowToSystem` las incluyen.
- **`src/lib/graphstore/matching.js`**: nueva función `queryInfraImpact` (o extensión de `queryImpact`) — sigue siendo afectada por la fila `src/lib` de `components.md` (ya incluye `graphstore/` desde tarea 002, solo cambia el conteo de archivos si se agregan nuevos).
- **`src/commands/scan.js`**: nuevo flag `--terraform=<path>`. **`src/commands/publish.js`**/**`impact.js`**: incluyen/consultan `infraResources`/`infraEdges`. **`bin/sdd.js`**: actualizar `HELP` (`scan --terraform=`, `impact <recurso>`).
- **Nueva fixture** `src/commands/__fixtures__/terraform-show.json` (sintética, AWS) cubriendo los 11 casos de la métrica.
- **`.sdd/domain.md`**: agregar BR-017 a BR-022; ampliar el glosario con "Recurso de infra", "Arista de infra" (`type`/`confidence`).
- **ADR nuevo**: ADR-0009 — `infraResources`/`infraEdges` extienden `systems` (no tablas nuevas), registrando la decisión P1 confirmada. ADR-0005/0006/0007 se citan tal cual, sin cambios.
- **`skills/sdd-analyze/SKILL.md`** / **`README.md`**: mencionar `sdd scan --terraform=` y `sdd impact <recurso>` en la sección "Grafo de impacto" (paralelo a lo hecho en tarea 002 para `publish`/`impact` HTTP).

---
_Aprobación del dev: aprobado (2026-06-13)_
