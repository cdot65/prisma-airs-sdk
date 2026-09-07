/** @internal Read-only capability discovery on the explicit dev gateway, not Portkey Cloud. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runtimeSuite } from './e2e/gateway-runtime.js';

const results: { path: string; status: number; contentType: string | null; outcome: string }[] = [];
await runtimeSuite('gateway-runtime-families', async ({ harness, endpoint, apiKey }) => {
  assert.equal(
    new URL(endpoint).origin,
    'https://airs.cdot.io',
    'Discovery is scoped to the designated gateway',
  );
  for (const path of [
    '/models',
    '/assistants',
    '/fine_tuning/jobs',
    '/collections',
    '/labels',
    '/prompts',
    '/prompts/partials',
    '/virtual-keys',
    '/admin/users/invites',
    '/admin/users',
    '/scim/workspaces',
    '/secret-references',
  ]) {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}${path}`, {
      headers: {
        'x-portkey-api-key': apiKey,
        'x-portkey-provider': '@openai',
        ...(path === '/assistants' ? { 'OpenAI-Beta': 'assistants=v2' } : {}),
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const row = {
      path,
      status: response.status,
      contentType: response.headers.get('content-type'),
      outcome: response.ok ? 'available' : 'not-live-verified',
    };
    results.push(row);
    console.log(JSON.stringify(row));
    if (response.ok) {
      const body = await response.json();
      harness.captureResponseShape(path, body);
    } else await response.body?.cancel();
  }
  await harness.check('runtime.authentication-positive-control', async () => {
    assert.equal(results.find((row) => row.path === '/models')?.status, 200);
  });
});
mkdirSync('artifacts/e2e', { recursive: true });
writeFileSync(
  'artifacts/e2e/gateway-runtime-family-discovery.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      scope:
        'GET-only discovery through the explicit gateway and owned short-lived key. A non-2xx result is not proof the entire upstream family is unsupported.',
      results,
    },
    null,
    2,
  ) + '\n',
  { mode: 0o600 },
);
