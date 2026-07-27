import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayDeploymentsClient } from '../../src/ai-gateway/deployments-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const depId = '21414819-485e-4ba3-b3d3-3e1815580e43';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}
function mockFetch(data: unknown, text?: string) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(text ?? JSON.stringify(data)),
  });
}

const sampleDeployment = {
  id: depId,
  name: 'talos',
  slug: 'dp-talos-f3b74e',
  type: 'production',
  status: 'active',
  created_at: '2026-07-17T00:42:44.000Z',
  last_updated_at: '2026-07-17T00:42:44.000Z',
  last_synced_at: null,
  last_resynced_at: null,
  is_default: 0,
  created_by: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
  object: 'deployment',
};

describe('AIGatewayDeploymentsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayDeploymentsClient;

  beforeEach(() => {
    client = new AIGatewayDeploymentsClient({
      baseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists deployments', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleDeployment] });
    const res = await client.list();

    expect(res.data[0].slug).toBe('dp-talos-f3b74e');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/deployments');
  });

  it('fetches one deployment', async () => {
    mockFetch({
      ...sampleDeployment,
      credentials: { username: 'u', password: '***' },
      deployment_config: null,
    });
    const res = await client.get(depId);

    expect(res.name).toBe('talos');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/deployments/${depId}`);
  });

  it('parses the create RECEIPT, which is not a deployment record', async () => {
    mockFetch({
      id: depId,
      client_auth: 'client-auth-abc',
      credentials: { username: '1852583913', password: 's3cret' },
      organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
      object: 'deployment',
    });

    const res = await client.create({
      name: 'prod',
      type: 'production',
      organisation_id: '1852583913',
      auth_settings: { allow_all_workspaces: true },
    });

    expect(res.credentials.password).toBe('s3cret');
    expect((res as unknown as { name?: string }).name).toBeUndefined();
    expect((res as unknown as { slug?: string }).slug).toBeUndefined();
    expect((res as unknown as { status?: string }).status).toBeUndefined();
  });

  it('tolerates DELETE returning 200 with an empty body', async () => {
    mockFetch(undefined, '');
    await expect(client.delete(depId, '1852583913')).resolves.toBeUndefined();

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init as RequestInit).method).toBe('DELETE');
    expect(new URL(url as string).searchParams.get('organisation_id')).toBe('1852583913');
  });

  it('rejects get with an invalid deploymentId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.get('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects delete with an invalid deploymentId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.delete('not-a-uuid', '1852583913')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
