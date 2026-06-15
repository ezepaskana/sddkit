# Plan — tarea 003: Fase 3: Scanner de Terraform (aristas de infraestructura)

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. El dev debe APROBAR este plan antes de ejecutar.

Estructura de cada paso — el checkbox de la **primera línea** es lo que `sdd task` trackea; el detalle va en sub-ítems indentados:

```markdown
- [ ] **N. Título corto del paso** `[P]` _(rapido)_
  - **Hace:** qué se construye o cambia en este paso
  - **Archivos:** `ruta/uno`, `ruta/dos`
  - **Depende de:** paso M (o —)
  - **Verificación:** cómo se comprueba que quedó bien
```

`[P]` = paralelizable · Nivel de modelo por paso: _(rapido)_ mecánico/boilerplate · _(medio)_ implementación estándar · _(fuerte)_ diseño, lógica compleja, edge cases. Los modelos concretos de cada nivel están en `.sdd/config.json → models`.

**Secuenciación:** 14 pasos — más que los 10 de la Fase 2, porque la spec identifica ~11 detectores independientes (vs. el matching único de Fase 2). Para evitar conflictos de edición concurrente, los pasos 3-7 (todos sobre `src/lib/terraform.js`) son SECUENCIALES, no `[P]`, aunque cada uno es chico. El paso 9 (migración de esquema del graphstore) es independiente de esa cadena y corre en paralelo (`[P]`). Los pasos 1 y 2 (domain/ADR y fixture) son la base de todo lo demás y van primero.

## Pasos

- [x] **1. BR-017 a BR-022 en `.sdd/domain.md` + ADR-0009** `[P]` _(fuerte)_
  - **Hace:**
    - Agrega al final de la sección "Reglas de negocio" de `.sdd/domain.md` (después de BR-016) seis reglas nuevas, BR-017 a BR-022, con el texto de la spec refinada de la tarea 003 (sección "Reglas de negocio afectadas / nuevas"), adaptado al estilo de las reglas existentes (una línea por regla, termina en "Fuente: ..."). Citar ADR-0005/0006/0007 donde corresponda (no se re-discuten, solo se citan) y ADR-0009 (nuevo, este paso) para BR-020.
    - Agrega dos filas nuevas a la tabla del Glosario (después de "Match `exacto`/`posible`"): **"Recurso de infra"** (`infraResources`: `{name, arn, type, address}`, `type` ∈ `storage|queue|topic|db-compartida|event`, ADR-0007) y **"Arista de infra"** (`infraEdges`: `{from, to, type, action?, confidence}`, `confidence` ∈ `confirmado|potencial`, ADR-0006).
    - Crea `.sdd/decisions/0009-infra-resources-edges-extienden-systems.md` siguiendo el formato de `0000-plantilla.md` (mismo header que ADR-0008: fecha 2026-06-13, estado aceptada, tarea relacionada `.sdd/tasks/003`):
      - **Contexto:** Fase 3 necesita persistir, junto al snapshot de cada sistema (BR-013), los recursos/aristas de infra detectados por el scanner de Terraform (BR-017-019). Decidir entre tablas nuevas con FK a `systems` vs. extender `systems`.
      - **Decisión:** extender `systems` (BR-012) con dos columnas JSON, `infra_resources`/`infra_edges` (default `'[]'`), publicadas vía el mismo `publishSystem`. La correlación `confirmado`/`potencial` (ADR-0006) se calcula en tiempo de consulta (`queryInfraImpact`, estilo `matching.js`), no en publish. Migración idempotente (`ALTER TABLE ... ADD COLUMN` con detección de columna existente) en `sqlite.js`/`mysql.js` sobre las filas ya publicadas en tarea 002.
      - **Alternativas consideradas:** tablas nuevas con FK (descartado — JOINs y migraciones más invasivas en 2 drivers sin necesidad real, volumen bajo); grafo/storage separado (descartado — duplicaría BR-012).
      - **Consecuencias:** `ALTER TABLE ... ADD COLUMN` debe ser idempotente y no romper filas ya publicadas (quedan `'[]'`/`'[]'` hasta su próximo `sdd publish`); `queryInfraImpact` opera en memoria sobre `listSystems()`, mismo límite de escalabilidad que ADR-0002.
  - **Archivos:** `.sdd/domain.md`, `.sdd/decisions/0009-infra-resources-edges-extienden-systems.md`
  - **Depende de:** —
  - **Verificación:** manual — el orquestador revisa que BR-017 a BR-022 citen ADR-0005/0006/0007/0009 correctamente y que el glosario tenga las 2 entradas nuevas; no requiere `node --test`.

