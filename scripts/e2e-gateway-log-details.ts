/** @internal Read-only detail probe using a real log's documented storage metadata. */
import assert from 'node:assert/strict';
import { AIGatewayClient, AISecSDKException, ErrorType } from '../src/index.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { DEFAULT_AI_GW_DATA_ENDPOINT } from '../src/constants.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
const credentials = loadLiveCredentials();
const h = new LiveHarness();
try {
  const gw = new AIGatewayClient({ numRetries: 0 });
  const token = await new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  }).getToken();
  let found = false;
  for (const workspace of (await gw.workspaces.list()).data) {
    const row = (await gw.telemetry.logs({ workspaceSlug: workspace.slug, pageSize: 1 })).data
      .records[0];
    if (!row) continue;
    found = true;
    for (const variant of ['native-storage-metadata', 'v2-iso-timestamp'])
      await h.check(`logs.detail.${variant}`, async () => {
        const url = new URL(`${DEFAULT_AI_GW_DATA_ENDPOINT}/logs/${encodeURIComponent(row.id)}`);
        url.searchParams.set('workspace_id', workspace.id);
        url.searchParams.set(
          'path_format',
          variant === 'native-storage-metadata' ? row.log_store_file_path_format : 'v2',
        );
        url.searchParams.set(
          'created_at',
          variant === 'native-storage-metadata'
            ? row.created_at
            : new Date(
                row.created_at.endsWith('Z')
                  ? row.created_at
                  : row.created_at.replace(' ', 'T') + 'Z',
              ).toISOString(),
        );
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tsg-id': process.env.PANW_MGMT_TSG_ID!,
            'x-portkey-workspace-id': workspace.id,
          },
          signal: AbortSignal.timeout(20_000),
        });
        const body = await response.json();
        h.captureResponseShape(`logs.detail.${variant}.wire`, body);
        if (!response.ok)
          throw new AISecSDKException(
            'Log detail probe did not return success',
            response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
            { statusCode: response.status, failureKind: 'http' },
          );
        assert(body && typeof body === 'object');
        return body;
      });
    break;
  }
  if (!found) h.skip('logs.detail', 'No accessible log metadata was available.');
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  h.finish('gateway-log-details', true);
}
