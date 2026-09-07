import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayInferenceClient, ErrorType } from '../../src/index.js';
import { openRealtime } from '../../src/http/realtime.js';

class Socket extends EventEmitter {
  readyState = 0;
  bufferedAmount = 0;
  sent: string[] = [];
  send(data: string, callback: (error?: Error) => void) {
    this.sent.push(data);
    callback();
  }
  close(code = 1000) {
    this.readyState = 3;
    this.emit('close', code);
  }
  terminate() {
    this.close(1006);
  }
  open() {
    this.emit('upgrade', { statusCode: 101 });
    this.readyState = 1;
    this.emit('open');
  }
  message(value: unknown) {
    this.emit('message', Buffer.from(JSON.stringify(value)), false);
  }
}

const client = () =>
  new AIGatewayInferenceClient({ endpoint: 'https://gateway.example/v1', apiKey: 'test-key' });
function fixture(open = true) {
  const socket = new Socket();
  const factory = vi.fn(() => {
    if (open) queueMicrotask(() => socket.open());
    return socket;
  });
  return { socket, factory };
}

afterEach(() => vi.useRealTimers());
describe('gateway realtime connection', () => {
  it('uses the explicit runtime endpoint/key and exact query, with no retries or unsafe socket options', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime(
      { model: '@openai/gpt-5.6-terra', intent: 'transcription' },
      { webSocketFactory: factory, headers: { 'x-portkey-provider': '@openai' } },
    );
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory.mock.calls[0]).toEqual([
      'wss://gateway.example/v1/realtime?model=%40openai%2Fgpt-5.6-terra&intent=transcription',
      expect.objectContaining({
        headers: { 'x-portkey-api-key': 'test-key', 'x-portkey-provider': '@openai' },
        followRedirects: false,
        perMessageDeflate: false,
        maxPayload: 1_048_576,
      }),
    ]);
    socket.message({ type: 'session.created', session: { id: 'synthetic' }, additive: true });
    expect(await connection.next()).toEqual({
      done: false,
      value: { type: 'session.created', session: { id: 'synthetic' }, additive: true },
    });
    connection.send({ type: 'session.update', session: { instructions: 'Synthetic' } });
    expect(socket.sent.map((value) => JSON.parse(value))).toEqual([
      { type: 'session.update', session: { instructions: 'Synthetic' } },
    ]);
    await connection.cancel();
    expect(socket.readyState).toBe(3);
    expect(socket.eventNames()).toEqual([]);
  });
  it('does not treat an HTTP upgrade or recoverable error event as provider session readiness', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime({}, { webSocketFactory: factory });
    socket.message({ type: 'error', error: { code: 'invalid_model', message: 'Synthetic' } });
    expect((await connection.next()).value.type).toBe('error');
    expect(socket.readyState).toBe(1);
    socket.message({ type: 'session.created', session: {} });
    expect((await connection.next()).value.type).toBe('session.created');
    await connection.return!();
  });
  it('rejects bad queries and auth-header overrides before socket construction', async () => {
    const { factory } = fixture();
    await expect(
      client().connectRealtime({ model: 3 } as never, { webSocketFactory: factory }),
    ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    await expect(
      client().connectRealtime(
        {},
        { webSocketFactory: factory, headers: { Authorization: 'secret' } },
      ),
    ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    expect(factory).not.toHaveBeenCalled();
  });
  it('respects an already aborted request without connecting', async () => {
    const { factory } = fixture();
    const abort = new AbortController();
    abort.abort(new Error('cancelled'));
    await expect(
      client().connectRealtime({}, { webSocketFactory: factory, signal: abort.signal }),
    ).rejects.toThrow('cancelled');
    expect(factory).not.toHaveBeenCalled();
  });
  it('cancels a pending iterator and the socket when the caller aborts', async () => {
    const { socket, factory } = fixture();
    const abort = new AbortController();
    const connection = await client().connectRealtime(
      {},
      { webSocketFactory: factory, signal: abort.signal },
    );
    const pending = connection.next();
    const rejected = expect(pending).rejects.toThrow('cancelled');
    abort.abort(new Error('cancelled'));
    await rejected;
    expect(socket.readyState).toBe(3);
  });
  it('bounds queued events when the consumer is not reading', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime(
      {},
      { webSocketFactory: factory, maxBufferedEvents: 1 },
    );
    socket.message({ type: 'first' });
    socket.message({ type: 'second' });
    await expect(connection.next()).rejects.toThrow('buffer');
    expect(socket.readyState).toBe(3);
  });
  it('rejects oversized or invalid UTF-8 events', async () => {
    for (const data of [Buffer.alloc(101), Buffer.from([0xff])]) {
      const { socket, factory } = fixture();
      const connection = await client().connectRealtime(
        {},
        { webSocketFactory: factory, maxEventBytes: 100 },
      );
      socket.emit('message', data, false);
      await expect(connection.next()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
      expect(socket.readyState).toBe(3);
    }
  });
  it('validates outgoing finite JSON and send-buffer bounds', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime(
      {},
      { webSocketFactory: factory, maxBufferedBytes: 100 },
    );
    expect(() => connection.send({ type: 'event', invalid: Infinity })).toThrow();
    socket.bufferedAmount = 100;
    expect(() => connection.send({ type: 'event' })).toThrow('buffer');
    expect(socket.sent).toEqual([]);
    await connection.cancel();
  });
  it('delivers queued messages in order on a normal remote close', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime({}, { webSocketFactory: factory });
    socket.message({ type: 'first' });
    socket.message({ type: 'second' });
    socket.close();
    const events = [];
    for await (const event of connection) events.push(event.type);
    expect(events).toEqual(['first', 'second']);
    expect(socket.eventNames()).toEqual([]);
  });
  it('redacts upstream transport errors and never reconnects', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime({}, { webSocketFactory: factory });
    socket.emit('error', new Error('test-key credential echo'));
    await expect(connection.next()).rejects.toThrow('Realtime transport failed');
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it.each([
    'timeoutMs',
    'handshakeTimeoutMs',
    'maxEventBytes',
    'maxBufferedBytes',
    'maxBufferedEvents',
  ])('rejects invalid %s before constructing a socket', async (field) => {
    for (const value of [0, -1, 0.5, Infinity, 2_147_483_648]) {
      const { factory } = fixture();
      await expect(
        client().connectRealtime({}, { webSocketFactory: factory, [field]: value }),
      ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
      expect(factory).not.toHaveBeenCalled();
    }
  });
  it('requires a callable transport and redacts constructor exceptions', async () => {
    const auth = { prepare: vi.fn() };
    await expect(
      openRealtime({
        method: 'GET',
        path: '/realtime',
        baseUrl: 'https://gateway.example/v1',
        params: {},
        headers: {},
        auth,
        timeoutMs: 1000,
        webSocketFactory: undefined as never,
      }),
    ).rejects.toThrow('webSocketFactory');
    expect(auth.prepare).not.toHaveBeenCalled();
    for (const value of [undefined, {}, { webSocketFactory: 3 }])
      await expect(client().connectRealtime({}, value as never)).rejects.toThrow(
        'webSocketFactory',
      );
    const factory = vi.fn(() => {
      throw new Error('test-key');
    });
    await expect(client().connectRealtime({}, { webSocketFactory: factory })).rejects.toThrow(
      'Realtime transport construction failed',
    );
  });
  it('rejects malformed adapters and retires partially created transports', async () => {
    const terminate = vi.fn();
    for (const socket of [
      null,
      {},
      { terminate },
      {
        terminate() {
          throw new Error('test-key');
        },
      },
    ])
      await expect(
        client().connectRealtime({}, { webSocketFactory: (() => socket) as never }),
      ).rejects.toThrow('construction failed');
    expect(terminate).toHaveBeenCalledOnce();
  });
  it('observes cancellation during authentication and during adapter construction', async () => {
    const first = new AbortController();
    const { factory } = fixture(false);
    const connected = client().connectRealtime(
      {},
      { webSocketFactory: factory, signal: first.signal },
    );
    const rejected = expect(connected).rejects.toThrow('cancelled');
    first.abort(new Error('cancelled'));
    await rejected;
    expect(factory).not.toHaveBeenCalled();
    const second = new AbortController();
    const socket = new Socket();
    await expect(
      client().connectRealtime(
        {},
        {
          signal: second.signal,
          webSocketFactory: () => {
            second.abort(new Error('during construction'));
            return socket;
          },
        },
      ),
    ).rejects.toThrow('during construction');
    expect(socket.readyState).toBe(3);
  });
  it('bounds an unopened handshake without retrying', async () => {
    vi.useFakeTimers();
    const { socket, factory } = fixture(false);
    const connected = client().connectRealtime(
      {},
      { webSocketFactory: factory, handshakeTimeoutMs: 10 },
    );
    const rejected = expect(connected).rejects.toThrow('handshake deadline');
    await vi.advanceTimersByTimeAsync(10);
    await rejected;
    expect(socket.readyState).toBe(3);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('owns the full connection deadline after HTTP upgrade', async () => {
    vi.useFakeTimers();
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime(
      {},
      { webSocketFactory: factory, timeoutMs: 10 },
    );
    const pending = expect(connection.next()).rejects.toThrow('connection deadline');
    await vi.advanceTimersByTimeAsync(10);
    await pending;
    expect(socket.readyState).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['no-upgrade', 'wrong-upgrade', 'early-close', 'early-message'])(
    'rejects an unverified handshake: %s',
    async (kind) => {
      const { socket, factory } = fixture(false);
      const connected = client().connectRealtime({}, { webSocketFactory: factory });
      const rejected = expect(connected).rejects.toMatchObject({ errorType: expect.any(String) });
      await vi.waitFor(() => expect(factory).toHaveBeenCalled());
      if (kind === 'no-upgrade') socket.emit('open');
      if (kind === 'wrong-upgrade') socket.emit('upgrade', { statusCode: 200 });
      if (kind === 'early-close') socket.close();
      if (kind === 'early-message') socket.message({ type: 'session.created' });
      await rejected;
      expect(socket.readyState).toBe(3);
    },
  );
  it.each([403, 302, 'not-a-code'])(
    'destroys rejected upgrade responses without leaking their bodies: %s',
    async (statusCode) => {
      const { socket, factory } = fixture(false);
      const connected = client().connectRealtime({}, { webSocketFactory: factory });
      const rejected = expect(connected).rejects.toMatchObject({
        failureKind: typeof statusCode === 'number' ? 'http' : 'network',
        ...(typeof statusCode === 'number' ? { statusCode } : {}),
      });
      await vi.waitFor(() => expect(factory).toHaveBeenCalled());
      const destroy = vi.fn(() => {
        throw new Error('secret upstream body');
      });
      expect(() => socket.emit('unexpected-response', {}, { statusCode, destroy })).not.toThrow();
      await rejected;
      expect(destroy).toHaveBeenCalledOnce();
    },
  );
  it.each([null, [], 3, {}, { type: '' }, { type: 2 }, { type: 'event', constructor: 'unsafe' }])(
    'rejects an invalid incoming envelope: %j',
    async (event) => {
      const { socket, factory } = fixture();
      const connection = await client().connectRealtime({}, { webSocketFactory: factory });
      socket.message(event);
      await expect(connection.next()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    },
  );
  it('rejects binary, non-buffer and malformed JSON messages', async () => {
    for (const [data, binary] of [
      [Buffer.from('{}'), true],
      [new ArrayBuffer(1), false],
      ['{', false],
    ]) {
      const { socket, factory } = fixture();
      const connection = await client().connectRealtime({}, { webSocketFactory: factory });
      socket.emit('message', data, binary);
      await expect(connection.next()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    }
  });
  it('supports text messages, concurrent reads and byte bounds independently of event counts', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime(
      {},
      { webSocketFactory: factory, maxBufferedBytes: 20 },
    );
    const first = connection.next();
    const second = connection.next();
    socket.emit('message', '{"type":"first"}', false);
    socket.emit('message', '{"type":"second"}', false);
    expect((await first).value.type).toBe('first');
    expect((await second).value.type).toBe('second');
    socket.message({ type: 'event', tooLarge: true });
    await expect(connection.next()).rejects.toThrow('incoming buffer');
  });
  it('bounds pending reads and rejects all of them on overflow', async () => {
    const { factory } = fixture();
    const connection = await client().connectRealtime(
      {},
      { webSocketFactory: factory, maxBufferedEvents: 1 },
    );
    const first = expect(connection.next()).rejects.toThrow('pending-reader buffer');
    await expect(connection.next()).rejects.toThrow('pending-reader buffer');
    await first;
  });
  it('returns pending reads on cancellation and makes cancellation idempotent', async () => {
    const { factory } = fixture();
    const connection = await client().connectRealtime({}, { webSocketFactory: factory });
    const pending = connection.next();
    await connection.cancel();
    expect(await pending).toEqual({ done: true, value: undefined });
    await connection.cancel();
    expect(() => connection.send({ type: 'event' })).toThrow('closed');
  });
  it('preserves a consumer throw and closes the socket', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime({}, { webSocketFactory: factory });
    await expect(connection.throw!(new Error('consumer'))).rejects.toThrow('consumer');
    expect(socket.readyState).toBe(3);
  });
  it('rejects abnormal remote closure after draining no misleading success events', async () => {
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime({}, { webSocketFactory: factory });
    socket.message({ type: 'queued' });
    socket.close(1006);
    await expect(connection.next()).rejects.toThrow('closed unexpectedly');
  });
  it('normalizes synchronous and asynchronous send failures', async () => {
    for (const sync of [false, true]) {
      const { socket, factory } = fixture();
      const connection = await client().connectRealtime({}, { webSocketFactory: factory });
      socket.send = (_data, callback) => {
        if (sync) throw new Error('secret');
        callback(new Error('secret'));
      };
      if (sync)
        expect(() => connection.send({ type: 'event' })).toThrow('Realtime transport failed');
      else connection.send({ type: 'event' });
      await expect(connection.next()).rejects.toThrow('Realtime transport failed');
    }
  });
  it('bounds outgoing event size separately from the send queue', async () => {
    const { factory } = fixture();
    const connection = await client().connectRealtime(
      {},
      { webSocketFactory: factory, maxEventBytes: 10 },
    );
    expect(() => connection.send({ type: 'larger-than-ten' })).toThrow('maxEventBytes');
    await connection.cancel();
  });
  it('forces closure after a stalled graceful close', async () => {
    vi.useFakeTimers();
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime({}, { webSocketFactory: factory });
    socket.close = () => {
      socket.readyState = 2;
    };
    socket.terminate = () => {
      socket.readyState = 3;
      socket.emit('close', 1006);
    };
    const closing = connection.cancel();
    await vi.advanceTimersByTimeAsync(250);
    await closing;
    expect(socket.readyState).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reports unconfirmed closure within a bound when an adapter refuses termination', async () => {
    vi.useFakeTimers();
    const { socket, factory } = fixture();
    const connection = await client().connectRealtime({}, { webSocketFactory: factory });
    socket.close = () => {
      throw new Error('secret');
    };
    socket.terminate = () => {
      throw new Error('secret');
    };
    const closing = expect(connection.cancel()).rejects.toThrow('closure was not confirmed');
    await vi.advanceTimersByTimeAsync(500);
    await closing;
    expect(vi.getTimerCount()).toBe(0);
  });
});