- [x] **2. Fixture sintética `terraform-show.json` (los 11 casos de la métrica F3)** `[P]` _(rapido)_
  - **Hace:** crea `src/commands/__fixtures__/terraform-show.json` con EXACTAMENTE este contenido (output sintético de `terraform show -json`, AWS) — es el dato de entrada de los pasos 3-8, así que debe copiarse tal cual, sin modificar nombres/ARNs/valores (los pasos siguientes verifican contra estos valores exactos):
    ```json
    {
      "format_version": "1.2",
      "terraform_version": "1.7.5",
      "values": {
        "root_module": {
          "resources": [
            {
              "address": "aws_s3_bucket.uploads",
              "mode": "managed",
              "type": "aws_s3_bucket",
              "name": "uploads",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": { "bucket": "uploads-bucket", "arn": "arn:aws:s3:::uploads-bucket" }
            },
            {
              "address": "aws_sqs_queue.jobs",
              "mode": "managed",
              "type": "aws_sqs_queue",
              "name": "jobs",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": { "name": "jobs-queue", "arn": "arn:aws:sqs:us-east-1:123456789012:jobs-queue" }
            },
            {
              "address": "aws_sns_topic.notifications",
              "mode": "managed",
              "type": "aws_sns_topic",
              "name": "notifications",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": { "name": "notifications-topic", "arn": "arn:aws:sns:us-east-1:123456789012:notifications-topic" }
            },
            {
              "address": "aws_cloudwatch_event_rule.nightly",
              "mode": "managed",
              "type": "aws_cloudwatch_event_rule",
              "name": "nightly",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": { "name": "nightly-rule", "arn": "arn:aws:events:us-east-1:123456789012:rule/nightly-rule" }
            },
            {
              "address": "aws_lambda_function.process_upload",
              "mode": "managed",
              "type": "aws_lambda_function",
              "name": "process_upload",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": {
                "function_name": "process-upload",
                "arn": "arn:aws:lambda:us-east-1:123456789012:function:process-upload",
                "role": "arn:aws:iam::123456789012:role/process-upload-role",
                "environment": {
                  "variables": {
                    "BUCKET_NAME": "uploads-bucket",
                    "DB_PASSWORD": "p4ssw0rd-do-not-extract"
                  }
                }
              }
            },
            {
              "address": "aws_lambda_function.consume_jobs",
              "mode": "managed",
              "type": "aws_lambda_function",
              "name": "consume_jobs",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": {
                "function_name": "consume-jobs",
                "arn": "arn:aws:lambda:us-east-1:123456789012:function:consume-jobs",
                "role": "arn:aws:iam::123456789012:role/consume-jobs-role"
              }
            },
            {
              "address": "aws_lambda_function.nightly_job",
              "mode": "managed",
              "type": "aws_lambda_function",
              "name": "nightly_job",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": {
                "function_name": "nightly-job",
                "arn": "arn:aws:lambda:us-east-1:123456789012:function:nightly-job",
                "role": "arn:aws:iam::123456789012:role/nightly-job-role"
              }
            },
            {
              "address": "aws_s3_bucket_notification.uploads_notify",
              "mode": "managed",
              "type": "aws_s3_bucket_notification",
              "name": "uploads_notify",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": {
                "bucket": "uploads-bucket",
                "lambda_function": [
                  { "lambda_function_arn": "arn:aws:lambda:us-east-1:123456789012:function:process-upload", "events": ["s3:ObjectCreated:*"] }
                ]
              }
            },
            {
              "address": "aws_lambda_event_source_mapping.jobs_to_consumer",
              "mode": "managed",
              "type": "aws_lambda_event_source_mapping",
              "name": "jobs_to_consumer",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": {
                "event_source_arn": "arn:aws:sqs:us-east-1:123456789012:jobs-queue",
                "function_name": "arn:aws:lambda:us-east-1:123456789012:function:consume-jobs"
              }
            },
            {
              "address": "aws_cloudwatch_event_target.nightly_to_lambda",
              "mode": "managed",
              "type": "aws_cloudwatch_event_target",
              "name": "nightly_to_lambda",
              "provider_name": "registry.terraform.io/hashicorp/aws",
              "values": {
                "rule": "nightly-rule",
                "arn": "arn:aws:lambda:us-east-1:123456789012:function:nightly-job"
              }
            }
          ],
          "child_modules": [
            {
              "address": "module.database",
              "resources": [
                {
                  "address": "module.database.aws_dynamodb_table.sessions",
                  "mode": "managed",
                  "type": "aws_dynamodb_table",
                  "name": "sessions",
                  "provider_name": "registry.terraform.io/hashicorp/aws",
                  "values": { "name": "sessions-table", "arn": "arn:aws:dynamodb:us-east-1:123456789012:table/sessions-table" }
                },
                {
                  "address": "module.database.aws_db_instance.shared",
                  "mode": "managed",
                  "type": "aws_db_instance",
                  "name": "shared",
                  "provider_name": "registry.terraform.io/hashicorp/aws",
                  "values": { "identifier": "shared-db", "arn": "arn:aws:rds:us-east-1:123456789012:db:shared-db" }
                }
              ]
            },
            {
              "address": "module.api",
              "resources": [
                {
                  "address": "module.api.aws_ecs_task_definition.api",
                  "mode": "managed",
                  "type": "aws_ecs_task_definition",
                  "name": "api",
                  "provider_name": "registry.terraform.io/hashicorp/aws",
                  "values": {
                    "family": "api-task",
                    "task_role_arn": "arn:aws:iam::123456789012:role/api-task-role",
                    "container_definitions": "[{\"name\":\"api\",\"image\":\"123456789012.dkr.ecr.us-east-1.amazonaws.com/api:latest\",\"environment\":[{\"name\":\"SESSIONS_TABLE\",\"value\":\"sessions-table\"},{\"name\":\"API_TOKEN\",\"value\":\"shh-do-not-extract\"}]}]"
                  }
                },
                {
                  "address": "module.api.aws_iam_role_policy.api_task_role_policy",
                  "mode": "managed",
                  "type": "aws_iam_role_policy",
                  "name": "api_task_role_policy",
                  "provider_name": "registry.terraform.io/hashicorp/aws",
                  "values": {
                    "name": "api-task-policy",
                    "role": "api-task-role",
                    "policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:GetItem\",\"dynamodb:PutItem\"],\"Resource\":\"arn:aws:dynamodb:us-east-1:123456789012:table/sessions-table\"},{\"Effect\":\"Allow\",\"Action\":\"rds-db:connect\",\"Resource\":\"arn:aws:rds:us-east-1:123456789012:db:shared-db\"}]}"
                  }
                }
              ]
            }
          ]
        }
      }
    }
    ```
    - Los 11 casos cubiertos (referencia para los pasos 3-7): (1-6) recursos `aws_s3_bucket`/`aws_sqs_queue`/`aws_sns_topic`/`aws_cloudwatch_event_rule`/`aws_dynamodb_table` (en `module.database`)/`aws_db_instance` (en `module.database`); (7) IAM `aws_iam_role_policy.api_task_role_policy` con 2 statements (uno corroborable por env-var → `confirmado`, otro sin corroboración → `potencial`); (8) `aws_s3_bucket_notification` → Lambda `process-upload`; (9) `aws_lambda_event_source_mapping` SQS → Lambda `consume-jobs`; (10) `aws_cloudwatch_event_rule`+`aws_cloudwatch_event_target` → Lambda `nightly-job`; (11) env-var→recurso en `aws_lambda_function.process_upload` (`BUCKET_NAME`→bucket, `DB_PASSWORD` excluido) y `aws_ecs_task_definition.api` (`SESSIONS_TABLE`→tabla, `API_TOKEN` excluido).
  - **Archivos:** `src/commands/__fixtures__/terraform-show.json` (nuevo)
  - **Depende de:** —
  - **Verificación:** cmd: node -e "JSON.parse(require('fs').readFileSync('src/commands/__fixtures__/terraform-show.json','utf8'))" (valida que el JSON es válido)

