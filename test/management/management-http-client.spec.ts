import { describe, it, expect, afterEach, vi } from 'vitest';
import { managementHttpRequest } from '../../src/management/management-http-client.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';

function createMockOAuth(token = 'bearer-tok'): OAuthClient {
  return {
    getToken: vi.fn().mockResolvedValue(token),
    clearToken: vi.fn(),
  } as unknown as OAuthClient;
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(data !== null ? JSON.stringify(data) : ''),
    json: () => Promise.resolve(data),
  });
}

describe('managementHttpRequest', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends GET request with bearer token', async () => {
    const oauth = createMockOAuth('my-token');
    mockFetch({ data: 'ok' });

    const result = await managementHttpRequest({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/test',
      oauthClient: oauth,
      numRetries: 0,
    });

    expect(result.data).toEqual({ data: 'ok' });
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/test');
    expect(init.headers['Authorization']).toBe('Bearer my-token');
  });

  it('sends POST with JSON body', async () => {
    const oauth = createMockOAuth();
    mockFetch({ id: '1' }, 201);

    await managementHttpRequest({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/resource',
      body: { name: 'test' },
      oauthClient: oauth,
      numRetries: 0,
    });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ name: 'test' });
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('sends PUT request', async () => {
    const oauth = createMockOAuth();
    mockFetch({ updated: true });

    await managementHttpRequest({
      method: 'PUT',
      baseUrl: 'https://api.example.com',
      path: '/v1/resource/123',
      body: { name: 'updated' },
      oauthClient: oauth,
      numRetries: 0,
    });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe('PUT');
  });

  it('sends DELETE and handles empty body', async () => {
    const oauth = createMockOAuth();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    const result = await managementHttpRequest({
      method: 'DELETE',
      baseUrl: 'https://api.example.com',
      path: '/v1/resource/123',
      oauthClient: oauth,
      numRetries: 0,
    });

    expect(result.status).toBe(204);
    expect(result.data).toEqual({});
  });

  it('appends query params', async () => {
    const oauth = createMockOAuth();
    mockFetch({ items: [] });

    await managementHttpRequest({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      params: { offset: '10', limit: '20' },
      oauthClient: oauth,
      numRetries: 0,
    });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('offset=10');
    expect(url).toContain('limit=20');
  });

  it('retries on 5xx errors', async () => {
    const oauth = createMockOAuth();
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve(JSON.stringify({ message: 'unavailable' })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
      });
    globalThis.fetch = fetchSpy;

    const result = await managementHttpRequest({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/test',
      oauthClient: oauth,
      numRetries: 1,
    });

    expect(result.data).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('refreshes token on 401 and retries once', async () => {
    const oauth = createMockOAuth('old-token');
    (oauth.getToken as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('new-token');

    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ message: 'unauthorized' })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
      });
    globalThis.fetch = fetchSpy;

    const result = await managementHttpRequest({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/test',
      oauthClient: oauth,
      numRetries: 0,
    });

    expect(result.data).toEqual({ ok: true });
    expect(oauth.clearToken).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws on non-retryable client error', async () => {
    const oauth = createMockOAuth();
    mockFetch({ error_message: 'not found' }, 404);

    await expect(
      managementHttpRequest({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/missing',
        oauthClient: oauth,
        numRetries: 0,
      }),
    ).rejects.toThrow(AISecSDKException);
  });

  it('extracts error_message field from mgmt API errors', async () => {
    const oauth = createMockOAuth();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ error_message: 'bad input' })),
    });

    await expect(
      managementHttpRequest({
        method: 'POST',
        baseUrl: 'https://api.example.com',
        path: '/v1/test',
        oauthClient: oauth,
        numRetries: 0,
      }),
    ).rejects.toThrow(/bad input/);
  });

  it('retries on network error then succeeds', async () => {
    const oauth = createMockOAuth();
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
      });
    globalThis.fetch = fetchSpy;

    const result = await managementHttpRequest({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/test',
      oauthClient: oauth,
      numRetries: 1,
    });

    expect(result.data).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries on network error', async () => {
    const oauth = createMockOAuth();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('connection refused'));

    await expect(
      managementHttpRequest({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/test',
        oauthClient: oauth,
        numRetries: 0,
      }),
    ).rejects.toThrow(/connection refused/);
  });

  it('includes status and body when no known error fields', async () => {
    const oauth = createMockOAuth();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve(JSON.stringify({ code: 'UNKNOWN' })),
    });

    await expect(
      managementHttpRequest({
        method: 'POST',
        baseUrl: 'https://api.example.com',
        path: '/v1/test',
        oauthClient: oauth,
        numRetries: 0,
      }),
    ).rejects.toThrow(/API error 422/);
  });

  it('handles non-JSON error body', async () => {
    const oauth = createMockOAuth();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve('Bad Gateway'),
    });

    await expect(
      managementHttpRequest({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/test',
        oauthClient: oauth,
        numRetries: 0,
      }),
    ).rejects.toThrow(/Bad Gateway/);
  });

  it('falls back to message field in errors', async () => {
    const oauth = createMockOAuth();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ message: 'fallback msg' })),
    });

    await expect(
      managementHttpRequest({
        method: 'POST',
        baseUrl: 'https://api.example.com',
        path: '/v1/test',
        oauthClient: oauth,
        numRetries: 0,
      }),
    ).rejects.toThrow(/fallback msg/);
  });

  it('refreshes token on 403 and retries once', async () => {
    const oauth = createMockOAuth('old-token');
    (oauth.getToken as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('new-token');

    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify({ message: 'forbidden' })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
      });
    globalThis.fetch = fetchSpy;

    const result = await managementHttpRequest({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/test',
      oauthClient: oauth,
      numRetries: 0,
    });

    expect(result.data).toEqual({ ok: true });
    expect(oauth.clearToken).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not retry 403 twice', async () => {
    const oauth = createMockOAuth('old-token');
    (oauth.getToken as ReturnType<typeof vi.fn>).mockResolvedValue('same-bad-token');

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve(JSON.stringify({ message: 'forbidden' })),
    });
    globalThis.fetch = fetchSpy;

    await expect(
      managementHttpRequest({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/test',
        oauthClient: oauth,
        numRetries: 0,
      }),
    ).rejects.toThrow(/forbidden/);

    // 1 initial + 1 retry after 403 = 2 calls, then fails
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
