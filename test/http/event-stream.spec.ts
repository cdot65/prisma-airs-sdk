import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createEventStream } from '../../src/http/event-stream.js';

const schema = z.object({ text: z.string() }).passthrough();
function response(chunks: Uint8Array[], cancel = vi.fn()) {
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      },
      cancel,
    }),
    { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } },
  );
}
const bytes = (text: string) => new TextEncoder().encode(text);
async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const event of stream) result.push(event);
  return result;
}

describe('bounded SSE response consumption', () => {
  it('ends a pending next() cleanly on explicit cancellation', async () => {
    const stream = createEventStream(
      new Response(new ReadableStream(), { headers: { 'Content-Type': 'text/event-stream' } }),
      schema,
      new AbortController().signal,
      vi.fn(),
    );
    const pending = stream.next();
    await Promise.resolve();
    await stream.cancel();
    expect(await pending).toEqual({ done: true, value: undefined });
  });
  it('returns typed lifecycle termination and rejects the wrong sentinel', async () => {
    const dispose = vi.fn();
    const stream = createEventStream(
      response([bytes('data: {"text":"complete"}\n\n')]),
      schema,
      new AbortController().signal,
      dispose,
      { isTerminal: (event) => event.text === 'complete' },
    );
    expect(await collect(stream)).toEqual([{ text: 'complete' }]);
    expect(dispose).toHaveBeenCalledOnce();
    const wrong = createEventStream(
      response([bytes('data: [DONE]\n\n')]),
      schema,
      new AbortController().signal,
      vi.fn(),
      { isTerminal: () => false },
    );
    await expect(collect(wrong)).rejects.toThrow('typed terminator');
  });
  it('serializes concurrent reads and supports explicit iterator throw', async () => {
    const dispose = vi.fn();
    const stream = createEventStream(
      response([bytes('data: {"text":"one"}\n\ndata: {"text":"two"}\n\ndata: [DONE]\n\n')]),
      schema,
      new AbortController().signal,
      dispose,
    );
    const events = await Promise.all([stream.next(), stream.next()]);
    expect(events.map((event) => event.value?.text)).toEqual(['one', 'two']);
    const reason = new Error('consumer error');
    await expect(stream.throw!(reason)).rejects.toBe(reason);
    expect(dispose).toHaveBeenCalledOnce();
  });
  it.each([0, -1, 1.5, Number.NaN])('rejects invalid event budgets: %s', (maxEventBytes) => {
    expect(() =>
      createEventStream(response([]), schema, new AbortController().signal, vi.fn(), {
        maxEventBytes,
      }),
    ).toThrow('positive integer');
  });
  it('rejects malformed UTF-8 without leaking the body', async () => {
    const stream = createEventStream(
      response([new Uint8Array([0xff])]),
      schema,
      new AbortController().signal,
      vi.fn(),
    );
    await expect(collect(stream)).rejects.toThrow('valid UTF-8');
  });
  it('normalizes a reader failure and disposes after a rejected cancel hook', async () => {
    const dispose = vi.fn();
    const body = new ReadableStream({
      pull() {
        throw new Error('private upstream details');
      },
      cancel() {
        return Promise.reject(new Error('cancel failed'));
      },
    });
    const stream = createEventStream(
      new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
      schema,
      new AbortController().signal,
      dispose,
    );
    await expect(collect(stream)).rejects.toThrow('Failed to read event stream');
    expect(dispose).toHaveBeenCalledOnce();
  });
  it('enforces total event size across complete lines and ignores nondata fields', async () => {
    const stream = createEventStream(
      response([bytes('id: abc\nretry: 5\nunknown\ndata: {"text":"ok"}\n\ndata: [DONE]\n\n')]),
      schema,
      new AbortController().signal,
      vi.fn(),
    );
    expect(await collect(stream)).toEqual([{ text: 'ok' }]);
    const large = createEventStream(
      response([bytes('data: ' + 'x'.repeat(80) + '\n\n')]),
      schema,
      new AbortController().signal,
      vi.fn(),
      { maxEventBytes: 16 },
    );
    await expect(collect(large)).rejects.toThrow('event exceeded');
  });
  it('decodes split UTF-8 and CRLF frames, preserves extra fields and stops at DONE', async () => {
    const wire = bytes(
      ': keepalive\r\nevent: chunk\r\ndata: {"text":"héllo","extra":true}\r\n\r\ndata: [DONE]\r\n\r\n',
    );
    const dispose = vi.fn();
    const stream = createEventStream(
      response(Array.from(wire, (byte) => new Uint8Array([byte]))),
      schema,
      new AbortController().signal,
      dispose,
    );
    expect(await collect(stream)).toEqual([{ text: 'héllo', extra: true }]);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it('joins multiline data and handles bare CR separators', async () => {
    const stream = createEventStream(
      response([bytes('data: {\rdata: "text":"ok"}\r\rdata: [DONE]\r\r')]),
      schema,
      new AbortController().signal,
      vi.fn(),
    );
    expect(await collect(stream)).toEqual([{ text: 'ok' }]);
  });
  it('cancels without beginning iteration', async () => {
    const cancel = vi.fn();
    const dispose = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const stream = createEventStream(
      new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
      schema,
      new AbortController().signal,
      dispose,
    );
    await stream.cancel();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(await stream.next()).toEqual({ done: true, value: undefined });
  });
  it('releases a reader when a consumer breaks early', async () => {
    const cancel = vi.fn();
    const dispose = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes('data: {"text":"one"}\n\n'));
      },
      cancel,
    });
    const stream = createEventStream(
      new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
      schema,
      new AbortController().signal,
      dispose,
    );
    for await (const event of stream) {
      expect(event).toBeDefined();
      break;
    }
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it('interrupts a stalled read and retains the caller cancellation reason', async () => {
    const controller = new AbortController();
    const dispose = vi.fn();
    const stream = createEventStream(
      new Response(new ReadableStream(), { headers: { 'Content-Type': 'text/event-stream' } }),
      schema,
      controller.signal,
      dispose,
    );
    const pending = stream.next();
    const reason = new Error('caller stopped');
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['malformed JSON', 'data: nope\n\n'],
    ['invalid schema', 'data: {"text":42}\n\n'],
    ['server error event', 'event: error\ndata: {"message":"do not echo secrets"}\n\n'],
    ['error envelope', 'data: {"error":{"message":"do not echo secrets"}}\n\n'],
    ['missing terminator', 'data: {"text":"partial"}\n\n'],
  ])('rejects %s without leaking data', async (_name, wire) => {
    const stream = createEventStream(
      response([bytes(wire)]),
      schema,
      new AbortController().signal,
      vi.fn(),
    );
    await expect(collect(stream)).rejects.not.toThrow('do not echo secrets');
  });
  it('rejects oversized unfinished frames', async () => {
    const stream = createEventStream(
      response([bytes('data: ' + 'x'.repeat(128))]),
      schema,
      new AbortController().signal,
      vi.fn(),
      { maxEventBytes: 64 },
    );
    await expect(collect(stream)).rejects.toThrow('event exceeded');
  });
  it('rejects non-SSE responses before handing off the connection', () => {
    expect(() =>
      createEventStream(new Response('{}'), schema, new AbortController().signal, vi.fn()),
    ).toThrow('text/event-stream');
  });
});
