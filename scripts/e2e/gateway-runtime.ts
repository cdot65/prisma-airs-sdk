/** @internal Reproducible runtime verification from read-only SCM credentials and disposable keys. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AIGatewayClient, GatewayServiceApiKeyCreateRequestSchema } from '../../src/index.js';
import { loadLiveCredentials } from '../live-credentials.js';
import { LiveHarness } from './harness.js';
import { gatewayIpv4Lookup } from './gateway-network.js';

export async function runtimeSuite(
  name: string,
  run: (context: {
    harness: LiveHarness;
    management: AIGatewayClient;
    endpoint: string;
    apiKey: string;
    workspaceId: string;
    tag: string;
  }) => Promise<void>,
): Promise<void> {
  const credentials = loadLiveCredentials();
  const harness = new LiveHarness();
  const management = new AIGatewayClient({ numRetries: 0 });
  const endpoint = process.env.E2E_GATEWAY_INFERENCE_ENDPOINT ?? 'https://airs.cdot.io/v1';
  const restoreLookup = gatewayIpv4Lookup(endpoint);
  const tag = `sdk-e2e-inference-${randomUUID().slice(0, 8)}`;
  try {
    assert(
      process.argv.includes('--writes'),
      'Pass --writes to create and retire an owned runtime key',
    );
    const workspace = await management.workspaces.get(
      process.env.E2E_GATEWAY_WORKSPACE ?? 'ws-develo-71f8d8',
    );
    const sourceKeys = await management.apiKeys.listService({ workspaceId: workspace.id });
    sourceKeys.data.forEach((key) => harness.protect(key));
    const source = sourceKeys.data.find(
      (key) => Array.isArray(key.scopes) && key.scopes.length > 0,
    );
    assert(source, 'No established runtime service-key scopes in the requested workspace');
    const created = await management.apiKeys.createService(
      GatewayServiceApiKeyCreateRequestSchema.parse({
        organisation_id: process.env.PANW_MGMT_TSG_ID,
        workspace_id: workspace.id,
        name: tag,
        type: source.type,
        scopes: source.scopes,
        expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      }),
    );
    harness.protect(created);
    const keyId = created.id;
    assert(typeof keyId === 'string', 'Created key lacks a resource ID');
    harness.own('gateway.service-api-key', keyId, tag);
    harness.defer('runtime-key.retired', () => management.apiKeys.deleteService(keyId));
    assert(
      typeof created.key === 'string' && created.key.length > 0,
      'Created key lacks runtime credential',
    );
    await run({
      harness,
      management,
      endpoint,
      apiKey: created.key,
      workspaceId: workspace.id,
      tag,
    });
  } catch (error) {
    await harness.check('runtime.prerequisites', async () => {
      throw error;
    });
  } finally {
    try {
      await harness.cleanup();
      credentials.verifyUnchanged();
      harness.finish(name, true);
    } finally {
      restoreLookup();
    }
  }
}
