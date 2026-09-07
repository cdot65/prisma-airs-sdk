/** @internal Read-only route exposure probe for Portkey configuration surfaces on SCM. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadLiveCredentials } from './live-credentials.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { AIGatewayClient } from '../src/index.js';
import { DEFAULT_AI_GW_ADMIN_ENDPOINT, DEFAULT_AI_GW_DATA_ENDPOINT } from '../src/constants.js';

const credentials = loadLiveCredentials();
try {
  const oauth = new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  });
  const token = await oauth.getToken();
  const gw = new AIGatewayClient({ numRetries: 0 });
  const workspace = (await gw.workspaces.list()).data[0];
  const integration = (await gw.integrations.list()).data[0];
  const mcp = (await gw.mcpIntegrations.list()).data[0];
  const guardrail = (await gw.guardrails.list({ workspaceId: workspace.id })).data[0];
  const routes = [
    '/collections',
    '/labels',
    '/prompts',
    '/prompts/partials',
    '/virtual-keys',
    '/users',
    '/users/invites',
    '/mcp-servers',
    '/policies/usage-limits',
    '/policies/rate-limits',
    '/secret-references',
    '/logs/exports',
    '/models',
    '/scim/workspaces',
    '/model-configs/pricing/openai/gpt-4o',
    '/analytics/graphs/requests',
    '/analytics/groups/ai-models',
    `/mcp-integrations/${mcp?.id ?? '550e8400-e29b-41d4-a716-446655440000'}/workspaces`,
    `/guardrails/${guardrail?.id ?? '550e8400-e29b-41d4-a716-446655440000'}/mcp-servers`,
    `/integrations/${integration.id}/models`,
  ];
  const results: {
    plane: string;
    route: string;
    status: number;
    opaDenied: boolean;
    errorCode?: string;
  }[] = [];
  for (const [plane, base] of [
    ['admin', DEFAULT_AI_GW_ADMIN_ENDPOINT],
    ['data', DEFAULT_AI_GW_DATA_ENDPOINT],
  ]) {
    for (const route of routes) {
      const url = new URL(base + route);
      url.searchParams.set('workspace_id', workspace.id);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-tsg-id': process.env.PANW_MGMT_TSG_ID! },
        signal: AbortSignal.timeout(20_000),
      });
      let payload: { data?: { errorCode?: string } } = {};
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        /* Status still identifies the route boundary. */
      }
      const result = {
        plane,
        route: route.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, '{id}'),
        status: response.status,
        opaDenied: response.headers.get('x-opa-decision') === 'false',
        errorCode: payload.data?.errorCode,
      };
      results.push(result);
      console.log(JSON.stringify(result));
    }
  }
  mkdirSync('artifacts/e2e', { recursive: true });
  writeFileSync(
    'artifacts/e2e/gateway-surface.json',
    JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + '\n',
  );
} finally {
  credentials.verifyUnchanged();
}
