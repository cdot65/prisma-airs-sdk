import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayConfigsClient } from '../../src/ai-gateway/configs-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

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

// List row — 12 fields, no config/format/type/version_id.
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
  object: 'config',
};

// Detail read — adds config/format/type/version_id on top of the list row.
const sampleConfigDetail = {
  ...sampleConfig,
  config: '{"provider":"@anthropic-prod"}',
  format: 'json',
  type: 'ORG_CONFIG',
  version_id: 'v1',
};

const sampleConfigVersion = {
  ...sampleConfigDetail,
  version_created_at: '2026-07-17T00:42:44.000Z',
  version_owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
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

  it('sends workspace_id as a query param on list, returning list rows with no config field', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleConfig] });
    const res = await client.list({ workspaceId: wsId });

    expect((res.data[0] as unknown as { config?: string }).config).toBeUndefined();
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe('/configs');
    expect(u.searchParams.get('workspace_id')).toBe(wsId);
  });

  it('fetches one config detail, including config as a JSON string', async () => {
    mockFetch(sampleConfigDetail);
    const res = await client.get(cfgId);

    expect(res.config).toBe('{"provider":"@anthropic-prod"}');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://gw.example.com/configs/${cfgId}`);
  });

  it('lists the live-verified version history for one config', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleConfigVersion] });

    const res = await client.listVersions(cfgId);

    expect(res.data[0].version_created_at).toBe('2026-07-17T00:42:44.000Z');
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://gw.example.com/configs/${cfgId}/versions`);
    expect((init as RequestInit).method).toBe('GET');
  });

  it('rejects listVersions with an invalid configId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.listVersions('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('POSTs a config with the config body as an OBJECT, and parses the create RECEIPT', async () => {
    mockFetch({
      id: cfgId,
      version_id: 'v1',
      slug: 'pc-sdk-ve-14620d',
      object: 'config',
    });
    const receipt = await client.create({
      name: 'vertex-airs',
      workspace_id: wsId,
      config: { retry: { attempts: 3 }, cache: { mode: 'simple' } },
    });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(typeof body.config).toBe('object');
    expect((init as RequestInit).method).toBe('POST');

    // The create receipt does NOT carry the full record's fields.
    expect(receipt.slug).toBe('pc-sdk-ve-14620d');
    expect((receipt as unknown as { name?: string }).name).toBeUndefined();
    expect((receipt as unknown as { config?: string }).config).toBeUndefined();
    expect((receipt as unknown as { status?: string }).status).toBeUndefined();
  });

  it('DELETEs a config with no organisation_id param and no responseSchema', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    });
    await expect(client.delete(cfgId)).resolves.toBeUndefined();

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe(`/configs/${cfgId}`);
    expect(u.searchParams.get('organisation_id')).toBeNull();
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('rejects delete with an invalid configId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.delete('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects list with an invalid workspaceId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.list({ workspaceId: 'not-a-uuid' })).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects update with an invalid body.workspace_id before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.update(cfgId, {
        name: 'test',
        workspace_id: 'not-a-uuid',
        config: {},
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
