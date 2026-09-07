import { AISecSDKException, ErrorType } from '../errors.js';
import {
  GatewayRealtimeEventSchema,
  type GatewayRealtimeEvent,
} from '../models/ai-gateway-realtime.js';
import type { AuthAdapter } from './types.js';
import { abortable } from './abort.js';

/** Node-style WebSocket adapter. Use a reviewed implementation; the SDK does not implement framing.
 * @example `const factory: GatewayWebSocketFactory = (url, options) => new WebSocket(url, options);`
 */
export interface GatewayWebSocket {
  readonly readyState: number;
  readonly bufferedAmount: number;
  /** Subscribe to Node-style socket events.
   * @example `socket.on('open', () => console.log('upgraded'));`
   */
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  /** Remove the exact registered listener.
   * @example `socket.off('open', onOpen);`
   */
  off(event: string, listener: (...args: unknown[]) => void): unknown;
  /** Send one UTF-8 text frame and report transport errors through the callback.
   * @example `socket.send(JSON.stringify(event), onSent);`
   */
  send(data: string, callback: (error?: Error) => void): void;
  /** Initiate a WebSocket close handshake.
   * @example `socket.close(1000);`
   */
  close(code: number): void;
  /** Force termination when a handshake or graceful close cannot finish.
   * @example `socket.terminate();`
   */
  terminate(): void;
}

/** Explicit caller-owned transport, compatible with Node's `ws` package; never a browser credential workaround.
 * @example `const factory: GatewayWebSocketFactory = (url, options) => new WebSocket(url, options);`
 */
export type GatewayWebSocketFactory = (
  url: string,
  options: {
    headers: Record<string, string>;
    handshakeTimeout: number;
    followRedirects: false;
    perMessageDeflate: false;
    maxPayload: number;
  },
) => GatewayWebSocket;

/** Single-consumer, bounded provider-event connection. An upgrade is not a provider-ready session.
 * @example `for await (const event of connection) { if (event.type === 'session.created') break; }`
 */
export interface GatewayRealtimeConnection extends AsyncIterableIterator<GatewayRealtimeEvent> {
  /** Queue a validated event, without replay or a provider-delivery guarantee. Errors reach iteration.
   * @example `connection.send({ type: 'response.create', response: { output_modalities: ['text'] } });`
   */
  send(event: GatewayRealtimeEvent): void;
  /** Close even if iteration never starts; breaking iteration also closes the owned socket.
   * @example `await connection.cancel();`
   */
  cancel(): Promise<void>;
}

/** @internal Explicit upgrade call site; no HTTP retry/auth-refresh behavior is applied to sockets. */
export interface RealtimeRequest {
  method: 'GET';
  path: '/realtime';
  baseUrl: string;
  params: Record<string, string | undefined>;
  headers: Record<string, string>;
  auth: AuthAdapter;
  webSocketFactory: GatewayWebSocketFactory;
  signal?: AbortSignal;
  timeoutMs: number;
  handshakeTimeoutMs?: number;
  maxEventBytes?: number;
  maxBufferedEvents?: number;
  maxBufferedBytes?: number;
}

function positive(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2_147_483_647)
    throw new AISecSDKException(
      `${name} must be an integer from 1 to 2147483647`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  return value;
}
const transportError = (message: string, statusCode?: number) =>
  new AISecSDKException(message, ErrorType.CLIENT_SIDE_ERROR, {
    failureKind: statusCode === undefined ? 'network' : 'http',
    ...(statusCode === undefined ? {} : { statusCode }),
  });