- [x] **3. `src/lib/terraform.js` — `walkResources` + `extractResources` (6 tipos de recurso compartible)** _(medio)_
  - **Hace:** nuevo módulo `src/lib/terraform.js` (puro, sin DB — análogo a `patterns.js` para Terraform). Primeras dos funciones exportadas:
    - **`walkResources(rootModule)`** → array plano de `{address, type, name, values}`, recorriendo `rootModule.resources` y, recursivamente, `child_modules[].resources` (y sus propios `child_modules`, si los hubiera) — BR-017 ("recorriendo `values.root_module` y `child_modules` recursivamente"). Si `rootModule` es `null`/`undefined` o no tiene `resources`, devuelve `[]`.
    - **`extractResources(allResources)`** → array de `{name, arn, type, address}` para los recursos de tipo:
      | tipo Terraform | `type` de salida | `name` desde |
      |---|---|---|
      | `aws_s3_bucket` | `storage` | `values.bucket` |
      | `aws_sqs_queue` | `queue` | `values.name` |
      | `aws_sns_topic` | `topic` | `values.name` |
      | `aws_dynamodb_table` | `db-compartida` | `values.name` |
      | `aws_db_instance` | `db-compartida` | `values.identifier` |
      | `aws_cloudwatch_event_rule` | `event` | `values.name` |

      `arn` siempre desde `values.arn`. Otros tipos se ignoran (no aparecen en `infraResources`).
  - **Tests** (`src/lib/terraform.test.js`, nuevo) — usando la fixture del paso 2 (`readFileSync` + `JSON.parse`):
    1. `walkResources(rootModule)` devuelve 12 entradas (10 en `resources` + 2 en `module.database`), incluyendo `module.database.aws_dynamodb_table.sessions` y `module.api.aws_ecs_task_definition.api` (recursión sobre `child_modules` y `module.api` que está al mismo nivel que `module.database`, ambos dentro de `child_modules`).
    2. `extractResources(allResources)` devuelve exactamente 6 entradas, una por cada uno de los 6 tipos de la tabla, con `name`/`arn`/`type` correctos según los valores de la fixture (p.ej. `{name:'uploads-bucket', arn:'arn:aws:s3:::uploads-bucket', type:'storage', address:'aws_s3_bucket.uploads'}`, `{name:'sessions-table', ..., type:'db-compartida'}`, `{name:'shared-db', ..., type:'db-compartida'}`).
    3. `walkResources(null)` y `walkResources({})` → `[]` (sin tirar error).
  - **Archivos:** `src/lib/terraform.js` (nuevo), `src/lib/terraform.test.js` (nuevo), `src/commands/__fixtures__/terraform-show.json`
  - **Depende de:** paso 2
  - **Verificación:** cmd: node --test src/lib/terraform.test.js

