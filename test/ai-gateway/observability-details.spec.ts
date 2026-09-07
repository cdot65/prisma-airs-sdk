import { describe, expect, it, vi } from 'vitest';
import { AIGatewayInferenceClient } from '../../src/ai-gateway/inference-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { ErrorType } from '../../src/errors.js';

const connection = { endpoint: 'https://gateway.test/v1', apiKey: 'offline-runtime-key' };
const feedbackId = '550e8400-e29b-41d4-a716-446655440000';
const timestamp = '2026-09-07T00:00:00.000+02:00';
// Source-schema specimens, deliberately not labeled as successful Prisma responses.
const feedbackResponse = { status: 'success', message: 'Updated', future: { revision: 2 } };
const logResponse = {
  _id: null,
  request: {
    url: 'https://example.invalid/no-network',
    method: 'POST',
    portkeyHeaders: { 'x-portkey-trace-id': 'synthetic-trace' },
    body: { synthetic: true },
    extension: true,
  },
  response: { status: 200, responseTime: 1, lastUsedOptionJsonPath: '$', extension: true },
  organisation_id: null,
  created_at: null,
  metrics: { 'metadata.key': [null, 'test'], 'metadata.value': [null, 'value'], future: true },
  finalUntransformedRequest: { body: { synthetic: true } },
  originalResponse: { headers: { 'content-type': 'application/json' } },
  transformedRequest: { url: 'https://example.invalid/no-network', method: 'POST' },
  future: { additive: true },
};

function observeAuth(client: AIGatewayInferenceClient) {
  return vi.spyOn(Reflect.get(client, 'auth') as AuthAdapter, 'prepare');
}

