import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, type IncomingMessage } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { describe, expect, it } from 'vitest';
import {
  AIGatewayInferenceClient,
  GatewayRealtimeConnectRequestSchema,
  type GatewayRealtimeConnection,
  type GatewayWebSocketFactory,
} from '../../src/index.js';
import { collectCallSites } from '../../scripts/openapi/inventory.js';
import fixture from './realtime.json';
import manifest from './gateway-manifest.json';

describe('independent real WebSocket upgrade contract', () => {
  it('pins the operation and distinguishes its 101 response from an ordinary JSON response', () => {
    expect(fixture.sha256).toBe(manifest.sha256);
    expect(fixture.operationId).toBe('connectRealtime');
    expect(fixture.method).toBe('GET');
    expect(fixture.path).toBe('/realtime');
    expect(Object.keys(fixture.responses)).toEqual(['101', 'default']);
    expect(collectCallSites().filter((call) => call.path === fixture.path)).toEqual([
      expect.objectContaining({
        method: fixture.method,
        className: 'AIGatewayInferenceClient',
        member: fixture.operationId,
        source: 'src/ai-gateway/inference-client.ts',
        transport: 'websocket',
      }),
    ]);
  });
  it('preserves the optional string model and documented additional query strings', () => {
    const queries = fixture.parameters.filter((parameter) => parameter.in === 'query');
    expect(queries).toEqual([
      expect.objectContaining({ name: 'model', required: false, schema: { type: 'string' } }),
    ]);
    expect(GatewayRealtimeConnectRequestSchema.parse({})).toEqual({});
    expect(
      GatewayRealtimeConnectRequestSchema.parse({
        model: '@provider/model',
        intent: 'transcription',
      }),
    ).toEqual({ model: '@provider/model', intent: 'transcription' });
    for (const model of [3, null, false, [], {}])
      expect(GatewayRealtimeConnectRequestSchema.safeParse({ model }).success).toBe(false);
  });
  it('exchanges actual UTF-8 text frames, preserves all declared headers, and closes on loop break', async () => {
    const http = createServer();
    const server = new WebSocketServer({ noServer: true });
    let request: IncomingMessage | undefined;
    http.on('upgrade', (incoming, socket, head) => {
      request = incoming;
      server.handleUpgrade(incoming, socket, head, (peer) => server.emit('connection', peer));
    });
    const received: unknown[] = [];
    server.on('connection', (peer) => {
      peer.send(JSON.stringify({ type: 'session.created', session: { id: 'synthetic' } }));
      peer.on('message', (data, binary) => {
        received.push({ binary, value: JSON.parse(String(data)) });
        peer.send(
          JSON.stringify({ type: 'session.updated', session: { instructions: 'Unicode café 🌍' } }),
        );
      });
    });
    http.listen(0, '127.0.0.1');
    await once(http, 'listening');
    const address = http.address();
    assert(address && typeof address === 'object');
    const factory: GatewayWebSocketFactory = (url, options) => new WebSocket(url, options);
    const headers = Object.fromEntries(
      fixture.parameters
        .filter((parameter) => parameter.in === 'header')
        .map((parameter) => [
          parameter.name,
          parameter.schema.type === 'object'
            ? '{"fixture":"synthetic"}'
            : parameter.schema.type === 'boolean'
              ? 'true'
              : 'synthetic',
        ]),
    );
    const client = new AIGatewayInferenceClient({
      endpoint: `http://127.0.0.1:${address.port}/v1`,
      apiKey: 'synthetic-key',
    });
    let connection: GatewayRealtimeConnection | undefined;
    try {
      connection = await client.connectRealtime(
        { model: '@provider/model', intent: 'transcription' },
        { webSocketFactory: factory, headers },
      );
      expect(request?.method).toBe(fixture.method);
      expect(request?.url).toBe('/v1/realtime?model=%40provider%2Fmodel&intent=transcription');
      expect(request?.headers).toMatchObject({ ...headers, 'x-portkey-api-key': 'synthetic-key' });
      expect(request?.headers.authorization).toBeUndefined();
      expect(request?.headers['x-tsg-id']).toBeUndefined();
      expect(request?.headers['sec-websocket-extensions']).toBeUndefined();
      expect((await connection.next()).value.type).toBe('session.created');
      connection.send({ type: 'session.update', session: { instructions: 'Unicode café 🌍' } });
      for await (const event of connection) {
        expect(event).toEqual({
          type: 'session.updated',
          session: { instructions: 'Unicode café 🌍' },
        });
        break;
      }
      expect(received).toEqual([
        {
          binary: false,
          value: { type: 'session.update', session: { instructions: 'Unicode café 🌍' } },
        },
      ]);
      expect(server.clients.size).toBe(0);
    } finally {
      await connection?.cancel();
      for (const peer of server.clients) peer.terminate();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
  it('rejects an actual redirect without forwarding the credential', async () => {
    let rejectedCalls = 0;
    let targetCalls = 0;
    const http = createServer();
    http.on('upgrade', (request, socket) => {
      if (request.url === '/credential-target') targetCalls++;
      else rejectedCalls++;
      socket.end('HTTP/1.1 302 Found\r\nLocation: /credential-target\r\nContent-Length: 0\r\n\r\n');
    });
    http.listen(0, '127.0.0.1');
    await once(http, 'listening');
    const address = http.address();
    assert(address && typeof address === 'object');
    try {
      const client = new AIGatewayInferenceClient({
        endpoint: `http://127.0.0.1:${address.port}`,
        apiKey: 'synthetic-key',
      });
      await expect(
        client.connectRealtime(
          {},
          { webSocketFactory: (url, options) => new WebSocket(url, options) },
        ),
      ).rejects.toMatchObject({ statusCode: 302, failureKind: 'http' });
      expect(rejectedCalls).toBe(1);
      expect(targetCalls).toBe(0);
    } finally {
      await new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
