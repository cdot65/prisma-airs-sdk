import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { probeRealtimeConnection } from '../../scripts/e2e/realtime-probe.js';

class Socket extends EventEmitter {
  readyState = 0;
  close = vi.fn(() => {
    this.readyState = 3;
    this.emit('close', 1000);
  });
  terminate = vi.fn(() => {
    this.readyState = 3;
    this.emit('close', 1006);
  });
}

const url = 'wss://gateway.example/v1/realtime?model=%40openai%2Fgpt-5.6-terra';
const headers = { 'x-portkey-api-key': 'private-runtime-key' };

describe('bounded realtime discovery', () => {
  it('requires a validated upgrade and session, then closes without sending inference', async () => {
    const socket = new Socket();
    const factory = vi.fn(() => {
      queueMicrotask(() => {
        socket.emit('upgrade', { statusCode: 101 });
        socket.readyState = 1;
        socket.emit('open');
        socket.emit('message', Buffer.from('{"type":"session.created","secret":"private"}'));
      });
      return socket;
    });
    const result = await probeRealtimeConnection(factory, url, headers, 1000);
    expect(factory).toHaveBeenCalledWith(url, {
      headers,
      handshakeTimeout: 1000,
      followRedirects: false,
      perMessageDeflate: false,
      maxPayload: 1_048_576,
    });
    expect(result).toMatchObject({
      outcome: 'session-created',
      upgraded: true,
      statusCode: 101,
      sessionCreated: true,
      closed: true,
      eventTypes: ['session.created'],
      clientEventsSent: 0,
    });
    expect(socket.close).toHaveBeenCalledWith(1000);
    expect(socket.terminate).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it.each([
    ['error', new Error('credential=value'), 'transport-error'],
    ['close', 1006, 'closed-before-session'],
    [
      'message',
      Buffer.from('{"type":"error","error":{"message":"credential=value"}}'),
      'server-error',
    ],
    ['message', Buffer.from('{malformed'), 'invalid-event'],
    ['message', Buffer.from('null'), 'invalid-event'],
    ['message', Buffer.from('{"type":123}'), 'invalid-event'],
  ])('bounds %s failures without retaining upstream values', async (event, data, outcome) => {
    const socket = new Socket();
    const result = await probeRealtimeConnection(
      () => {
        queueMicrotask(() => socket.emit(event, data));
        return socket;
      },
      url,
      headers,
      1000,
    );
    expect(result.outcome).toBe(outcome);
    expect(result.closed).toBe(true);
    expect(result.sessionCreated).toBe(false);
    expect(JSON.stringify(result)).not.toContain('credential');
  });

  it('records unexpected HTTP status and destroys its response without reading its body', async () => {
    const socket = new Socket();
    const response = { statusCode: 403, destroy: vi.fn() };
    const result = await probeRealtimeConnection(
      () => {
        queueMicrotask(() => socket.emit('unexpected-response', {}, response));
        return socket;
      },
      url,
      headers,
      1000,
    );
    expect(result).toMatchObject({ outcome: 'http-error', statusCode: 403, closed: true });
    expect(response.destroy).toHaveBeenCalledOnce();
  });

  it('terminates a handshake that never opens', async () => {
    const socket = new Socket();
    const result = await probeRealtimeConnection(() => socket, url, headers, 5);
    expect(result).toMatchObject({ outcome: 'timeout', upgraded: false, closed: true });
    expect(socket.terminate).toHaveBeenCalledOnce();
  });

  it('does not certify session.created without an open connection', async () => {
    const socket = new Socket();
    const result = await probeRealtimeConnection(
      () => {
        queueMicrotask(() => socket.emit('message', Buffer.from('{"type":"session.created"}')));
        return socket;
      },
      url,
      headers,
      1000,
    );
    expect(result).toMatchObject({ outcome: 'invalid-event', sessionCreated: false });
  });

  it('does not retain arbitrary event names', async () => {
    const socket = new Socket();
    const result = await probeRealtimeConnection(
      () => {
        queueMicrotask(() => {
          socket.emit('message', Buffer.from('{"type":"credential-value"}'));
          socket.emit('error', new Error('credential-value'));
        });
        return socket;
      },
      url,
      headers,
      1000,
    );
    expect(result.eventTypes).toEqual(['other']);
    expect(JSON.stringify(result)).not.toContain('credential-value');
  });

  it('captures constructor failure without leaking its message', async () => {
    const result = await probeRealtimeConnection(
      () => {
        throw new Error('private-runtime-key');
      },
      url,
      headers,
      1000,
    );
    expect(result).toMatchObject({ outcome: 'construction-error', closed: true });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('bounds unknown-event floods without keeping their arbitrary names', async () => {
    const socket = new Socket();
    const result = await probeRealtimeConnection(
      () => {
        queueMicrotask(() => {
          for (let i = 0; i < 30; i++) socket.emit('message', '{"type":"private-name"}');
        });
        return socket;
      },
      url,
      headers,
      1000,
    );
    expect(result.outcome).toBe('event-limit');
    expect(result.eventTypes).toEqual(Array(16).fill('other'));
    expect(result.closed).toBe(true);
  });

  it('rejects an oversized message before parsing', async () => {
    const socket = new Socket();
    const result = await probeRealtimeConnection(
      () => {
        queueMicrotask(() => socket.emit('message', Buffer.alloc(1_048_577)));
        return socket;
      },
      url,
      headers,
      1000,
    );
    expect(result.outcome).toBe('invalid-event');
    expect(result.closed).toBe(true);
  });

  it('waits for asynchronous termination after a stalled graceful close', async () => {
    const socket = new Socket();
    socket.close.mockImplementation(() => {
      socket.readyState = 2;
    });
    socket.terminate.mockImplementation(() => {
      queueMicrotask(() => {
        socket.readyState = 3;
        socket.emit('close', 1006);
      });
    });
    const result = await probeRealtimeConnection(
      () => {
        queueMicrotask(() => {
          socket.readyState = 1;
          socket.emit('upgrade', { statusCode: 101 });
          socket.emit('open');
          socket.emit('message', '{"type":"session.created"}');
        });
        return socket;
      },
      url,
      headers,
      1000,
    );
    expect(result).toMatchObject({ outcome: 'session-created', closed: true });
    expect(socket.terminate).toHaveBeenCalledOnce();
  });

  it('does not report cleanup success when termination never closes', async () => {
    const socket = new Socket();
    socket.terminate.mockImplementation(() => undefined);
    const result = await probeRealtimeConnection(() => socket, url, headers, 5);
    expect(result).toMatchObject({ outcome: 'timeout', closed: false });
  });

  it.each([0, -1, NaN, Infinity, 1.5, 60_001])(
    'rejects invalid deadline %s before connection',
    async (timeout) => {
      const factory = vi.fn();
      await expect(probeRealtimeConnection(factory, url, headers, timeout)).rejects.toThrow();
      expect(factory).not.toHaveBeenCalled();
    },
  );
});
