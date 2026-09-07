import { describe, expect, it, vi } from 'vitest';
import { AIGatewayInferenceClient } from '../../src/ai-gateway/inference-client.js';
import { ErrorType } from '../../src/errors.js';
import live from './fixtures/observability.json';

const connection = { endpoint: 'https://gateway.test/v1', apiKey: 'offline-runtime-key' };
const feedback = { trace_id: 'owned-trace', value: 0, weight: 0, metadata: { synthetic: true } };
const feedbackResponse = live.feedback;
const log = {
  request: { url: 'https://example.invalid/no-request', body: { prompt: 'READY' } },
  response: { body: { output: 'READY' }, status: 200, response_time: 1 },
  metadata: { trace_id: 'owned-log', synthetic: true, additionalProperties: 'declared-field' },
};

describe('runtime observability contracts', () => {
  it('creates feedback through the explicit runtime endpoint with no management credentials', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(feedbackResponse)));
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    expect(await client.createFeedback(feedback)).toEqual(feedbackResponse);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://gateway.test/v1/feedback');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(feedback);
    const headers = new Headers(init.headers);
    expect(headers.get('x-portkey-api-key')).toBe(connection.apiKey);
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-tsg-id')).toBe(false);
    expect(headers.has('x-portkey-provider')).toBe(false);
    expect(init.redirect).toBe('error');
  });

  it.each([log, [log, log]])(
    'preserves a single log or a batch and the plain-text acknowledgement',
    async (body) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(live.logAcknowledgement, { headers: { 'Content-Type': 'text/plain' } }),
        );
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      expect(await client.createLogs(body)).toBe(live.logAcknowledgement);
      expect(fetch.mock.calls[0][0]).toBe('https://gateway.test/v1/logs');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
      expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(body);
    },
  );

  it.each([
    { ...feedback, value: -11 },
    { ...feedback, value: 11 },
    { ...feedback, value: 0.5 },
    { ...feedback, value: '0' },
    { ...feedback, weight: -0.01 },
    { ...feedback, weight: 1.01 },
    { ...feedback, trace_id: undefined },
    { ...feedback, typo: true },
    { ...feedback, metadata: { value: Infinity } },
    { ...feedback, metadata: JSON.parse('{"__proto__":{"bad":true}}') },
  ])('rejects malformed feedback before network access', async (body) => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    await expect(client.createFeedback(body as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { ...log, request: undefined },
    { ...log, request: { body: {} } },
    { ...log, response: {} },
    { ...log, response: { body: {}, status: 200.5 } },
    { ...log, request: { ...log.request, headers: { test: 1 } } },
    { ...log, response: { body: { value: NaN } } },
    { ...log, metadata: { trace_id: 5 } },
    { ...log, metadata: { synthetic: undefined } },
    { ...log, typo: true },
  ])('rejects malformed logs without sending or dropping data', async (body) => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    await expect(client.createLogs(body as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves additive feedback response fields but rejects invalid known fields', async () => {
    const response = { ...feedbackResponse, extension: { test: true } };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(response)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...feedbackResponse, feedback_ids: [7] })),
      );
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    expect(await client.createFeedback(feedback)).toEqual(response);
    await expect(client.createFeedback(feedback)).rejects.toMatchObject({
      errorType: ErrorType.RESPONSE_VALIDATION,
    });
  });

  it.each(['createFeedback', 'createLogs'] as const)(
    'does not automatically retry %s writes',
    async (method) => {
      const fetch = vi.fn().mockResolvedValue(new Response('service error', { status: 500 }));
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      await expect(
        method === 'createFeedback' ? client.createFeedback(feedback) : client.createLogs(log),
      ).rejects.toMatchObject({ statusCode: 500 });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it('propagates pre-aborted requests without logging data', async () => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    const controller = new AbortController();
    const reason = new Error('test cancelled');
    controller.abort(reason);
    await expect(client.createLogs(log, { signal: controller.signal })).rejects.toBe(reason);
    expect(fetch).not.toHaveBeenCalled();
  });
});
