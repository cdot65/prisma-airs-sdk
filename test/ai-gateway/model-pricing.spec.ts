import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AIGatewayModelPricingClient,
  GatewayModelPricingConfigSchema,
  ErrorType,
} from '../../src/index.js';

const endpoint = 'https://public.example.test';
const pricing = {
  currency: 'USD',
  pay_as_you_go: {
    request_token: { price: 0.003 },
    response_token: { price: 0 },
    additional_units: { web_search: { price: 1 } },
    image: { standard: { '1024x1024': { price: 4 } } },
  },
  calculate: {
    request: {
      operation: 'sum',
      operands: [
        {
          operation: 'multiply',
          operands: [{ value: 'input_tokens' }, { value: 'rates.request_token' }],
        },
      ],
    },
    response: { operation: 'multiply', operands: [{ value: 'output_tokens' }] },
  },
  finetune_config: { pay_per_token: { price: 0.002 }, pay_per_hour: { price: 5 } },
  batch_config: { request_token: { price: 0.0015 } },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('public model pricing', () => {
  it('uses the explicit public host without /v1, OAuth, TSG or a runtime key', async () => {
    for (const key of [
      'PANW_MGMT_CLIENT_SECRET',
      'PANW_AI_GW_CLIENT_SECRET',
      'PANW_AI_GW_INFERENCE_API_KEY',
      'PANW_AI_SEC_API_KEY',
    ])
      vi.stubEnv(key, 'never-send-this-credential');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(pricing)));
    vi.stubGlobal('fetch', fetch);
    const result = await new AIGatewayModelPricingClient({ endpoint: endpoint + '///' }).get(
      'openai',
      'gpt-5.6-terra',
    );
    expect(result).toEqual(pricing);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(endpoint + '/model-configs/pricing/openai/gpt-5.6-terra');
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('error');
    expect(init.body).toBeUndefined();
    const headers = new Headers(init.headers);
    expect(headers.get('accept')).toBe('application/json');
    for (const header of [
      'authorization',
      'x-tsg-id',
      'x-portkey-api-key',
      'x-portkey-provider',
      'cookie',
    ])
      expect(headers.has(header)).toBe(false);
    expect(JSON.stringify(init)).not.toContain('never-send-this-credential');
  });

  it('supports caller-owned fetch and encodes each model/provider as exactly one segment', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    const globalFetch = vi.fn();
    vi.stubGlobal('fetch', globalFetch);
    await new AIGatewayModelPricingClient({ endpoint: endpoint + '/public', fetch }).get(
      'provider/name',
      'org/model?x=1#part%',
    );
    expect(fetch.mock.calls[0][0]).toBe(
      endpoint + '/public/model-configs/pricing/provider%2Fname/org%2Fmodel%3Fx%3D1%23part%25',
    );
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it.each(['http://localhost:3210', 'http://127.0.0.1:3210', 'http://[::1]:3210', endpoint])(
    'accepts secure or explicit loopback endpoints: %s',
    (endpoint) => {
      expect(() => new AIGatewayModelPricingClient({ endpoint })).not.toThrow();
    },
  );

  it.each([
    undefined,
    null,
    {},
    { endpoint: '' },
    { endpoint: 'relative' },
    { endpoint: 'http://remote.example' },
    { endpoint: 'https://user:password@example.test' },
    { endpoint: endpoint + '?token=hidden' },
    { endpoint: endpoint + '#fragment' },
    { endpoint: 'file:///tmp/pricing' },
    { endpoint, apiKey: 'unexpected' },
    { endpoint, headers: { authorization: 'unexpected' } },
    { endpoint, fetch: 1 },
    { endpoint, timeoutMs: 0 },
    { endpoint, timeoutMs: Infinity },
    { endpoint, timeoutMs: 1.2 },
    { endpoint, timeoutMs: Number.MAX_SAFE_INTEGER + 1 },
    { endpoint, timeoutMs: 2_147_483_648 },
    { endpoint, numRetries: -1 },
    { endpoint, numRetries: 6 },
    { endpoint, numRetries: NaN },
  ])('rejects invalid constructor options without network access: %j', (options) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(() => new AIGatewayModelPricingClient(options as never)).toThrow(
      expect.objectContaining({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR }),
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['', ' ', '.', '..', '\ud800', undefined, null, 12])(
    'rejects invalid path segments before I/O: %j',
    async (segment) => {
      const fetch = vi.fn();
      const client = new AIGatewayModelPricingClient({ endpoint, fetch });
      await expect(client.get(segment as never, 'model')).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      await expect(client.get('provider', segment as never)).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    { headers: { authorization: 'not-allowed' } },
    { signal: {} },
    { timeoutMs: 0 },
    { timeoutMs: Infinity },
    { timeoutMs: 2_147_483_648 },
    null,
  ])('rejects invalid per-request options before I/O: %j', async (options) => {
    const fetch = vi.fn();
    const client = new AIGatewayModelPricingClient({ endpoint, fetch });
    await expect(client.get('openai', 'model', options as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('honors caller cancellation before a request starts', async () => {
    const fetch = vi.fn();
    const controller = new AbortController();
    controller.abort(new Error('cancelled by caller'));
    await expect(
      new AIGatewayModelPricingClient({ endpoint, fetch }).get('openai', 'model', {
        signal: controller.signal,
      }),
    ).rejects.toThrow('cancelled by caller');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('bounds a transport that ignores AbortSignal with the per-call timeout', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    const result = new AIGatewayModelPricingClient({ endpoint, fetch, timeoutMs: 1000 }).get(
      'openai',
      'model',
      { timeoutMs: 10 },
    );
    const rejected = expect(result).rejects.toMatchObject({
      errorType: ErrorType.CLIENT_SIDE_ERROR,
    });
    await vi.advanceTimersByTimeAsync(10);
    await rejected;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry a failure by default', async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response('{}', { status: 500 }));
    await expect(
      new AIGatewayModelPricingClient({ endpoint, fetch }).get('openai', 'model'),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('supports an explicitly bounded retry budget for this read-only operation', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(pricing)));
    const result = new AIGatewayModelPricingClient({ endpoint, fetch, numRetries: 1 }).get(
      'openai',
      'model',
    );
    const passed = expect(result).resolves.toEqual(pricing);
    await vi.runAllTimersAsync();
    await passed;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 404])(
    'preserves HTTP %i without trying management authentication',
    async (status) => {
      const fetch = vi.fn().mockResolvedValue(new Response('{}', { status }));
      await expect(
        new AIGatewayModelPricingClient({ endpoint, fetch }).get('openai', 'model'),
      ).rejects.toMatchObject({ statusCode: status });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    'not JSON',
    '{"currency":"EUR"}',
    '{"pay_as_you_go":{"request_token":{"price":"0.1"}}}',
  ])('normalizes invalid successful bodies as response validation failures: %s', async (body) => {
    const fetch = vi.fn().mockResolvedValue(new Response(body));
    await expect(
      new AIGatewayModelPricingClient({ endpoint, fetch }).get('openai', 'model'),
    ).rejects.toMatchObject({ errorType: ErrorType.RESPONSE_VALIDATION });
  });

  it('preserves optional and future fields without coercing prices or evaluating formulas', () => {
    expect(GatewayModelPricingConfigSchema.parse({})).toEqual({});
    expect(GatewayModelPricingConfigSchema.parse(pricing)).toEqual(pricing);
    expect(
      GatewayModelPricingConfigSchema.parse({
        calculate: { request: { value: 'data-only()', future: true } },
      }),
    ).toEqual({ calculate: { request: { value: 'data-only()', future: true } } });
  });

  it.each([
    { pay_as_you_go: { request_token: { price: Infinity } } },
    { pay_as_you_go: { additional_units: { lookup: { price: '1' } } } },
    { pay_as_you_go: { image: { standard: { large: { price: null } } } } },
    { calculate: { request: { operation: 'eval', operands: [] } } },
    { calculate: { request: { operation: 'sum', operands: [{ value: 1 }] } } },
    { calculate: { response: { operands: 'invalid' } } },
    { finetune_config: { pay_per_hour: { price: '1' } } },
  ])('validates modeled nested fields: %j', (payload) => {
    expect(GatewayModelPricingConfigSchema.safeParse(payload).success).toBe(false);
  });
});
