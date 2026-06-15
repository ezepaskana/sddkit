// Tipo Terraform → { type de salida, campo de `values` del que sale `name` }.
const RESOURCE_TYPE_MAP = {
  aws_s3_bucket: { type: 'storage', nameField: 'bucket' },
  aws_sqs_queue: { type: 'queue', nameField: 'name' },
  aws_sns_topic: { type: 'topic', nameField: 'name' },
  aws_dynamodb_table: { type: 'db-compartida', nameField: 'name' },
  aws_db_instance: { type: 'db-compartida', nameField: 'identifier' },
  aws_cloudwatch_event_rule: { type: 'event', nameField: 'name' },
};

/**
 * Recorre `rootModule.resources` y, recursivamente, `child_modules[].resources`
 * (y los `child_modules` de esos módulos, si los hubiera), devolviendo un array
 * plano de `{address, type, name, values}`. Si `rootModule` es `null`/`undefined`
 * o no tiene `resources`, devuelve `[]`.
 */
export function walkResources(rootModule) {
  if (!rootModule || !Array.isArray(rootModule.resources)) return [];
  const out = [];
  for (const r of rootModule.resources) {
    out.push({ address: r.address, type: r.type, name: r.name, values: r.values });
  }
  for (const child of rootModule.child_modules || []) {
    out.push(...walkResources(child));
  }
  return out;
}

/**
 * Filtra `allResources` (salida de `walkResources`) a los recursos compartibles
 * de interés (S3, SQS, SNS, DynamoDB, RDS, EventBridge), devolviendo
 * `{name, arn, type, address}`. Otros tipos se ignoran.
 */
export function extractResources(allResources) {
  const out = [];
  for (const r of allResources) {
    const mapping = RESOURCE_TYPE_MAP[r.type];
    if (!mapping) continue;
    const values = r.values || {};
    out.push({
      name: values[mapping.nameField],
      arn: values.arn,
      type: mapping.type,
      address: r.address,
    });
  }
  return out;
}

// BR-018: descartar env-vars que parezcan secretos (por nombre o por valor).
const SECRET_NAME_RE = /SECRET|PASSWORD|KEY|TOKEN|CREDENTIAL/i;
const SECRET_VALUE_RE = /secretsmanager|ssm|valueFrom/i;

/**
 * Devuelve el segmento posterior a la última `/` de `arnOrName`; si no contiene
 * `/`, devuelve el string tal cual.
 * - `"arn:aws:iam::123456789012:role/api-task-role"` → `"api-task-role"`
 * - `"api-task-role"` → `"api-task-role"`
 */
export function lastPathSegment(arnOrName) {
  if (typeof arnOrName !== 'string' || !arnOrName.includes('/')) return arnOrName;
  return arnOrName.slice(arnOrName.lastIndexOf('/') + 1);
}

/**
 * Normaliza un valor de `Action`/`Resource` de un statement IAM a array:
 * si ya es array lo devuelve tal cual, si es string lo envuelve en `[valor]`.
 */
function toArray(value) {
  return Array.isArray(value) ? value : [value];
}

/**
 * Lee las policies inline de IAM (`aws_iam_role_policy`) y extrae los
 * statements con `Effect: "Allow"`, devolviendo un array de
 * `{roleRef, actions, resources}` (uno por statement).
 *
 * `roleRef` es `lastPathSegment(values.role)` si el recurso tiene `role`
 * asociado, o `null` si no lo tiene (p.ej. una `aws_iam_policy` standalone).
 * `actions` y `resources` se normalizan siempre a array.
 *
 * Statements con `Effect !== 'Allow'` se ignoran.
 */
export function extractIamBindings(allResources) {
  const out = [];
  for (const r of allResources) {
    if (r.type !== 'aws_iam_role_policy' && r.type !== 'aws_iam_policy') continue;
    const values = r.values || {};
    let policy;
    try {
      policy = JSON.parse(values.policy);
    } catch {
      continue;
    }
    const roleRef = values.role ? lastPathSegment(values.role) : null;
    for (const statement of policy.Statement || []) {
      if (statement.Effect !== 'Allow') continue;
      out.push({
        roleRef,
        actions: toArray(statement.Action),
        resources: toArray(statement.Resource),
      });
    }
  }
  return out;
}

/**
 * Lee las env-vars de recursos de compute (ECS task definitions y Lambda) para
 * resolver símbolos `env:NOMBRE_VAR` a recursos. Única excepción a ADR-0005
 * (que prohíbe extraer `values` arbitrarios): BR-018 permite leer estas env-vars,
 * EXCLUYENDO cualquiera que parezca un secreto (por nombre o por valor).
 *
 * Devuelve un array de `{computeRef, roleRef, envVar, resourceName}`.
 */
export function extractEnvVarResources(allResources) {
  const out = [];
  for (const r of allResources) {
    const values = r.values || {};
    if (r.type === 'aws_ecs_task_definition') {
      let containers;
      try {
        containers = JSON.parse(values.container_definitions);
      } catch {
        continue;
      }
      for (const container of containers || []) {
        for (const { name, value } of container.environment || []) {
          if (SECRET_NAME_RE.test(name) || SECRET_VALUE_RE.test(value)) continue;
          out.push({
            computeRef: values.family,
            roleRef: lastPathSegment(values.task_role_arn),
            envVar: name,
            resourceName: value,
          });
        }
      }
    } else if (r.type === 'aws_lambda_function') {
      const variables = values.environment?.variables || {};
      for (const [name, value] of Object.entries(variables)) {
        if (SECRET_NAME_RE.test(name) || SECRET_VALUE_RE.test(value)) continue;
        out.push({
          computeRef: values.arn,
          roleRef: lastPathSegment(values.role),
          envVar: name,
          resourceName: value,
        });
      }
    }
  }
  return out;
}

