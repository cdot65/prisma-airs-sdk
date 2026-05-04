import { describe, it, expect, vi } from 'vitest';
import { OAuthAuth } from '../../../src/http/auth/oauth.js';
import type { OAuthClient } from '../../../src/management/oauth-client.js';
import type { PreparedRequest } from '../../../src/http/types.js';

function makeClient(token = 'tok-1'): OAuthClient {
  return {
    getToken: vi.fn().mockResolvedValue(token),
    clearToken: vi.fn(),
  } as unknown as OAuthClient;
}

function baseRequest(): PreparedRequest {
  return {
    method: 'GET',
    url: new URL('https://api.example.com/v1/items'),
    headers: { 'User-Agent': 'test' },
  };
}

describe('OAuthAuth.prepare', () => {
  it('adds Authorization Bearer header from getToken()', async () => {
    const client = makeClient('my-token');
    const auth = new OAuthAuth(client);
    const out = await auth.prepare(baseRequest());
    expect(out.headers['Authorization']).toBe('Bearer my-token');
  });

  it('preserves existing headers', async () => {
    const auth = new OAuthAuth(makeClient());
    const req = baseRequest();
    req.headers['X-Custom'] = 'keep-me';
    const out = await auth.prepare(req);
    expect(out.headers['X-Custom']).toBe('keep-me');
    expect(out.headers['User-Agent']).toBe('test');
  });

  it('returns a request with same url, method, and bodyText', async () => {
    const auth = new OAuthAuth(makeClient());
    const req: PreparedRequest = {
      method: 'POST',
      url: new URL('https://api.example.com/v1/things'),
      headers: {},
      bodyText: '{"a":1}',
    };
    const out = await auth.prepare(req);
    expect(out.method).toBe('POST');
    expect(out.url.toString()).toBe('https://api.example.com/v1/things');
    expect(out.bodyText).toBe('{"a":1}');
  });

  it('propagates token fetch errors', async () => {
    const client = {
      getToken: vi.fn().mockRejectedValue(new Error('token fetch failed')),
      clearToken: vi.fn(),
    } as unknown as OAuthClient;
    const auth = new OAuthAuth(client);
    await expect(auth.prepare(baseRequest())).rejects.toThrow(/token fetch failed/);
  });

  it('calls getToken once per prepare', async () => {
    const client = makeClient();
    const auth = new OAuthAuth(client);
    await auth.prepare(baseRequest());
    expect(client.getToken).toHaveBeenCalledTimes(1);
  });
});

describe('OAuthAuth.onUnauthorized', () => {
  it('clears token and returns true on 401', async () => {
    const client = makeClient();
    const auth = new OAuthAuth(client);
    const res = new Response(null, { status: 401 });
    const should = await auth.onUnauthorized!(res);
    expect(should).toBe(true);
    expect(client.clearToken).toHaveBeenCalledTimes(1);
  });

  it('clears token and returns true on 403', async () => {
    const client = makeClient();
    const auth = new OAuthAuth(client);
    const res = new Response(null, { status: 403 });
    const should = await auth.onUnauthorized!(res);
    expect(should).toBe(true);
    expect(client.clearToken).toHaveBeenCalledTimes(1);
  });

  it('returns false and does not clear token on 500', async () => {
    const client = makeClient();
    const auth = new OAuthAuth(client);
    const res = new Response(null, { status: 500 });
    const should = await auth.onUnauthorized!(res);
    expect(should).toBe(false);
    expect(client.clearToken).not.toHaveBeenCalled();
  });

  it('returns false on 400', async () => {
    const client = makeClient();
    const auth = new OAuthAuth(client);
    const res = new Response(null, { status: 400 });
    expect(await auth.onUnauthorized!(res)).toBe(false);
    expect(client.clearToken).not.toHaveBeenCalled();
  });
});
