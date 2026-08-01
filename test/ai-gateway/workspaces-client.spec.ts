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

  beforeEach(() => {
    client = new AIGatewayWorkspacesClient({
      baseUrl: 'https://gw.example.com',
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
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://gw.example.com/workspaces');
  });

  it('rejects a non-UUID id before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.get('not-a-uuid')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
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
