import { describe, it, expect, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { request } from '../../src/http/request.js';
import { AISecSDKException, ErrorType } from '../../src/errors.js';
import type { AuthAdapter, PreparedRequest } from '../../src/http/types.js';

const passthroughAuth: AuthAdapter = {
  prepare: async (req) => req,
};

function refreshAuth(
  opts: {
    unauthorizedReturns?: boolean;
  } = {},
): AuthAdapter & { refreshCount: () => number } {
  let count = 0;
  return {
    prepare: async (req) => req,
    onUnauthorized: async () => {
      count++;
      return opts.unauthorizedReturns ?? true;
    },
    refreshCount: () => count,
  } as AuthAdapter & { refreshCount: () => number };
}

function mockResponse(body: unknown, status = 200): Response {
  const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

const ItemSchema = z.object({ id: z.string(), name: z.string() });
type Item = z.infer<typeof ItemSchema>;

describe('request — URL building', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('builds URL from baseUrl + path', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/items');
  });

  it('strips trailing slash from baseUrl', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com///',
      path: '/v1/items',
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/items');
  });

  it('appends scalar params', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      params: { skip: '10', limit: '20' },
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain('skip=10');
    expect(url).toContain('limit=20');
  });

  it('appends array params with repeated keys', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      params: { tag: ['a', 'b', 'c'] },
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [url] = fetchSpy.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(parsed.searchParams.getAll('tag')).toEqual(['a', 'b', 'c']);
  });
});

describe('request — body handling', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('omits body and Content-Type when body undefined', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('JSON-stringifies body and sets Content-Type', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      body: { name: 'foo' },
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ name: 'foo' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sets User-Agent on every request', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/PAN-AIRS/);
  });

  // Regression for #162: AIRS DLP GET-by-id endpoints return 400 on tenants
  // whose downstream services require the `service-name: api` header. The
  // header is optional in the spec but defensive on the client per the AIRS
  // API team's guidance.
  it('sets service-name: api on every request', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect((init.headers as Record<string, string>)['service-name']).toBe('api');
  });
});

describe('request — content type override', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends application/merge-patch+json when contentType is set', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'PATCH',
      baseUrl: 'https://api.example.com',
      path: '/v1/items/1',
      body: { description: null, name: 'updated' },
      contentType: 'application/merge-patch+json',
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/merge-patch+json',
    );
    // Body is still JSON-stringified (merge-patch is a JSON dialect).
    expect(init.body).toBe(JSON.stringify({ description: null, name: 'updated' }));
  });

  it('contentType is ignored when no body is set', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      contentType: 'application/merge-patch+json',
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('defaults to application/json when contentType is omitted', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      body: { name: 'foo' },
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });
});

