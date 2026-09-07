import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException, ErrorType } from '../../src/errors.js';

const options = { clientId: 'offline-id', clientSecret: 'offline-secret', tsgId: '123456' };
const disposals: (() => void)[] = [];
function deferred<T>(fallback: T) {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  disposals.push(() => resolve(fallback));
  return { promise, resolve, reject };
}
function watch(promise: Promise<string>) {
  const result: { settled: boolean; value?: string; error?: unknown } = { settled: false };
  void promise.then(
    (value) => Object.assign(result, { settled: true, value }),
    (error: unknown) => Object.assign(result, { settled: true, error }),
  );
  return result;
}
const token = (value = 'offline-token') =>
  new Response(JSON.stringify({ access_token: value, expires_in: 3600 }));
function expectTimeout(result: ReturnType<typeof watch>) {
  expect(result.settled).toBe(true);
  expect(result.error).toBeInstanceOf(AISecSDKException);
  expect(result.error).toMatchObject({ errorType: ErrorType.OAUTH_ERROR });
  expect(String(result.error)).toContain('Token request timed out');
  expect(String(result.error)).not.toContain(options.clientSecret);
}

beforeEach(() => {
  vi.useFakeTimers();
  // Also drives the pre-fix native timeout under fake time, so the red tests prove
  // that an already-aborted signal alone does not bound the client's own wait.
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), ms);
    return controller.signal;
  });
});
afterEach(async () => {
  for (const dispose of disposals.splice(0)) dispose();
  await vi.advanceTimersByTimeAsync(0);
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('standalone OAuth deadline ownership', () => {
  it('rejects all refresh waiters after 30 seconds when fetch ignores cancellation', async () => {
    const pending = deferred(token());
    let signal: AbortSignal | undefined;
    const fetch = vi.fn().mockImplementation((_url, init) => {
      signal = init.signal;
      return pending.promise;
    });
    vi.stubGlobal('fetch', fetch);
    const client = new OAuthClient(options);
    const first = watch(client.getToken());
    const second = watch(client.getToken());
    await vi.advanceTimersByTimeAsync(29_999);
    expect(first.settled).toBe(false);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(true);
    expectTimeout(first);
    expectTimeout(second);
    expect(second.error).toBe(first.error);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.getTokenInfo().hasToken).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows a fresh refresh and discards a late response without overwriting the new token', async () => {
    const pending = deferred(token('offline-old'));
    const fetch = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(token('offline-new'));
    vi.stubGlobal('fetch', fetch);
    const refreshed = vi.fn();
    const client = new OAuthClient({ ...options, onTokenRefresh: refreshed });
    const expired = watch(client.getToken());
    await vi.advanceTimersByTimeAsync(30_000);
    expectTimeout(expired);
    expect(await client.getToken()).toBe('offline-new');
    const late = token('offline-old');
    const cancel = vi.spyOn(late.body!, 'cancel');
    pending.resolve(late);
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(await client.getToken()).toBe('offline-new');
    expect(refreshed).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('consumes a late rejected fetch without an unhandled rejection or poisoned refresh', async () => {
    const pending = deferred(token());
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(token()));
    const client = new OAuthClient(options);
    const expired = watch(client.getToken());
    await vi.advanceTimersByTimeAsync(30_000);
    expectTimeout(expired);
    pending.reject(new Error('late transport failure'));
    await vi.advanceTimersByTimeAsync(0);
    expect(await client.getToken()).toBe('offline-token');
  });

  it.each([200, 401, 503])(
    'uses one deadline for headers and a stalled %s JSON body',
    async (status) => {
      const header = deferred(token());
      const body = deferred({ access_token: 'offline-late', expires_in: 3600 });
      const cancel = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(header.promise));
      const client = new OAuthClient(options);
      const result = watch(client.getToken());
      await vi.advanceTimersByTimeAsync(20_000);
      header.resolve({
        ok: status === 200,
        status,
        json: () => body.promise,
        body: { cancel },
      } as unknown as Response);
      await vi.advanceTimersByTimeAsync(9_999);
      expect(result.settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expectTimeout(result);
      expect(cancel).toHaveBeenCalledTimes(1);
      body.resolve({ access_token: 'offline-late', expires_in: 3600 });
      await vi.advanceTimersByTimeAsync(0);
      expect(client.getTokenInfo().hasToken).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(['throws', 'rejects', 'never-settles', 'no-body'] as const)(
    'does not let %s body cancellation replace or delay a timeout',
    async (mode) => {
      const body = deferred({ access_token: 'offline-late', expires_in: 3600 });
      const cancel = vi.fn().mockImplementation(() => {
        if (mode === 'throws') throw new Error('body locked');
        if (mode === 'rejects') return Promise.reject(new Error('body locked'));
        return new Promise(() => {});
      });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => body.promise,
          body: mode === 'no-body' ? null : { cancel },
        }),
      );
      const result = watch(new OAuthClient(options).getToken());
      await vi.advanceTimersByTimeAsync(30_000);
      expectTimeout(result);
      expect(cancel).toHaveBeenCalledTimes(mode === 'no-body' ? 0 : 1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([
    'success',
    'http-error',
    'network-error',
    'invalid-json',
    'invalid-schema',
    'callback-error',
  ] as const)('disposes its timer after a prompt %s result', async (kind) => {
    let signal: AbortSignal | undefined;
    const fetch = vi.fn().mockImplementation((_url, init) => {
      signal = init.signal;
      if (kind === 'network-error') return Promise.reject(new Error('offline network failure'));
      if (kind === 'http-error')
        return Promise.resolve(
          new Response(JSON.stringify({ error_description: 'invalid client' }), { status: 401 }),
        );
      if (kind === 'invalid-json') return Promise.resolve(new Response('{'));
      if (kind === 'invalid-schema') return Promise.resolve(new Response('{}'));
      return Promise.resolve(token());
    });
    vi.stubGlobal('fetch', fetch);
    const client = new OAuthClient({
      ...options,
      onTokenRefresh: () => {
        if (kind === 'callback-error') throw new Error('callback failure');
      },
    });
    if (kind === 'success' || kind === 'callback-error')
      expect(await client.getToken()).toBe('offline-token');
    else
      await expect(client.getToken()).rejects.toMatchObject({ errorType: ErrorType.OAUTH_ERROR });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signal?.aborted).toBe(false);
  });
});
