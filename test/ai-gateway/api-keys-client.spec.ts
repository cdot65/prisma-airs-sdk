import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayApiKeysClient } from '../../src/ai-gateway/api-keys-client.js';
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

describe('AIGatewayApiKeysClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayApiKeysClient;

  beforeEach(() => {
    client = new AIGatewayApiKeysClient({
      baseUrl: 'https://gw.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('routes service and user keys to separate sub-collections', async () => {
    mockFetch({ object: 'list', total: 0, data: [] });
    await client.listService({ workspaceId: wsId });
    expect(
      new URL((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string).pathname,
    ).toBe('/api-keys/service');

    mockFetch({ object: 'list', total: 0, data: [] });
    await client.listUser({ workspaceId: wsId });
    expect(
      new URL((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string).pathname,
    ).toBe('/api-keys/user');
  });

  it('POSTs a service key create to /api-keys/service', async () => {
    mockFetch({});
    await client.createService({
      name: 'ci-runner',
      scopes: ['completions.write', 'logs.write'],
      organisation_id: '1852583913',
      workspace_id: wsId,
      type: 'workspace',
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/api-keys/service');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('POSTs a user key create to /api-keys/user with user_id', async () => {
    mockFetch({});
    await client.createUser({
      name: 'calvin-laptop',
      scopes: ['completions.write'],
      organisation_id: '1852583913',
      workspace_id: wsId,
      type: 'workspace',
      user_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/api-keys/user');
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body.user_id).toBe('fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f');
  });

  it('PUTs updateService to /api-keys/service/{keyId}', async () => {
    mockFetch({});
    const keyId = '11111111-1111-4111-8111-111111111111';
    await client.updateService(keyId, {
      name: 'ci-runner',
      scopes: ['completions.write'],
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe(`/api-keys/service/${keyId}`);
    expect((init as RequestInit).method).toBe('PUT');
  });

  it('PUTs updateUser to /api-keys/user/{keyId}', async () => {
    mockFetch({});
    const keyId = '11111111-1111-4111-8111-111111111111';
    await client.updateUser(keyId, {
      name: 'calvin-laptop',
      scopes: ['completions.write'],
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe(`/api-keys/user/${keyId}`);
    expect((init as RequestInit).method).toBe('PUT');
  });

  it('gets an API key from the service detail route', async () => {
    const keyId = '11111111-1111-4111-8111-111111111111';
    mockFetch({ id: keyId, name: 'ci-runner', object: 'api-key' });
    await expect(client.getService(keyId)).resolves.toMatchObject({ id: keyId, name: 'ci-runner' });
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      `https://gw.example.com/api-keys/service/${keyId}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('deletes an API key from the user detail route', async () => {
    const keyId = '11111111-1111-4111-8111-111111111111';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    await expect(client.deleteUser(keyId)).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      `https://gw.example.com/api-keys/user/${keyId}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('rotates an API key and parses the one-time secret response', async () => {
    const keyId = '11111111-1111-4111-8111-111111111111';
    mockFetch({ id: keyId, key: 'pk-secret', key_transition_expires_at: '2026-09-01T00:00:00Z' });
    const result = await client.rotateService(keyId, { key_transition_period_ms: 3_600_000 });
    expect(result.key).toBe('pk-secret');
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      `https://gw.example.com/api-keys/service/${keyId}/rotate`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key_transition_period_ms: 3_600_000 }),
      }),
    );
  });

  it.each(['getService', 'deleteService', 'rotateService'] as const)(
    'rejects %s with a non-UUID keyId before issuing a request',
    async (method) => {
      globalThis.fetch = vi.fn();
      const call =
        method === 'rotateService' ? client.rotateService('bad', {}) : client[method]('bad');
      await expect(call).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    },
  );

  it('does not add a combined api-keys list method', () => {
    expect((client as unknown as Record<string, unknown>)['list']).toBeUndefined();
  });

  it('rejects a non-UUID workspaceId in listService() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.listService({ workspaceId: 'not-a-uuid' })).rejects.toThrow(
      AISecSDKException,
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID workspace_id in createService() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.createService({
        name: 'ci-runner',
        scopes: ['completions.write'],
        organisation_id: '1852583913',
        workspace_id: 'not-a-uuid',
        type: 'workspace',
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID keyId in updateService() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.updateService('not-a-uuid', {
        name: 'ci-runner',
        scopes: ['completions.write'],
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('accepts a numeric-string organisation_id (TSG) rather than requiring a UUID', async () => {
    mockFetch({});
    await expect(
      client.createService({
        name: 'ci-runner',
        scopes: ['completions.write'],
        organisation_id: '1852583913',
        workspace_id: wsId,
        type: 'workspace',
      }),
    ).resolves.toBeDefined();
  });
});
