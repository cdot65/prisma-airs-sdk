import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { request } from '../../src/http/request.js';
import {
  executeWithRetry,
  sleep,
  parseRetryAfterHeader,
  parseRetryAfterBody,
} from '../../src/http-retry.js';
import { deadline, abortable } from '../../src/http/abort.js';
import { ErrorType } from '../../src/errors.js';
import { sanitizeDebugBody, sanitizeUrl } from '../../src/http/debug.js';

const base = {
  method: 'POST' as const,
  baseUrl: 'https://example.test',
  path: '/items',
  auth: {
    prepare: async (r: Parameters<Parameters<typeof request>[0]['auth']['prepare']>[0]) => r,
  },
  numRetries: 0,
};
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('bounded transport and cancellation', () => {
  it.each([200, 403])(
    'preserves caller cancellation during a %s response-body read',
    async (status) => {
      const caller = new AbortController();
      const reason = new Error('cancel body read');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: status === 200,
          status,
          text: () => {
            caller.abort(reason);
            return Promise.reject(reason);
          },
        }),
      );
      await expect(request({ ...base, signal: caller.signal })).rejects.toBe(reason);
    },
  );
  it('preserves caller cancellation during authentication refresh', async () => {
    const caller = new AbortController();
    const reason = new Error('cancel refresh');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(
      request({
        ...base,
        signal: caller.signal,
        auth: {
          ...base.auth,
          onUnauthorized: async () => {
            caller.abort(reason);
            throw reason;
          },
        },
      }),
    ).rejects.toBe(reason);
  });
  it('propagates refresh errors without replaying the original write', async () => {
    const reason = new Error('refresh unavailable');
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetch);
    await expect(
      request({
        ...base,
        numRetries: 5,
        auth: {
          ...base.auth,
          onUnauthorized: async () => {
            throw reason;
          },
        },
      }),
    ).rejects.toBe(reason);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not let synchronous stream cancellation mask a successful retry', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        body: {
          cancel: () => {
            throw new Error('locked stream');
          },
        },
      })
      .mockResolvedValueOnce(new Response('{}'));
    expect((await executeWithRetry({ maxRetries: 1, execute })).status).toBe(200);
  });
  it('removes the abort listener after a successful backoff', async () => {
    const caller = new AbortController();
    const remove = vi.spyOn(caller.signal, 'removeEventListener');
    await sleep(0, caller.signal);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });
  it.each([-1, 6, 0.5, NaN, Infinity])('rejects invalid retry budgets: %s', async (maxRetries) => {
    const execute = vi.fn();
    await expect(executeWithRetry({ maxRetries, execute })).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(execute).not.toHaveBeenCalled();
  });
  it('rejects overflowing Retry-After guidance and invalid dates', () => {
    expect(parseRetryAfterHeader('9'.repeat(400))).toBeUndefined();
    expect(parseRetryAfterHeader('Mon, 99 Jan 2026 99:99:99 GMT')).toBeUndefined();
    expect(parseRetryAfterBody('{"retry_after":{"interval":1,"unit":42}}')).toBeUndefined();
    expect(
      parseRetryAfterBody('{"retry_after":{"interval":1e308,"unit":"minutes"}}'),
    ).toBeUndefined();
  });
  it('continues response parsing when an opted-in debug clone fails', async () => {
    vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
    vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', '1');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        clone: () => {
          throw new Error('not cloneable');
        },
        text: async () => '{"ok":true}',
      }),
    );
    expect(await request({ ...base, responseSchema: z.object({ ok: z.boolean() }) })).toEqual({
      ok: true,
    });
  });
  it('does not serialize multipart file contents into debug output', async () => {
    vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
    vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', '1');
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    const formData = new FormData();
    formData.append('file', new Blob(['private-upload-text']), 'prompts.csv');
    await request({ ...base, formData });
    expect(JSON.stringify(output.mock.calls)).not.toContain('private-upload-text');
  });
  it.each([NaN, Infinity, -Infinity])(
    'rejects non-finite JSON without changing it to null: %s',
    async (value) => {
      const prepare = vi.fn();
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      await expect(
        request({ ...base, auth: { prepare }, body: { extension: { value } } }),
      ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
      expect(prepare).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('bounds a fetch implementation that ignores AbortSignal', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const result = expect(request({ ...base, timeoutMs: 10 })).rejects.toMatchObject({
      failureKind: 'network',
    });
    await vi.advanceTimersByTimeAsync(10);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('bounds HTTP error-body reads while preserving the original status', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: () => new Promise(() => {}) }),
    );
    const result = expect(request({ ...base, timeoutMs: 10 })).rejects.toMatchObject({
      failureKind: 'http',
      statusCode: 403,
    });
    await vi.advanceTimersByTimeAsync(10);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('bounds authentication refresh and normalizes its timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    const result = expect(
      request({
        ...base,
        timeoutMs: 10,
        auth: { ...base.auth, onUnauthorized: () => new Promise(() => {}) },
      }),
    ).rejects.toMatchObject({ failureKind: 'network' });
    await vi.advanceTimersByTimeAsync(10);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not let failed stream cancellation mask a retry outcome', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        body: { cancel: () => Promise.reject(new Error('broken cancellation')) },
      })
      .mockResolvedValueOnce(new Response('{}'));
    expect((await executeWithRetry({ maxRetries: 1, execute })).status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(2);
  });
  it('composes a deadline with an un-aborted caller signal', async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const fetch = vi.fn(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const result = expect(
      request({ ...base, timeoutMs: 20, signal: caller.signal }),
    ).rejects.toMatchObject({ errorType: ErrorType.CLIENT_SIDE_ERROR, failureKind: 'network' });
    await vi.advanceTimersByTimeAsync(20);
    await result;
    expect(caller.signal.aborted).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not authenticate or fetch after caller cancellation', async () => {
    const signal = AbortSignal.abort(new Error('caller stopped'));
    const prepare = vi.fn();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(request({ ...base, signal, auth: { prepare } })).rejects.toThrow('caller stopped');
    expect(prepare).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('cancels a long Retry-After backoff immediately', async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('retry', { status: 503, headers: { 'Retry-After': '60' } }));
    vi.stubGlobal('fetch', fetch);
    const result = expect(
      request({ ...base, numRetries: 5, signal: caller.signal }),
    ).rejects.toThrow('cancel backoff');
    await vi.advanceTimersByTimeAsync(0);
    caller.abort(new Error('cancel backoff'));
    await result;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds waiting for a shared authentication operation', async () => {
    vi.useFakeTimers();
    const result = expect(
      request({ ...base, timeoutMs: 10, auth: { prepare: () => new Promise(() => {}) } }),
    ).rejects.toMatchObject({ failureKind: 'network' });
    await vi.advanceTimersByTimeAsync(10);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -1, 0.5, NaN, Infinity])(
    'rejects invalid timeout %s before fetch',
    async (timeoutMs) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      await expect(request({ ...base, timeoutMs })).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('validates the process-wide deadline override', async () => {
    vi.stubEnv('PANW_AI_SEC_TIMEOUT_MS', 'invalid');
    await expect(request(base)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
  });

  it('serializes a retry body once but prepares auth for every attempt', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const toJSON = vi.fn().mockReturnValue({ key: 'value' });
    const prepare = vi.fn(async (r) => {
      r.url.searchParams.append('auth_attempt', 'yes');
      return r;
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await request({ ...base, body: { toJSON }, numRetries: 1, auth: { prepare } });
    expect(toJSON).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(
      fetch.mock.calls.map(([url]) => new URL(url).searchParams.getAll('auth_attempt')),
    ).toEqual([['yes'], ['yes']]);
    expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);
  });

  it('rejects circular JSON without authenticating or retrying', async () => {
    const body: Record<string, unknown> = {};
    body.self = body;
    const prepare = vi.fn();
    await expect(request({ ...base, body, auth: { prepare } })).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(prepare).not.toHaveBeenCalled();
  });

  it('normalizes failed 2xx body reads without replaying the request', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.reject(new Error('stream failed')),
    });
    vi.stubGlobal('fetch', fetch);
    await expect(request({ ...base, numRetries: 5 })).rejects.toMatchObject({
      failureKind: 'network',
      statusCode: 200,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves HTTP status when an error body cannot be read', async () => {
    const execute = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.reject(new Error('broken body')),
    });
    await expect(executeWithRetry({ maxRetries: 0, execute })).rejects.toMatchObject({
      failureKind: 'http',
      statusCode: 403,
    });
  });

  it('bounds even a misbehaving special-retry callback', async () => {
    const execute = vi.fn(() => Promise.resolve(new Response('{}', { status: 401 })));
    const onRetryableFailure = vi.fn(async () => true);
    await expect(
      executeWithRetry({ maxRetries: 0, execute, onRetryableFailure }),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(onRetryableFailure).toHaveBeenCalledTimes(1);
  });

  it.each([null, undefined, 'failure'])(
    'normalizes non-Error transport rejection %s',
    async (failure) => {
      await expect(
        executeWithRetry({ maxRetries: 0, execute: () => Promise.reject(failure) }),
      ).rejects.toMatchObject({ failureKind: 'network' });
    },
  );

  it('disposes parent listeners and pending timers on success', async () => {
    vi.useFakeTimers();
    const parent = new AbortController();
    const remove = vi.spyOn(parent.signal, 'removeEventListener');
    const scope = deadline(100, parent.signal);
    expect(await abortable(Promise.resolve('ok'), scope.signal)).toBe('ok');
    scope.dispose();
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('handles already-cancelled deadline, shared wait and sleep', async () => {
    const parent = AbortSignal.abort(new Error('cancelled'));
    const scope = deadline(100, parent);
    await expect(abortable(Promise.resolve('ignored'), scope.signal)).rejects.toThrow('cancelled');
    await expect(sleep(100, parent)).rejects.toThrow('cancelled');
    scope.dispose();
  });
});

describe('credential-safe diagnostics', () => {
  it('never quotes rejected request or response values in schema errors', async () => {
    const canary = 'sensitive-value-that-must-not-appear';
    const schema = z.object({ secret: z.literal('allowed') });
    const prepare = vi.fn(base.auth.prepare);
    await expect(
      request({ ...base, auth: { prepare }, body: { secret: canary }, requestSchema: schema }),
    ).rejects.toThrow('secret: invalid_literal');
    expect(prepare).not.toHaveBeenCalled();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ secret: canary }))),
    );
    try {
      await request({ ...base, responseSchema: schema });
      throw new Error('Expected validation failure');
    } catch (error) {
      expect(String(error)).toContain('secret: invalid_literal');
      expect(String(error)).not.toContain(canary);
    }
  });
  it('omits bodies and does not clone them by default', async () => {
    vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
    vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', '');
    const response = new Response('{"private":"response-canary"}');
    const clone = vi.spyOn(response, 'clone');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await request({
      ...base,
      params: { token: 'query-canary' },
      body: { prompt: 'prompt-canary' },
    });
    const output = log.mock.calls.flat().join(' ');
    for (const secret of ['query-canary', 'prompt-canary', 'response-canary'])
      expect(output).not.toContain(secret);
    expect(output).toContain('[BODY OMITTED]');
    expect(clone).not.toHaveBeenCalled();
  });

  it('redacts nested credentials even with explicit body logging', async () => {
    vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
    vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', 'true');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"access_token":"response-token","ok":true}')),
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await request({
      ...base,
      body: {
        client_secret: 'request-secret',
        auth_config: { auth_header: { Authorization: 'header-secret' } },
      },
      responseSchema: z.object({ ok: z.boolean() }).passthrough(),
    });
    const output = log.mock.calls.flat().join(' ');
    for (const secret of ['request-secret', 'response-token', 'header-secret'])
      expect(output).not.toContain(secret);
    expect(output).toContain('"ok":true');
  });

  it('fails closed for malformed bodies and URLs', () => {
    expect(sanitizeDebugBody('raw-token')).toBe('[NON-JSON BODY OMITTED]');
    expect(sanitizeUrl('raw-token')).toBe('[INVALID URL OMITTED]');
    expect(sanitizeUrl('https://user:password@example.test/?access_token=secret')).not.toMatch(
      /user|password|secret/,
    );
  });

  it('redacts secret adapter variables without mutating the input', () => {
    const raw = JSON.stringify({
      variables: [
        { type: 'SECRET', value: 'secret-value' },
        { type: 'VAR', value: 4 },
      ],
      array: [null, 'plain'],
    });
    const safe = sanitizeDebugBody(raw);
    expect(safe).not.toContain('secret-value');
    expect(safe).toContain('plain');
    expect(raw).toContain('secret-value');
  });
});
