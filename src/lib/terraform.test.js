import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walkResources, extractResources, extractEnvVarResources, extractIamBindings, extractEventWiring, lastPathSegment, extractInfra } from './terraform.js';

const fixturePath = join(import.meta.dirname, '..', 'commands', '__fixtures__', 'terraform-show.json');
const data = JSON.parse(readFileSync(fixturePath, 'utf8'));
const rootModule = data.values.root_module;

test('walkResources(rootModule) devuelve 14 entradas (10 en resources + 2 en module.database + 2 en module.api), recursivo sobre child_modules', () => {
  const all = walkResources(rootModule);
  assert.equal(all.length, 14);
  const addresses = all.map((r) => r.address);
  assert.ok(addresses.includes('module.database.aws_dynamodb_table.sessions'));
  assert.ok(addresses.includes('module.api.aws_ecs_task_definition.api'));
});

test('extractResources(allResources) devuelve exactamente 6 entradas, una por cada tipo compartible de la fixture', () => {
  const all = walkResources(rootModule);
  const shared = extractResources(all);
  assert.deepEqual(shared, [
    { name: 'uploads-bucket', arn: 'arn:aws:s3:::uploads-bucket', type: 'storage', address: 'aws_s3_bucket.uploads' },
    { name: 'jobs-queue', arn: 'arn:aws:sqs:us-east-1:123456789012:jobs-queue', type: 'queue', address: 'aws_sqs_queue.jobs' },
    { name: 'notifications-topic', arn: 'arn:aws:sns:us-east-1:123456789012:notifications-topic', type: 'topic', address: 'aws_sns_topic.notifications' },
    { name: 'nightly-rule', arn: 'arn:aws:events:us-east-1:123456789012:rule/nightly-rule', type: 'event', address: 'aws_cloudwatch_event_rule.nightly' },
    { name: 'sessions-table', arn: 'arn:aws:dynamodb:us-east-1:123456789012:table/sessions-table', type: 'db-compartida', address: 'module.database.aws_dynamodb_table.sessions' },
    { name: 'shared-db', arn: 'arn:aws:rds:us-east-1:123456789012:db:shared-db', type: 'db-compartida', address: 'module.database.aws_db_instance.shared' },
  ]);
});

test('walkResources(null) y walkResources({}) devuelven [] sin tirar error', () => {
  assert.deepEqual(walkResources(null), []);
  assert.deepEqual(walkResources(undefined), []);
  assert.deepEqual(walkResources({}), []);
});

test('extractEnvVarResources(allResources) incluye las env-vars de Lambda (BUCKET_NAME) y ECS (SESSIONS_TABLE)', () => {
  const all = walkResources(rootModule);
  const result = extractEnvVarResources(all);
  assert.ok(
    result.some(
      (e) =>
        e.computeRef === 'arn:aws:lambda:us-east-1:123456789012:function:process-upload' &&
        e.roleRef === 'process-upload-role' &&
        e.envVar === 'BUCKET_NAME' &&
        e.resourceName === 'uploads-bucket',
    ),
  );
  assert.ok(
    result.some(
      (e) =>
        e.computeRef === 'api-task' &&
        e.roleRef === 'api-task-role' &&
        e.envVar === 'SESSIONS_TABLE' &&
        e.resourceName === 'sessions-table',
    ),
  );
});

test('extractEnvVarResources(allResources) excluye secretos (BR-018): ni DB_PASSWORD ni API_TOKEN ni sus valores aparecen', () => {
  const all = walkResources(rootModule);
  const result = extractEnvVarResources(all);
  assert.ok(!result.some((e) => e.envVar === 'DB_PASSWORD'));
  assert.ok(!result.some((e) => e.envVar === 'API_TOKEN'));
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes('p4ssw0rd-do-not-extract'));
  assert.ok(!serialized.includes('shh-do-not-extract'));
});

test('lastPathSegment devuelve el segmento tras la última / o el string tal cual', () => {
  assert.equal(lastPathSegment('arn:aws:iam::123456789012:role/api-task-role'), 'api-task-role');
  assert.equal(lastPathSegment('plain-name'), 'plain-name');
});

