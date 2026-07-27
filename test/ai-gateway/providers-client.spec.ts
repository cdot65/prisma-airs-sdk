import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayProvidersClient } from '../../src/ai-gateway/providers-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const wsId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';

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

describe('AIGatewayProvidersClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayProvidersClient;

  beforeEach(() => {
    client = new AIGatewayProvidersClient({
      baseUrl: 'https://gw.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists providers scoped to a workspace', async () => {
    mockFetch({
      object: 'list',
      total: 1,
      data: [{ id: 'f6692544-3265-49be-9711-bbdcebc079e4', slug: 'openai-calvin' }],
    });
    const res = await client.list({ workspaceId: wsId });

    expect(res.data[0].slug).toBe('openai-calvin');
    const u = new URL((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(u.pathname).toBe('/providers');
    expect(u.searchParams.get('workspace_id')).toBe(wsId);
  });

  it('POSTs a provider binding to /providers', async () => {
    mockFetch({});
    await client.create({
      workspace_id: wsId,
      ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
      integration_id: 'f6692544-3265-49be-9711-bbdcebc079e4',
      name: 'openai-calvin',
      slug: 'openai-calvin',
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/providers');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body.slug).toBe('openai-calvin');
  });

  it('rejects a non-UUID workspaceId in list() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.list({ workspaceId: 'not-a-uuid' })).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID workspace_id in create() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.create({
        workspace_id: 'not-a-uuid',
        ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
        integration_id: 'f6692544-3265-49be-9711-bbdcebc079e4',
        name: 'openai-calvin',
        slug: 'openai-calvin',
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
