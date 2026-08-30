import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayProvidersClient } from '../../src/ai-gateway/providers-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const wsId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';
const providerId = 'f6692544-3265-49be-9711-bbdcebc079e4';

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

  it('fetches one live-verified provider detail', async () => {
    mockFetch({
      id: providerId,
      ai_provider_name: 'Vertex AI',
      model_config: { vertexRegion: 'us-central1' },
      key: 'masked-or-sensitive',
      masked_api_key: '***',
      slug: 'vertex-prod',
      name: 'Vertex production',
      usage_limits: null,
      status: 'active',
      note: '',
      created_at: '2026-07-17T00:42:44.000Z',
      expires_at: null,
      last_reset_at: null,
      rate_limits: [],
      integration_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
      tags: null,
      secret_mappings: [],
      object: 'provider',
    });

    const result = await client.get(providerId);

    expect(result.ai_provider_name).toBe('Vertex AI');
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://gw.example.com/providers/${providerId}`);
    expect((init as RequestInit).method).toBe('GET');
  });

  it('rejects get with an invalid providerId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.get('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('POSTs a provider binding to /providers, and parses the create RECEIPT (no version_id)', async () => {
    mockFetch({ id: providerId, slug: 'sdk-verify-delete-me-provider', object: 'provider' });
    const receipt = await client.create({
      workspace_id: wsId,
      ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
      integration_id: providerId,
      name: 'openai-calvin',
      slug: 'openai-calvin',
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/providers');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body.slug).toBe('openai-calvin');

    // The create receipt does NOT carry the full record's fields, and has NO version_id.
    expect(receipt.slug).toBe('sdk-verify-delete-me-provider');
    expect((receipt as unknown as { version_id?: string }).version_id).toBeUndefined();
    expect((receipt as unknown as { name?: string }).name).toBeUndefined();
  });

  it('PUTs a partial provider update to the live-verified resource path', async () => {
    mockFetch({});
    await client.update(providerId, { name: 'Updated provider', note: 'E2E verified' });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://gw.example.com/providers/${providerId}`);
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      name: 'Updated provider',
      note: 'E2E verified',
    });
  });

  it('rejects update with an invalid providerId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.update('not-a-uuid', { name: 'Updated' })).rejects.toThrow(
      AISecSDKException,
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('DELETEs a provider with no organisation_id param and no responseSchema', async () => {
    mockFetch(undefined, '');
    await expect(client.delete(providerId)).resolves.toBeUndefined();

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe(`/providers/${providerId}`);
    expect(u.searchParams.get('organisation_id')).toBeNull();
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('rejects delete with an invalid providerId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.delete('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
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

  it('rejects a non-UUID ai_provider_id in create() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.create({
        workspace_id: wsId,
        ai_provider_id: 'not-a-uuid',
        integration_id: 'f6692544-3265-49be-9711-bbdcebc079e4',
        name: 'openai-calvin',
        slug: 'openai-calvin',
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID integration_id in create() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.create({
        workspace_id: wsId,
        ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
        integration_id: 'not-a-uuid',
        name: 'openai-calvin',
        slug: 'openai-calvin',
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
