import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayConfigsClient } from '../../src/ai-gateway/configs-client.js';
import type { AuthAdapter } from '../../src/http/types.js';

const wsId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';
const cfgId = '764cf9cd-4ebf-449e-b669-08149b0fbbbc';

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

const sampleConfig = {
  id: cfgId,
  name: 'claude-code',
  slug: 'pc-claude-e46fe6',
  organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
  is_default: 0,
  status: 'active',
  owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
  updated_by: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
  created_at: '2026-07-17T00:42:44.000Z',
  last_updated_at: '2026-07-17T00:42:44.000Z',
  workspace_id: wsId,
  config: '{"provider":"@anthropic-prod"}',
  format: 'json',
  type: 'ORG_CONFIG',
  version_id: 'v1',
  object: 'config',
};

describe('AIGatewayConfigsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayConfigsClient;

  beforeEach(() => {
    client = new AIGatewayConfigsClient({
      baseUrl: 'https://gw.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends workspace_id as a query param on list', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleConfig] });
    await client.list({ workspaceId: wsId });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe('/configs');
    expect(u.searchParams.get('workspace_id')).toBe(wsId);
  });

  it('POSTs a config with the config body as an OBJECT', async () => {
    mockFetch({});
    await client.create({
      name: 'vertex-airs',
      workspace_id: wsId,
      config: { retry: { attempts: 3 }, cache: { mode: 'simple' } },
    });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(typeof body.config).toBe('object');
    expect((init as RequestInit).method).toBe('POST');
  });
});
