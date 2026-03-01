import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { httpRequest } from '../src/http-client.js';
import { globalConfiguration, init } from '../src/configuration.js';
import { AISecSDKException } from '../src/errors.js';

describe('httpRequest', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalConfiguration.reset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalConfiguration.reset();
  });

  it('throws when SDK not initialized', async () => {
    await expect(httpRequest({ method: 'GET', path: '/test' })).rejects.toThrow(AISecSDKException);
  });

  it('makes successful GET request', async () => {
    init({ apiKey: 'test-key', numRetries: 0 });
    const mockData = { result: 'ok' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const res = await httpRequest({ method: 'GET', path: '/v1/test' });
    expect(res.data).toEqual(mockData);
    expect(res.status).toBe(200);
  });

  it('makes successful POST request', async () => {
    init({ apiKey: 'test-key', numRetries: 0 });
    const mockData = { scan_id: '123' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const res = await httpRequest({
      method: 'POST',
      path: '/v1/scan/sync/request',
      body: { ai_profile: { profile_name: 'test' }, contents: [] },
    });
    expect(res.data).toEqual(mockData);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].headers['x-pan-token']).toBe('test-key');
    expect(callArgs[1].headers['x-payload-hash']).toBeDefined();
  });

  it('sets Authorization header for apiToken', async () => {
    init({ apiToken: 'bearer-token', numRetries: 0 });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await httpRequest({ method: 'GET', path: '/test' });

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBe('Bearer bearer-token');
  });

  it('throws on 4xx error', async () => {
    init({ apiKey: 'test-key', numRetries: 0 });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Bad request' }),
    });

    await expect(httpRequest({ method: 'GET', path: '/test' })).rejects.toThrow(AISecSDKException);
  });

  it('retries on 500 status', async () => {
    init({ apiKey: 'test-key', numRetries: 1 });

    const fn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'server error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });

    globalThis.fetch = fn;

    const res = await httpRequest({ method: 'GET', path: '/test' });
    expect(res.data).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on network error', async () => {
    init({ apiKey: 'test-key', numRetries: 1 });

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });

    globalThis.fetch = fn;

    const res = await httpRequest({ method: 'GET', path: '/test' });
    expect(res.data).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries on network error', async () => {
    init({ apiKey: 'test-key', numRetries: 1 });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(httpRequest({ method: 'GET', path: '/test' })).rejects.toThrow(AISecSDKException);
  });

  it('includes query params for GET', async () => {
    init({ apiKey: 'test-key', numRetries: 0 });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    await httpRequest({
      method: 'GET',
      path: '/v1/scan/results',
      params: { scan_ids: 'a,b' },
    });

    const callUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callUrl).toContain('scan_ids=a%2Cb');
  });
});