/**
 * Extrae cableados de eventos confirmados (BR-019: son disparadores reales,
 * no permisos) a partir de tres tipos de recursos:
 *
 * - `aws_s3_bucket_notification`: una entrada por cada elemento de
 *   `values.lambda_function`. `from` es el `arn` del `aws_s3_bucket` cuyo
 *   `values.bucket` coincide con `values.bucket` de la notification (o el
 *   nombre del bucket como fallback si no se encuentra), `to` es
 *   `lambda_function_arn`, `type:'storage'`, `action:'s3-notification'`.
 * - `aws_lambda_event_source_mapping`: `from` es `values.event_source_arn`,
 *   `to` es `values.function_name`. `type` es `'queue'` si `from` contiene
 *   `:sqs:`, `'storage'` en caso contrario. `action:'event-source-mapping'`.
 * - `aws_cloudwatch_event_target`: `from` es el `arn` del
 *   `aws_cloudwatch_event_rule` cuyo `values.name` coincide con
 *   `values.rule` del target (o `values.rule` como fallback si no se
 *   encuentra), `to` es `values.arn` del target, `type:'event'`,
 *   `action:'eventbridge-target'`.
 *
 * Todas las entradas devueltas llevan `confidence: 'confirmado'`.
 */
export function extractEventWiring(allResources) {
  const out = [];
  for (const r of allResources) {
    const values = r.values || {};
    if (r.type === 'aws_s3_bucket_notification') {
      const bucket = allResources.find(
        (other) => other.type === 'aws_s3_bucket' && (other.values || {}).bucket === values.bucket,
      );
      const from = bucket ? bucket.values.arn : values.bucket;
      for (const entry of values.lambda_function || []) {
        out.push({
          from,
          to: entry.lambda_function_arn,
          type: 'storage',
          action: 's3-notification',
          confidence: 'confirmado',
        });
      }
    } else if (r.type === 'aws_lambda_event_source_mapping') {
      const from = values.event_source_arn;
      const type = from && from.includes(':sqs:') ? 'queue' : 'storage';
      out.push({
        from,
        to: values.function_name,
        type,
        action: 'event-source-mapping',
        confidence: 'confirmado',
      });
    } else if (r.type === 'aws_cloudwatch_event_target') {
      const rule = allResources.find(
        (other) => other.type === 'aws_cloudwatch_event_rule' && (other.values || {}).name === values.rule,
      );
      const from = rule ? rule.values.arn : values.rule;
      out.push({
        from,
        to: values.arn,
        type: 'event',
        action: 'eventbridge-target',
        confidence: 'confirmado',
      });
    }
  }
  return out;
}

/**
 * Construye el array de aristas de infraestructura a partir de las extracciones
 * parciales del módulo. El orden de las aristas importa (eventWiring, luego
 * env-vars, luego IAM):
 *
 * - Paso A: arranca con todas las `eventWiring` tal cual (ya confirmadas).
 * - Paso B: resuelve cada env-var a un recurso trackeado (por nombre o por ARN,
 *   ADR-0007) y emite una arista `confirmado`; registra el par
 *   `{roleRef, resourceArn}` para corroborar bindings IAM en el Paso C.
 * - Paso C: emite una arista por cada `(binding, resourceArn)` que matchee un
 *   recurso trackeado (match exacto de ARN). Es `confirmado` si un env-var del
 *   mismo rol corrobora ese recurso (ADR-0006/BR-019), o `potencial` si no.
 */
export function buildInfraEdges({ resources, envVarResources, iamBindings, eventWiring }) {
  const edges = [];

  // Paso A
  for (const wiring of eventWiring) {
    edges.push(wiring);
  }

  // Paso B
  const envResolved = [];
  for (const { computeRef, roleRef, envVar, resourceName } of envVarResources) {
    const r = resources.find(
      (res) =>
        res.name === resourceName ||
        (typeof res.arn === 'string' &&
          (res.arn.endsWith('/' + resourceName) || res.arn.endsWith(':' + resourceName))),
    );
    if (!r) continue;
    edges.push({
      from: computeRef,
      to: r.arn,
      type: r.type,
      confidence: 'confirmado',
      action: 'env:' + envVar,
    });
    envResolved.push({ roleRef, resourceArn: r.arn });
  }

  // Paso C
  for (const bindings of iamBindings) {
    for (const resourceArn of bindings.resources) {
      const r = resources.find((res) => res.arn === resourceArn);
      if (!r) continue;
      const confidence = envResolved.some(
        (e) => e.roleRef === bindings.roleRef && e.resourceArn === r.arn,
      )
        ? 'confirmado'
        : 'potencial';
      edges.push({
        from: bindings.roleRef,
        to: r.arn,
        type: r.type,
        confidence,
        action: bindings.actions.join(','),
      });
    }
  }

  return edges;
}

/**
 * Punto de entrada del módulo: a partir del JSON de `terraform show -json`,
 * devuelve `{resources, edges}`. Si no hay `values.root_module` (archivo vacío
 * o inesperado), degrada silenciosamente a `{resources:[], edges:[]}` — la
 * validación de "archivo inválido" es responsabilidad de `scan.js`.
 */
export function extractInfra(showJson) {
  const rootModule = showJson?.values?.root_module;
  if (!rootModule) return { resources: [], edges: [] };
  const allResources = walkResources(rootModule);
  const resources = extractResources(allResources);
  const envVarResources = extractEnvVarResources(allResources);
  const iamBindings = extractIamBindings(allResources);
  const eventWiring = extractEventWiring(allResources);
  const edges = buildInfraEdges({ resources, envVarResources, iamBindings, eventWiring });
  return { resources, edges };
}
