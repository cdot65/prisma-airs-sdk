/** @internal Investigate the SCM workspace metadata rejection with one owned wire fixture. */
import { randomUUID } from 'node:crypto';
import { AIGatewayClient } from '../src/index.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { DEFAULT_AI_GW_ADMIN_ENDPOINT } from '../src/constants.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
const credentials = loadLiveCredentials();
const h = new LiveHarness();
const gw = new AIGatewayClient({ numRetries: 0 });
try {
  if (!process.argv.includes('--writes'))
    throw new Error('Pass --writes for an owned workspace fixture');
  const tag = `sdk-e2e-${randomUUID().slice(0, 8)}`;
  const scope = `ws_sdkprobe_${randomUUID().slice(0, 8)}`;
  const token = await new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  }).getToken();
  await h.check('workspaces.create.root-metadata-wire', async () => {
    const response = await fetch(`${DEFAULT_AI_GW_ADMIN_ENDPOINT}/workspaces`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tsg-id': process.env.PANW_MGMT_TSG_ID!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: tag, scope_name: scope, metadata: { scope_name: scope } }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await response.json()) as {
      id?: string;
      data?: { id?: string; errorCode?: string };
    };
    h.captureResponseShape('workspaces.create.wire', body);
    const id = body.id ?? body.data?.id;
    if (response.ok && id) {
      h.own('gateway.workspace', id, tag);
      h.defer('workspaces.archive', () => gw.workspaces.delete(id));
    }
    if (!response.ok)
      throw new Error(
        `Workspace wire probe returned HTTP ${response.status}, ${body.data?.errorCode ?? 'no code'}`,
      );
    if (!id) throw new Error('Workspace creation returned no resource identifier');
    return body;
  });
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('gateway-workspace-wire', true);
}
