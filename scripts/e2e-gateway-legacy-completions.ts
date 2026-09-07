/** @internal Probe the pinned legacy completion operation without substituting the designated model. */
import assert from 'node:assert/strict';
import { AIGatewayInferenceClient, AISecSDKException, ErrorType } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

const sdkMode = process.argv.includes('--sdk');
await runtimeSuite(
  sdkMode ? 'gateway-legacy-completions-sdk' : 'gateway-legacy-completions',
  async ({ harness, endpoint, apiKey }) => {
    assert.equal(endpoint, 'https://airs.cdot.io/v1');
    const sdk = new AIGatewayInferenceClient({ endpoint, apiKey, numRetries: 0 });
    async function call(path: string, body?: Record<string, unknown>): Promise<Response> {
      const response = await fetch(endpoint + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          'x-portkey-api-key': apiKey,
          ...(body ? { 'Content-Type': 'application/json' } : { 'x-portkey-provider': '@openai' }),
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const text = await response.text();
        let value: unknown = text;
        try {
          value = JSON.parse(text);
        } catch {
          /* Preserve structure only, never raw upstream error text. */
        }
        harness.captureResponseShape(`legacy-completions.error.${response.status}`, value);
        console.log(
          JSON.stringify({
            diagnostic: 'legacy-completions',
            status: response.status,
            incompatibleModel:
              /not a chat model|chat model.*not supported|not supported.*completions|only supported.*chat|model.*does not support/i.test(
                text,
              ),
          }),
        );
        throw new AISecSDKException(
          'Designated-model legacy completion probe failed',
          response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
          { statusCode: response.status, failureKind: 'http' },
        );
      }
      return response;
    }
    await harness.check('legacy-completions.model-auth-control', async () => {
      const value: unknown = await (await call('/models/gpt-5.6-terra')).json();
      assert(value && typeof value === 'object' && 'id' in value);
      assert.equal(value.id, 'gpt-5.6-terra');
      return value;
    });
    const body = { model: '@openai/gpt-5.6-terra', prompt: 'Reply with READY.', max_tokens: 128 };
    const passed = await harness.check('legacy-completions.create', async () => {
      const value: unknown = sdkMode
        ? await sdk.createCompletion(body)
        : await (await call('/completions', body)).json();
      assert(value && typeof value === 'object' && 'object' in value && 'choices' in value);
      assert.equal(value.object, 'text_completion');
      assert(Array.isArray(value.choices) && value.choices.length > 0);
      assert.equal(typeof value.choices[0].text, 'string');
      harness.captureResponseShape('legacy-completions.json', value);
      return true;
    });
    if (passed) {
      await harness.check('legacy-completions.stream', async () => {
        if (sdkMode) {
          const stream = await sdk.createCompletion({ ...body, stream: true });
          let events = 0;
          let output = '';
          for await (const event of stream) {
            events++;
            output += event.choices.map((choice) => choice.text).join('');
            harness.captureResponseShape('legacy-completions.sdk-stream', event);
          }
          assert(output.length > 0);
          return { eventCount: events, completed: true };
        }
        const response = await call('/completions', { ...body, stream: true });
        assert(response.headers.get('content-type')?.includes('text/event-stream'));
        const text = await response.text();
        assert(text.includes('data: [DONE]'));
        const events = text
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
          .map(
            (line) =>
              JSON.parse(line.slice(6)) as { object?: string; choices?: { text?: string }[] },
          );
        assert(
          events.some(
            (event) =>
              event.object === 'text_completion' &&
              event.choices?.some((choice) => typeof choice.text === 'string'),
          ),
        );
        return { eventCount: events.length, first: events[0], last: events.at(-1) };
      });
    } else {
      harness.skip(
        'legacy-completions.stream',
        'Non-streaming legacy completion prerequisite failed for the designated model; no alternate model used.',
      );
    }
  },
);
