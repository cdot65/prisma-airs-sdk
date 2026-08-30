import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayGuardrailsClient } from '../../src/ai-gateway/guardrails-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const wsId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';
const grId = '9f6c2a8e-2b3d-4e5f-8a9b-0c1d2e3f4a5b';

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

// Detail read (GET /guardrails/{id}) — real shape, verified live.
const sampleGuardrailDetail = {
  checks: [
    {
      id: 'panw-prisma-airs.intercept',
      parameters: { profile_name: 'AI Gateway - Strict', ai_model: '', app_user: '' },
      is_enabled: true,
    },
  ],
  actions: {
    deny: false,
    async: false,
    sequential: false,
    on_success: { feedback: { value: 5, weight: 1, metadata: '' } },
    on_fail: { feedback: { value: -5, weight: 1, metadata: '' } },
  },
  version_id: 'v1',
  created_at: '2026-07-17T00:42:44.000Z',
  id: grId,
  name: 'PrismaAIRS',
  slug: 'pg-prisma-099a16',
  organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
  status: 'active',
  owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
  updated_by: null,
  last_updated_at: '2026-07-17T00:42:44.000Z',
  workspace_id: wsId,
  object: 'guardrail',
};

describe('AIGatewayGuardrailsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayGuardrailsClient;

  beforeEach(() => {
    client = new AIGatewayGuardrailsClient({
      baseUrl: 'https://gw.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists guardrails scoped to a workspace, returning list rows with no checks/actions', async () => {
    mockFetch({
      object: 'list',
      total: 1,
      data: [
        {
          id: grId,
          name: 'PrismaAIRS',
          slug: 'pg-prisma-099a16',
          organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
          status: 'active',
          owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
          updated_by: null,
          created_at: '2026-07-17T00:42:44.000Z',
          last_updated_at: '2026-07-17T00:42:44.000Z',
          workspace_id: wsId,
          object: 'guardrail',
        },
      ],
    });
    const res = await client.list({ workspaceId: wsId });

    expect(res.data[0].slug).toBe('pg-prisma-099a16');
    expect(res.data[0].updated_by).toBeNull();
    expect((res.data[0] as unknown as { checks?: unknown }).checks).toBeUndefined();
    const u = new URL((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(u.pathname).toBe('/guardrails');
    expect(u.searchParams.get('workspace_id')).toBe(wsId);
  });

  it('fetches one guardrail detail, with the real panw-prisma-airs.intercept check id', async () => {
    mockFetch(sampleGuardrailDetail);
    const res = await client.get(grId);

    expect(res.checks[0].id).toBe('panw-prisma-airs.intercept');
    expect(res.actions.on_success?.feedback.value).toBe(5);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://gw.example.com/guardrails/${grId}`);
  });

  it('rejects get with an invalid guardrailId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.get('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('POSTs a guardrail with checks and actions, and parses the create RECEIPT', async () => {
    mockFetch({ id: grId, version_id: 'v1', slug: 'pg-sdk-ve-874b62', object: 'guardrail' });
    const receipt = await client.create({
      workspace_id: wsId,
      name: 'PrismaAIRS',
      checks: [
        {
          id: 'panw-prisma-airs.intercept',
          parameters: { profile_name: 'AI Gateway - Strict' },
          is_enabled: true,
        },
      ],
      actions: { deny: false, async: false, sequential: false },
    });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(Array.isArray(body.checks)).toBe(true);

    // The create receipt does NOT carry the full record's fields.
    expect(receipt.slug).toBe('pg-sdk-ve-874b62');
    expect((receipt as unknown as { name?: string }).name).toBeUndefined();
    expect((receipt as unknown as { checks?: unknown }).checks).toBeUndefined();
    expect((receipt as unknown as { actions?: unknown }).actions).toBeUndefined();
  });

  it('DELETEs a guardrail with no organisation_id param and no responseSchema', async () => {
    mockFetch(undefined, '');
    await expect(client.delete(grId)).resolves.toBeUndefined();

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe(`/guardrails/${grId}`);
    expect(u.searchParams.get('organisation_id')).toBeNull();
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('PUTs a partial guardrail update to the live-verified resource path', async () => {
    mockFetch({});
    await client.update(grId, { name: 'Updated guardrail' });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`https://gw.example.com/guardrails/${grId}`);
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      name: 'Updated guardrail',
    });
  });

  it('rejects update with an invalid guardrailId before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.update('not-a-uuid', { name: 'Updated' })).rejects.toThrow(
      AISecSDKException,
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects delete with an invalid guardrailId before issuing a request', async () => {
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
        name: 'PrismaAIRS',
        checks: [],
        actions: {},
      }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
