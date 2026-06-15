import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchOne, matchMethod, queryCapability, queryImpact, queryInfraImpact } from './matching.js';

test('caso real validado (P6): consumo frontend env:VITE_API_URL/public/invitations/:param matchea endpoint backend → posible', () => {
  const systems = [{
    canonicalName: 'frontend-app',
    repoPath: '/path/to/projects/frontend-app',
    publishedAt: '2026-06-13T00:00:00Z',
    endpoints: [],
    consumptions: [{ method: 'GET', target: 'env:VITE_API_URL/public/invitations/:param', file: 'src/services/api/invitations.ts' }],
  }];
  const res = queryImpact(systems, { method: 'GET', path: '/api/v1/public/invitations/{token}' });
  assert.equal(res.length, 1);
  assert.equal(res[0].confidence, 'posible');
  assert.equal(res[0].canonicalName, 'frontend-app');
  assert.equal(res[0].file, 'src/services/api/invitations.ts');
});

test('match exacto: target sin prefijo env:, ruta normalizada idéntica al endpoint → exacto', () => {
  const systems = [{
    canonicalName: 'svc-a',
    repoPath: '/repo/a',
    publishedAt: '2026-06-13T00:00:00Z',
    endpoints: [],
    consumptions: [{ method: 'GET', target: '/api/v1/public/invitations/:param', file: 'x.ts' }],
  }];
  const res = queryImpact(systems, { method: 'GET', path: '/api/v1/public/invitations/{token}' });
  assert.equal(res.length, 1);
  assert.equal(res[0].confidence, 'exacto');
});

test('sin match: ruta consultada que no coincide con ningún consumo → []', () => {
  const systems = [
    {
      canonicalName: 'frontend-app', repoPath: '/r/f', publishedAt: 't', endpoints: [],
      consumptions: [{ method: 'GET', target: 'env:VITE_API_URL/public/invitations/:param', file: 'a.ts' }],
    },
    {
      canonicalName: 'svc-a', repoPath: '/r/a', publishedAt: 't', endpoints: [],
      consumptions: [{ method: 'GET', target: '/api/v1/public/invitations/:param', file: 'x.ts' }],
    },
  ];
  const res = queryImpact(systems, { method: 'GET', path: '/no/existe' });
  assert.deepEqual(res, []);
});

test('target (dynamic) nunca matchea → []', () => {
  const systems = [{
    canonicalName: 'svc-a', repoPath: '/r/a', publishedAt: 't', endpoints: [],
    consumptions: [{ method: 'GET', target: '(dynamic)', file: 'x.ts' }],
  }];
  const res = queryImpact(systems, { method: 'GET', path: '/cualquier/ruta' });
  assert.deepEqual(res, []);
});

test('c.method === null degrada exacto a posible', () => {
  const systems = [{
    canonicalName: 'svc-a', repoPath: '/r/a', publishedAt: 't', endpoints: [],
    consumptions: [{ method: null, target: '/api/v1/public/invitations/:param', file: 'x.ts' }],
  }];
  const res = queryImpact(systems, { method: 'GET', path: '/api/v1/public/invitations/{token}' });
  assert.equal(res.length, 1);
  assert.equal(res[0].confidence, 'posible');
});

test('forma {system} (reverse lookup): consumers del propio endpoint, excluyendo self', () => {
  const systems = [
    {
      canonicalName: 'backend-service',
      repoPath: '/path/to/projects/backend-service',
      publishedAt: '2026-06-13T00:00:00Z',
      endpoints: [{ method: 'GET', path: '/api/v1/public/invitations/{token}' }],
      consumptions: [],
    },
    {
      canonicalName: 'frontend-app',
      repoPath: '/path/to/projects/frontend-app',
      publishedAt: '2026-06-13T00:00:00Z',
      endpoints: [],
      consumptions: [{ method: 'GET', target: 'env:VITE_API_URL/public/invitations/:param', file: 'src/services/api/invitations.ts' }],
    },
  ];
  const res = queryImpact(systems, { system: 'backend-service' });
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].endpoint, { method: 'GET', path: '/api/v1/public/invitations/{token}' });
  assert.equal(res[0].consumers.length, 1);
  assert.equal(res[0].consumers[0].canonicalName, 'frontend-app');
  assert.equal(res[0].consumers[0].confidence, 'posible');
});

test('forma {system} excluye consumos del propio sistema contra sus propios endpoints', () => {
  const systems = [{
    canonicalName: 'svc-self',
    repoPath: '/r/self',
    publishedAt: 't',
    endpoints: [{ method: 'GET', path: '/api/v1/things/{id}' }],
    consumptions: [{ method: 'GET', target: '/api/v1/things/:param', file: 'x.ts' }],
  }];
  const res = queryImpact(systems, { system: 'svc-self' });
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].consumers, []);
});

test('sistema inexistente en forma {system} → null', () => {
  const systems = [{ canonicalName: 'svc-a', repoPath: '/r/a', publishedAt: 't', endpoints: [], consumptions: [] }];
  assert.equal(queryImpact(systems, { system: 'no-existe' }), null);
});

// --- Cobertura directa de matchOne (5 branches) y matchMethod ---

