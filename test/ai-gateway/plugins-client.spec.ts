import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayPluginsClient } from '../../src/ai-gateway/plugins-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const integrationId = '232e45c4-809a-11f1-af60-2ca2a760eb7b';

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

const samplePlugin = {
  id: 'a9f2e8db-1efe-49a7-a45b-b45cade4d861',
  integration_id: integrationId,
  credentials: { AIRS_API_KEY: 'sn*****Gul' },
  owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
  created_at: '2026-07-17T00:42:44.000Z',
  last_updated_at: '2026-07-17T00:42:44.000Z',
  status: 'active',
  integration_slug: 'panw-prisma-airs',
  plugin_provider_id: 'b1e2e8db-1efe-49a7-a45b-b45cade4d861',
  plugin_provider_slug: 'panw-prisma-airs',
  object: 'plugin',
};

describe('AIGatewayPluginsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayPluginsClient;

  beforeEach(() => {
    client = new AIGatewayPluginsClient({
      baseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists organisation plugins', async () => {
    mockFetch({ object: 'list', total: 1, data: [samplePlugin] });
    const res = await client.list();

    expect(res.data[0].integration_slug).toBe('panw-prisma-airs');
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/plugins');
    expect((init as RequestInit).method).toBe('GET');
  });

  it('POSTs a new plugin binding', async () => {
    mockFetch({});
    await client.create({
      organisation_id: '1852583913',
      integration_id: integrationId,
      credentials: { AIRS_API_KEY: 'secret' },
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/plugins');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('rejects create with an invalid integration_id before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.create({
        organisation_id: '1852583913',
        integration_id: 'not-a-uuid',
        credentials: { AIRS_API_KEY: 'secret' },
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
