/** @internal Bounded synthetic audit-log/feedback exposure probe. No provider inference occurs. */
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadLiveCredentials } from './live-credentials.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { AIGatewayClient } from '../src/index.js';
import { DEFAULT_AI_GW_ADMIN_ENDPOINT, DEFAULT_AI_GW_DATA_ENDPOINT } from '../src/constants.js';

const credentials = loadLiveCredentials();
const results: {
  plane: string;
  method: string;
  route: string;
  status: number;
  opaDenied: boolean;
  errorCode?: string;
  keys: string[];
}[] = [];
const trace = randomUUID();
try {
  const token = await new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  }).getToken();
  const workspace = (await new AIGatewayClient({ numRetries: 0 }).workspaces.list()).data[0];
  for (const [plane, base] of [
    ['data', DEFAULT_AI_GW_DATA_ENDPOINT],
    ['admin', DEFAULT_AI_GW_ADMIN_ENDPOINT],
  ]) {
    for (const [method, path, body] of [
      ['GET', `/logs/${trace}`, undefined],
      [
        'POST',
        '/logs',
        {
          request: {
            url: 'https://example.invalid/sdk-e2e-no-network-call',
            method: 'POST',
            headers: {},
            body: { prompt: 'SDK synthetic audit fixture' },
          },
          response: { status: 200, headers: {}, body: { output: 'SDK_TEST_OK' }, response_time: 1 },
          metadata: { trace_id: trace },
        },
      ],
      ['POST', '/feedback', { trace_id: trace, value: 0, metadata: { sdk_e2e: true } }],
    ] as const) {
      const url = new URL(base + path);
      url.searchParams.set('workspace_id', workspace.id);
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tsg-id': process.env.PANW_MGMT_TSG_ID!,
          'Content-Type': 'application/json',
          'x-portkey-workspace-id': workspace.id,
        },
        body: body && JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await response.json()) as typeof data;
      } catch {
        /* Non-JSON failures remain identified by status. */
      }
      const result = {
        plane,
        method,
        route: path.replace(trace, '{owned-trace}'),
        status: response.status,
        opaDenied: response.headers.get('x-opa-decision') === 'false',
        errorCode: (data.data as { errorCode?: string })?.errorCode,
        keys: Object.keys(data),
      };
      results.push(result);
      console.log(JSON.stringify(result));
    }
  }
} finally {
  credentials.verifyUnchanged();
  mkdirSync('artifacts/e2e', { recursive: true });
  writeFileSync(
    'artifacts/e2e/gateway-log-surface.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        credentialsUnchanged: true,
        ownedSyntheticTrace: trace,
        note: 'If accepted, synthetic audit records have no delete API. No existing traces were altered.',
        results,
      },
      null,
      2,
    ) + '\n',
  );
}