/** @internal Open one authenticated socket with deadlines, bounded queues and deterministic ownership. */
export async function openRealtime(spec: RealtimeRequest): Promise<GatewayRealtimeConnection> {
  const timeoutMs = positive(spec.timeoutMs, 'timeoutMs');
  const handshakeMs = Math.min(
    positive(spec.handshakeTimeoutMs ?? 15_000, 'handshakeTimeoutMs'),
    timeoutMs,
  );
  const maxEventBytes = positive(spec.maxEventBytes ?? 1_048_576, 'maxEventBytes');
  const maxBufferedEvents = positive(spec.maxBufferedEvents ?? 256, 'maxBufferedEvents');
  const maxBufferedBytes = positive(spec.maxBufferedBytes ?? 4_194_304, 'maxBufferedBytes');
  if (typeof spec.webSocketFactory !== 'function')
    throw new AISecSDKException(
      'Realtime requires an explicit webSocketFactory',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  spec.signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(spec.signal?.reason);
  spec.signal?.addEventListener('abort', abort, { once: true });
  const deadline = setTimeout(
    () => controller.abort(transportError('Realtime connection deadline exceeded')),
    timeoutMs,
  );
  const release = () => {
    clearTimeout(deadline);
    spec.signal?.removeEventListener('abort', abort);
  };
  const url = new URL(spec.baseUrl + spec.path);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  for (const [key, value] of Object.entries(spec.params))
    if (value !== undefined) url.searchParams.set(key, value);
  let socket: GatewayWebSocket;
  try {
    const prepared = await abortable(
      spec.auth.prepare({ method: spec.method, url, headers: { ...spec.headers } }),
      controller.signal,
    );
    controller.signal.throwIfAborted();
    socket = spec.webSocketFactory(url.href, {
      headers: prepared.headers,
      handshakeTimeout: handshakeMs,
      followRedirects: false,
      perMessageDeflate: false,
      maxPayload: maxEventBytes,
    });
    if (
      !socket ||
      !['on', 'off', 'send', 'close', 'terminate'].every(
        (name) => typeof (socket as unknown as Record<string, unknown>)[name] === 'function',
      )
    ) {
      // A malformed caller adapter must not leave its partially created transport running.
      try {
        socket?.terminate?.();
      } catch {
        /* Preserve the sanitized construction failure. */
      }
      throw new Error('Invalid WebSocket adapter');
    }
  } catch {
    release();
    if (controller.signal.aborted) throw controller.signal.reason;
    throw transportError('Realtime transport construction failed');
  }

  let opened = false;
  let status: number | undefined;
  let ended = false;
  let closing = false;
  let detached = false;
  let failed = false;
  let failure: unknown;
  let bufferedBytes = 0;
  const queue: { value: GatewayRealtimeEvent; bytes: number }[] = [];
  type Result = IteratorResult<GatewayRealtimeEvent>;
  const done: Result = { done: true, value: undefined };
  const readers: { resolve: (value: Result) => void; reject: (error: unknown) => void }[] = [];
  const listeners: [string, (...args: unknown[]) => void][] = [];
  let resolveOpen!: (value: GatewayRealtimeConnection) => void;
  let rejectOpen!: (error: unknown) => void;
  const connected = new Promise<GatewayRealtimeConnection>((resolve, reject) => {
    resolveOpen = resolve;
    rejectOpen = reject;
  });
  let resolveClosed!: () => void;
  let rejectClosed!: (error: unknown) => void;
  const closed = new Promise<void>((resolve, reject) => {
    resolveClosed = resolve;
    rejectClosed = reject;
  });
  // Construction/iteration can fail before the caller obtains a connection to await cleanup.
  void closed.catch(() => {});
  let terminateTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const handshakeTimer = setTimeout(
    () => fail(transportError('Realtime handshake deadline exceeded')),
    handshakeMs,
  );
  function detach() {
    if (detached) return;
    detached = true;
    release();
    clearTimeout(handshakeTimer);
    clearTimeout(terminateTimer);
    clearTimeout(closeTimer);
    controller.signal.removeEventListener('abort', onAbort);
    for (const [name, listener] of listeners) socket.off(name, listener);
  }
  function flush() {
    while (readers.length && (failed || queue.length || ended)) {
      const reader = readers.shift()!;
      if (failed) reader.reject(failure);
      else if (queue.length) {
        const entry = queue.shift()!;
        bufferedBytes -= entry.bytes;
        reader.resolve({ done: false, value: entry.value });
      } else reader.resolve(done);
    }
  }
  function finishClosed() {
    detach();
    resolveClosed();
  }
  function terminate() {
    try {
      socket.terminate();
    } catch {
      /* Closure still needs independent confirmation. */
    }
    if (socket.readyState === 3) finishClosed();
  }
  function closeSocket(graceful: boolean) {
    if (closing) return;
    closing = true;
    release();
    clearTimeout(handshakeTimer);
    if (socket.readyState === 3) {
      finishClosed();
      return;
    }
    closeTimer = setTimeout(() => {
      terminate();
      if (socket.readyState !== 3) {
        detach();
        rejectClosed(transportError('Realtime socket closure was not confirmed'));
      }
    }, 500);
    if (graceful && socket.readyState === 1) {
      terminateTimer = setTimeout(terminate, 250);
      try {
        socket.close(1000);
      } catch {
        terminate();
      }
    } else terminate();
  }
  function fail(error: unknown) {
    if (ended) return;
    failed = true;
    failure = error;
    ended = true;
    queue.length = 0;
    bufferedBytes = 0;
    if (!opened) rejectOpen(error);
    flush();
    closeSocket(false);
  }
  function onAbort() {
    fail(controller.signal.reason);
  }
  const connection: GatewayRealtimeConnection = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (failed) return Promise.reject(failure);
      if (queue.length) {
        const entry = queue.shift()!;
        bufferedBytes -= entry.bytes;
        return Promise.resolve({ done: false, value: entry.value });
      }
      if (ended) return Promise.resolve(done);
      if (readers.length >= maxBufferedEvents) {
        fail(transportError('Realtime pending-reader buffer exceeded its limit'));
        return Promise.reject(failure);
      }
      return new Promise<Result>((resolve, reject) => readers.push({ resolve, reject }));
    },
    send(event) {
      if (ended || socket.readyState !== 1) throw transportError('Realtime connection is closed');
      let body: string;
      try {
        body = JSON.stringify(GatewayRealtimeEventSchema.parse(event));
      } catch {
        throw new AISecSDKException(
          'Realtime event must be a finite JSON object with a type',
          ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        );
      }
      const bytes = Buffer.byteLength(body);
      if (bytes > maxEventBytes)
        throw new AISecSDKException(
          'Realtime event exceeded maxEventBytes',
          ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        );
      if (
        !Number.isSafeInteger(socket.bufferedAmount) ||
        socket.bufferedAmount < 0 ||
        socket.bufferedAmount + bytes > maxBufferedBytes
      )
        throw new AISecSDKException(
          'Realtime outgoing buffer exceeded its limit',
          ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        );
      try {
        socket.send(body, (error) => {
          if (error) fail(transportError('Realtime transport failed'));
        });
      } catch {
        fail(transportError('Realtime transport failed'));
        throw failure;
      }
    },
    async cancel() {
      ended = true;
      queue.length = 0;
      bufferedBytes = 0;
      flush();
      closeSocket(true);
      await closed;
    },
    async return() {
      await connection.cancel();
      return done;
    },
    async throw(error) {
      await connection.cancel();
      throw error;
    },
  };
  function listen(name: string, listener: (...args: unknown[]) => void) {
    listeners.push([name, listener]);
    socket.on(name, listener);
  }
  listen('upgrade', (response) => {
    if (ended) return;
    const code = (response as { statusCode?: unknown })?.statusCode;
    if (code !== 101) return fail(transportError('Realtime upgrade was not HTTP 101'));
    status = code;
  });
  listen('open', () => {
    if (ended) return;
    if (status !== 101) return fail(transportError('Realtime upgrade was not verified'));
    opened = true;
    clearTimeout(handshakeTimer);
    resolveOpen(connection);
  });
  listen('unexpected-response', (_request, response) => {
    const value = response as { statusCode?: unknown; destroy?: () => void };
    const code = value?.statusCode;
    const httpStatus =
      typeof code === 'number' && Number.isInteger(code) && code >= 100 && code <= 599
        ? code
        : undefined;
    try {
      value?.destroy?.();
    } catch {
      /* Never throw an upstream cleanup error from an event callback. */
    }
    fail(transportError('Realtime upgrade rejected', httpStatus));
  });
  listen('error', () => fail(transportError('Realtime transport failed')));
  listen('close', (code) => {
    if (!ended) {
      if (!opened || code !== 1000) fail(transportError('Realtime socket closed unexpectedly'));
      else {
        ended = true;
        flush();
      }
    }
    finishClosed();
  });
  listen('message', (data, binary) => {
    if (ended) return;
    try {
      if (!opened || binary === true || (typeof data !== 'string' && !Buffer.isBuffer(data)))
        throw new Error();
      const bytes = Buffer.byteLength(data);
      if (bytes > maxEventBytes) throw new Error();
      const text =
        typeof data === 'string' ? data : new TextDecoder('utf-8', { fatal: true }).decode(data);
      const value = GatewayRealtimeEventSchema.parse(JSON.parse(text));
      if (queue.length >= maxBufferedEvents || bufferedBytes + bytes > maxBufferedBytes)
        return fail(
          new AISecSDKException(
            'Realtime incoming buffer exceeded its limit',
            ErrorType.RESPONSE_VALIDATION,
          ),
        );
      queue.push({ value, bytes });
      bufferedBytes += bytes;
      flush();
    } catch {
      fail(
        new AISecSDKException(
          'Realtime event is invalid or exceeds maxEventBytes',
          ErrorType.RESPONSE_VALIDATION,
        ),
      );
    }
  });
  controller.signal.addEventListener('abort', onAbort, { once: true });
  if (controller.signal.aborted) onAbort();
  return connected;
}
