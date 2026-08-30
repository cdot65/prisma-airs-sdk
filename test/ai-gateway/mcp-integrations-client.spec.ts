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

  it('fetches MCP integration detail with configurations as an object', async () => {
    mockFetch({
      id: mcpId,
      name: 'Context 7',
      description: 'Documentation server',
      owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
      status: 'active',
      created_at: '2026-07-17T00:42:44.000Z',
      last_updated_at: '2026-07-17T00:42:44.000Z',
      configurations: { passthrough_headers: { 'x-api-key': 'configured' } },
      global_workspace_access: { enabled: true },
      workspace_id: null,
      slug: 'context-7',
      url: 'https://mcp.context7.com/mcp',
      auth_type: 'none',
      transport: 'http',
      type: 'MCP_INTEGRATION',
      secret_mappings: [],
      object: 'mcp-integration',
    });

    const result = await client.get(mcpId);

    expect(result.configurations).toEqual({
      passthrough_headers: { 'x-api-key': 'configured' },
    });
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      `https://admin.example.com/mcp-integrations/${mcpId}`,
    );
  });

  it('accepts nullable workspace access and secret mappings on newly created integrations', async () => {
    mockFetch({
      id: mcpId,
      name: 'New MCP',
      description: null,
      owner_id: 'owner',
      status: 'active',
      created_at: '2026-08-30T00:00:00Z',
      last_updated_at: '2026-08-30T00:00:00Z',
      configurations: {},
      global_workspace_access: null,
      workspace_id: null,
      slug: 'new-mcp',
      url: 'https://mcp.example.com/mcp',
      auth_type: 'none',
      transport: 'http',
      type: 'MCP_INTEGRATION',
      secret_mappings: null,
      object: 'mcp-integration',
    });
    await expect(client.get(mcpId)).resolves.toMatchObject({
      global_workspace_access: null,
      secret_mappings: null,
    });
  });

  it('lists MCP capabilities', async () => {
    mockFetch({
      object: 'list',
      counts: { tools: { total: 1, enabled: 1 } },
      total: 1,
      has_more: false,
      data: [
        {
          name: 'lookup',
          type: 'tool',
          title: null,
          description: 'Look up documentation',
          icons: null,
          enabled: true,
          created_at: '2026-07-17T00:42:44.000Z',
          last_updated_at: '2026-07-17T00:42:44.000Z',
          input_schema: { type: 'object' },
          output_schema: null,
          execution: null,
          annotations: { readOnlyHint: true },
          object: 'mcp-capability',
        },
      ],
    });

    const result = await client.getCapabilities(mcpId);

    expect(result.data[0].name).toBe('lookup');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      `https://admin.example.com/mcp-integrations/${mcpId}/capabilities`,
    );
  });

  it('fetches MCP server metadata', async () => {
    mockFetch({
      server_name: 'context7',
      server_version: '1.0.0',
      title: 'Context 7',
      description: 'Documentation server',
      website_url: null,
      icons: null,
      protocol_version: null,
      capability_flags: { tools: { listChanged: false } },
      instructions: '',
      sync_status: 'synced',
      last_synced_at: '2026-07-17T00:42:44.000Z',
      sync_error: null,
      object: 'mcp-integration-metadata',
    });

    const result = await client.getMetadata(mcpId);

    expect(result.sync_status).toBe('synced');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      `https://admin.example.com/mcp-integrations/${mcpId}/metadata`,
    );
  });

  it.each(['get', 'getCapabilities', 'getMetadata'] as const)(
    'rejects %s with an invalid mcpIntegrationId before issuing a request',
    async (method) => {
      globalThis.fetch = vi.fn();
      await expect(client[method]('not-a-uuid')).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    },
  );

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
    await expect(
      client.setWorkspaces(mcpId, {
        workspaces: [{ id: 'ws-develo-71f8d8', enabled: true }],
        global_workspace_access: { enabled: false },
        override_existing_workspace_access: true,
      }),
    ).resolves.toEqual({});

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/mcp-integrations/${mcpId}/workspaces`);
    expect((init as RequestInit).method).toBe('PUT');
  });

  it('rejects undocumented MCP workspace write response fields', async () => {
    mockFetch({ success: true });
    await expect(client.setWorkspaces(mcpId, { workspaces: [] })).rejects.toThrow(
      AISecSDKException,
    );
  });

  it('updates and deletes an MCP integration', async () => {
    mockFetch({});
    await client.update(mcpId, { name: 'Context 7 updated' });
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      `https://admin.example.com/mcp-integrations/${mcpId}`,
      expect.objectContaining({ method: 'PUT' }),
    );

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    await expect(client.delete(mcpId)).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      `https://admin.example.com/mcp-integrations/${mcpId}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('bulk updates MCP capabilities', async () => {
    mockFetch({ success: true });
    const body = { capabilities: [{ name: 'lookup', type: 'tool' as const, enabled: false }] };
    await expect(client.setCapabilities(mcpId, body)).resolves.toEqual({ success: true });
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/mcp-integrations/${mcpId}/capabilities`);
    expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify(body) });
  });

  it.each(['update', 'delete', 'setCapabilities'] as const)(
    'rejects %s with an invalid mcpIntegrationId before issuing a request',
    async (method) => {
      globalThis.fetch = vi.fn();
      const call =
        method === 'update'
          ? client.update('not-a-uuid', { name: 'x' })
          : method === 'setCapabilities'
            ? client.setCapabilities('not-a-uuid', {
                capabilities: [{ name: 'lookup', type: 'tool', enabled: true }],
              })
            : client.delete('not-a-uuid');
      await expect(call).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    },
  );

  it('rejects setWorkspaces with an invalid mcpIntegrationId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.setWorkspaces('not-a-uuid', { global_workspace_access: { enabled: true } }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
