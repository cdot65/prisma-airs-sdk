import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayClient } from '../../src/ai-gateway/client.js';
import { AISecSDKException } from '../../src/errors.js';

describe('AIGatewayClient', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.PANW_AI_GW_CLIENT_ID;
    delete process.env.PANW_AI_GW_CLIENT_SECRET;
    delete process.env.PANW_AI_GW_TSG_ID;
    delete process.env.PANW_MGMT_CLIENT_ID;
    delete process.env.PANW_MGMT_CLIENT_SECRET;
    delete process.env.PANW_MGMT_TSG_ID;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it('constructs every sub-client from explicit options', () => {
    const gw = new AIGatewayClient({ clientId: 'cid', clientSecret: 'sec', tsgId: '1852583913' });

    expect(gw.telemetry).toBeDefined();
    expect(gw.workspaces).toBeDefined();
    expect(gw.configs).toBeDefined();
    expect(gw.guardrails).toBeDefined();
    expect(gw.providers).toBeDefined();
    expect(gw.apiKeys).toBeDefined();
    expect(gw.integrations).toBeDefined();
    expect(gw.mcpIntegrations).toBeDefined();
    expect(gw.deployments).toBeDefined();
    expect(gw.plugins).toBeDefined();
    expect(gw.organisations).toBeDefined();
    expect(gw.auditLogs).toBeDefined();
  });

  it('falls back to PANW_MGMT_* when PANW_AI_GW_* is unset', () => {
    process.env.PANW_MGMT_CLIENT_ID = 'mgmt-id';
    process.env.PANW_MGMT_CLIENT_SECRET = 'mgmt-secret';
    process.env.PANW_MGMT_TSG_ID = '1852583913';

    expect(() => new AIGatewayClient()).not.toThrow();
  });

  it('throws MISSING_VARIABLE when no credentials resolve', () => {
    expect(() => new AIGatewayClient()).toThrow(AISecSDKException);
  });

  // "honours endpoint overrides" as its own weak toBeInstanceOf-only test was removed —
  // the 'plane assignment' block below already proves overrides are honoured, per
  // sub-client, by asserting the resolved baseUrl for both dataEndpoint and adminEndpoint.

  describe('plane assignment', () => {
    // Deliberately-distinguishable overrides so a swapped/mis-wired sub-client is caught
    // by URL rather than passing by coincidence (e.g. both endpoints defaulting to the
    // same host in some other test).
    const DATA_ENDPOINT = 'https://data.test';
    const ADMIN_ENDPOINT = 'https://admin.test';

    const gw = new AIGatewayClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1852583913',
      dataEndpoint: DATA_ENDPOINT,
      adminEndpoint: ADMIN_ENDPOINT,
    });

    // Each sub-client stores its resolved base URL in a private `baseUrl` field. There is
    // no public accessor for it (and this test must not add one to production code just to
    // observe it), so we reach past the type system with a narrow, test-only cast. This is
    // deliberate: it is the least invasive way to assert which plane each sub-client was
    // actually wired to, which is exactly the property a data/admin swap would break.
    const baseUrlOf = (client: object): string =>
      (client as unknown as { baseUrl: string }).baseUrl;

    interface PlaneCase {
      name: string;
      accessor: () => object;
      expectedOrigin: string;
    }

    const cases: PlaneCase[] = [
      { name: 'telemetry', accessor: () => gw.telemetry, expectedOrigin: DATA_ENDPOINT },
      { name: 'workspaces', accessor: () => gw.workspaces, expectedOrigin: DATA_ENDPOINT },
      { name: 'configs', accessor: () => gw.configs, expectedOrigin: DATA_ENDPOINT },
      { name: 'guardrails', accessor: () => gw.guardrails, expectedOrigin: DATA_ENDPOINT },
      { name: 'providers', accessor: () => gw.providers, expectedOrigin: DATA_ENDPOINT },
      { name: 'apiKeys', accessor: () => gw.apiKeys, expectedOrigin: DATA_ENDPOINT },
      { name: 'integrations', accessor: () => gw.integrations, expectedOrigin: ADMIN_ENDPOINT },
      {
        name: 'mcpIntegrations',
        accessor: () => gw.mcpIntegrations,
        expectedOrigin: ADMIN_ENDPOINT,
      },
      { name: 'deployments', accessor: () => gw.deployments, expectedOrigin: ADMIN_ENDPOINT },
      { name: 'plugins', accessor: () => gw.plugins, expectedOrigin: ADMIN_ENDPOINT },
      { name: 'organisations', accessor: () => gw.organisations, expectedOrigin: ADMIN_ENDPOINT },
      { name: 'auditLogs', accessor: () => gw.auditLogs, expectedOrigin: ADMIN_ENDPOINT },
    ];

    it.each(cases)('$name is wired to $expectedOrigin', ({ accessor, expectedOrigin }) => {
      expect(baseUrlOf(accessor())).toBe(expectedOrigin);
    });
  });

  describe('x-tsg-id on the wire', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    // Every AI Gateway request goes through TsgHeaderAuth wrapping OAuthAuth (see
    // src/ai-gateway/client.ts), which is only unit-tested in isolation (test/http/tsg-header.spec.ts).
    // Nothing else proves x-tsg-id actually reaches the outgoing fetch() call once a real
    // AIGatewayClient is constructed end-to-end. This stubs both hops — the OAuth token
    // exchange, then the API call — and asserts the header on the second (API) request.
    it('sends x-tsg-id on the outgoing API request, after a stubbed OAuth exchange', async () => {
      const tokenResp = { access_token: 'tok', token_type: 'bearer', expires_in: 3600 };
      const apiResp = { object: 'list', total: 0, data: [] };

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(tokenResp),
          text: () => Promise.resolve(JSON.stringify(tokenResp)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(apiResp)),
        });
      globalThis.fetch = fetchMock;

      const gw = new AIGatewayClient({
        clientId: 'cid',
        clientSecret: 'sec',
        tsgId: '1852583913',
        numRetries: 0,
      });
      await gw.workspaces.list();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, init] = fetchMock.mock.calls[1] as [string, { headers: Record<string, string> }];
      expect(init.headers['x-tsg-id']).toBe('1852583913');
    });
  });
});