test('matchOne: target (dynamic) → null', () => {
  assert.equal(matchOne('/a/b', '(dynamic)'), null);
});

test('matchOne: rutas idénticas → exacto', () => {
  assert.equal(matchOne('/a/b/:param', '/a/b/:param'), 'exacto');
});

test('matchOne: env:VAR + sufijo coincidente → posible', () => {
  assert.equal(matchOne('/api/v1/public/invitations/:param', 'env:VITE_API_URL/public/invitations/:param'), 'posible');
});

test('matchOne: env:VAR con stripped que no es sufijo → null', () => {
  assert.equal(matchOne('/api/v1/orders', 'env:VITE_API_URL/products'), null);
});

test('matchOne: env:VAR sin resto (stripped vacío) → null', () => {
  assert.equal(matchOne('/api/v1/orders', 'env:VITE_API_URL'), null);
});

test('matchOne: sin env:, sufijo no idéntico → posible', () => {
  assert.equal(matchOne('/api/v1/orders', '/orders'), 'posible');
});

test('matchOne: sin env:, sin relación → null', () => {
  assert.equal(matchOne('/api/v1/orders', '/products'), null);
});

test('matchMethod: método null → true; coincidencia case-insensitive → true; distinto → false', () => {
  assert.equal(matchMethod('GET', null), true);
  assert.equal(matchMethod('GET', 'get'), true);
  assert.equal(matchMethod('GET', 'POST'), false);
});

test('queryCapability ordena exacto antes que posible y por canonicalName dentro del grupo', () => {
  const systems = [
    { canonicalName: 'zeta', repoPath: '/z', publishedAt: 't', endpoints: [], consumptions: [{ method: 'GET', target: '/api/v1/orders/:param', file: 'z.ts' }] },
    { canonicalName: 'beta', repoPath: '/b', publishedAt: 't', endpoints: [], consumptions: [{ method: 'GET', target: '/orders/:param', file: 'b.ts' }] },
    { canonicalName: 'alpha', repoPath: '/a', publishedAt: 't', endpoints: [], consumptions: [{ method: 'GET', target: '/orders/:param', file: 'a.ts' }] },
  ];
  const res = queryCapability(systems, 'GET', '/api/v1/orders/:param');
  assert.deepEqual(res.map((r) => [r.canonicalName, r.confidence]), [
    ['zeta', 'exacto'],
    ['alpha', 'posible'],
    ['beta', 'posible'],
  ]);
});

// --- queryInfraImpact (Fase 3, BR-021) ---

test('queryInfraImpact: match por from (ARN exacto) devuelve la arista con su sistema publicador', () => {
  const systems = [
    {
      canonicalName: 'infra-service', repoPath: '/r/infra', publishedAt: 't', endpoints: [], consumptions: [],
      infraEdges: [{ from: 'arn:aws:s3:::uploads-bucket', to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload', type: 'storage', confidence: 'confirmado', action: 's3-notification' }],
    },
    { canonicalName: 'svc-sin-infra', repoPath: '/r/svc', publishedAt: 't', endpoints: [], consumptions: [] },
  ];
  const res = queryInfraImpact(systems, 'arn:aws:s3:::uploads-bucket');
  assert.equal(res.length, 1);
  assert.equal(res[0].canonicalName, 'infra-service');
  assert.equal(res[0].from, 'arn:aws:s3:::uploads-bucket');
  assert.equal(res[0].to, 'arn:aws:lambda:us-east-1:123456789012:function:process-upload');
  assert.equal(res[0].type, 'storage');
  assert.equal(res[0].confidence, 'confirmado');
  assert.equal(res[0].action, 's3-notification');
});

test('queryInfraImpact: match por to (no solo por from)', () => {
  const systems = [{
    canonicalName: 'infra-service', repoPath: '/r/infra', publishedAt: 't', endpoints: [], consumptions: [],
    infraEdges: [{ from: 'arn:aws:s3:::uploads-bucket', to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload', type: 'storage', confidence: 'confirmado', action: 's3-notification' }],
  }];
  const res = queryInfraImpact(systems, 'arn:aws:lambda:us-east-1:123456789012:function:process-upload');
  assert.equal(res.length, 1);
  assert.equal(res[0].canonicalName, 'infra-service');
});

test('queryInfraImpact: recurso que no aparece en ninguna arista → []', () => {
  const systems = [{
    canonicalName: 'infra-service', repoPath: '/r/infra', publishedAt: 't', endpoints: [], consumptions: [],
    infraEdges: [{ from: 'arn:aws:s3:::uploads-bucket', to: 'arn:aws:lambda:us-east-1:123456789012:function:process-upload', type: 'storage', confidence: 'confirmado', action: 's3-notification' }],
  }];
  assert.deepEqual(queryInfraImpact(systems, 'no-existe'), []);
});

test('queryInfraImpact: sistema sin infraEdges (campo ausente) no rompe y no contribuye resultados', () => {
  const systems = [{ canonicalName: 'svc-a', repoPath: '/r/a', publishedAt: 't', endpoints: [], consumptions: [] }];
  assert.deepEqual(queryInfraImpact(systems, 'cualquier-cosa'), []);
});
