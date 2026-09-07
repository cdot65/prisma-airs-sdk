import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayInferenceClient } from '../../src/ai-gateway/inference-client.js';
import { AIGatewayClient } from '../../src/ai-gateway/client.js';
import { ErrorType } from '../../src/errors.js';
import { gatewayMultipart } from '../../src/ai-gateway/runtime-wire.js';

const options = { endpoint: 'https://gateway.test/v1/', apiKey: 'test-runtime-key' };
const input = {
  model: '@provider/model',
  messages: [{ role: 'user' as const, content: 'hello' }],
  max_completion_tokens: 128,
};
const completion = {
  id: 'chat-test',
  object: 'chat.completion',
  created: 1,
  model: 'model',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'ok', refusal: null },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  system_fingerprint: null,
};
const chunk = {
  id: 'chat-test',
  object: 'chat.completion.chunk',
  created: 1,
  model: 'model',
  choices: [
    { index: 0, delta: { role: 'assistant', content: 'ok' }, logprobs: null, finish_reason: null },
  ],
  usage: null,
  system_fingerprint: null,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('standalone gateway inference', () => {
  it.each([
    { endpoint: '' },
    { apiKey: '' },
    { endpoint: 'bad-url' },
    { endpoint: 'http://gateway.test/v1' },
    { endpoint: 'https://user:password@gateway.test/v1' },
    { endpoint: 'https://gateway.test/v1?token=x' },
    { endpoint: 'https://gateway.test/v1#fragment' },
    { apiKey: '  ' },
    { apiKey: 'test\r\nsecret' },
    { timeoutMs: 0 },
    { maxEventBytes: -1 },
    { numRetries: 6 },
    { numRetries: -1 },
    { numRetries: 0.5 },
    { fetch: 'invalid' },
  ])('rejects invalid construction without leaking secrets: %j', (override) => {
    expect(() => new AIGatewayInferenceClient({ ...options, ...override } as never)).toThrow();
  });
  it('uses explicit environment configuration and allows loopback for local testing', () => {
    vi.stubEnv('PANW_AI_GW_INFERENCE_ENDPOINT', 'http://127.0.0.1:9999/v1');
    vi.stubEnv('PANW_AI_GW_INFERENCE_API_KEY', 'local-test-key');
    expect(new AIGatewayInferenceClient()).toBeInstanceOf(AIGatewayInferenceClient);
  });
  it.each(['', '.', '..', '\ud800'])(
    'rejects unsafe path identifiers before network: %j',
    async (id) => {
      const fetch = vi.fn();
      const client = new AIGatewayInferenceClient({ ...options, fetch });
      await expect(client.retrieveFile(id)).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    { Authorization: 'Bearer private' },
    { 'x-portkey-api-key': 'other-key' },
    { 'x-portkey-provider': 'provider\r\nsecret' },
    { 'invalid header': 'x' },
    { 'x-portkey-provider': 123 },
  ])('rejects invalid header overrides before network: %j', async (headers) => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...options, fetch });
    await expect(client.createChatCompletion(input, { headers } as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves supported routing headers and encoded resource IDs', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([0, 255, 10])));
    const client = new AIGatewayInferenceClient({ ...options, fetch });
    const result = await client.downloadFile('file/a?b#c', {
      headers: { 'x-portkey-provider': '@provider', 'OpenAI-Beta': 'assistants=v2' },
    });
    expect(result).toEqual(new Uint8Array([0, 255, 10]));
    expect(fetch.mock.calls[0][0]).toBe('https://gateway.test/v1/files/file%2Fa%3Fb%23c/content');
    expect(fetch.mock.calls[0][1].headers['x-portkey-provider']).toBe('@provider');
  });
  it('validates multipart inputs and leaves the boundary to native fetch', async () => {
    const file = new Blob(['exact fixture bytes'], { type: 'text/plain' });
    const response = {
      id: 'file-test',
      object: 'file',
      bytes: 19,
      created_at: 1,
      filename: 'test.txt',
      purpose: 'assistants',
      status: 'processed',
      status_details: null,
    };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
    const client = new AIGatewayInferenceClient({ ...options, fetch });
    expect(await client.createFile({ file, purpose: 'assistants' })).toEqual(response);
    const init = fetch.mock.calls[0][1];
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
    expect(await init.body.get('file').text()).toBe('exact fixture bytes');
    expect(init.body.get('purpose')).toBe('assistants');
    await expect(
      client.createFile({ file: 'wrong', purpose: 'assistants' } as never),
    ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('encodes explicit multipart array/object fields without dropping false or zero', () => {
    const form = gatewayMultipart({
      ignored: undefined,
      empty: null,
      files: [new Blob(['a'])],
      tokens: [1, 2],
      options: [{ a: true }],
      config: { mode: 'x' },
      count: 0,
      enabled: false,
    });
    expect(form.has('ignored')).toBe(false);
    expect(form.getAll('tokens[]')).toEqual(['1', '2']);
    expect(form.get('options[]')).toBe('{"a":true}');
    expect(form.get('config')).toBe('{"mode":"x"}');
    expect(form.get('count')).toBe('0');
    expect(form.get('enabled')).toBe('false');
  });
  it('returns the final typed Responses event and closes without a chat sentinel', async () => {
    const body = {
      id: 'response-test',
      object: 'response',
      created_at: 1,
      error: null,
      incomplete_details: null,
      instructions: null,
      model: 'model',
      tools: [],
      output: [],
      parallel_tool_calls: true,
      metadata: {},
      tool_choice: 'auto',
      temperature: 1,
      top_p: 1,
      user: null,
      usage: null,
      status: 'completed',
    };
    const event = { type: 'response.completed', response: body };
    const fetch = vi.fn().mockResolvedValue(
      new Response(`event: response.completed\ndata: ${JSON.stringify(event)}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const client = new AIGatewayInferenceClient({ ...options, fetch });
    const stream = await client.createResponse({
      model: '@provider/new-model',
      input: 'hello',
      stream: true,
    });
    const result = [];
    for await (const item of stream) result.push(item);
    expect(result).toEqual([event]);
  });
  it('sends the runtime key without management OAuth and rejects redirects', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(completion)));
    const client = new AIGatewayInferenceClient({ ...options, fetch });
    expect(await client.createChatCompletion(input)).toMatchObject(completion);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://gateway.test/v1/chat/completions');
    const init = fetch.mock.calls[0][1];
    expect(init.headers['x-portkey-api-key']).toBe(options.apiKey);
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers['x-tsg-id']).toBeUndefined();
    expect(init.redirect).toBe('error');
    expect(JSON.parse(init.body)).toEqual(input);
    expect(JSON.stringify(client)).not.toContain(options.apiKey);
  });
  it('validates inputs before any authentication or request', async () => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...options, fetch });
    await expect(client.createChatCompletion({ ...input, messages: [] })).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    await expect(
      client.createChatCompletion({ ...input, typo: true } as never),
    ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns a typed cancellable stream when stream=true', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const client = new AIGatewayInferenceClient({ ...options, fetch });
    const stream = await client.createChatCompletion({ ...input, stream: true });
    const events = [];
    for await (const event of stream) events.push(event);
    expect(events).toEqual([chunk]);
  });
  it.each([{ embedding: [0.1, 0.2] }, { embedding: 'AAAAAA==' }])(
    'preserves embedding encoding %j',
    async ({ embedding }) => {
      const body = {
        object: 'list',
        model: 'embedding-model',
        data: [{ object: 'embedding', index: 0, embedding }],
        usage: { prompt_tokens: 1, total_tokens: 1 },
      };
      const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
      const client = new AIGatewayInferenceClient({ ...options, fetch });
      expect(
        await client.createEmbedding({
          model: '@provider/embedding',
          input: 'hello',
          encoding_format: typeof embedding === 'string' ? 'base64' : 'float',
        }),
      ).toEqual(body);
    },
  );
  it('does not retry billable inference by default', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"error":{"message":"Unavailable"}}', { status: 503 }));
    const client = new AIGatewayInferenceClient({ ...options, fetch });
    await expect(client.createChatCompletion(input)).rejects.toMatchObject({ statusCode: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('supports a lazy inference client without changing SCM construction requirements', () => {
    const client = new AIGatewayClient({
      clientId: 'client',
      clientSecret: 'secret',
      tsgId: '123456',
      inference: options,
    });
    expect(client.inference).toBeInstanceOf(AIGatewayInferenceClient);
    expect(client.inference).toBe(client.inference);
    expect(JSON.stringify(client)).not.toContain(options.apiKey);
  });
});
