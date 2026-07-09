import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CustomerAppsClient } from '../../src/management/customer-apps.js';
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

describe('CustomerAppsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: CustomerAppsClient;

  beforeEach(() => {
    client = new CustomerAppsClient({
      baseUrl: 'https://api.example.com',
      auth: passthroughAuth(),
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

    it('sends default offset and limit query params', async () => {
      mockFetch({ customer_apps: [], next_offset: 0 });
      await client.list();

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const params = new URL(url).searchParams;
      expect(params.get('offset')).toBe('0');
      expect(params.get('limit')).toBe('100');
    });

    it('sends explicit offset and limit query params', async () => {
      mockFetch({ customer_apps: [], next_offset: 20 });
      await client.list({ offset: 20, limit: 5 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const params = new URL(url).searchParams;
      expect(params.get('offset')).toBe('20');
      expect(params.get('limit')).toBe('5');
    });

    it('round-trips a populated PaginatedCustomerAppObject', async () => {
      mockFetch({
        customer_apps: [
          {
            tsg_id: '123',
            customer_appId: 'app-uuid-1',
            app_name: 'myapp',
            cloud_provider: 'aws',
            environment: 'prod',
            model_name: 'gpt-4',
            ai_agent_framework: 'langchain',
            api_keys_dp_info: [{ api_key_name: 'key1', dp_name: 'dp1', auth_code: 'abc' }],
          },
        ],
        next_offset: 10,
      });
      const result = await client.list();

      expect(result.next_offset).toBe(10);
      expect(result.customer_apps).toHaveLength(1);
      const app = result.customer_apps![0];
      expect(app.customer_appId).toBe('app-uuid-1');
      expect(app.cloud_provider).toBe('aws');
      expect(app.environment).toBe('prod');
      expect(app.api_keys_dp_info?.[0]).toEqual({
        api_key_name: 'key1',
        dp_name: 'dp1',
        auth_code: 'abc',
      });
    });

    it('percent-encodes a TSG ID with reserved characters in the path', async () => {
      const encodingClient = new CustomerAppsClient({
        baseUrl: 'https://api.example.com',
        auth: passthroughAuth(),
        tsgId: 'tsg/with space',
        numRetries: 0,
      });
      mockFetch({ customer_apps: [], next_offset: 0 });
      await encodingClient.list();

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/customerapp/tsg/tsg%2Fwith%20space');
      // The raw slash must not create an extra path segment.
      expect(url).not.toContain('/tsg/tsg/with');
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
      mockFetch({ message: 'deleted' });
      await client.delete('myapp', 'user@test.com');

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('app_name=myapp');
      expect(url).toContain('updated_by=user');
      expect(init.method).toBe('DELETE');
    });

    // Regression for #167 — see profiles.spec.ts for shared context.
    // Server returns a JSON-encoded plain string ("customer app and associated
    // keys successfully deleted") on a successful DELETE; SDK must normalize
    // it to { message } instead of throwing RESPONSE_VALIDATION.
    it('tolerates plain-string body and normalizes to { message }', async () => {
      mockFetch('customer app and associated keys successfully deleted');
      const result = await client.delete('myapp', 'user@test.com');
      expect(result.message).toBe('customer app and associated keys successfully deleted');
    });
  });
});
