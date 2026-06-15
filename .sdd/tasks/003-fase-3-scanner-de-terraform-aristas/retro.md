# Retro — tarea 003: Fase 3 — Scanner de Terraform (aristas de infraestructura) (ver REQUISITO-grafo-impacto.md)

> La completa el agente al cerrar la tarea, con input del dev. Es la fuente del aprendizaje del framework: alimenta `.sdd/LEARNINGS.md`, el catálogo y los docs. Creada el 2026-06-13.

## Resultado de la métrica F3

- **Baseline (de spec.md):** 0 — `sdd find terraform` no encontraba nada; no existía ningún extractor de Terraform/HCL en el repo (P2: sin repo Terraform real en `/path/to/projects`, métrica redefinida como cualitativa contra fixture sintética).
- **Resultado medido después:**
  - `node --test src/lib/terraform.test.js` → **12/12** (cobertura de los 11 casos + degradación sin `root_module`). Suite completa: **99/99**.
  - Recorrido manual end-to-end en un directorio temporal con `.sdd/config.json → graph.sqlite.path` apuntando a un `graph.db` temporal (NO se tocó `~/.sddkit/graph.db`, verificado por timestamp antes/después):
    - `sdd scan --terraform=src/commands/__fixtures__/terraform-show.json` → `.sdd/patterns.json → infra.resources.length === 6`, `infra.edges.length === 7` ✓
    - `sdd publish` → `✓ Publicado "..." → commit (sin git) @ ...` (gate de calidad sin pendientes, tras resolver 6 checkboxes — ver "Desvíos") ✓
    - `sdd impact arn:aws:s3:::uploads-bucket` → 2 resultados: `[confirmado] storage: arn:aws:s3:::uploads-bucket → ...function:process-upload (s3-notification)` y `[confirmado] storage: ...function:process-upload → arn:aws:s3:::uploads-bucket (env:BUCKET_NAME)` — el mismo recurso aparece como `from` en una arista y `to` en otra (ver "Aprendizajes accionables") ✓
    - `sdd impact arn:aws:rds:us-east-1:123456789012:db:shared-db` → `[potencial] db-compartida: api-task-role → ...db:shared-db (rds-db:connect)` ✓
    - `sdd impact GET /no/existe` → `Sin consumidores publicados hasta la fecha para GET /no/existe.` (sin regresión BR-014) ✓
    - `sdd impact sistema-inexistente` → mensaje unificado `✖ "sistema-inexistente" no encontrado: no matchea ningún sistema publicado ni recurso de infra publicado, ni se interpreta como "<MÉTODO> <ruta>". Probá: sdd impact <MÉTODO> <ruta> | sdd impact <sistema> | sdd impact <ARN-o-nombre-de-recurso>` ✓
    - `DB_PASSWORD`/`API_TOKEN` y sus valores (`p4ssw0rd-do-not-extract`, `shh-do-not-extract`) — 0 ocurrencias en `.sdd/patterns.json`, en el `graph.db` (verificado con `strings`) y en los outputs de `sdd impact` (BR-018) ✓

- **Los 11 casos de la fixture, uno por uno:**

  | # | Caso | Esperado | Obtenido |
  |---|---|---|---|
  | 1 | `aws_s3_bucket.uploads` | recurso `storage` `uploads-bucket` | ✓ |
  | 2 | `aws_sqs_queue.jobs` | recurso `queue` `jobs-queue` | ✓ |
  | 3 | `aws_sns_topic.notifications` | recurso `topic` `notifications-topic` | ✓ |
  | 4 | `aws_cloudwatch_event_rule.nightly` | recurso `event` `nightly-rule` | ✓ |
  | 5 | `module.database.aws_dynamodb_table.sessions` | recurso `db-compartida` `sessions-table` | ✓ |
  | 6 | `module.database.aws_db_instance.shared` | recurso `db-compartida` `shared-db` | ✓ |
  | 7 | `aws_iam_role_policy.api_task_role_policy` (2 statements) | `api-task-role→sessions-table` `confirmado` (corroborado por env `SESSIONS_TABLE`); `api-task-role→shared-db` `potencial` (sin corroboración) | ✓ ambos, con la confianza esperada (ADR-0006) |
  | 8 | `aws_s3_bucket_notification.uploads_notify` | arista `uploads-bucket → process-upload`, `storage`, `s3-notification`, `confirmado` | ✓ |
  | 9 | `aws_lambda_event_source_mapping.jobs_to_consumer` | arista `jobs-queue → consume-jobs`, `queue`, `event-source-mapping`, `confirmado` | ✓ |
  | 10 | `aws_cloudwatch_event_target.nightly_to_lambda` | arista `nightly-rule → nightly-job`, `event`, `eventbridge-target`, `confirmado` | ✓ |
  | 11 | env-var→recurso (`aws_lambda_function.process_upload`, `module.api.aws_ecs_task_definition.api`) | `process-upload → uploads-bucket` vía `env:BUCKET_NAME` (`storage`, `confirmado`); `api-task → sessions-table` vía `env:SESSIONS_TABLE` (`db-compartida`, `confirmado`); `DB_PASSWORD`/`API_TOKEN` excluidos (BR-018) | ✓ los 2 edges + 2/2 exclusiones |

