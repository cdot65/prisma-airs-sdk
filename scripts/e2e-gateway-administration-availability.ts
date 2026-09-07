/** @internal Status-only SCM administration discovery; never mutate IAM or retain user payloads. */
import assert from 'node:assert/strict';
import { AIGatewayClient, AISecSDKException, ErrorType } from '../src/index.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import {
  DEFAULT_AI_GW_ADMIN_ENDPOINT,
  DEFAULT_AI_GW_DATA_ENDPOINT,
  DEFAULT_TOKEN_ENDPOINT,
} from '../src/constants.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';
import { administrationReadProbes } from './e2e/administration-probes.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const rows: {
  plane: string;
  name: string;
  sourcePath: string;
  pathTemplate: string;
  queryNames: string[];
  status: number;
  opaDenied: boolean;
  available: boolean;
}[] = [];

try {
  const gateway = new AIGatewayClient({
    numRetries: 0,
    dataEndpoint: DEFAULT_AI_GW_DATA_ENDPOINT,
    adminEndpoint: DEFAULT_AI_GW_ADMIN_ENDPOINT,
    tokenEndpoint: DEFAULT_TOKEN_ENDPOINT,
  });
  const workspace = await gateway.workspaces.get('ws-develo-71f8d8');
  assert.equal(workspace.slug, 'ws-develo-71f8d8');
  harness.protect(workspace);
  const probes = administrationReadProbes(workspace.id);
  const token = await new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
    tokenEndpoint: DEFAULT_TOKEN_ENDPOINT,
  }).getToken();
  harness.protect(token);
  for (const [plane, endpoint] of [
    ['data', DEFAULT_AI_GW_DATA_ENDPOINT],
    ['admin', DEFAULT_AI_GW_ADMIN_ENDPOINT],
  ] as const) {
    const control = await harness.check(`${plane}.workspace-auth-control`, async () => {
      const value = await gateway.workspaces.get(workspace.id, { plane });
      assert.equal(value.id, workspace.id);
      assert.equal(value.slug, workspace.slug);
      return true;
    });
    assert(control, 'The plane authentication control must pass before route discovery');
    for (const probe of probes) {
      await harness.check(`${plane}.${probe.name}`, async () => {
        const url = new URL(endpoint + probe.path);
        for (const [key, value] of Object.entries(probe.query)) url.searchParams.set(key, value);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        timer.unref();
        try {
          const response = await fetch(url, {
            method: probe.method,
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tsg-id': process.env.PANW_MGMT_TSG_ID!,
              Accept: 'application/json',
            },
            redirect: 'error',
            signal: controller.signal,
          });
          rows.push({
            plane,
            name: probe.name,
            sourcePath: probe.sourcePath,
            pathTemplate: probe.pathTemplate,
            queryNames: Object.keys(probe.query).sort(),
            status: response.status,
            opaDenied: response.headers.get('x-opa-decision') === 'false',
            available: response.ok,
          });
          // Availability discovery needs only status/OPA headers, not member identities,
          // emails or virtual-key payloads. Abort after cancellation starts so it cannot hang.
          const cancel = response.body?.cancel();
          controller.abort();
          await cancel;
          if (!response.ok)
            throw new AISecSDKException(
              'Administration route did not return a successful status',
              response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
              { statusCode: response.status, failureKind: 'http' },
            );
          return true;
        } finally {
          clearTimeout(timer);
          controller.abort();
        }
      });
    }
  }
} catch (error) {
  await harness.check('administration.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  writePrivateReport('artifacts/e2e/gateway-administration-availability-observations.json', {
    checkedAt: new Date().toISOString(),
    credentialsUnchanged: true,
    mutations: false,
    responseBodiesRetained: false,
    disclosure:
      'GET-only route hypotheses with explicit upstream pagination and verified-neighbor Prisma path alternatives. No users, memberships, invitations, SCIM mappings or keys are changed. Status and OPA headers only; neither a 2xx nor denial certifies a response schema or the entire family.',
    attempted: rows.length,
    available: rows.filter((row) => row.available).length,
    rows,
  });
  harness.finish('gateway-administration-availability', true);
}
