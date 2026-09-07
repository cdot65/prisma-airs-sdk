/** @internal Restrict MCP discovery to one owned endpoint and non-executing protocol messages. */
import assert from 'node:assert/strict';

export interface McpHttpObservation {
  method: string;
  rpcMethods: string[];
  status: number;
}

export function discoveryFetch(
  endpoint: URL,
  observations: McpHttpObservation[],
  fetchImpl: typeof fetch = fetch,
  limits = { timeoutMs: 20_000, maxBytes: 8 * 1024 * 1024 },
): typeof fetch {
  return async (input, init) => {
    assert(!(input instanceof Request), 'MCP fixture requires an explicit URL and request options');
    const url = String(input);
    assert.equal(url, endpoint.href, 'MCP credentials must remain on the exact owned endpoint');
    const method = init?.method ?? 'GET';
    assert(['GET', 'POST', 'DELETE'].includes(method), 'Unsupported MCP HTTP method');
    const rpcMethods: string[] = [];
    if (method === 'POST') {
      assert.equal(typeof init?.body, 'string');
      const parsed: unknown = JSON.parse(init!.body as string);
      const messages = Array.isArray(parsed) ? parsed : [parsed];
      assert(messages.length > 0 && messages.length <= 10);
      for (const message of messages) {
        assert(message && typeof message === 'object' && message.jsonrpc === '2.0');
        assert(
          [
            'initialize',
            'notifications/initialized',
            'notifications/cancelled',
            'tools/list',
            'ping',
          ].includes(message.method),
          'MCP fixture permits discovery only, never tool execution',
        );
        rpcMethods.push(message.method);
      }
    }
    if (method === 'DELETE')
      assert(
        new Headers(init?.headers).has('mcp-session-id'),
        'Only an owned session may be terminated',
      );
    const controller = new AbortController();
    const abort = () => controller.abort(init?.signal?.reason);
    if (init?.signal?.aborted) abort();
    else init?.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(
      () => controller.abort(new Error('MCP HTTP deadline exceeded')),
      limits.timeoutMs,
    );
    timer.unref();
    const release = () => {
      clearTimeout(timer);
      init?.signal?.removeEventListener('abort', abort);
    };
    try {
      const response = await fetchImpl(input, {
        ...init,
        redirect: 'error',
        signal: controller.signal,
      });
      observations.push({ method, rpcMethods, status: response.status });
      if (!response.body) {
        release();
        return response;
      }
      const reader = response.body.getReader();
      let bytes = 0;
      const stream = new ReadableStream<Uint8Array>({
        async pull(output) {
          try {
            const chunk = await reader.read();
            if (chunk.done) {
              release();
              output.close();
              return;
            }
            bytes += chunk.value.byteLength;
            assert(bytes <= limits.maxBytes, 'MCP response exceeds bounded discovery size');
            output.enqueue(chunk.value);
          } catch (error) {
            release();
            controller.abort(error);
            await reader.cancel(error).catch(() => {});
            output.error(error);
          }
        },
        async cancel(reason) {
          release();
          // Close the reader before aborting the native fetch. Reversing this order
          // makes ordinary empty-202 cleanup reject with AbortError during MCP init.
          const cancelled = reader.cancel(reason);
          controller.abort(reason);
          await cancelled;
        },
      });
      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      release();
      throw error;
    }
  };
}
