/** @internal Owned, unbound secret-reference route discovery. No real secret-manager credentials. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AIGatewayClient, AISecSDKException, ErrorType } from '../src/index.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { DEFAULT_AI_GW_ADMIN_ENDPOINT } from '../src/constants.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const h = new LiveHarness();
const name = `sdk-e2e-secret-${randomUUID().slice(0, 8)}`;
try {
  assert(process.argv.includes('--writes'), 'Pass --writes for this disposable reference test');
  const gw = new AIGatewayClient({ numRetries: 0 });
  const workspace = await gw.workspaces.get('ws-develo-71f8d8');
  assert.equal(workspace.slug, 'ws-develo-71f8d8');
  const token = await new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  }).getToken();
  h.protect(token);
  async function wire(method: string, path: string, body?: unknown, expected = 200) {
    const response = await fetch(DEFAULT_AI_GW_ADMIN_ENDPOINT + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tsg-id': process.env.PANW_MGMT_TSG_ID!,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => undefined);
    h.captureResponseShape(`${method} ${path.split('?')[0]}`, payload);
    if (response.status !== expected)
      throw new AISecSDKException(
        'Secret-reference discovery returned an unexpected HTTP status',
        response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
        { failureKind: 'http', statusCode: response.status },
      );
    return payload as Record<string, unknown>;
  }
  await h.check('secretReferences.list.admin', async () => {
    const result = await wire('GET', '/secret-references?current_page=0&page_size=1');
    assert.equal(result.object, 'list');
    assert.equal(typeof result.total, 'number');
    assert(Array.isArray(result.data));
    return result;
  });
  const created = await h.check('secretReferences.create.unbound-synthetic', async () => {
    const result = await wire('POST', '/secret-references', {
      organisation_id: process.env.PANW_MGMT_TSG_ID!,
      name,
      slug: name,
      description:
        'Disposable SDK fixture. Invalid synthetic credentials; never bound or resolved.',
      manager_type: 'aws_sm',
      auth_config: {
        aws_auth_type: 'accessKey',
        aws_access_key_id: 'AKIA0000000000000000',
        aws_secret_access_key: 'sdk-e2e-invalid-secret-manager-credential',
        aws_region: 'us-east-1',
      },
      secret_path: `${name}/never-resolve`,
      allow_all_workspaces: false,
      allowed_workspaces: [workspace.id],
    });
    // Journal the returned identity before interpreting other fields, even on a schema mismatch.
    assert.equal(typeof result.id, 'string');
    const id = result.id as string;
    h.own('gateway.secret-reference', id, name);
    h.defer('secretReferences.delete-and-confirm', async () => {
      await wire('DELETE', `/secret-references/${encodeURIComponent(id)}`);
      await wire('GET', `/secret-references/${encodeURIComponent(id)}`, undefined, 404);
    });
    assert.equal(result.slug, name);
    return result;
  });
  if (created) {
    const path = `/secret-references/${encodeURIComponent(created.id as string)}`;
    await h.check('secretReferences.get.owned', async () => {
      const result = await wire('GET', path);
      assert.equal(result.id, created.id);
      assert.equal(result.name, name);
      assert.equal(result.allow_all_workspaces, false);
      return result;
    });
    await h.check('secretReferences.update.owned', () =>
      wire('PUT', path, { description: 'Updated disposable SDK secret-reference fixture' }),
    );
    await h.check('secretReferences.updated-roundtrip', async () => {
      const result = await wire('GET', path);
      assert.equal(result.description, 'Updated disposable SDK secret-reference fixture');
      return result;
    });
  } else {
    h.skip(
      'secretReferences.get-update-delete',
      'Creation failed; no existing reference was changed.',
    );
  }
} catch (error) {
  await h.check('discovery.prerequisites', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('gateway-secret-reference-discovery', true);
}
