import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayIntegrationsClient } from '../../src/ai-gateway/integrations-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const intId = 'f6692544-3265-49be-9711-bbdcebc079e4';

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

const sampleIntegration = {
  id: intId,
  organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
  name: 'openai-calvin',
  owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
  status: 'active',
  created_at: '2026-07-17T00:42:44.000Z',
  last_updated_at: '2026-07-17T00:42:44.000Z',
  slug: 'openai-calvin',
  tags: null,
  description: null,
  workspace_id: null,
  ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
  object: 'integration',
};

describe('AIGatewayIntegrationsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayIntegrationsClient;

  beforeEach(() => {
    client = new AIGatewayIntegrationsClient({
      baseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists organisation integrations', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleIntegration] });
    const res = await client.list();

    expect(res.data[0].slug).toBe('openai-calvin');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/integrations');
  });

  it('fetches one integration', async () => {
    mockFetch(sampleIntegration);
    const res = await client.get(intId);

    expect(res.name).toBe('openai-calvin');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/integrations/${intId}`);
  });

  it('POSTs a new integration', async () => {
    mockFetch({});
    await client.create({
      organisation_id: '1852583913',
      ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
      name: 'openai-prod',
      slug: 'openai-prod',
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/integrations');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('PUTs an integration update', async () => {
    mockFetch({});
    await client.update(intId, { name: 'openai-prod' });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/integrations/${intId}`);
    expect((init as RequestInit).method).toBe('PUT');
  });

  it('reads the models sub-resource', async () => {
    mockFetch({
      models: [{ slug: 'gpt-4', enabled: true }],
      allow_all_models: false,
      object: 'list',
    });
    const res = await client.getModels(intId);

    expect(res.models[0].slug).toBe('gpt-4');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/integrations/${intId}/models`);
  });

  it('PUTs the models sub-resource', async () => {
    mockFetch({});
    await client.setModels(intId, { models: [{ slug: 'gpt-4', enabled: false }] });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init as RequestInit).method).toBe('PUT');
  });

  it('reads the workspaces sub-resource', async () => {
    mockFetch({ workspaces: [], global_workspace_access: true, object: 'list' });
    const res = await client.getWorkspaces(intId);

    expect(res.global_workspace_access).toBe(true);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/integrations/${intId}/workspaces`);
  });

  it('PUTs the workspaces sub-resource', async () => {
    mockFetch({});
    await client.setWorkspaces(intId, { global_workspace_access: true });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://admin.example.com/integrations/${intId}/workspaces`);
    expect((init as RequestInit).method).toBe('PUT');
  });

  it('sends organisation_id as a query param on delete', async () => {
    mockFetch({});
    await client.delete(intId, '1852583913');

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init as RequestInit).method).toBe('DELETE');
    expect(new URL(url as string).searchParams.get('organisation_id')).toBe('1852583913');
  });

  it('resolves delete to undefined on an empty 200 body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    });
    await expect(client.delete(intId, '1852583913')).resolves.toBeUndefined();
  });

  it('rejects get with an invalid integrationId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.get('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects update with an invalid integrationId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.update('not-a-uuid', { name: 'x' })).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects create with an invalid body.ai_provider_id before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.create({
        organisation_id: '1852583913',
        ai_provider_id: 'not-a-uuid',
        name: 'openai-prod',
        slug: 'openai-prod',
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects update with an invalid body.ai_provider_id before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.update(intId, { ai_provider_id: 'not-a-uuid' })).rejects.toThrow(
      AISecSDKException,
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects delete with an invalid integrationId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.delete('not-a-uuid', '1852583913')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects delete with a non-numeric organisationId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.delete(intId, 'not-numeric')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects setModels with an invalid integrationId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.setModels('not-a-uuid', { models: [{ slug: 'gpt-4', enabled: true }] }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects setWorkspaces with an invalid integrationId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.setWorkspaces('not-a-uuid', { global_workspace_access: true }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
