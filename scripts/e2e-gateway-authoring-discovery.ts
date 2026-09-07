/** @internal GET-only contract discovery in the explicitly requested dev workspace. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { AIGatewayClient } from '../src/index.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { DEFAULT_AI_GW_ADMIN_ENDPOINT, DEFAULT_AI_GW_DATA_ENDPOINT } from '../src/constants.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const results: {
  plane: string;
  path: string;
  workspaceQuery: string;
  status: number;
  opaDenied: boolean;
  errorCode?: string;
  available: boolean;
}[] = [];
try {
  const gateway = new AIGatewayClient({ numRetries: 0 });
  const workspace = await gateway.workspaces.get('ws-develo-71f8d8');
  assert.equal(workspace.slug, 'ws-develo-71f8d8');
  const token = await new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  }).getToken();
  harness.protect(token);
  for (const [plane, endpoint] of [
    ['data', DEFAULT_AI_GW_DATA_ENDPOINT],
    ['admin', DEFAULT_AI_GW_ADMIN_ENDPOINT],
  ] as const) {
    await harness.check(`${plane}.dev-workspace-auth-control`, () =>
      gateway.workspaces.get(workspace.id, { plane }),
    );
    for (const path of [
      '/collections',
      '/labels',
      '/prompts',
      '/prompts/partials',
      '/secret-references',
      '/users',
      '/admin/users',
      '/scim/workspaces',
      '/model-configs/pricing/openai/gpt-5.6-terra',
      '/model-configs/pricing/openai/text-embedding-3-small',
    ]) {
      for (const mode of ['id', 'slug', 'none'] as const) {
        // The pinned collection-list operation requires workspace_id; never treat an invalid
        // no-workspace request as availability evidence for that route.
        if (mode === 'none' && path === '/collections') continue;
        const url = new URL(endpoint + path);
        if (mode !== 'none')
          url.searchParams.set('workspace_id', mode === 'id' ? workspace.id : workspace.slug!);
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tsg-id': process.env.PANW_MGMT_TSG_ID!,
            Accept: 'application/json',
          },
          redirect: 'error',
          signal: AbortSignal.timeout(15_000),
        });
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          /* Non-JSON is still a route result. */
        }
        let errorCode: string | undefined;
        if (payload && typeof payload === 'object' && 'data' in payload) {
          const data = payload.data;
          if (
            data &&
            typeof data === 'object' &&
            'errorCode' in data &&
            typeof data.errorCode === 'string' &&
            /^AB\d{2}$/.test(data.errorCode)
          )
            errorCode = data.errorCode;
        }
        const row = {
          plane,
          path,
          workspaceQuery: mode,
          status: response.status,
          opaDenied: response.headers.get('x-opa-decision') === 'false',
          errorCode,
          available: response.ok,
        };
        results.push(row);
        if (response.ok) harness.captureResponseShape(`${plane}:${path}:${mode}`, payload);
        console.log(JSON.stringify(row));
      }
    }
  }
} catch (error) {
  await harness.check('discovery.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('gateway-authoring-discovery', true);
  const report = {
    checkedAt: new Date().toISOString(),
    workspace: 'dev',
    workspaceSlug: 'ws-develo-71f8d8',
    credentialsUnchanged: true,
    mutations: false,
    disclosure:
      'GET-only SCM discovery with explicit dev ID/slug and omitted optional workspace queries. Only 2xx results establish availability; denial is not proof the family is unsupported. Discovery results are not passing SDK operation tests.',
    attempted: results.length,
    available: results.filter((row) => row.available).length,
    results,
  };
  mkdirSync('artifacts/e2e', { recursive: true, mode: 0o700 });
  writeFileSync(
    'artifacts/e2e/gateway-authoring-availability.json',
    JSON.stringify(report, null, 2) + '\n',
    { mode: 0o600 },
  );
}