- [x] **4. `src/lib/terraform.js` — `extractEnvVarResources` (BR-018, exclusión de secretos)** _(fuerte)_
  - **Hace:** agrega a `src/lib/terraform.js` (mismo archivo del paso 3):
    - **`extractEnvVarResources(allResources)`** → array de `{computeRef, roleRef, envVar, resourceName}`:
      - Para cada resource `type === 'aws_ecs_task_definition'`: `JSON.parse(values.container_definitions)` (string JSON embebido — única excepción a ADR-0005, BR-018) → para cada contenedor, para cada entrada de su array `environment` (`{name, value}`): si pasa el filtro de exclusión, push `{computeRef: values.family, roleRef: lastPathSegment(values.task_role_arn), envVar: name, resourceName: value}`.
      - Para cada resource `type === 'aws_lambda_function'`: itera `Object.entries(values.environment?.variables || {})` → para cada `[name, value]` que pase el filtro, push `{computeRef: values.arn, roleRef: lastPathSegment(values.role), envVar: name, resourceName: value}`.
      - **Filtro de exclusión (BR-018):** descarta la entrada si `name` matchea `/SECRET|PASSWORD|KEY|TOKEN|CREDENTIAL/i` O `value` matchea `/secretsmanager|ssm|valueFrom/i`. Las entradas descartadas NO aparecen en el resultado bajo ninguna forma (ni el nombre ni el valor).
    - **`lastPathSegment(arnOrName)`** (helper interno, puede exportarse para tests): si el string contiene `/`, devuelve el segmento después de la última `/`; si no, devuelve el string tal cual. Ej: `"arn:aws:iam::123456789012:role/api-task-role"` → `"api-task-role"`; `"api-task-role"` → `"api-task-role"`.
  - **Tests** (`src/lib/terraform.test.js`, extender) — usando la fixture del paso 2:
    1. `extractEnvVarResources(allResources)` incluye `{computeRef:'arn:aws:lambda:us-east-1:123456789012:function:process-upload', roleRef:'process-upload-role', envVar:'BUCKET_NAME', resourceName:'uploads-bucket'}` y `{computeRef:'api-task', roleRef:'api-task-role', envVar:'SESSIONS_TABLE', resourceName:'sessions-table'}`.
    2. El resultado NO contiene ninguna entrada con `envVar:'DB_PASSWORD'` ni `envVar:'API_TOKEN'`, y ningún valor del resultado es `'p4ssw0rd-do-not-extract'` ni `'shh-do-not-extract'` (verificar con `JSON.stringify(result).includes(...)` → `false`).
    3. `lastPathSegment('arn:aws:iam::123456789012:role/api-task-role')` → `'api-task-role'`; `lastPathSegment('plain-name')` → `'plain-name'`.
    4. Caso adicional inline (sin tocar la fixture): un `aws_lambda_function` con `environment.variables: {DATABASE_URL: 'postgres://...@secretsmanager...'}` → excluido por el patrón de VALOR aunque el nombre no matchee `/SECRET|.../i`.
  - **Archivos:** `src/lib/terraform.js`, `src/lib/terraform.test.js`
  - **Depende de:** paso 3
  - **Verificación:** cmd: node --test src/lib/terraform.test.js

- [x] **5. `src/lib/terraform.js` — `extractIamBindings`** _(medio)_
  - **Hace:** agrega **`extractIamBindings(allResources)`** → array de `{roleRef, actions, resources}` (uno por statement `"Effect":"Allow"`):
    - Para cada resource `type === 'aws_iam_role_policy'` (y, si aparece, `aws_iam_policy` — sin `role` propio, `roleRef: null`): `JSON.parse(values.policy)` → para cada elemento de `Statement` con `Effect === 'Allow'`: `actions` = `values.policy.Statement[i].Action` normalizado a array (si es string, `[Action]`); `resources` = `Resource` normalizado a array igual; `roleRef = lastPathSegment(values.role)` (helper del paso 4) si `values.role` existe, sino `null`. Statements con `Effect !== 'Allow'` se ignoran (no hay casos `Deny` en el alcance de la métrica).
  - **Tests** (`src/lib/terraform.test.js`, extender) — usando la fixture del paso 2:
    - `extractIamBindings(allResources)` devuelve UN elemento: `{roleRef:'api-task-role', actions:['dynamodb:GetItem','dynamodb:PutItem'], resources:['arn:aws:dynamodb:us-east-1:123456789012:table/sessions-table']}` Y otro: `{roleRef:'api-task-role', actions:['rds-db:connect'], resources:['arn:aws:rds:us-east-1:123456789012:db:shared-db']}` — es decir, 2 statements del mismo `aws_iam_role_policy`, cada uno con `actions`/`resources` normalizados a array (el segundo tenía `Action` como string suelto en el JSON de la fixture).
  - **Archivos:** `src/lib/terraform.js`, `src/lib/terraform.test.js`
  - **Depende de:** paso 4
  - **Verificación:** cmd: node --test src/lib/terraform.test.js

