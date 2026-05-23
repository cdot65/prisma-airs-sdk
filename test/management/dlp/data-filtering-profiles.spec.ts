import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataFilteringProfilesClient } from '../../../src/management/dlp/data-filtering-profiles.js';
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
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  });
}

const profileFixture = {
  id: 'dfp-1',
  name: 'Finance',
  file_based: true,
  non_file_based: false,
};

const pageFixture = {
  content: [profileFixture],
  empty: false,
  first: true,
  last: true,
  number: 0,
  numberOfElements: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

describe('DataFilteringProfilesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: DataFilteringProfilesClient;

  beforeEach(() => {
    client = new DataFilteringProfilesClient({
      baseUrl: 'https://api.dlp.paloaltonetworks.com',
      auth: passthroughAuth(),
      numRetries: 1,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('list', () => {
    it('GETs /v2/api/data-filtering-profiles with no params', async () => {
      mockFetch(pageFixture);
      const r = await client.list();
      expect(r.content).toHaveLength(1);
      expect(r.content[0].id).toBe('dfp-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-filtering-profiles');
      expect(init.method).toBe('GET');
    });

    it('passes page + size as query params', async () => {
      mockFetch(pageFixture);
      await client.list({ page: 2, size: 50 });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('page=2');
      expect(url).toContain('size=50');
    });

    it('passes status + name filter params', async () => {
      mockFetch(pageFixture);
      await client.list({ status: 'enabled', name: 'finance' });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('status=enabled');
      expect(url).toContain('name=finance');
    });

    it('repeats the sort query parameter once per array entry', async () => {
      mockFetch(pageFixture);
      await client.list({ sort: ['name,asc', 'id,desc'] });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const urlObj = new URL(url);
      expect(urlObj.searchParams.getAll('sort')).toEqual(['name,asc', 'id,desc']);
    });

    it('parses the Spring Page envelope and returns typed content', async () => {
      mockFetch(pageFixture);
      const r = await client.list();
      expect(r.totalElements).toBe(1);
      expect(r.content[0].name).toBe('Finance');
    });

    it('throws RESPONSE_VALIDATION when the body fails schema parsing', async () => {
      mockFetch({ content: 'not-an-array' });
      await expect(client.list()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    });
  });

  describe('get', () => {
    it('GETs /v2/api/data-filtering-profiles/{resourceId}', async () => {
      mockFetch(profileFixture);
      const r = await client.get('dfp-1');
      expect(r.id).toBe('dfp-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-filtering-profiles/dfp-1');
      expect(init.method).toBe('GET');
    });

    it('URL-encodes resourceIds with special characters', async () => {
      mockFetch(profileFixture);
      await client.get('weird id/with slash');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('weird%20id%2Fwith%20slash');
    });
  });

  describe('replace', () => {
    it('PUTs the JSON body to /v2/api/data-filtering-profiles/{resourceId}', async () => {
      mockFetch(profileFixture);
      const body = { file_based: true, non_file_based: false, description: 'updated' };
      const r = await client.replace('dfp-1', body);
      expect(r.id).toBe('dfp-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-filtering-profiles/dfp-1');
      expect(init.method).toBe('PUT');
      expect(init.body).toBe(JSON.stringify(body));
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });

  describe('auth', () => {
    it('invokes the auth adapter refresh path on 401', async () => {
      const auth = authWith401Then200();
      client = new DataFilteringProfilesClient({
        baseUrl: 'https://api.dlp.paloaltonetworks.com',
        auth,
        numRetries: 1,
      });

      // First call → 401, second → 200
      const fetchSpy = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(pageFixture)),
        });
      globalThis.fetch = fetchSpy;

      const r = await client.list();
      expect(r.content[0].id).toBe('dfp-1');
      expect(auth.refreshes()).toBe(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