describe('experimental runtime observability detail contracts', () => {
  it('uses PUT, the runtime key and exact feedback fields without inserting defaults', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(feedbackResponse)));
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    const auth = observeAuth(client);
    const body = { value: 0, weight: 0, metadata: { synthetic: true, nested: [null, false, 0] } };
    expect(await client.updateFeedback(feedbackId, body)).toEqual(feedbackResponse);
    expect(auth).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`https://gateway.test/v1/feedback/${feedbackId}`);
    expect(init.method).toBe('PUT');
    expect(init.redirect).toBe('error');
    expect(JSON.parse(init.body)).toEqual(body);
    const headers = new Headers(init.headers);
    expect(headers.get('x-portkey-api-key')).toBe(connection.apiKey);
    for (const key of ['authorization', 'x-tsg-id', 'x-portkey-provider'])
      expect(headers.has(key)).toBe(false);
  });

  it('preserves the minimal update without adding optional weight or metadata', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    const auth = observeAuth(client);
    expect(await client.updateFeedback(feedbackId, { value: -10 })).toEqual({});
    expect(auth).toHaveBeenCalledOnce();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ value: -10 });
  });

  it.each([
    {},
    { value: undefined },
    { value: -11 },
    { value: 11 },
    { value: 0.5 },
    { value: '0' },
    { value: NaN },
    { value: Infinity },
    { value: 0, weight: -0.01 },
    { value: 0, weight: 1.01 },
    { value: 0, trace_id: 'not-an-update-field' },
    { value: 0, metadata: { score: Infinity } },
    { value: 0, metadata: { missing: undefined } },
    { value: 0, metadata: JSON.parse('{"__proto__":{"bad":true}}') },
  ])('rejects invalid feedback before authentication or fetch: %j', async (body) => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    const auth = observeAuth(client);
    await expect(client.updateFeedback(feedbackId, body as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(auth).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['', ' ', '.', '..', 'not-a-uuid', 'a/b', '\ud800', null, 7])(
    'rejects malformed feedback IDs before authentication: %j',
    async (id) => {
      const fetch = vi.fn();
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      const auth = observeAuth(client);
      await expect(client.updateFeedback(id as never, { value: 0 })).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(auth).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('gets log detail with exact optional query encoding and additive nested responses', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(logResponse)));
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    const auth = observeAuth(client);
    const query = { path_format: 'v2' as const, created_at: timestamp, type: 'hooks' as const };
    expect(await client.getLog('owned/log ?#雪', query)).toEqual(logResponse);
    expect(auth).toHaveBeenCalledOnce();
    const [raw, init] = fetch.mock.calls[0];
    const url = new URL(raw);
    expect(url.pathname).toBe('/v1/logs/owned%2Flog%20%3F%23%E9%9B%AA');
    expect(Object.fromEntries(url.searchParams)).toEqual(query);
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.redirect).toBe('error');
    const headers = new Headers(init.headers);
    expect(headers.get('x-portkey-api-key')).toBe(connection.apiKey);
    for (const key of ['authorization', 'x-tsg-id', 'x-portkey-provider'])
      expect(headers.has(key)).toBe(false);
  });

  it.each([undefined, {}, { path_format: 'v1' as const }, { created_at: timestamp }])(
    'supports omitted/default-v1 queries without silently inserting defaults: %j',
    async (query) => {
      const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(logResponse)));
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      const auth = observeAuth(client);
      expect(await client.getLog('owned-log', query)).toEqual(logResponse);
      expect(auth).toHaveBeenCalledOnce();
      expect(Object.fromEntries(new URL(fetch.mock.calls[0][0]).searchParams)).toEqual(query ?? {});
    },
  );

  it.each([
    { path_format: 'v2' },
    { path_format: 'v2', created_at: undefined },
    { path_format: 'v3' },
    { type: 'request' },
    { created_at: '' },
    { created_at: 'not-a-date' },
    { created_at: '2026-09-07 00:00:00' },
    { created_at: '2026-02-30T00:00:00Z' },
    { created_at: null },
    { created_at: 123 },
    { path_format: ['v1'] },
    { typo: true },
  ])('rejects malformed log query and missing v2 timestamp before auth: %j', async (query) => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    const auth = observeAuth(client);
    await expect(client.getLog('owned-log', query as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(auth).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['', ' ', '.', '..', '\ud800', null, 7])(
    'rejects invalid log path segments before auth: %j',
    async (id) => {
      const fetch = vi.fn();
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      const auth = observeAuth(client);
      await expect(client.getLog(id as never)).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(auth).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ...logResponse, request: undefined },
    { ...logResponse, response: undefined },
    { ...logResponse, request: { ...logResponse.request, method: 'INVALID' } },
    { ...logResponse, response: { ...logResponse.response, status: '200' } },
    { ...logResponse, metrics: { 'metadata.key': [7] } },
  ])('rejects incorrect promised log fields: %j', async (body) => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    const auth = observeAuth(client);
    await expect(client.getLog('owned-log')).rejects.toMatchObject({
      errorType: ErrorType.RESPONSE_VALIDATION,
    });
    expect(auth).toHaveBeenCalledOnce();
  });

  it.each(['getLog', 'updateFeedback'] as const)(
    'surfaces %s backend 500 without automatic retry',
    async (method) => {
      const fetch = vi.fn().mockResolvedValue(new Response('storage unavailable', { status: 500 }));
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      const auth = observeAuth(client);
      await expect(
        method === 'getLog'
          ? client.getLog('owned-log')
          : client.updateFeedback(feedbackId, { value: 0 }),
      ).rejects.toMatchObject({ statusCode: 500, errorType: ErrorType.SERVER_SIDE_ERROR });
      expect(auth).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it.each([{ status: 7 }, { message: false }, { feedback_ids: [7] }])(
    'rejects invalid known feedback response fields: %j',
    async (body) => {
      const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      await expect(client.updateFeedback(feedbackId, { value: 0 })).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    },
  );

  it.each(['getLog', 'updateFeedback'] as const)(
    'never emits sensitive %s bodies even with debug-body opt-in',
    async (method) => {
      vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
      vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', '1');
      const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const marker = 'synthetic-private-log-body-do-not-emit';
        const response =
          method === 'getLog'
            ? { ...logResponse, originalResponse: { body: { output: marker } } }
            : { ...feedbackResponse, message: marker };
        const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
        const client = new AIGatewayInferenceClient({ ...connection, fetch });
        const result =
          method === 'getLog'
            ? await client.getLog('owned-log')
            : await client.updateFeedback(feedbackId, { value: 0, metadata: { private: marker } });
        expect(result).toEqual(response);
        expect(output).toHaveBeenCalled();
        const text = output.mock.calls.flat().join('\n');
        expect(text).not.toContain(marker);
        expect(text).not.toContain(connection.apiKey);
      } finally {
        output.mockRestore();
        vi.unstubAllEnvs();
      }
    },
  );

  it.each(['getLog', 'updateFeedback'] as const)(
    'honors pre-aborted %s requests before auth',
    async (method) => {
      const fetch = vi.fn();
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      const auth = observeAuth(client);
      const controller = new AbortController();
      const reason = new Error('cancel synthetic request');
      controller.abort(reason);
      const options = { signal: controller.signal };
      await expect(
        method === 'getLog'
          ? client.getLog('owned-log', {}, options)
          : client.updateFeedback(feedbackId, { value: 0 }, options),
      ).rejects.toBe(reason);
      expect(auth).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