test('extractEnvVarResources excluye por patrón de VALOR (secretsmanager) aunque el nombre no matchee', () => {
  const allResources = [
    {
      type: 'aws_lambda_function',
      values: {
        arn: 'arn:aws:lambda:...:function:x',
        role: 'role/x-role',
        environment: {
          variables: {
            DATABASE_URL: 'postgres://user:pass@secretsmanager.amazonaws.com/db',
          },
        },
      },
    },
  ];
  assert.deepEqual(extractEnvVarResources(allResources), []);
});

test('extractIamBindings(allResources) devuelve un elemento por statement Allow de aws_iam_role_policy, con actions/resources normalizados a array', () => {
  const all = walkResources(rootModule);
  const bindings = extractIamBindings(all);
  assert.deepEqual(bindings, [
    {
      roleRef: 'api-task-role',
      actions: ['dynamodb:GetItem', 'dynamodb:PutItem'],
      resources: ['arn:aws:dynamodb:us-east-1:123456789012:table/sessions-table'],
    },
    {
      roleRef: 'api-task-role',
      actions: ['rds-db:connect'],
      resources: ['arn:aws:rds:us-east-1:123456789012:db:shared-db'],
    },
  ]);
});

test('extractEventWiring(allResources) devuelve los 3 cableados de evento de la fixture, todos confirmados (BR-019)', () => {
  const all = walkResources(rootModule);
  const wiring = extractEventWiring(all);
  assert.deepEqual(wiring, [
    {
      from: 'arn:aws:s3:::uploads-bucket',
      to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload',
      type: 'storage',
      action: 's3-notification',
      confidence: 'confirmado',
    },
    {
      from: 'arn:aws:sqs:us-east-1:123456789012:jobs-queue',
      to: 'arn:aws:lambda:us-east-1:123456789012:function:consume-jobs',
      type: 'queue',
      action: 'event-source-mapping',
      confidence: 'confirmado',
    },
    {
      from: 'arn:aws:events:us-east-1:123456789012:rule/nightly-rule',
      to: 'arn:aws:lambda:us-east-1:123456789012:function:nightly-job',
      type: 'event',
      action: 'eventbridge-target',
      confidence: 'confirmado',
    },
  ]);
});

test('extractInfra(data).resources coincide con extractResources(walkResources(rootModule))', () => {
  const result = extractInfra(data);
  assert.deepEqual(result.resources, extractResources(walkResources(rootModule)));
});

test('extractInfra(data).edges devuelve exactamente las 7 aristas en orden (eventWiring, env-var, IAM) con confirmado/potencial correctos (ADR-0006)', () => {
  const result = extractInfra(data);
  assert.deepEqual(result.edges, [
    { from: 'arn:aws:s3:::uploads-bucket', to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload', type: 'storage', action: 's3-notification', confidence: 'confirmado' },
    { from: 'arn:aws:sqs:us-east-1:123456789012:jobs-queue', to: 'arn:aws:lambda:us-east-1:123456789012:function:consume-jobs', type: 'queue', action: 'event-source-mapping', confidence: 'confirmado' },
    { from: 'arn:aws:events:us-east-1:123456789012:rule/nightly-rule', to: 'arn:aws:lambda:us-east-1:123456789012:function:nightly-job', type: 'event', action: 'eventbridge-target', confidence: 'confirmado' },
    { from: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload', to: 'arn:aws:s3:::uploads-bucket', type: 'storage', confidence: 'confirmado', action: 'env:BUCKET_NAME' },
    { from: 'api-task', to: 'arn:aws:dynamodb:us-east-1:123456789012:table/sessions-table', type: 'db-compartida', confidence: 'confirmado', action: 'env:SESSIONS_TABLE' },
    { from: 'api-task-role', to: 'arn:aws:dynamodb:us-east-1:123456789012:table/sessions-table', type: 'db-compartida', confidence: 'confirmado', action: 'dynamodb:GetItem,dynamodb:PutItem' },
    { from: 'api-task-role', to: 'arn:aws:rds:us-east-1:123456789012:db:shared-db', type: 'db-compartida', confidence: 'potencial', action: 'rds-db:connect' },
  ]);
});

test('extractInfra degrada silenciosamente a {resources:[], edges:[]} sin root_module', () => {
  assert.deepEqual(extractInfra({ values: {} }), { resources: [], edges: [] });
  assert.deepEqual(extractInfra({}), { resources: [], edges: [] });
});
