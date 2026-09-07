/** @internal Verify runtime log/feedback routing using only owned synthetic traces. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AIGatewayInferenceClient, AISecSDKException, ErrorType } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { writePrivateReport } from './e2e/harness.js';

const sdk = process.argv.includes('--sdk');
const suite = sdk ? 'gateway-observability' : 'gateway-runtime-observability';
const outputs: Record<string, unknown> = {};
await runtimeSuite(suite, async ({ harness, endpoint, apiKey, tag }) => {
  assert.equal(endpoint, 'https://airs.cdot.io/v1', 'Only the designated dev gateway is in scope');
  const trace = randomUUID();
  const inference = new AIGatewayInferenceClient({
    endpoint,
    apiKey,
    numRetries: 0,
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      if (
        response.ok &&
        init?.method === 'POST' &&
        new URL(String(input)).pathname === '/v1/feedback'
      ) {
        // Journal raw returned IDs before SDK response validation so drift cannot hide ownership.
        const raw = (await response.clone().json()) as { feedback_ids?: unknown };
        if (Array.isArray(raw.feedback_ids))
          for (const id of raw.feedback_ids)
            if (typeof id === 'string' && id.length)
              harness.own('gateway.feedback-audit-record', id, tag);
      }
      return response;
    },
  });
  const completion = await harness.check('runtime-observability.owned-trace.control', () =>
    inference.createChatCompletion(
      {
        model: '@openai/gpt-5.6-terra',
        messages: [{ role: 'user', content: 'Reply with READY.' }],
        max_completion_tokens: 128,
      },
      {
        headers: {
          'x-portkey-trace-id': trace,
          'x-portkey-metadata': JSON.stringify({ sdk_e2e: tag }),
        },
      },
    ),
  );

  async function probe(method: 'POST' | 'PUT', path: string, body: unknown) {
    const response = await fetch(`${endpoint}${path}`, {
      method,
      headers: {
        'x-portkey-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = JSON.parse(text);
    } catch {
      /* Preserve text acknowledgements. */
    }
    console.log(
      JSON.stringify({
        diagnostic: 'runtime-observability-route',
        method,
        route: path.startsWith('/feedback/') ? '/feedback/{owned-id}' : path,
        status: response.status,
        opaDenied: response.headers.get('x-opa-decision') === 'false',
        contentType: response.headers.get('content-type'),
      }),
    );
    harness.captureResponseShape(
      `${method} ${path.startsWith('/feedback/') ? '/feedback/{owned-id}' : path}`,
      payload,
    );
    if (!response.ok)
      throw new AISecSDKException(
        'Runtime observability route did not succeed',
        response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
        { statusCode: response.status, failureKind: 'http' },
      );
    return payload;
  }

  if (completion) {
    const feedback = await harness.check('runtime-observability.feedback.create', () =>
      (sdk
        ? inference.createFeedback.bind(inference)
        : (body: unknown) => probe('POST', '/feedback', body))({
        trace_id: trace,
        value: 0,
        weight: 0,
        metadata: { sdk_e2e: tag },
      }),
    );
    if (feedback && typeof feedback === 'object' && 'feedback_ids' in feedback) {
      const ids = feedback.feedback_ids;
      if (Array.isArray(ids) && ids.length === 1 && typeof ids[0] === 'string') {
        const id = ids[0];
        assert(id.length > 0 && !['.', '..'].includes(id));
        // The pinned API has no feedback deletion operation. Never update an existing user trace.
        if (!sdk) harness.own('gateway.feedback-audit-record', id, tag);
        outputs.feedback = { ...feedback, feedback_ids: ['<owned-feedback-id>'] };
        if (!sdk)
          await harness.check('runtime-observability.feedback.update-owned', () =>
            probe('PUT', `/feedback/${encodeURIComponent(id)}`, {
              value: 0,
              weight: 0,
              metadata: { sdk_e2e: tag, updated: true },
            }),
          );
      } else
        harness.skip(
          'runtime-observability.feedback.update-owned',
          'No unique returned owned feedback ID.',
        );
    } else
      harness.skip(
        'runtime-observability.feedback.update-owned',
        'Feedback creation did not return owned IDs.',
      );
  }

  const log = {
    request: {
      url: 'https://example.invalid/sdk-e2e-no-network-call',
      method: 'POST',
      headers: {},
      body: { prompt: 'Synthetic SDK audit fixture. No customer data.' },
    },
    response: { status: 200, headers: {}, body: { output: 'READY' }, response_time: 1 },
    metadata: { trace_id: randomUUID(), sdk_e2e: tag },
  };
  const inserted = await harness.check('runtime-observability.logs.insert-synthetic', () =>
    sdk ? inference.createLogs(log) : probe('POST', '/logs', log),
  );
  if (inserted !== undefined) {
    outputs.singleLogAcknowledgement = inserted;
    harness.own('gateway.log-audit-record', log.metadata.trace_id, tag);
  }
  if (sdk) {
    const batch = [{ ...log, metadata: { ...log.metadata, trace_id: randomUUID() } }];
    const result = await harness.check('runtime-observability.logs.insert-batch', () =>
      inference.createLogs(batch),
    );
    if (result !== undefined) {
      outputs.batchLogAcknowledgement = result;
      harness.own('gateway.log-audit-record', batch[0].metadata.trace_id, tag);
    }
  }
});
if (sdk) {
  const report = JSON.parse(readFileSync(`artifacts/e2e/${suite}.json`, 'utf8')) as {
    finishedAt: string;
    passed: number;
    failed: number;
    credentialsUnchanged: boolean;
  };
  if (!report.failed && report.credentialsUnchanged) {
    writePrivateReport('artifacts/examples/gateway-observability.json', {
      capturedAt: report.finishedAt,
      suite,
      source:
        'Actual typed SDK responses from owned synthetic traces; feedback IDs replaced, no secret values retained.',
      outputs,
    });
  }
}
