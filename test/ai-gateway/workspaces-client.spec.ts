import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayWorkspacesClient } from '../../src/ai-gateway/workspaces-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const wsId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}
function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const sampleWorkspace = {
  id: wsId,
  slug: 'ws-main-a-349e0e',
  name: 'talos_k8s_cluster',
  icon: null,
  description: 'Default workspace',
  created_at: '2026-07-16T15:48:18.000Z',
  last_updated_at: '2026-07-17T12:25:22.000Z',
  is_default: 0,
  status: 'active',
  scope_name: 'main_airs_workspace_1852583913',
  object: 'workspace',
};

describe('AIGatewayWorkspacesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayWorkspacesClient;

  beforeEach(() => {
    client = new AIGatewayWorkspacesClient({
      baseUrl: 'https://gw.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('GETs /workspaces with no params', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleWorkspace] });
    const res = await client.list();

    expect(res.data[0].slug).toBe('ws-main-a-349e0e');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://gw.example.com/workspaces');
  });

  it('rejects a non-UUID id before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.get('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
