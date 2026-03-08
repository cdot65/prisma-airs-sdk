import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiKeysClient } from '../../src/management/api-keys.js';
import { OAuthClient } from '../../src/management/oauth-client.js';

function createMockOAuth(): OAuthClient {
  return {
    getToken: vi.fn().mockResolvedValue('tok'),
    clearToken: vi.fn(),
  } as unknown as OAuthClient;
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('ApiKeysClient', () => {
  const originalFetch = globalThis.fetch;
  let client: ApiKeysClient;

  beforeEach(() => {
    client = new ApiKeysClient({
      baseUrl: 'https://api.example.com',
      oauthClient: createMockOAuth(),
      tsgId: '123',
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('create', () => {
    it('POSTs to /v1/mgmt/apikey', async () => {
      const apiKey = {
        api_key_id: 'k1',
        api_key_last8: '12345678',
        auth_code: 'ac',
        expiration: '2025-12-31',
        revoked: false,
      };
      mockFetch(apiKey);
      const result = await client.create({
        auth_code: 'ac',
        cust_app: 'app1',
        revoked: false,
        created_by: 'user@test.com',
        api_key_name: 'key1',
        rotation_time_interval: 90,
        rotation_time_unit: 'days',
      });

      expect(result.api_key_id).toBe('k1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/apikey');
      expect(init.method).toBe('POST');
    });
  });

  describe('list', () => {
    it('GETs /v1/mgmt/apikeys/tsg/:tsgId', async () => {
      mockFetch({ api_keys: [], next_offset: 0 });
      const result = await client.list();

      expect(result.api_keys).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/apikeys/tsg/123');
    });

    it('passes pagination params', async () => {
      mockFetch({ api_keys: [], next_offset: 10 });
      await client.list({ offset: 10, limit: 5 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('offset=10');
      expect(url).toContain('limit=5');
    });
  });

  describe('delete', () => {
    it('DELETEs /v1/mgmt/apikey/delete/:name with updated_by', async () => {
      mockFetch({ message: 'deleted' });
      const result = await client.delete('my-key', 'user@test.com');

      expect(result.message).toBe('deleted');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/apikey/delete/my-key');
      expect(url).toContain('updated_by=user');
      expect(init.method).toBe('DELETE');
    });
  });

  describe('regenerate', () => {
    it('POSTs to /v1/mgmt/apikey/regenerate/:id', async () => {
      const apiKey = {
        api_key_id: 'k1',
        api_key_last8: '87654321',
        auth_code: 'ac',
        expiration: '2026-06-30',
        revoked: false,
      };
      mockFetch(apiKey);
      const result = await client.regenerate('k1', {
        rotation_time_interval: 30,
        rotation_time_unit: 'days',
      });

      expect(result.api_key_id).toBe('k1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/apikey/regenerate/k1');
      expect(init.method).toBe('POST');
    });
  });
});