describe('request — multipart form-data', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('passes FormData straight through to fetch', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    const fd = new FormData();
    fd.append('file', new Blob(['hello']), 'hello.txt');

    await request({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/uploads',
      formData: fd,
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    // Same instance — don't serialize or wrap.
    expect(init.body).toBe(fd);
  });

  it('does not set Content-Type when sending FormData (runtime sets boundary)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    const fd = new FormData();
    fd.append('field', 'value');

    await request({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/uploads',
      formData: fd,
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('formData takes precedence over body when both are set', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({}));
    globalThis.fetch = fetchSpy;

    const fd = new FormData();
    fd.append('field', 'value');

    await request({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/uploads',
      formData: fd,
      body: { ignored: true },
      auth: passthroughAuth,
      numRetries: 0,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.body).toBe(fd);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });
});

describe('request — schema parsing', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns parsed body when schema matches', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ id: '1', name: 'foo' }));

    const result = await request<Item>({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items/1',
      responseSchema: ItemSchema,
      auth: passthroughAuth,
      numRetries: 0,
    });

    expect(result).toEqual({ id: '1', name: 'foo' });
  });

  it('throws RESPONSE_VALIDATION when schema fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ id: 1, name: 'foo' }));

    try {
      await request<Item>({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/items/1',
        responseSchema: ItemSchema,
        auth: passthroughAuth,
        numRetries: 0,
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AISecSDKException);
      expect((err as AISecSDKException).errorType).toBe(ErrorType.RESPONSE_VALIDATION);
    }
  });

  it('throws RESPONSE_VALIDATION when body is not valid JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse('not-json{', 200));

    try {
      await request<Item>({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/items/1',
        responseSchema: ItemSchema,
        auth: passthroughAuth,
        numRetries: 0,
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AISecSDKException);
      expect((err as AISecSDKException).errorType).toBe(ErrorType.RESPONSE_VALIDATION);
    }
  });

  it('returns undefined when no schema and empty body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(undefined, 204));

    const result = await request({
      method: 'DELETE',
      baseUrl: 'https://api.example.com',
      path: '/v1/items/1',
      auth: passthroughAuth,
      numRetries: 0,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when no schema and any body (body is discarded)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ ignored: true }));

    const result = await request({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      auth: passthroughAuth,
      numRetries: 0,
    });

    expect(result).toBeUndefined();
  });

  // Regression for #136: API returns 200 with an empty body when scan-logs has
  // zero results. Empty body must hydrate as `{}` so all-optional-fields
  // schemas parse cleanly instead of failing with "expected object, received undefined".
  it('hydrates empty 2xx body as {} for schemas with all-optional fields', async () => {
    const AllOptionalSchema = z
      .object({
        total_pages: z.number().optional(),
        page_number: z.number().optional(),
      })
      .passthrough();

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(undefined, 200));

    const result = await request({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/mgmt/scanlogs',
      responseSchema: AllOptionalSchema,
      auth: passthroughAuth,
      numRetries: 0,
    });

    expect(result).toEqual({});
  });

  it('returns undefined on empty 2xx body when allowEmptyBody=true (skips schema)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(undefined, 204));

    const result = await request<Item | undefined>({
      method: 'PUT',
      baseUrl: 'https://api.example.com',
      path: '/v1/items/1',
      responseSchema: ItemSchema.optional(),
      allowEmptyBody: true,
      auth: passthroughAuth,
      numRetries: 0,
    });

    expect(result).toBeUndefined();
  });

  it('still parses body with schema when allowEmptyBody=true and body is present', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ id: 'i-1', name: 'X' }, 200));

    const result = await request<Item | undefined>({
      method: 'PUT',
      baseUrl: 'https://api.example.com',
      path: '/v1/items/1',
      responseSchema: ItemSchema.optional(),
      allowEmptyBody: true,
      auth: passthroughAuth,
      numRetries: 0,
    });

    expect(result).toEqual({ id: 'i-1', name: 'X' });
  });

  it('still fails RESPONSE_VALIDATION on empty 2xx body when schema has required fields', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(undefined, 200));

    try {
      await request<Item>({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/items/1',
        responseSchema: ItemSchema, // requires `id` and `name`
        auth: passthroughAuth,
        numRetries: 0,
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AISecSDKException);
      expect((err as AISecSDKException).errorType).toBe(ErrorType.RESPONSE_VALIDATION);
      // Error now points at the specific missing fields, not the cryptic root-level
      const msg = (err as Error).message;
      expect(msg).toContain('id');
    }
  });
});

