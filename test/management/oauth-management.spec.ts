import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OAuthManagementClient } from '../../src/management/oauth-management.js';
import type { AuthAdapter } from '../../src/http/types.js';

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

describe('OAuthManagementClient', () => {
  const originalFetch = globalThis.fetch;
  let client: OAuthManagementClient;

  beforeEach(() => {
    client = new OAuthManagementClient({
      baseUrl: 'https://api.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('invalidateToken', () => {
    it('POSTs to /v1/mgmt/oauth/invalidateToken', async () => {
      mockFetch('token invalidated');
      const result = await client.invalidateToken('old-token', {
        client_id: 'cid',
        customer_app: 'app1',
      });

      expect(result).toBeDefined();
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/oauth/invalidateToken');
      expect(url).toContain('token=old-token');
      expect(init.method).toBe('POST');
    });
  });

  describe('getAccessToken', () => {
    it('POSTs to /v1/mgmt/oauth/client_credential/accesstoken', async () => {
      mockFetch({ access_token: 'new-token', expires_in: '86400' });
      const result = await client.getAccessToken({
        body: { client_id: 'cid', customer_app: 'app1' },
      });

      expect(result.access_token).toBe('new-token');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/oauth/client_credential/accesstoken');
      expect(init.method).toBe('POST');
    });

    it('passes TTL params', async () => {
      mockFetch({ access_token: 'tok' });
      await client.getAccessToken({
        body: { client_id: 'cid', customer_app: 'app1' },
        tokenTtlInterval: 3,
        tokenTtlUnit: 'hours',
      });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('tokenTtlInterval=3');
      expect(url).toContain('tokenTtlUnit=hours');
    });
  });
});
