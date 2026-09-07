/** @internal Bounded realtime handshake/session discovery; no generation or alternate model. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { AIGatewayInferenceClient, AISecSDKException, ErrorType } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { writePrivateReport } from './e2e/harness.js';
import { probeRealtimeConnection, type ProbeSocketFactory } from './e2e/realtime-probe.js';

// Reuse the isolated browser-verification dependency; no SDK production dependency is added.
// Resolve this prerequisite before creating any owned key.
const require = createRequire(import.meta.url);
const dependency = '../artifacts/browser-verification/node_modules/ws';
const { version } = require(dependency + '/package.json') as { version: string };
assert.equal(version, '8.21.3', 'Review a changed WebSocket dependency before live discovery');
const WebSocket = require(dependency) as new (
  ...args: Parameters<ProbeSocketFactory>
) => ReturnType<ProbeSocketFactory>;

await runtimeSuite('gateway-realtime', async ({ harness, endpoint, apiKey }) => {
  assert.equal(endpoint, 'https://airs.cdot.io/v1');
  const sdk = new AIGatewayInferenceClient({ endpoint, apiKey, numRetries: 0 });
  const control = await harness.check('realtime.model-auth-control', async () => {
    const model = await sdk.retrieveModel('gpt-5.6-terra', {
      headers: { 'x-portkey-provider': '@openai' },
    });
    assert.equal(model.id, 'gpt-5.6-terra');
    return true;
  });
  assert(control, 'Same-key model/authentication control must pass before opening a socket');
  const url = new URL(endpoint + '/realtime');
  url.protocol = 'wss:';
  url.searchParams.set('model', '@openai/gpt-5.6-terra');
  let errorCode: string | undefined;
  let modelErrorReported = false;
  const observation = await probeRealtimeConnection(
    (address, options) => {
      const socket = new WebSocket(address, options);
      socket.on('message', (data) => {
        if (!Buffer.isBuffer(data) && typeof data !== 'string') return;
        if (Buffer.byteLength(data) > 1_048_576) return;
        let value: unknown;
        try {
          value = JSON.parse(String(data));
        } catch {
          return;
        }
        if (!value || typeof value !== 'object' || !('type' in value) || value.type !== 'error')
          return;
        harness.captureResponseShape('realtime.server-error', value);
        if (!('error' in value) || !value.error || typeof value.error !== 'object') return;
        const error = value.error as { code?: unknown; message?: unknown };
        const allowedCodes = [
          'model_not_found',
          'model_not_supported',
          'invalid_model',
          'invalid_api_key',
          'insufficient_quota',
          'rate_limit_exceeded',
          'invalid_request_error',
        ];
        if (typeof error.code === 'string' && allowedCodes.includes(error.code))
          errorCode = error.code;
        modelErrorReported =
          typeof error.message === 'string' &&
          /model.*(?:not.*(?:support|exist)|invalid)|invalid.*model/i.test(error.message);
      });
      return socket;
    },
    url.href,
    { 'x-portkey-api-key': apiKey, 'x-portkey-provider': '@openai' },
    15_000,
  );
  writePrivateReport('artifacts/e2e/gateway-realtime-evidence.json', {
    startedAt: harness.startedAt,
    checkedAt: new Date().toISOString(),
    model: '@openai/gpt-5.6-terra',
    webSocketVersion: version,
    ...observation,
    errorCode,
    modelErrorReported,
    disclosure:
      'A temporary owned runtime key and the prescribed model were used. TLS verification stayed enabled; redirects, compression and retries were disabled. No client events, audio or generation request was sent. Raw upstream error text and arbitrary event names are not retained; only an allowlisted error code and a model-error boolean are recorded. A failed connection is not SDK operation coverage.',
  });
  await harness.check('realtime.connect-and-session', async () => {
    if (!observation.upgraded || !observation.sessionCreated)
      throw new AISecSDKException(
        'Prescribed-model realtime connection did not establish a validated session',
        ErrorType.SERVER_SIDE_ERROR,
        {
          statusCode: observation.statusCode,
          failureKind: observation.statusCode === undefined ? 'network' : 'http',
        },
      );
    return { upgraded: true, sessionCreated: true, clientEventsSent: 0 };
  });
  await harness.check('realtime.socket-cleanup', async () => {
    assert(observation.closed, 'Owned WebSocket did not reach a terminal closed state');
    return { closed: true };
  });
});
