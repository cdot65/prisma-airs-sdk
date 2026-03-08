import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CustomerAppsClient } from '../../src/management/customer-apps.js';
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

describe('CustomerAppsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: CustomerAppsClient;

  beforeEach(() => {
    client = new CustomerAppsClient({
      baseUrl: 'https://api.example.com',
      oauthClient: createMockOAuth(),
      tsgId: '123',
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('get', () => {
    it('GETs /v1/mgmt/customerapp with app_name', async () => {
      const app = { tsg_id: '123', app_name: 'myapp', cloud_provider: 'aws', environment: 'prod' };
      mockFetch(app);
      const result = await client.get('myapp');

      expect(result.app_name).toBe('myapp');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/customerapp');
      expect(url).toContain('app_name=myapp');
    });
  });

  describe('list', () => {
    it('GETs /v1/mgmt/customerapp/tsg/:tsgId', async () => {
      mockFetch({ customer_apps: [], next_offset: 0 });
      const result = await client.list();

      expect(result.customer_apps).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/customerapp/tsg/123');
    });
  });

  describe('update', () => {
    it('PUTs to /v1/mgmt/customerapp with customer_app_id', async () => {
      const app = { tsg_id: '123', app_name: 'myapp', cloud_provider: 'aws', environment: 'prod' };
      mockFetch(app);
      await client.update('uuid-1', app);

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/customerapp');
      expect(url).toContain('customer_app_id=uuid-1');
      expect(init.method).toBe('PUT');
    });
  });

  describe('delete', () => {
    it('DELETEs /v1/mgmt/customerapp with app_name and updated_by', async () => {
      const app = { tsg_id: '123', app_name: 'myapp', cloud_provider: 'aws', environment: 'prod' };
      mockFetch(app);
      await client.delete('myapp', 'user@test.com');

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('app_name=myapp');
      expect(url).toContain('updated_by=user');
      expect(init.method).toBe('DELETE');
    });
  });
});
