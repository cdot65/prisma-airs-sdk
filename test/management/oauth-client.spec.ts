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
        json: () => Promise.resolve({ error: 'invalid_client', error_description: 'bad creds' }),
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

  describe('tokenBufferMs option', () => {
    it('uses default 30s buffer', async () => {
      mockFetchToken('tok', 31); // expires in 31s
      const client = new OAuthClient(opts);
      await client.getToken();

      // within default 30s buffer → should re-fetch
      const info = client.getTokenInfo();
      // 31s token, 30s buffer → valid for ~1s
      expect(info.isValid).toBe(true);
    });

    it('accepts custom buffer', async () => {
      mockFetchToken('tok', 120); // 120s token
      const client = new OAuthClient({ ...opts, tokenBufferMs: 60_000 }); // 60s buffer
      await client.getToken();

      const info = client.getTokenInfo();
      expect(info.isValid).toBe(true);
    });

    it('custom buffer triggers earlier refresh', async () => {
      // Token that lasts 45s, buffer of 60s → should be "expiring soon"
      mockFetchToken('tok', 45);
      const client = new OAuthClient({ ...opts, tokenBufferMs: 60_000 });
      await client.getToken();

      // Token will be within 60s buffer → getToken should re-fetch
      expect(client.isTokenExpiringSoon()).toBe(true);
    });
  });

  describe('isTokenExpired', () => {
    it('returns true when no token fetched', () => {
      const client = new OAuthClient(opts);
      expect(client.isTokenExpired()).toBe(true);
    });

    it('returns false for valid token', async () => {
      mockFetchToken('tok', 3600);
      const client = new OAuthClient(opts);
      await client.getToken();

      expect(client.isTokenExpired()).toBe(false);
    });

    it('returns true for expired token (expires_in=0)', async () => {
      mockFetchToken('tok', 0);
      const client = new OAuthClient(opts);
      await client.getToken();

      expect(client.isTokenExpired()).toBe(true);
    });

    it('returns true after clearToken', async () => {
      mockFetchToken('tok', 3600);
      const client = new OAuthClient(opts);
      await client.getToken();
      client.clearToken();

      expect(client.isTokenExpired()).toBe(true);
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('returns true when no token', () => {
      const client = new OAuthClient(opts);
      expect(client.isTokenExpiringSoon()).toBe(true);
    });

    it('returns false for token with plenty of time', async () => {
      mockFetchToken('tok', 3600);
      const client = new OAuthClient(opts);
      await client.getToken();

      expect(client.isTokenExpiringSoon()).toBe(false);
    });

    it('uses configured buffer by default', async () => {
      mockFetchToken('tok', 25); // 25s, within default 30s buffer
      const client = new OAuthClient(opts);
      await client.getToken();

      expect(client.isTokenExpiringSoon()).toBe(true);
    });

    it('accepts custom buffer override', async () => {
      mockFetchToken('tok', 3600);
      const client = new OAuthClient(opts);
      await client.getToken();

      expect(client.isTokenExpiringSoon(3600_000)).toBe(true); // 1hr buffer
      expect(client.isTokenExpiringSoon(1000)).toBe(false); // 1s buffer
    });
  });

  describe('getTokenInfo', () => {
    it('returns no-token state before fetch', () => {
      const client = new OAuthClient(opts);
      const info = client.getTokenInfo();

      expect(info.hasToken).toBe(false);
      expect(info.isValid).toBe(false);
      expect(info.isExpired).toBe(true);
      expect(info.isExpiringSoon).toBe(true);
      expect(info.expiresInMs).toBe(0);
    });

    it('returns valid state after fetch', async () => {
      mockFetchToken('tok', 3600);
      const client = new OAuthClient(opts);
      await client.getToken();

      const info = client.getTokenInfo();
      expect(info.hasToken).toBe(true);
      expect(info.isValid).toBe(true);
      expect(info.isExpired).toBe(false);
      expect(info.isExpiringSoon).toBe(false);
      expect(info.expiresInMs).toBeGreaterThan(3500_000); // ~1hr minus processing
      expect(info.expiresInMs).toBeLessThanOrEqual(3600_000);
      expect(info.expiresAt).toBeGreaterThan(Date.now());
    });

    it('returns expired state for expired token', async () => {
      mockFetchToken('tok', 0);
      const client = new OAuthClient(opts);
      await client.getToken();

      const info = client.getTokenInfo();
      expect(info.hasToken).toBe(true);
      expect(info.isValid).toBe(false);
      expect(info.isExpired).toBe(true);
      expect(info.expiresInMs).toBe(0);
    });
  });

  describe('onTokenRefresh callback', () => {
    it('calls onTokenRefresh after successful fetch', async () => {
      mockFetchToken('tok', 3600);
      const onRefresh = vi.fn();
      const client = new OAuthClient({ ...opts, onTokenRefresh: onRefresh });
      await client.getToken();

      expect(onRefresh).toHaveBeenCalledTimes(1);
      const info = onRefresh.mock.calls[0][0];
      expect(info.expiresInMs).toBeGreaterThan(0);
      expect(info.hasToken).toBe(true);
      expect(info.isValid).toBe(true);
    });

    it('calls onTokenRefresh on each refresh', async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'tok1', expires_in: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'tok2', expires_in: 3600 }),
        });
      globalThis.fetch = fetchSpy;
      const onRefresh = vi.fn();
      const client = new OAuthClient({ ...opts, onTokenRefresh: onRefresh });
      await client.getToken();
      await client.getToken(); // triggers refresh because expires_in=0

      expect(onRefresh).toHaveBeenCalledTimes(2);
    });

    it('does not block getToken if callback throws', async () => {
      mockFetchToken('tok', 3600);
      const onRefresh = vi.fn().mockImplementation(() => {
        throw new Error('callback error');
      });
      const client = new OAuthClient({ ...opts, onTokenRefresh: onRefresh });

      // should not throw despite callback error
      const token = await client.getToken();
      expect(token).toBe('tok');
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