- **¿Se cumplió lo esperado?:** Sí, 100%. Los 11 casos + las 2 exclusiones de secretos coinciden exactamente con lo definido en la spec (baseline=0 → cobertura completa de los 11 casos). El recorrido end-to-end (`scan --terraform=` → `publish` → `impact <recurso>` ×2 → degradación ×2) corrió en <1s contra SQLite temporal de 1 fila, sin tocar `~/.sddkit/graph.db`.

## Qué anticipó bien la spec y qué no

**Bien:**
- El plan de 14 pasos (más grande que los 10 de la tarea 002, anticipado en la spec por la mayor cantidad de detectores independientes) se ejecutó completo en orden, sin replanificación ni pasos agregados/removidos.
- La correlación `confirmado`/`potencial` (ADR-0006) funcionó exactamente como se diseñó con datos de la fixture: el binding IAM `api-task-role→sessions-table` quedó `confirmado` porque hay un env-var (`SESSIONS_TABLE`) que corrobora el mismo `roleRef`+`resourceArn`, mientras que `api-task-role→shared-db` (sin env-var que lo corrobore) quedó `potencial`.
- El filtro de exclusión de secretos (BR-018) funcionó de punta a punta sobre los 2 formatos distintos de la fixture: env-vars directas de `aws_lambda_function` (`DB_PASSWORD`, excluido por nombre) y el JSON embebido de `container_definitions` de `aws_ecs_task_definition` (`API_TOKEN`, excluido por nombre) — más el caso adicional de exclusión por patrón de VALOR (`secretsmanager`) cubierto en el paso 4.
- La migración idempotente de `sqlite.js` (`ALTER TABLE ... ADD COLUMN ... DEFAULT '[]'`) funcionó limpio tanto sobre DBs nuevas como sobre el esquema de la tarea 002 (sin las columnas `infra_*`), sin romper filas existentes ni fallar en una segunda corrida.

**No anticipado:**
- Error aritmético en el paso 3 del plan (12 vs. 14 entradas de `walkResources`) — ver "Desvíos del plan".
- `queryInfraImpact` matchea tanto por `from` como por `to` (tal como especifica BR-021), lo cual es correcto, pero implica que un mismo recurso (p.ej. `uploads-bucket`) puede aparecer en MÚLTIPLES aristas con direcciones/acciones distintas (`s3-notification` saliente y `env:BUCKET_NAME` entrante). La spec no anticipaba este caso de "doble aparición" en la salida de `sdd impact <recurso>` — el resultado es correcto y legible, pero es un punto a tener en cuenta si una fase futura agrega filtros (`--from`/`--to`).
- Drift no detectado entre tareas: la sección "¿A quién impacto?" agregada en la tarea 002 a `skills/sdd-analyze/SKILL.md` solo había llegado a la copia desplegada globalmente (`~/.claude/skills/sdd-analyze/SKILL.md`), NO a la copia versionada del repo. El paso 13 de esta tarea lo detectó y lo corrigió de paso.

## Desvíos del plan

Los 14 pasos se completaron en el orden planeado, sin replanificación ni pasos agregados/removidos. Ajustes hechos por el orquestador, dentro del alcance de los pasos correspondientes:

- **Paso 3**: el plan especificaba que `walkResources(rootModule)` debía devolver "12 entradas (10 en `resources` + 2 en `module.database`)", pero la fixture del paso 2 tiene 14 entradas reales: 10 en `resources` + 2 en `module.database` + 2 en `module.api` (`module.api.aws_ecs_task_definition.api` y `module.api.aws_iam_role_policy.api_task_role_policy`), ambos `child_modules` al mismo nivel. El subagente del paso 3 detectó la discrepancia aritmética; el orquestador instruyó corregir el test a `assert.equal(all.length, 14)` e incluir explícitamente `module.api.aws_ecs_task_definition.api` en las aserciones de `addresses`, sin tocar la fixture (que estaba correcta).
- **Paso 9**: el test preexistente de `mysql.test.js` ("`querySystem`: sin filas → `null`") verificaba que el SQL ejecutado incluyera el substring `'SELECT'`. La nueva query de migración (`information_schema.columns`) también contiene `'SELECT'`, lo que hacía pasar el assert por la razón equivocada (o potencialmente romperlo según el orden de llamadas al stub). Se ajustó el assert a `.includes('SELECT * FROM systems')` para que siga verificando específicamente la query de `querySystem`.
- **Paso 13**: el subagente (rapido) removió innecesariamente los backticks escapados de la línea 57 del `HELP` de `bin/sdd.js` (`desde \`terraform show -json\`.` → `desde terraform show -json.`), alegando un conflicto de sintaxis con el template literal — pero la línea 73 del mismo archivo ya tenía `\`terraform show -json\`` funcionando sin problema. El orquestador restauró los backticks escapados vía `Edit` directo, verificó `node --check bin/sdd.js` y la suite completa (99/99).
- **Paso 13**: además de la extensión planeada de `skills/sdd-analyze/SKILL.md` con la mención a `sdd impact <ARN-o-nombre>` (BR-021), se detectó que la sección completa "¿A quién impacto?" (agregada en la tarea 002) estaba AUSENTE de la copia del repo — solo existía en la copia desplegada globalmente (`~/.claude/skills/sdd-analyze/SKILL.md`). Se hizo el backfill de esa sección completa Y se la extendió con el párrafo de BR-021 en una sola edición.
- **Paso 14 (+ Cierre)**: tanto la validación original del paso 14 como la re-verificación de esta sección de cierre necesitaron resolver los 6 checkboxes `- [ ] ` que `sdd scan` deja pendientes en `context.md`/`containers.md`/`components.md` de un repo nuevo (gate de `sdd publish`, mismo patrón que el paso 10 de la tarea 002). Se resolvieron con respuestas `N/A` genéricas, apropiadas porque es un repo temporal descartable creado solo para la validación.

