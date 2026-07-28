import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayMcpIntegrationsClient } from '../../src/ai-gateway/mcp-integrations-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const mcpId = '2a6f4e2e-6f5a-4a1f-9d0e-9b2b6f6c3a11';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}
function mockFetch(data: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const sampleMcpIntegration = {
  id: mcpId,
  organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
  name: 'Context 7',
  owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
  status: 'active',
  type: 'MCP_INTEGRATION',
  url: 'https://mcp.context7.com/mcp',
  auth_type: 'none',
  transport: 'http',
  // JSON-encoded STRING on reads — the CREATE request sends an object; see the schema comment.
  configurations: '{}',
  created_at: '2026-07-17T00:42:44.000Z',
  last_updated_at: '2026-07-17T00:42:44.000Z',
};

describe('AIGatewayMcpIntegrationsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayMcpIntegrationsClient;

  beforeEach(() => {
    client = new AIGatewayMcpIntegrationsClient({
      baseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists organisation MCP integrations, keeping configurations as a JSON string', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleMcpIntegration] });
    const res = await client.list();

    expect(res.data[0].name).toBe('Context 7');
    expect(typeof res.data[0].configurations).toBe('string');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/mcp-integrations');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({
      method: 'GET',
    });
  });

  it('POSTs a new MCP integration', async () => {
    mockFetch({});
    await client.create({
      name: 'Context 7',
      organisation_id: '1852583913',
      slug: 'context-7',
      url: 'https://mcp.context7.com/mcp',
      auth_type: 'none',
      transport: 'http',
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/mcp-integrations');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('PUTs the workspaces sub-resource', async () => {
    mockFetch({});
    await client.setWorkspaces(mcpId, { global_workspace_access: true });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/mcp-integrations/${mcpId}/workspaces`);
    expect((init as RequestInit).method).toBe('PUT');
  });

  it('rejects setWorkspaces with an invalid mcpIntegrationId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.setWorkspaces('not-a-uuid', { global_workspace_access: true }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
