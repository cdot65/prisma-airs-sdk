import { describe, it, expect, afterEach, vi } from 'vitest';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';
import { DEFAULT_TOKEN_ENDPOINT } from '../../src/constants.js';

function mockFetchToken(accessToken = 'tok-123', expiresIn = 3600, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      Promise.resolve(
        status >= 200 && status < 300
          ? { access_token: accessToken, expires_in: expiresIn }
          : { error: 'invalid_client', error_description: 'bad creds' },
      ),
  });
}

describe('OAuthClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const opts = {
    clientId: 'cid',
    clientSecret: 'csecret',
    tsgId: '123456',
  };

  it('uses default token endpoint', () => {
    const client = new OAuthClient(opts);
    expect(client.tokenEndpoint).toBe(DEFAULT_TOKEN_ENDPOINT);
  });

  it('accepts custom token endpoint', () => {
    const client = new OAuthClient({ ...opts, tokenEndpoint: 'https://custom/token' });
    expect(client.tokenEndpoint).toBe('https://custom/token');
  });

  describe('getToken', () => {
    it('fetches token via POST with correct params', async () => {
      mockFetchToken('abc', 3600);
      const client = new OAuthClient(opts);
      const token = await client.getToken();

      expect(token).toBe('abc');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe(DEFAULT_TOKEN_ENDPOINT);
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      const authHeader = init.headers['Authorization'] as string;
      expect(authHeader.startsWith('Basic ')).toBe(true);
      const decoded = atob(authHeader.slice(6));
      expect(decoded).toBe('cid:csecret');

      expect(init.body).toContain('grant_type=client_credentials');
      expect(init.body).toContain('scope=tsg_id%3A123456');
    });

    it('caches token on subsequent calls', async () => {
      mockFetchToken('cached', 3600);
      const client = new OAuthClient(opts);
      await client.getToken();
      await client.getToken();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('refreshes when token is expired', async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'first', expires_in: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'second', expires_in: 3600 }),
        });
      globalThis.fetch = fetchSpy;
      const client = new OAuthClient(opts);
      await client.getToken();

      const token = await client.getToken();

      expect(token).toBe('second');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent fetches', async () => {
      mockFetchToken('dedup', 3600);
      const client = new OAuthClient(opts);

      const [t1, t2, t3] = await Promise.all([
        client.getToken(),
        client.getToken(),
        client.getToken(),
      ]);

      expect(t1).toBe('dedup');
      expect(t2).toBe('dedup');
      expect(t3).toBe('dedup');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws OAUTH_ERROR with error_description from response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({ error: 'invalid_client', error_description: 'bad creds' }),
      });
      const client = new OAuthClient(opts);

      await expect(client.getToken()).rejects.toThrow(AISecSDKException);
      await expect(client.getToken()).rejects.toThrow(/bad creds/);
    });

    it('throws OAUTH_ERROR with error field when no description', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'unauthorized_client' }),
      });
      const client = new OAuthClient(opts);

      await expect(client.getToken()).rejects.toThrow(/unauthorized_client/);
    });

    it('throws OAUTH_ERROR with status when json parse fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });
      const client = new OAuthClient(opts);

      await expect(client.getToken()).rejects.toThrow(/status 500/);
    });

    it('throws OAUTH_ERROR with status fallback when no error fields', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ code: 'FORBIDDEN' }),
      });
      const client = new OAuthClient(opts);

      await expect(client.getToken()).rejects.toThrow(/status 403/);
    });

    it('throws OAUTH_ERROR on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'));
      const client = new OAuthClient(opts);

      await expect(client.getToken()).rejects.toThrow(AISecSDKException);
    });
  });

  describe('clearToken', () => {
    it('forces re-fetch after clear', async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'tok1', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'tok2', expires_in: 3600 }),
        });
      globalThis.fetch = fetchSpy;
      const client = new OAuthClient(opts);
      await client.getToken();

      client.clearToken();
      const token = await client.getToken();

      expect(token).toBe('tok2');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