- [x] **6. `src/lib/terraform.js` — `extractEventWiring` (3 tipos de cableado)** _(medio)_
  - **Hace:** agrega **`extractEventWiring(allResources)`** → array de `{from, to, type, action, confidence:'confirmado'}` (los 3 tipos son siempre `confirmado`, BR-019 — son cableados reales, no permisos):
    - **`aws_s3_bucket_notification`**: para cada entrada de `values.lambda_function` (también podría haber `queue`/`topic`, pero la fixture solo cubre `lambda_function`): busca en `allResources` el `aws_s3_bucket` cuyo `values.bucket === notification.values.bucket`; `from = bucket.values.arn` (o el nombre del bucket si no se encuentra el resource), `to = entry.lambda_function_arn`, `type:'storage'`, `action:'s3-notification'`.
    - **`aws_lambda_event_source_mapping`**: `from = values.event_source_arn`, `to = values.function_name`, `action:'event-source-mapping'`. `type`: `'queue'` si `from` contiene `:sqs:`, sino `'storage'` (no hay otros casos en el alcance — DynamoDB streams quedarían `db-compartida`, pero no está en la fixture; dejar un `else` razonable que no rompa si aparece otro ARN).
    - **`aws_cloudwatch_event_target`**: busca en `allResources` el `aws_cloudwatch_event_rule` cuyo `values.name === target.values.rule`; `from = rule.values.arn` (o `target.values.rule` si no se encuentra), `to = target.values.arn`, `type:'event'`, `action:'eventbridge-target'`.
  - **Tests** (`src/lib/terraform.test.js`, extender) — usando la fixture del paso 2, `extractEventWiring(allResources)` devuelve exactamente 3 elementos:
    1. `{from:'arn:aws:s3:::uploads-bucket', to:'arn:aws:lambda:us-east-1:123456789012:function:process-upload', type:'storage', action:'s3-notification', confidence:'confirmado'}`
    2. `{from:'arn:aws:sqs:us-east-1:123456789012:jobs-queue', to:'arn:aws:lambda:us-east-1:123456789012:function:consume-jobs', type:'queue', action:'event-source-mapping', confidence:'confirmado'}`
    3. `{from:'arn:aws:events:us-east-1:123456789012:rule/nightly-rule', to:'arn:aws:lambda:us-east-1:123456789012:function:nightly-job', type:'event', action:'eventbridge-target', confidence:'confirmado'}`
  - **Archivos:** `src/lib/terraform.js`, `src/lib/terraform.test.js`
  - **Depende de:** paso 5
  - **Verificación:** cmd: node --test src/lib/terraform.test.js

- [x] **7. `src/lib/terraform.js` — `buildInfraEdges`/`extractInfra` (correlación `confirmado`/`potencial`, BR-019)** _(fuerte)_
  - **Hace:** agrega las dos funciones que cierran el módulo:
    - **`buildInfraEdges({resources, envVarResources, iamBindings, eventWiring})`** → array de `{from, to, type, action, confidence}`:
      1. Arranca con todas las `eventWiring` (ya tienen `confidence:'confirmado'`, paso 6).
      2. Para cada entrada de `envVarResources` (paso 4): resuelve `resourceName` contra `resources` (paso 3) — match si `r.name === resourceName`, o `r.arn` termina en `'/'+resourceName` o `':'+resourceName` (ADR-0007, join ARN/nombre). Si matchea: push edge `{from: computeRef, to: r.arn, type: r.type, confidence:'confirmado', action: 'env:'+envVar}` Y guarda el par `{roleRef, resourceArn: r.arn}` en una lista interna `envResolved` (para el paso 3). Si NO matchea ningún recurso de los 6 tipos trackeados, se ignora (no genera edge).
      3. Para cada entrada de `iamBindings` (paso 5), para cada `resourceArn` de `bindings.resources`: busca `r` en `resources` con `r.arn === resourceArn` — si no hay match (recurso no trackeado, p.ej. el propio IAM), se ignora. Si hay match: `confidence = 'confirmado'` si existe algún `{roleRef, resourceArn}` en `envResolved` (paso 2) con `roleRef === bindings.roleRef && resourceArn === r.arn`; sino `'potencial'` (ADR-0006). Push edge `{from: bindings.roleRef, to: r.arn, type: r.type, confidence, action: bindings.actions.join(',')}`.
    - **`extractInfra(showJson)`** → `{resources, edges}` — punto de entrada del módulo (lo llama `scan.js`, paso 8):
      - `rootModule = showJson?.values?.root_module`. Si es `null`/`undefined`, devuelve `{resources:[], edges:[]}` (degradación, no error — la validación de "archivo inválido" es responsabilidad de `scan.js`, paso 8, ANTES de llamar a esto).
      - `allResources = walkResources(rootModule)`; `resources = extractResources(allResources)`; llama a `extractEnvVarResources`, `extractIamBindings`, `extractEventWiring`; `edges = buildInfraEdges({resources, envVarResources, iamBindings, eventWiring})`; devuelve `{resources, edges}`.
  - **Tests** (`src/lib/terraform.test.js`, extender) — usando la fixture del paso 2, `extractInfra(showJson)` devuelve:
    - `resources`: las 6 entradas del paso 3.
    - `edges`: exactamente 7 entradas — las 3 de `eventWiring` (paso 6) + 2 env-var→recurso (`process-upload`→`uploads-bucket` vía `BUCKET_NAME`, type `storage`; `api-task`→`sessions-table` vía `SESSIONS_TABLE`, type `db-compartida`, ambas `confirmado`) + 2 IAM (`api-task-role`→`sessions-table`, `confidence:'confirmado'` por estar corroborada por el env-var de `api-task`; `api-task-role`→`shared-db`, `confidence:'potencial'`, sin corroboración).
    - Además: `extractInfra({values:{}})` → `{resources:[], edges:[]}` (sin tirar error).
  - **Archivos:** `src/lib/terraform.js`, `src/lib/terraform.test.js`
  - **Depende de:** pasos 3, 4, 5, 6
  - **Verificación:** cmd: node --test src/lib/terraform.test.js

