import { describe, expect, it, vi } from 'vitest';
import { selectRuntimeKey } from '../../scripts/e2e/gateway-runtime.js';
import { discoveryFetch, type McpHttpObservation } from '../../scripts/e2e/mcp-discovery-fetch.js';

const endpoint = new URL('https://mcp-airs.cdot.io/sdk-e2e-test/mcp');
const request = (method: string) => ({
  method: 'POST',
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method }),
});

describe('owned MCP discovery safeguards', () => {
  it('selects only established scopes and never falls back to an unrelated permission', () => {
    const keys = [{ scopes: [] }, { scopes: ['inference'] }, { scopes: ['mcp.invoke', 'read'] }];
    expect(selectRuntimeKey(keys)).toBe(keys[1]);
    expect(selectRuntimeKey(keys, ['mcp.invoke'])).toBe(keys[2]);
    expect(selectRuntimeKey(keys, ['mcp.invoke', 'missing'])).toBeUndefined();
    expect(selectRuntimeKey([{ scopes: null }], ['mcp.invoke'])).toBeUndefined();
  });
  it.each(['tools/call', 'resources/read', 'prompts/get', 'unknown'])(
    'prohibits %s before I/O',
    async (method) => {
      const network = vi.fn();
      await expect(
        discoveryFetch(endpoint, [], network)(endpoint, request(method)),
      ).rejects.toThrow('discovery only');
      expect(network).not.toHaveBeenCalled();
    },
  );
  it('prohibits credential forwarding to a different path or origin', async () => {
    const network = vi.fn();
    for (const url of ['https://mcp-airs.cdot.io/existing/mcp', 'https://unrelated.example/mcp'])
      await expect(
        discoveryFetch(endpoint, [], network)(url, request('initialize')),
      ).rejects.toThrow('exact owned');
    expect(network).not.toHaveBeenCalled();
  });
  it('preserves streamed content while forcing redirect rejection and recording no bodies', async () => {
    const network = vi
      .fn()
      .mockResolvedValue(
        new Response('data: {}\n\n', { headers: { 'content-type': 'text/event-stream' } }),
      );
    const observations: McpHttpObservation[] = [];
    const response = await discoveryFetch(
      endpoint,
      observations,
      network,
    )(endpoint, request('tools/list'));
    expect(await response.text()).toBe('data: {}\n\n');
    expect(network.mock.calls[0][1].redirect).toBe('error');
    expect(observations).toEqual([{ method: 'POST', rpcMethods: ['tools/list'], status: 200 }]);
  });
  it('rejects oversized responses and aborts upstream', async () => {
    const network = vi.fn().mockResolvedValue(new Response('too large'));
    const response = await discoveryFetch(endpoint, [], network, { timeoutMs: 1000, maxBytes: 3 })(
      endpoint,
      request('tools/list'),
    );
    await expect(response.text()).rejects.toThrow('bounded discovery size');
    expect(network.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('requires a session before DELETE and disallows other verbs', async () => {
    const network = vi.fn();
    await expect(
      discoveryFetch(endpoint, [], network)(endpoint, { method: 'DELETE' }),
    ).rejects.toThrow('owned session');
    await expect(
      discoveryFetch(endpoint, [], network)(endpoint, { method: 'PATCH' }),
    ).rejects.toThrow('HTTP method');
    expect(network).not.toHaveBeenCalled();
  });
  it('cancels the upstream stream when the consumer cancels', async () => {
    const cancel = vi.fn();
    const network = vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel })));
    const response = await discoveryFetch(endpoint, [], network)(endpoint);
    await response.body!.cancel();
    expect(cancel).toHaveBeenCalled();
    expect(network.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('rejects Request objects so their implicit methods and bodies cannot evade the guard', async () => {
    const network = vi.fn();
    await expect(
      discoveryFetch(endpoint, [], network)(new Request(endpoint, request('tools/call'))),
    ).rejects.toThrow('explicit URL');
    expect(network).not.toHaveBeenCalled();
  });
  it('aborts stalled requests at the hard deadline', async () => {
    vi.useFakeTimers();
    try {
      const network = vi.fn().mockImplementation(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
          }),
      );
      const pending = discoveryFetch(endpoint, [], network, { timeoutMs: 10, maxBytes: 100 })(
        endpoint,
      );
      const rejected = expect(pending).rejects.toThrow('deadline exceeded');
      await vi.advanceTimersByTimeAsync(10);
      await rejected;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it('forwards caller cancellation and releases its deadline timer', async () => {
    const controller = new AbortController();
    const network = vi.fn().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
        }),
    );
    const pending = discoveryFetch(endpoint, [], network)(endpoint, { signal: controller.signal });
    const rejected = expect(pending).rejects.toThrow('stop discovery');
    controller.abort(new Error('stop discovery'));
    await rejected;
  });
});
