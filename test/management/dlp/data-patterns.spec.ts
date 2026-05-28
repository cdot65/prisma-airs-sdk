import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataPatternsClient } from '../../../src/management/dlp/data-patterns.js';
import type { AuthAdapter } from '../../../src/http/types.js';
import { ErrorType } from '../../../src/errors.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}

function authWith401Then200(): AuthAdapter & { refreshes: () => number } {
  let count = 0;
  return {
    prepare: async (req) => req,
    onUnauthorized: async () => {
      count++;
      return true;
    },
    refreshes: () => count,
  } as AuthAdapter & { refreshes: () => number };
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () =>
      Promise.resolve(
        data === undefined ? '' : typeof data === 'string' ? data : JSON.stringify(data),
      ),
  });
}

const patternFixture = {
  id: 'dp-1',
  name: 'SSN',
  type: 'custom',
  status: 'active',
  detection_config: { technique: 'regex' },
};

const pageFixture = {
  content: [patternFixture],
  empty: false,
  first: true,
  last: true,
  number: 0,
  numberOfElements: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

describe('DataPatternsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: DataPatternsClient;

  beforeEach(() => {
    client = new DataPatternsClient({
      baseUrl: 'https://api.dlp.paloaltonetworks.com',
      auth: passthroughAuth(),
      numRetries: 1,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('list', () => {
    it('GETs /v2/api/data-patterns with no params', async () => {
      mockFetch(pageFixture);
      const r = await client.list();
      expect(r.content).toHaveLength(1);
      expect(r.content[0].id).toBe('dp-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-patterns');
      expect(init.method).toBe('GET');
    });

    it('passes page + size as query params', async () => {
      mockFetch(pageFixture);
      await client.list({ page: 2, size: 50 });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('page=2');
      expect(url).toContain('size=50');
    });

    it('repeats the sort query param once per array entry', async () => {
      mockFetch(pageFixture);
      await client.list({ sort: ['name,asc', 'id,desc'] });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(new URL(url).searchParams.getAll('sort')).toEqual(['name,asc', 'id,desc']);
    });

    it('throws RESPONSE_VALIDATION on schema mismatch', async () => {
      mockFetch({ content: 'not-an-array' });
      await expect(client.list()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    });
  });

  describe('create', () => {
    it('POSTs the JSON body to /v2/api/data-patterns', async () => {
      mockFetch(patternFixture, 201);
      const body = {
        name: 'SSN',
        type: 'custom' as const,
        detection_config: { technique: 'regex' as const },
      };
      const r = await client.create(body);
      expect(r.id).toBe('dp-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-patterns');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify(body));
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });

  describe('get', () => {
    it('GETs /v2/api/data-patterns/{resourceId}', async () => {
      mockFetch(patternFixture);
      const r = await client.get('dp-1');
      expect(r.id).toBe('dp-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-patterns/dp-1');
      expect(init.method).toBe('GET');
    });

    it('URL-encodes resourceIds with special characters', async () => {
      mockFetch(patternFixture);
      await client.get('weird id/slash');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('weird%20id%2Fslash');
    });

    // Regression for #162: tenants whose downstream services require the
    // `service-name: api` header returned 400 for every valid id. The fix
    // sets the header globally in src/http/request.ts; this asserts it
    // reaches the DLP get-by-id call path.
    it('sends service-name: api header', async () => {
      mockFetch(patternFixture);
      await client.get('dp-1');
      const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect((init.headers as Record<string, string>)['service-name']).toBe('api');
    });
  });

  describe('replace', () => {
    it('PUTs the JSON body to /v2/api/data-patterns/{resourceId}', async () => {
      mockFetch(patternFixture);
      const body = {
        name: 'SSN',
        type: 'custom' as const,
        detection_config: { technique: 'regex' as const },
      };
      const r = await client.replace('dp-1', body);
      expect(r.id).toBe('dp-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-patterns/dp-1');
      expect(init.method).toBe('PUT');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });

  describe('patch', () => {
    it('PATCHes with Content-Type application/merge-patch+json', async () => {
      mockFetch(patternFixture);
      const body = {
        name: 'SSN',
        type: 'custom' as const,
        detection_config: { technique: 'regex' as const },
        description: null,
      };
      const r = await client.patch('dp-1', body);
      expect(r.id).toBe('dp-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-patterns/dp-1');
      expect(init.method).toBe('PATCH');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe(
        'application/merge-patch+json',
      );
      expect(init.body).toBe(JSON.stringify(body));
    });
  });

  describe('delete', () => {
    it('DELETEs /v2/api/data-patterns/{resourceId} and resolves to undefined on 204', async () => {
      mockFetch(undefined, 204);
      const r = await client.delete('dp-1');
      expect(r).toBeUndefined();
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-patterns/dp-1');
      expect(init.method).toBe('DELETE');
    });

    it('URL-encodes resourceIds on delete', async () => {
      mockFetch(undefined, 204);
      await client.delete('foo/bar');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('foo%2Fbar');
    });
  });

  describe('auth', () => {
    it('invokes the auth adapter refresh path on 401', async () => {
      const auth = authWith401Then200();
      client = new DataPatternsClient({
        baseUrl: 'https://api.dlp.paloaltonetworks.com',
        auth,
        numRetries: 1,
      });

      const fetchSpy = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 401, text: () => Promise.resolve('') })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(pageFixture)),
        });
      globalThis.fetch = fetchSpy;

      const r = await client.list();
      expect(r.content[0].id).toBe('dp-1');
      expect(auth.refreshes()).toBe(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