## Aprendizajes accionables

- **`queryInfraImpact` matchea por `from` Y por `to` (BR-021) — un recurso puede aparecer en múltiples aristas con sentido opuesto**: `sdd impact arn:aws:s3:::uploads-bucket` devuelve 2 líneas: la arista `s3-notification` (bucket → lambda, `confirmado`) y la arista `env:BUCKET_NAME` (lambda → bucket, `confirmado`). Es el comportamiento correcto y especificado, pero si el catálogo de `infraEdges` de un repo de infra real crece, la salida puede volverse ruidosa para un solo recurso muy conectado — análogo al aprendizaje de `sdd impact <sistema>` de la tarea 002. Candidato a flag `--from`/`--to`/`--dir` si Fase 4+ retoma UX de `sdd impact`. _(tarea 003)_
- **`infraResources`/`infraEdges` son columnas JSON dentro de `systems` (ADR-0009), NO tablas nuevas**: `queryInfraImpact` opera en memoria sobre `listSystems()`, igual límite de escalabilidad que `queryCapability`/`queryImpact` (ADR-0002). Quien escriba una query nueva sobre el graphstore debe seguir este mismo patrón (`matching.js` puro + `wrap()` en `index.js`), no agregar JOINs. _(tarea 003)_
- **Las skills pueden divergir entre la copia del repo (versionada) y la copia desplegada globalmente** (`~/.claude/skills/`): un cambio aplicado solo a una de las dos queda invisible para quien lea la otra. Al cerrar una tarea que toca `skills/*/SKILL.md`, vale la pena un diff rápido contra la copia global (o viceversa) para detectar drift de tareas anteriores, como pasó con la sección "¿A quién impacto?" de la tarea 002. _(tarea 003)_
- **BR-018 (exclusión de secretos por env-var→recurso) validado de punta a punta, no solo en unit tests**: además de `terraform.test.js` (12/12), se confirmó con `grep`/`strings` que `DB_PASSWORD`/`API_TOKEN` y sus valores literales no aparecen en `.sdd/patterns.json`, en los bytes crudos del `graph.db` ni en ningún output de `sdd impact`. Útil como checklist repetible si Fase 4+ agrega más tipos de recurso/secreto al scanner. _(tarea 003)_
- **Al construir fixtures con `child_modules` anidados o múltiples módulos al mismo nivel, recalcular los totales explícitamente**: el error del paso 3 (12 vs. 14) fue un simple error de suma al escribir el plan, no un bug de código — pero al ser un número citado en un test (`assert.equal(all.length, N)`), un conteo incorrecto en el plan se propaga directo a una aserción incorrecta si nadie lo recalcula contra la fixture real. _(tarea 003)_

## ¿Algo para el catálogo, el dominio o la arquitectura?

- BR-017 a BR-022 y el glosario ("Recurso de infra" / "Arista de infra") ya estaban en `.sdd/domain.md` desde el paso 1 — sin cambios adicionales.
- ADR-0009 (`infra_resources`/`infra_edges` extienden `systems`) ya registrado desde el paso 1; ADR-0005 a 0008 (citadas, no re-discutidas) se confirman consistentes con la implementación final — no requirieron ajustes.
- `.sdd/c4/components.md` actualizado: fila `src/lib` (14→15 archivos) extendida para mencionar `terraform.js`/`terraform.test.js` (Fase 3, BR-017 a BR-022) y la nueva clave `queryInfraImpact` de `graphstore/index.js`/`matching.js` — ver edición de cierre.
- No surgió ninguna convención nueva con `multipleStyles: true` que requiera `sdd decide`.
- BR-022 (límite conocido: las aristas nuevas de infra no mejoran `posible`→`exacto` de los matches HTTP existentes) queda documentado en `domain.md`/README — candidato a revisarse si una Fase 4 prioriza esa mejora; no amerita ADR todavía.
- Validación contra un repo Terraform real (P2 de la spec) sigue pendiente — no existe ninguno en este entorno. Queda como aprendizaje/pendiente para cuando exista uno, igual que se documentó en la spec.