- [x] **8. `sdd scan --terraform=<path>` (BR-017)** _(medio)_
  - **Hace:** en `src/commands/scan.js`, dentro de `scan(root, flags)`:
    - Si `flags.terraform` está presente: resuelve la ruta (`isAbsolute(flags.terraform) ? flags.terraform : resolve(process.cwd(), flags.terraform)`), `readJSON(path)` (de `fsutil.js` — ya devuelve `null` si el archivo no existe o el JSON es inválido). Si es `null` → `throw new Error('--terraform: no se pudo leer "<path>" — ¿existe y es un terraform show -json válido?')` (criterio: error claro, sin stack trace crudo — `bin/sdd.js` ya formatea los `Error` así; no modifica `.sdd/patterns.json`, porque el `throw` ocurre ANTES del `writeJSON`).
    - Si es válido: `infra = extractInfra(parsed)` (paso 7).
    - Al construir el objeto que se pasa a `writeJSON(.sdd/patterns.json, ...)`, agrega la clave `infra` SOLO si `flags.terraform` estaba presente: `{ scannedAt, filesScanned, patterns, capabilities, ...(infra ? {infra} : {}) }`. Si `--terraform` no se pasó, `patterns.json` queda exactamente igual que hoy (sin clave `infra`) — compatibilidad con repos de aplicación.
    - Importa `extractInfra` desde `../lib/terraform.js`. Actualiza el `HELP` de `bin/sdd.js` (sección `scan`): agrega una línea mencionando `--terraform=<path>` (scanner de infraestructura, Fase 3).
  - **Tests** (`src/commands/scan.test.js`, extender o nuevo según exista): usando `fs.mkdtempSync` para un repo temporal mínimo (igual que otros tests de `scan`):
    1. `scan(root, {terraform: 'src/commands/__fixtures__/terraform-show.json'})` (o copiar la fixture al tmpdir y usar ruta absoluta) → `.sdd/patterns.json` resultante tiene `infra.resources.length === 6` y `infra.edges.length === 7` (valores del paso 7).
    2. `scan(root, {terraform: '/no/existe.json'})` → `throw` con mensaje que incluye `--terraform`; `.sdd/patterns.json` no se crea/modifica (verificar que no existe o no cambió respecto a antes de la llamada).
    3. `scan(root, {})` (sin `--terraform`) → `.sdd/patterns.json` NO tiene la clave `infra` (compatibilidad, criterio de la spec).
  - **Archivos:** `src/commands/scan.js`, `src/commands/scan.test.js`, `bin/sdd.js`, `src/commands/__fixtures__/terraform-show.json`
  - **Depende de:** paso 7
  - **Verificación:** cmd: node --test src/commands/scan.test.js

- [x] **9. Graphstore: columnas `infra_resources`/`infra_edges` + migración idempotente (BR-020)** `[P]` _(fuerte)_
  - **Hace:**
    - **`sqlite.js`**: agrega `infra_resources TEXT NOT NULL DEFAULT '[]'` e `infra_edges TEXT NOT NULL DEFAULT '[]'` a `CREATE_TABLE` (para DBs nuevas). Para DBs existentes (sin estas columnas, p.ej. `~/.sddkit/graph.db` de tarea 002): después de `db.exec(CREATE_TABLE)`, ejecuta `db.prepare("PRAGMA table_info(systems)").all()`, y por cada columna de `['infra_resources','infra_edges']` que NO esté en el resultado, `db.exec("ALTER TABLE systems ADD COLUMN <col> TEXT NOT NULL DEFAULT '[]'")` — SQLite soporta `DEFAULT` con string literal en `ADD COLUMN`, aplica el default a filas existentes. `UPSERT`/`rowToSystem`/`publishSystem` incluyen `infra_resources`/`infra_edges` (mismo patrón `JSON.stringify`/`JSON.parse` que `endpoints`/`consumptions`); `rowToSystem` usa `JSON.parse(row.infra_resources ?? '[]')` por si la columna viniera `NULL` en algún caso límite.
    - **`mysql.js`**: agrega `infra_resources LONGTEXT`, `infra_edges LONGTEXT` a `CREATE_TABLE` (para DBs nuevas — SIN `DEFAULT`, porque MySQL <8.0.13 no permite `DEFAULT` en columnas `TEXT`/`LONGTEXT`). Para DBs existentes: tras `pool.execute(CREATE_TABLE)`, consulta `INFORMATION_SCHEMA.COLUMNS` (`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name = 'systems'` — o `table_schema = DATABASE()` si aplica) y por cada columna faltante, `ALTER TABLE systems ADD COLUMN <col> LONGTEXT`. `UPSERT`/`rowToSystem`/`publishSystem` igual que sqlite, pero `rowToSystem` usa `JSON.parse(row.infra_resources || '[]')` (columna puede ser `NULL` en filas migradas sin re-publicar).
    - Tanto `publishSystem({..., infraResources, infraEdges})` (ambos drivers) aceptan `infraResources`/`infraEdges` `undefined` → tratar como `[]` (`infraResources ?? []`).
  - **Tests** (`src/lib/graphstore/sqlite.test.js` y `mysql.test.js`, extender):
    - **sqlite** (si `better-sqlite3` disponible, sino `t.skip` como en tarea 002):
      1. DB nueva: `publishSystem({...base, infraResources:[{name:'x',type:'storage'}], infraEdges:[{from:'a',to:'b',type:'storage',confidence:'confirmado'}]})` → `querySystem(...)` devuelve esos arrays parseados.
      2. **Migración**: crear una DB temporal manualmente con el `CREATE_TABLE` VIEJO (sin las 2 columnas, copiar el SQL de tarea 002) + insertar 1 fila vieja (sin `infra_resources`/`infra_edges`); luego `createSqliteStore(...)` sobre esa misma DB → no tira error, `querySystem(...)` de esa fila vieja devuelve `infraResources:[]`/`infraEdges:[]` (default aplicado por `ALTER TABLE`), y `listSystems()` sigue devolviendo la fila.
      3. Llamar `createSqliteStore(...)` DOS veces sobre la misma DB (ya migrada) → la segunda vez no tira error por "columna ya existe" (idempotencia).
    - **mysql** (con el stub de `createPool` de tarea 002, sin servidor real — P4): verificar que `createMysqlStore` ejecuta (vía el stub) una query que contiene `information_schema.columns` (o equivalente) y, si el stub simula que las columnas YA existen, NO ejecuta `ALTER TABLE` (idempotencia simulada); `publishSystem` con `infraResources`/`infraEdges` genera un `execute` cuyo SQL incluye `infra_resources`/`infra_edges`.
  - **Archivos:** `src/lib/graphstore/sqlite.js`, `src/lib/graphstore/sqlite.test.js`, `src/lib/graphstore/mysql.js`, `src/lib/graphstore/mysql.test.js`
  - **Depende de:** —
  - **Verificación:** cmd: node --test src/lib/graphstore/

