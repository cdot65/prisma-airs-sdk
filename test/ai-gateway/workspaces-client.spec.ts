import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayWorkspacesClient } from '../../src/ai-gateway/workspaces-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const wsId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}
function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const sampleWorkspace = {
  id: wsId,
  slug: 'ws-main-a-349e0e',
  name: 'talos_k8s_cluster',
  icon: null,
  description: 'Default workspace',
  created_at: '2026-07-16T15:48:18.000Z',
  last_updated_at: '2026-07-17T12:25:22.000Z',
  is_default: 0,
  status: 'active',
  scope_name: 'main_airs_workspace_1852583913',
  object: 'workspace',
};

describe('AIGatewayWorkspacesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayWorkspacesClient;

  const calledUrl = (): string =>
    (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
  const calledInit = (): RequestInit =>
    (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;

  beforeEach(() => {
    client = new AIGatewayWorkspacesClient({
      baseUrl: 'https://gw.example.com',
      adminBaseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('GETs /workspaces with no params', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleWorkspace] });
    const res = await client.list();

    expect(res.data[0].slug).toBe('ws-main-a-349e0e');
    expect(calledUrl()).toBe('https://gw.example.com/workspaces');
  });

  it('rejects a malformed workspace ref before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.get('not a workspace!')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // The API accepts a slug wherever it accepts a UUID — upstream documents the path param as
  // "Workspace UUID. Workspace slug is also accepted for backward compatibility", and a bogus
  // slug returns 404 (recognised key form) rather than 400. See #213.
  it('accepts a slug as well as a UUID', async () => {
    mockFetch({ ...sampleWorkspace, defaults: null, usage_limits: null, rate_limits: null });
    await client.get('ws-produc-985697');
    expect(calledUrl()).toBe('https://gw.example.com/workspaces/ws-produc-985697');
  });

  // Found live: an archived workspace created without a description returns `description: null`,
  // and upstream declares the field `nullable: true`. The list-row schema had it non-nullable,
  // so list({ status: 'archived' }) threw. See #213.
  it('parses a null description on list rows', async () => {
    mockFetch({
      object: 'list',
      total: 1,
      data: [{ ...sampleWorkspace, description: null, status: 'archived' }],
    });
    const res = await client.list({ status: 'archived' });
    expect(res.data[0].description).toBeNull();
  });

  describe('list filtering and plane selection', () => {
    it('serialises the status filter in lowercase', async () => {
      mockFetch({ object: 'list', total: 1, data: [sampleWorkspace] });
      await client.list({ status: 'archived' });
      expect(calledUrl()).toBe('https://gw.example.com/workspaces?status=archived');
    });

    // The data plane returns only workspaces the caller holds a workspace-scope grant on;
    // the admin plane returns every workspace in the tenant.
    it('targets the admin plane when asked', async () => {
      mockFetch({ object: 'list', total: 2, data: [sampleWorkspace] });
      await client.list({ plane: 'admin' });
      expect(calledUrl()).toBe('https://admin.example.com/workspaces');
    });

    it('combines plane and status', async () => {
      mockFetch({ object: 'list', total: 1, data: [sampleWorkspace] });
      await client.list({ plane: 'admin', status: 'active' });
      expect(calledUrl()).toBe('https://admin.example.com/workspaces?status=active');
    });

    it('reads a workspace through the admin plane when asked', async () => {
      mockFetch({ ...sampleWorkspace, defaults: null, usage_limits: null, rate_limits: null });
      await client.get(wsId, { plane: 'admin' });
      expect(calledUrl()).toBe(`https://admin.example.com/workspaces/${wsId}`);
    });
  });

  describe('writes (admin plane)', () => {
    it('POSTs a create to the admin plane', async () => {
      mockFetch({ id: wsId, slug: 'ws-new-000000', object: 'workspace' });
      await client.create({ name: 'New', scope_name: 'ws_new_000000', description: 'x' });

      expect(calledUrl()).toBe('https://admin.example.com/workspaces');
      const init = calledInit();
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({
        name: 'New',
        scope_name: 'ws_new_000000',
        description: 'x',
      });
    });

    it('requires name and scope_name before issuing a request', async () => {
      globalThis.fetch = vi.fn();
      await expect(
        client.create({ name: '', scope_name: 'ws_x' } as Parameters<typeof client.create>[0]),
      ).rejects.toThrow(AISecSDKException);
      await expect(
        client.create({ name: 'x', scope_name: '' } as Parameters<typeof client.create>[0]),
      ).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('PUTs an update to the admin plane', async () => {
      mockFetch({ ok: true });
      await client.update(wsId, { description: 'updated' });

      expect(calledUrl()).toBe(`https://admin.example.com/workspaces/${wsId}`);
      const init = calledInit();
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body as string)).toEqual({ description: 'updated' });
    });

    // The API rejects an empty patch with AB01 "No update fields provided"; fail locally
    // instead of burning a round trip.
    it('rejects an empty update before issuing a request', async () => {
      globalThis.fetch = vi.fn();
      await expect(client.update(wsId, {})).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    // Soft delete: the row persists with status 'archived' and is retrievable via
    // list({ status: 'archived' }). Same semantics as deployments.delete().
    it('DELETEs against the admin plane with no query params', async () => {
      mockFetch({});
      await client.delete(wsId);

      expect(calledUrl()).toBe(`https://admin.example.com/workspaces/${wsId}`);
      expect(calledInit().method).toBe('DELETE');
    });

    it.each(['create', 'update', 'delete'] as const)(
      '%s rejects a malformed ref/body before issuing a request',
      async (method) => {
        globalThis.fetch = vi.fn();
        const call =
          method === 'create'
            ? client.create({ name: 'x', scope_name: '' } as Parameters<typeof client.create>[0])
            : method === 'update'
              ? client.update('not a ref!', { name: 'x' })
              : client.delete('not a ref!');
        await expect(call).rejects.toThrow(AISecSDKException);
        expect(globalThis.fetch).not.toHaveBeenCalled();
      },
    );
  });

  // Regression: usage_limits / rate_limits are ARRAYS of policy objects, not objects.
  // The original schemas were derived from a tenant whose only workspace had `null` for both,
  // so the array form was never observed and `get()` threw AISEC_RESPONSE_VALIDATION against
  // any workspace with limits configured. Payload below is captured verbatim from TSG
  // 1852583913 workspace `Production` (2026-08-01). See issue #211.
  describe('usage_limits / rate_limits shapes', () => {
    const detailBase = {
      id: wsId,
      name: 'Production',
      description: 'All production applications',
      created_at: '2026-07-31T23:48:05.000Z',
      last_updated_at: '2026-08-01T11:03:22.000Z',
      is_default: 0,
      slug: 'ws-produc-985697',
      icon: null,
      defaults: { metadata: { env: 'production' } },
    };

    it('parses populated usage_limits and rate_limits arrays', async () => {
      mockFetch({
        ...detailBase,
        usage_limits: [
          {
            id: 'cf8cfd46-d44d-44f9-92d0-c75c9fb6fab6',
            type: 'cost',
            status: 'active',
            credit_limit: 10000,
            current_usage: 0.06673187500000002,
            periodic_reset: 'weekly',
            alert_threshold: 8000,
            is_exhausted_alerts_sent: false,
            is_threshold_alerts_sent: false,
          },
        ],
        rate_limits: [{ type: 'requests', unit: 'rpm', value: 100 }],
      });

      const res = await client.get(wsId);

      const usage = res.usage_limits as Array<Record<string, unknown>>;
      expect(usage[0].type).toBe('cost');
      expect(usage[0].credit_limit).toBe(10000);
      expect(usage[0].periodic_reset).toBe('weekly');

      const rate = res.rate_limits as Array<Record<string, unknown>>;
      expect(rate[0].unit).toBe('rpm');
      expect(rate[0].value).toBe(100);
    });

    it('still parses empty arrays', async () => {
      mockFetch({ ...detailBase, usage_limits: [], rate_limits: [] });
      const res = await client.get(wsId);
      expect(res.usage_limits).toEqual([]);
      expect(res.rate_limits).toEqual([]);
    });

    it('still parses null limits', async () => {
      mockFetch({ ...detailBase, usage_limits: null, rate_limits: null });
      const res = await client.get(wsId);
      expect(res.usage_limits).toBeNull();
      expect(res.rate_limits).toBeNull();
    });

    it('still parses the object form, so no tenant regresses', async () => {
      mockFetch({
        ...detailBase,
        usage_limits: { credit_limit: 500 },
        rate_limits: { value: 10 },
      });
      const res = await client.get(wsId);
      expect(res.usage_limits).toEqual({ credit_limit: 500 });
      expect(res.rate_limits).toEqual({ value: 10 });
    });
  });
});
