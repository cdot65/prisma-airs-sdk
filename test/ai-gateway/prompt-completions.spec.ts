import { describe, expect, it, vi } from 'vitest';
import { AIGatewayInferenceClient } from '../../src/ai-gateway/inference-client.js';
import { ErrorType } from '../../src/errors.js';
import type { GatewayStream } from '../../src/http/event-stream.js';

const connection = { endpoint: 'https://gateway.test/v1', apiKey: 'offline-key' };
const model = '@provider/compatible-model';
const completion = {
  id: 'cmpl-synthetic',
  object: 'text_completion',
  created: 1,
  model,
  choices: [{ index: 0, text: 'Synthetic', finish_reason: 'stop', logprobs: null }],
};
const chat = {
  id: 'chatcmpl-synthetic',
  object: 'chat.completion',
  created: 1,
  model,
  choices: [
    { index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Synthetic' } },
  ],
};
const body = {
  variables: { user_input: 'Synthetic', structured: { list: [1, null, true] } },
  model,
  max_completion_tokens: 16,
};
const cases = [
  {
    method: 'createCompletion',
    path: '/completions',
    body: { model, prompt: 'Synthetic', max_tokens: 16 },
    response: completion,
  },
  {
    method: 'createPromptCompletion',
    path: '/prompts/owned%2Fprompt%3F%23/completions',
    body,
    response: chat,
    promptId: 'owned/prompt?#',
  },
  {
    method: 'createPromptRender',
    path: '/prompts/owned%2Fprompt%3F%23/render',
    body,
    response: {
      success: true,
      data: { model, messages: [{ role: 'user', content: 'Synthetic' }] },
    },
    promptId: 'owned/prompt?#',
  },
] as const;
async function invoke(
  client: AIGatewayInferenceClient,
  item: (typeof cases)[number],
  value: unknown,
  options?: object,
): Promise<unknown> {
  const args = [...('promptId' in item ? [item.promptId] : []), value, options];
  return (client as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[
    item.method
  ](...args);
}
const sse = (...events: unknown[]) =>
  new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n',
    { headers: { 'Content-Type': 'text/event-stream' } },
  );

describe('experimental legacy and prompt runtime contracts', () => {
  for (const item of cases)
    describe(item.method, () => {
      it('uses the explicit runtime route/auth and exact root-level body', async () => {
        const response = { ...item.response, provider_extension: { preserved: true } };
        const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
        const result = await invoke(
          new AIGatewayInferenceClient({ ...connection, fetch }),
          item,
          item.body,
          { headers: { 'x-portkey-provider': '@provider' } },
        );
        expect(result).toEqual(response);
        expect(fetch).toHaveBeenCalledOnce();
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe(connection.endpoint + item.path);
        expect(init.method).toBe('POST');
        expect(init.redirect).toBe('error');
        expect(JSON.parse(init.body)).toEqual(item.body);
        const headers = new Headers(init.headers);
        expect(headers.get('x-portkey-api-key')).toBe(connection.apiKey);
        expect(headers.get('x-portkey-provider')).toBe('@provider');
        expect(headers.has('authorization')).toBe(false);
        expect(headers.has('x-tsg-id')).toBe(false);
      });
      it.each([null, undefined, { unsupported: true }])(
        'rejects invalid body %j before fetch',
        async (value) => {
          const fetch = vi.fn();
          await expect(
            invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, value),
          ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
          expect(fetch).not.toHaveBeenCalled();
        },
      );
      it('rejects undeclared input fields without leaking their values', async () => {
        const fetch = vi.fn();
        await expect(
          invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, {
            ...item.body,
            private_unknown: 'never-log-this',
          }),
        ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
        expect(fetch).not.toHaveBeenCalled();
      });
      it('rejects malformed successful JSON', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response('{"body":42,"status":42}'));
        await expect(
          invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, item.body),
        ).rejects.toMatchObject({ errorType: ErrorType.RESPONSE_VALIDATION });
      });
      it('does not retry a failed provider request by default', async () => {
        const fetch = vi
          .fn()
          .mockImplementation(() => Promise.resolve(new Response('temporary', { status: 503 })));
        await expect(
          invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, item.body),
        ).rejects.toMatchObject({ statusCode: 503 });
        expect(fetch).toHaveBeenCalledOnce();
      });
      it('preserves pre-abort without dispatch', async () => {
        const fetch = vi.fn();
        const controller = new AbortController();
        const reason = new Error('cancelled');
        controller.abort(reason);
        await expect(
          invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, item.body, {
            signal: controller.signal,
          }),
        ).rejects.toBe(reason);
        expect(fetch).not.toHaveBeenCalled();
      });
    });
  for (const item of cases.slice(1)) {
    it.each(['', ' ', '.', '..', '\ud800'])(
      `${item.method} rejects unsafe prompt ID %j`,
      async (promptId) => {
        const fetch = vi.fn();
        await expect(
          invoke(
            new AIGatewayInferenceClient({ ...connection, fetch }),
            { ...item, promptId } as typeof item,
            item.body,
          ),
        ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
        expect(fetch).not.toHaveBeenCalled();
      },
    );
    it(`${item.method} rejects educational-only nested hyperparameters`, async () => {
      const fetch = vi.fn();
      await expect(
        invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, {
          variables: {},
          hyperparameters: { model, prompt: 'Synthetic' },
        }),
      ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
      expect(fetch).not.toHaveBeenCalled();
    });
    it.each([
      NaN,
      Infinity,
      undefined,
      () => true,
      new Date('2025-01-01T00:00:00Z'),
      { constructor: 'unsafe' },
    ])(`${item.method} rejects unsafe variable %j`, async (value) => {
      const fetch = vi.fn();
      await expect(
        invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, {
          variables: { value },
        }),
      ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
      expect(fetch).not.toHaveBeenCalled();
    });
    it(`${item.method} allows variables-only input without selecting a model`, async () => {
      const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(item.response)));
      await invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, { variables: {} });
      expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ variables: {} });
    });
  }
  it.each(['Synthetic', ['one', 'two'], [1, 2], [[1, 2], [3]], null])(
    'preserves legacy prompt representation %j',
    async (prompt) => {
      const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(completion)));
      await invoke(new AIGatewayInferenceClient({ ...connection, fetch }), cases[0], {
        model,
        prompt,
      });
      expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ model, prompt });
    },
  );
  it.each([
    chat,
    completion,
    { status: 'success', headers: { synthetic: 'value' }, body: chat },
    { body: completion },
  ])('preserves declared and gateway-native prompt result %j', async (response) => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
    expect(
      await invoke(new AIGatewayInferenceClient({ ...connection, fetch }), cases[1], body),
    ).toEqual(response);
  });
  it('preserves legacy rendered parameters', async () => {
    const response = { success: true, data: { model, prompt: 'Synthetic', echo: true } };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
    expect(
      await invoke(new AIGatewayInferenceClient({ ...connection, fetch }), cases[2], {
        variables: {},
        echo: true,
      }),
    ).toEqual(response);
  });
  const textChunk = {
    ...completion,
    system_fingerprint: null,
    usage: null,
    choices: [{ ...completion.choices[0], finish_reason: null }],
  };
  const chatChunk = {
    id: 'chatcmpl-synthetic',
    object: 'chat.completion.chunk',
    created: 1,
    model,
    choices: [{ index: 0, delta: { content: 'Synthetic' }, finish_reason: null }],
    usage: null,
  };
  for (const item of cases.slice(0, 2)) {
    for (const chunk of item.method === 'createCompletion' ? [textChunk] : [textChunk, chatChunk])
      it(`${item.method} streams ${chunk.object} with explicit termination`, async () => {
        const usage = {
          ...chunk,
          choices: [],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        };
        const fetch = vi.fn().mockResolvedValue(sse(chunk, usage));
        const stream = (await invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, {
          ...item.body,
          stream: true,
        })) as GatewayStream<unknown>;
        const result = [];
        for await (const event of stream) result.push(event);
        expect(result).toEqual([chunk, usage]);
        expect(fetch).toHaveBeenCalledOnce();
      });
    it(`${item.method} rejects truncated streams without replay`, async () => {
      const fetch = vi.fn().mockResolvedValue(
        new Response(`data: ${JSON.stringify(textChunk)}\n\n`, {
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      );
      const stream = (await invoke(new AIGatewayInferenceClient({ ...connection, fetch }), item, {
        ...item.body,
        stream: true,
      })) as GatewayStream<unknown>;
      expect((await stream.next()).value).toEqual(textChunk);
      await expect(stream.next()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
      expect(fetch).toHaveBeenCalledOnce();
    });
    it(`${item.method} honors maxEventBytes and cancels before iteration`, async () => {
      const fetch = vi.fn().mockImplementation(() => Promise.resolve(sse(textChunk)));
      const client = new AIGatewayInferenceClient({ ...connection, fetch, maxEventBytes: 20 });
      const stream = (await invoke(client, item, {
        ...item.body,
        stream: true,
      })) as GatewayStream<unknown>;
      await expect(stream.next()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
      const abandoned = (await invoke(client, item, {
        ...item.body,
        stream: true,
      })) as GatewayStream<unknown>;
      await abandoned.cancel();
      expect((await abandoned.next()).done).toBe(true);
    });
  }
});
