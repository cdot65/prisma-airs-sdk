import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScanLogsClient } from '../../src/management/scan-logs.js';
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

describe('ScanLogsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: ScanLogsClient;

  beforeEach(() => {
    client = new ScanLogsClient({
      baseUrl: 'https://api.example.com',
      oauthClient: createMockOAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('query', () => {
    it('POSTs to /v1/mgmt/scanlogs with required params', async () => {
      mockFetch({ total_pages: 1, page_number: 1, page_size: 10 });
      const result = await client.query({
        time_interval: 24,
        time_unit: 'hour',
        pageNumber: 1,
        pageSize: 10,
        filter: 'all',
      });

      expect(result.total_pages).toBe(1);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/scanlogs');
      expect(url).toContain('time_interval=24');
      expect(url).toContain('time_unit=hour');
      expect(url).toContain('pageNumber=1');
      expect(url).toContain('pageSize=10');
      expect(url).toContain('filter=all');
      expect(init.method).toBe('POST');
    });

    it('sends page_token in body', async () => {
      mockFetch({ total_pages: 2, page_number: 2 });
      await client.query({
        time_interval: 7,
        time_unit: 'day',
        pageNumber: 2,
        pageSize: 50,
        filter: 'threat',
        page_token: 'encrypted-token',
      });

      const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.page_token).toBe('encrypted-token');
    });
  });
});