- [x] **10. `matching.js::queryInfraImpact` + wiring en `index.js` (BR-021)** _(medio)_
  - **Hace:**
    - En `src/lib/graphstore/matching.js`, nueva función **`queryInfraImpact(systems, resource)`** → array de `{canonicalName, from, to, type, confidence, action}`: para cada `sys` en `systems`, para cada `edge` en `sys.infraEdges || []`, si `edge.from === resource || edge.to === resource` (comparación exacta de string — ARN o nombre, ADR-0007), push `{canonicalName: sys.canonicalName, from: edge.from, to: edge.to, type: edge.type, confidence: edge.confidence, action: edge.action}`. `canonicalName` es el sistema que PUBLICÓ esa arista (típicamente el repo de infraestructura). Si ningún sistema tiene `infraEdges` que mencionen `resource` → `[]`.
    - En `src/lib/graphstore/index.js`, `wrap(store)` agrega `queryInfraImpact: (resource) => queryInfraImpact(store.listSystems(), resource)` al objeto devuelto (junto a `queryCapability`/`queryImpact`).
  - **Tests** (`src/lib/graphstore/matching.test.js`, extender):
    1. `systems = [{canonicalName:'infra-service', infraEdges:[{from:'arn:aws:s3:::uploads-bucket', to:'arn:aws:lambda:...:function:process-upload', type:'storage', confidence:'confirmado', action:'s3-notification'}], ...}]` → `queryInfraImpact(systems, 'arn:aws:s3:::uploads-bucket')` devuelve 1 resultado con `canonicalName:'infra-service'`, `confidence:'confirmado'`.
    2. Mismo `systems`, `queryInfraImpact(systems, 'arn:aws:lambda:...:function:process-upload')` (el `to` de la arista) → también 1 resultado (matchea por `to`, no solo por `from`).
    3. `queryInfraImpact(systems, 'no-existe')` → `[]`.
    4. Sistema sin `infraEdges` (campo ausente) → no rompe, simplemente no contribuye resultados.
  - **Archivos:** `src/lib/graphstore/matching.js`, `src/lib/graphstore/matching.test.js`, `src/lib/graphstore/index.js`
  - **Depende de:** pasos 7, 9
  - **Verificación:** cmd: node --test src/lib/graphstore/matching.test.js

- [x] **11. `sdd publish` incluye `infraResources`/`infraEdges` (BR-020)** _(rapido)_
  - **Hace:** en `src/commands/publish.js`, lee `.sdd/patterns.json → infra` (puede ser `undefined` si el repo no corrió `--terraform`): `const infra = readJSON(...).infra ?? readJSON('.sdd/patterns.json')?.infra` (reusar el `readJSON` ya hecho para `capabilities`, mismo objeto). `infraResources = infra?.resources ?? []`, `infraEdges = infra?.edges ?? []`. Pasa ambos a `store.publishSystem({..., infraResources, infraEdges})` (paso 9 ya soporta estos campos).
  - **Tests** (`src/commands/publish.test.js`, extender):
    1. Repo con `.sdd/patterns.json → infra: {resources:[...], edges:[...]}` (usar el resultado de `extractInfra` sobre la fixture del paso 2, o un subconjunto chico inline) → tras `publish(root, {})`, `querySystem(canonicalName).infraResources`/`.infraEdges` tienen ese contenido.
    2. Repo SIN clave `infra` en `patterns.json` (caso normal, repos de aplicación — fixtures existentes de tarea 001/002) → `publish(root, {})` no falla, `querySystem(canonicalName).infraResources === []` y `.infraEdges === []`.
  - **Archivos:** `src/commands/publish.js`, `src/commands/publish.test.js`
  - **Depende de:** pasos 8, 9
  - **Verificación:** cmd: node --test src/commands/publish.test.js

