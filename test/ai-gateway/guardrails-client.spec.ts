import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayGuardrailsClient } from '../../src/ai-gateway/guardrails-client.js';
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

  it('lists guardrails scoped to a workspace', async () => {
    mockFetch({ object: 'list', total: 1, data: [{ id: 'pg-prisma-099a16', name: 'PrismaAIRS' }] });
    const res = await client.list({ workspaceId: wsId });

    expect(res.data[0].id).toBe('pg-prisma-099a16');
    const u = new URL((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(u.pathname).toBe('/guardrails');
    expect(u.searchParams.get('workspace_id')).toBe(wsId);
  });

  it('POSTs a guardrail with checks and actions', async () => {
    mockFetch({});
    await client.create({
      workspace_id: wsId,
      name: 'PrismaAIRS',
      checks: [
        {
          id: 'panw.prisma-airs.intercept',
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