describe('request — error handling', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws CLIENT_SIDE_ERROR on 4xx (non-401/403)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ message: 'not found' })),
    });

    try {
      await request({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/missing',
        auth: passthroughAuth,
        numRetries: 0,
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AISecSDKException);
      expect((err as AISecSDKException).errorType).toBe(ErrorType.CLIENT_SIDE_ERROR);
      expect((err as Error).message).toContain('not found');
    }
  });

  it('retries on 5xx and eventually throws SERVER_SIDE_ERROR', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve(JSON.stringify({ message: 'unavailable' })),
    });
    globalThis.fetch = fetchSpy;

    try {
      await request({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/x',
        auth: passthroughAuth,
        numRetries: 1,
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as AISecSDKException).errorType).toBe(ErrorType.SERVER_SIDE_ERROR);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe('request — auth integration', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls auth.prepare for the request', async () => {
    const adapter: AuthAdapter = {
      prepare: vi.fn(async (req: PreparedRequest) => ({
        ...req,
        headers: { ...req.headers, 'X-Auth': 'yes' },
      })),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({}));

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      auth: adapter,
      numRetries: 0,
    });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Record<string, string>)['X-Auth']).toBe('yes');
    expect(adapter.prepare).toHaveBeenCalledTimes(1);
  });

  it('grants free retry when onUnauthorized returns true (401)', async () => {
    const auth = refreshAuth();
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ message: 'unauthorized' })),
      })
      .mockResolvedValueOnce(mockResponse({ ok: true }, 200));
    globalThis.fetch = fetchSpy;

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/x',
      auth,
      numRetries: 0,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(auth.refreshCount()).toBe(1);
  });

  it('only calls onUnauthorized once per request (401 twice → throws)', async () => {
    const auth = refreshAuth();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ message: 'unauthorized' })),
    });
    globalThis.fetch = fetchSpy;

    await expect(
      request({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/x',
        auth,
        numRetries: 0,
      }),
    ).rejects.toThrow(/unauthorized/);

    expect(auth.refreshCount()).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('falls through to CLIENT_SIDE_ERROR if onUnauthorized returns false', async () => {
    const auth = refreshAuth({ unauthorizedReturns: false });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ message: 'unauthorized' })),
    });
    globalThis.fetch = fetchSpy;

    try {
      await request({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/x',
        auth,
        numRetries: 0,
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as AISecSDKException).errorType).toBe(ErrorType.CLIENT_SIDE_ERROR);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('adapter without onUnauthorized: 401 falls through immediately', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ message: 'unauthorized' })),
    });
    globalThis.fetch = fetchSpy;

    await expect(
      request({
        method: 'GET',
        baseUrl: 'https://api.example.com',
        path: '/v1/x',
        auth: passthroughAuth,
        numRetries: 0,
      }),
    ).rejects.toThrow(/unauthorized/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('request — debug logging (PANW_AI_SEC_DEBUG)', () => {
  const originalFetch = globalThis.fetch;
  const originalDebug = process.env.PANW_AI_SEC_DEBUG;

  // A mock Response that supports clone() so the debug hook can read the body.
  function cloneableResponse(body: unknown, status = 200): Response {
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    const make = (): Response =>
      ({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(text),
        clone: () => make(),
      }) as unknown as Response;
    return make();
  }

  // Auth adapter that injects a real bearer token, like the OAuth adapter.
  const bearerAuth: AuthAdapter = {
    prepare: async (req: PreparedRequest) => ({
      ...req,
      headers: { ...req.headers, Authorization: 'Bearer super-secret-token-value' },
    }),
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalDebug === undefined) delete process.env.PANW_AI_SEC_DEBUG;
    else process.env.PANW_AI_SEC_DEBUG = originalDebug;
    vi.restoreAllMocks();
  });

  it('logs sanitized request + response to stderr when enabled, never the raw token', async () => {
    process.env.PANW_AI_SEC_DEBUG = '1';
    globalThis.fetch = vi.fn().mockResolvedValue(cloneableResponse({ id: '1', name: 'a' }));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await request({
      method: 'POST',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      body: { hello: 'world' },
      auth: bearerAuth,
      responseSchema: ItemSchema,
      numRetries: 0,
    });

    const out = errSpy.mock.calls.flat().join('\n');
    expect(out).toContain('[airs-sdk]');
    expect(out).toContain('POST https://api.example.com/v1/items');
    expect(out).not.toContain('super-secret-token-value');
    expect(out).toMatch(/sha256:[0-9a-f]{12}/);
    expect(out).toContain('200');
  });

  it('produces no debug output when disabled', async () => {
    delete process.env.PANW_AI_SEC_DEBUG;
    globalThis.fetch = vi.fn().mockResolvedValue(cloneableResponse({ id: '1', name: 'a' }));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      auth: bearerAuth,
      responseSchema: ItemSchema,
      numRetries: 0,
    });

    const airsLines = errSpy.mock.calls.flat().filter((a) => String(a).includes('[airs-sdk]'));
    expect(airsLines).toHaveLength(0);
  });

  it('logs once per attempt across an auth retry', async () => {
    process.env.PANW_AI_SEC_DEBUG = '1';
    let call = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      call++;
      return Promise.resolve(
        cloneableResponse(call === 1 ? {} : { id: '1', name: 'a' }, call === 1 ? 401 : 200),
      );
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await request({
      method: 'GET',
      baseUrl: 'https://api.example.com',
      path: '/v1/items',
      auth: refreshAuth({ unauthorizedReturns: true }),
      responseSchema: ItemSchema,
      numRetries: 2,
    });

    const reqLines = errSpy.mock.calls.flat().filter((a) => String(a).includes('→ GET'));
    expect(reqLines).toHaveLength(2);
  });
});