- [x] **12. `sdd impact <recurso>` — 3ra interpretación (BR-021)** _(medio)_
  - **Hace:** en `src/commands/impact.js`, dentro de `impact(root, pos, flags)`, tras el branch existente `{system}` (BR-014):
    - Si `query.system != null` y `store.queryImpact(query)` devuelve `null` (sistema no encontrado, rama existente que hoy imprime el error y `return`): ANTES de imprimir ese error, probar `store.queryInfraImpact(pos[0])` (paso 10). Si devuelve resultados no vacíos: imprimir `Recurso de infra "<pos[0]>":` y, por cada resultado, una línea con `canonicalName`, `type`, `confidence`, `from`→`to` y `action` (formato libre, legible — análogo a `printConsumer`).
    - Si `queryInfraImpact` también devuelve `[]`: imprimir el mensaje de "no encontrado" cubriendo las 3 interpretaciones, p.ej.: `✖ "<pos[0]>" no matchea ningún sistema publicado ni recurso de infra publicado, ni se interpreta como "<MÉTODO> <ruta>". Probá: sdd impact <MÉTODO> <ruta> | sdd impact <sistema> | sdd impact <ARN-o-nombre-de-recurso>` — y `return` (sin lanzar excepción, criterio de la spec).
  - **Tests** (`src/commands/impact.test.js`, extender) — seedear vía `createGraphStore(...).publishSystem(...)` un sistema `infra-service` con `infraEdges` (al menos 1 entrada, p.ej. la del paso 10):
    1. `impact(root, ['arn:aws:s3:::uploads-bucket'], {})` → output incluye `infra-service`, `confirmado`/`potencial` según corresponda, y los identificadores `from`/`to`.
    2. `impact(root, ['no-existe-ni-como-sistema-ni-como-recurso'], {})` → output incluye las 3 interpretaciones mencionadas (verificar que el string contiene `sdd impact <MÉTODO> <ruta>` y `sdd impact <sistema>` y `sdd impact <ARN-o-nombre-de-recurso>`), sin lanzar.
  - **Archivos:** `src/commands/impact.js`, `src/commands/impact.test.js`
  - **Depende de:** pasos 10, 11
  - **Verificación:** cmd: node --test src/commands/impact.test.js

- [x] **13. Documentación: `sdd-analyze` SKILL.md + README.md + HELP** `[P]` _(rapido)_
  - **Hace:**
    - `skills/sdd-analyze/SKILL.md`: en la sección "¿A quién impacto?" (agregada en tarea 002), menciona que si la tarea involucra un recurso de infraestructura (bucket/cola/topic/tabla/ARN) y el grafo tiene sistemas con `infraEdges` publicados, `sdd impact <ARN-o-nombre>` también puede responder (BR-021) — mismo espíritu "informativo, no bloquea".
    - `README.md`, sección "Grafo de impacto" (de tarea 002): agrega un párrafo sobre `sdd scan --terraform=<path-a-show.json>` (BR-017, requiere correr `terraform show -json > show.json` fuera de sddkit, ADR-0005) y `sdd impact <recurso>` (BR-021), mencionando el límite conocido BR-022 (no sube `posible`→`exacto`).
    - Confirma que el `HELP` de `bin/sdd.js` (actualizado en pasos 8 y 12) describe ambos usos nuevos de forma consistente con README/SKILL.
  - **Archivos:** `skills/sdd-analyze/SKILL.md`, `README.md`, `bin/sdd.js` (revisión, ya editado en pasos 8/12)
  - **Depende de:** pasos 8, 12
  - **Verificación:** manual — revisión de legibilidad y consistencia entre los 3 archivos; no requiere `node --test`.

- [x] **14. Validación F3 end-to-end contra la fixture + registro para retro** _(medio)_
  - **Hace:** según "Métrica de impacto" de la spec — recorrido manual con la fixture del paso 2, usando una DB sqlite temporal (no tocar `~/.sddkit/graph.db` real):
    1. En un directorio temporal con un `.sdd/` mínimo (config con `graph.driver:'sqlite'` apuntando a un archivo temporal, `context.md` con `**Sistema:** infra-fixture`, C4 sin pendientes), correr `sdd scan --dir=<tmp> --terraform=src/commands/__fixtures__/terraform-show.json` → verificar `.sdd/patterns.json → infra.resources.length === 6` y `.edges.length === 7`.
    2. `sdd publish --dir=<tmp>` → verificar que publica OK (gate de calidad sin pendientes).
    3. `sdd impact arn:aws:s3:::uploads-bucket --dir=<tmp>` → verificar que reporta la arista `s3-notification` (`confirmado`) hacia `process-upload`.
    4. `sdd impact arn:aws:rds:us-east-1:123456789012:db:shared-db --dir=<tmp>` → verificar que reporta la arista IAM con `confidence:'potencial'`.
    5. `sdd impact GET /no/existe --dir=<tmp>` y `sdd impact sistema-inexistente --dir=<tmp>` → confirmar que las 3 interpretaciones siguen degradando sin error (no regresión de BR-014).
    6. Anotar los 11 casos de la fixture y su resultado (presente/ausente, `type`/`confidence` esperado vs. obtenido) — insumo de `retro.md` (sección "Resultado de la métrica F3"). Confirmar explícitamente que `DB_PASSWORD`/`API_TOKEN` NO aparecen en ningún output (`patterns.json`, DB, `sdd impact`).
  - **Archivos:** ninguno del código de sddkit (recorrido manual en un directorio temporal).
  - **Depende de:** pasos 8, 11, 12
  - **Verificación:** manual — el dev revisa la cobertura de los 11 casos contra lo esperado y vuelca el resultado en `retro.md` al cerrar la tarea.

---

_Aprobación del dev: aprobado (2026-06-13)_
