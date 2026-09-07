/** @internal Bounded, non-generating WebSocket discovery; never retain upstream scalar values. */
import assert from 'node:assert/strict';

export interface ProbeSocket {
  readonly readyState: number;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  close(code: number): void;
  terminate(): void;
}

export type ProbeSocketFactory = (
  url: string,
  options: {
    headers: Record<string, string>;
    handshakeTimeout: number;
    followRedirects: false;
    perMessageDeflate: false;
    maxPayload: number;
  },
) => ProbeSocket;

export interface RealtimeProbeObservation {
  outcome:
    | 'session-created'
    | 'timeout'
    | 'transport-error'
    | 'http-error'
    | 'server-error'
    | 'invalid-event'
    | 'event-limit'
    | 'closed-before-session'
    | 'construction-error';
  upgraded: boolean;
  statusCode?: number;
  sessionCreated: boolean;
  closed: boolean;
  eventTypes: ('session.created' | 'error' | 'other')[];
  clientEventsSent: 0;
}

/** Uses a reviewed external WebSocket implementation; does not implement framing itself. */
export async function probeRealtimeConnection(
  factory: ProbeSocketFactory,
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<RealtimeProbeObservation> {
  assert(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60_000);
  const result: RealtimeProbeObservation = {
    outcome: 'timeout',
    upgraded: false,
    sessionCreated: false,
    closed: false,
    eventTypes: [],
    clientEventsSent: 0,
  };
  let socket: ProbeSocket;
  try {
    socket = factory(url, {
      headers,
      handshakeTimeout: timeoutMs,
      followRedirects: false,
      perMessageDeflate: false,
      maxPayload: 1_048_576,
    });
  } catch {
    return { ...result, outcome: 'construction-error', closed: true };
  }
  let closed = false;
  let markClosed!: () => void;
  const closure = new Promise<void>((resolve) => {
    markClosed = resolve;
  });
  socket.on('close', () => {
    closed = true;
    markClosed();
  });
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = (outcome: RealtimeProbeObservation['outcome']) => {
      if (settled) return;
      settled = true;
      result.outcome = outcome;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    socket.on('upgrade', (response) => {
      if (settled) return;
      const code = (response as { statusCode?: unknown })?.statusCode;
      if (typeof code === 'number' && Number.isInteger(code) && code >= 100 && code <= 599)
        result.statusCode = code;
    });
    socket.on('open', () => {
      if (!settled) result.upgraded = true;
    });
    socket.on('unexpected-response', (_request, response) => {
      if (settled) return;
      const rejected = response as { statusCode?: unknown; destroy(): void };
      const code = rejected.statusCode;
      if (typeof code === 'number' && Number.isInteger(code) && code >= 100 && code <= 599)
        result.statusCode = code;
      finish('http-error');
      // Never consume/log an upstream error body or leave its socket attached.
      rejected.destroy();
    });
    socket.on('error', () => finish('transport-error'));
    socket.on('close', () => finish('closed-before-session'));
    socket.on('message', (data) => {
      if (settled) return;
      if (result.eventTypes.length === 16) return finish('event-limit');
      if (
        (typeof data !== 'string' && !Buffer.isBuffer(data)) ||
        Buffer.byteLength(data) > 1_048_576
      )
        return finish('invalid-event');
      let event: unknown;
      try {
        event = JSON.parse(typeof data === 'string' ? data : data.toString('utf8'));
      } catch {
        return finish('invalid-event');
      }
      if (
        !event ||
        typeof event !== 'object' ||
        !('type' in event) ||
        typeof event.type !== 'string'
      )
        return finish('invalid-event');
      if (event.type === 'error') {
        result.eventTypes.push('error');
        return finish('server-error');
      }
      if (event.type === 'session.created') {
        if (!result.upgraded || result.statusCode !== 101) return finish('invalid-event');
        result.eventTypes.push('session.created');
        result.sessionCreated = true;
        return finish('session-created');
      }
      result.eventTypes.push('other');
    });
  });

  // Graceful close only after a validated open. Incomplete handshakes must be aborted.
  if (!closed && socket.readyState !== 3) {
    try {
      if (socket.readyState === 1) socket.close(1000);
      else socket.terminate();
    } catch {
      // A racing close is not itself proof the socket retired; inspect its terminal state below.
    }
    if (!closed && socket.readyState !== 3) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        closure,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 250);
        }),
      ]);
      clearTimeout(timer);
      if (!closed && socket.readyState !== 3) {
        try {
          socket.terminate();
        } catch {
          // The cleanup result must remain false if termination did not establish closure.
        }
        if (!closed && socket.readyState !== 3) {
          await Promise.race([
            closure,
            new Promise<void>((resolve) => {
              timer = setTimeout(resolve, 250);
            }),
          ]);
          clearTimeout(timer);
        }
      }
    }
  }
  result.closed = closed || socket.readyState === 3;
  return result;
}
