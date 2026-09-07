/** @internal Verify the typed realtime transport without generation or an alternate provider/model. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import WebSocket from 'ws';
import {
  AIGatewayInferenceClient,
  AISecSDKException,
  ErrorType,
  type GatewayRealtimeConnection,
} from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { writePrivateReport } from './e2e/harness.js';

const suite = 'gateway-realtime-sdk';
const observations: Record<string, unknown> = {
  model: '@openai/gpt-5.6-terra',
  clientEventsSent: 0,
  sessionCreated: false,
  socketClosed: false,
};
await runtimeSuite(suite, async ({ harness: h, endpoint, apiKey }) => {
  assert.equal(endpoint, 'https://airs.cdot.io/v1');
  const sdk = new AIGatewayInferenceClient({ endpoint, apiKey, numRetries: 0 });
  const control = await h.check('realtime-sdk.model-auth-control', async () => {
    const model = await sdk.retrieveModel('gpt-5.6-terra', {
      headers: { 'x-portkey-provider': '@openai' },
    });
    assert.equal(model.id, 'gpt-5.6-terra');
    return true;
  });
  assert(control, 'A same-key authentication control is required');
  let socket: WebSocket | undefined;
  const owned: { connection?: GatewayRealtimeConnection } = {};
  h.defer('realtime-sdk.socket-retired', async () => {
    if (owned.connection) await owned.connection.cancel();
    else if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.terminate();
      for (
        let attempt = 0;
        attempt < 20 && Number(socket.readyState) !== WebSocket.CLOSED;
        attempt++
      )
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    observations.socketClosed = !socket || socket.readyState === WebSocket.CLOSED;
    assert(observations.socketClosed, 'Socket closure is not confirmed');
    return { closed: true };
  });
  owned.connection = await h.check('realtime-sdk.typed-upgrade', () =>
    sdk.connectRealtime(
      { model: '@openai/gpt-5.6-terra' },
      {
        timeoutMs: 15_000,
        maxBufferedEvents: 16,
        headers: { 'x-portkey-provider': '@openai' },
        webSocketFactory: (url, options) => {
          assert.equal(url, 'wss://airs.cdot.io/v1/realtime?model=%40openai%2Fgpt-5.6-terra');
          assert.equal(options.followRedirects, false);
          assert.equal(options.perMessageDeflate, false);
          socket = new WebSocket(url, options);
          socket.on('upgrade', (response) => {
            observations.statusCode = response.statusCode;
          });
          return socket;
        },
      },
    ),
  );
  const connection = owned.connection;
  if (!connection) return;
  await h.check('realtime-sdk.provider-session', async () => {
    let count = 0;
    const events: string[] = [];
    observations.eventTypes = events;
    for await (const event of connection) {
      h.captureResponseShape('realtime-sdk.event', event);
      events.push(['session.created', 'error'].includes(event.type) ? event.type : 'other');
      if (event.type === 'session.created') {
        assert(event.session && typeof event.session === 'object' && !Array.isArray(event.session));
        assert.equal(typeof event.session.id, 'string');
        observations.sessionCreated = true;
        break;
      }
      if (event.type === 'error') {
        const error = event.error;
        if (
          error &&
          typeof error === 'object' &&
          !Array.isArray(error) &&
          [
            'invalid_model',
            'model_not_found',
            'model_not_supported',
            'invalid_api_key',
            'insufficient_quota',
            'rate_limit_exceeded',
            'invalid_request_error',
          ].includes(String(error.code))
        )
          observations.errorCode = error.code;
        break;
      }
      if (++count >= 16) break;
    }
    if (!observations.sessionCreated)
      throw new AISecSDKException(
        'Prescribed-model provider session was not established',
        ErrorType.SERVER_SIDE_ERROR,
        { statusCode: 101, failureKind: 'http' },
      );
    return { sessionCreated: true, clientEventsSent: 0 };
  });
});
const report = JSON.parse(readFileSync(`artifacts/e2e/${suite}.json`, 'utf8')) as {
  startedAt: string;
  finishedAt: string;
  failed: number;
  credentialsUnchanged: boolean;
};
const evidence = {
  ...observations,
  finishedAt: report.finishedAt,
  passed: report.failed === 0 && report.credentialsUnchanged,
};
writePrivateReport(`artifacts/e2e/${suite}-observations.json`, evidence);
writePrivateReport(
  `artifacts/e2e/history/${suite}-observations-${report.startedAt.replaceAll(':', '-')}.json`,
  evidence,
);
