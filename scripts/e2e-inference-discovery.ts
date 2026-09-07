/** @internal Bounded runtime discovery using a temporary SCM-created key, never the pasted credential. */
import assert from 'node:assert/strict';
import { AISecSDKException, ErrorType } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

await runtimeSuite('inference-discovery', async ({ harness, endpoint, apiKey }) => {
  async function call(path: string, body?: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(endpoint + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'x-portkey-api-key': apiKey,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new AISecSDKException(
        'Gateway runtime discovery failed',
        response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
        { statusCode: response.status },
      );
    }
    return response;
  }
  async function json(response: Response): Promise<Record<string, unknown>> {
    const value: unknown = await response.json();
    assert(value && typeof value === 'object' && !Array.isArray(value));
    return value as Record<string, unknown>;
  }
  const chatModel = '@openai/gpt-5.6-terra';
  const embeddingModel = '@openai/text-embedding-3-small';
  await harness.check('chat.completions', async () => {
    const body = await json(
      await call('/chat/completions', {
        model: chatModel,
        messages: [{ role: 'user', content: 'Reply with READY.' }],
        max_completion_tokens: 128,
      }),
    );
    assert.equal(body.object, 'chat.completion');
    assert(Array.isArray(body.choices) && body.choices.length > 0);
    assert.equal(typeof body.choices[0].message.content, 'string');
    return body;
  });
  await harness.check('chat.stream', async () => {
    const response = await call('/chat/completions', {
      model: chatModel,
      messages: [{ role: 'user', content: 'Reply with READY.' }],
      max_completion_tokens: 128,
      stream: true,
      stream_options: { include_usage: true },
    });
    assert(response.headers.get('content-type')?.includes('text/event-stream'));
    const text = await response.text();
    assert(text.includes('data: [DONE]'));
    const events = text
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
      .map((line) => JSON.parse(line.slice(6)) as { choices?: { delta?: { content?: string } }[] });
    assert(
      events.some((event) =>
        event.choices?.some((choice) => typeof choice.delta?.content === 'string'),
      ),
    );
    return { eventCount: events.length, first: events[0], last: events.at(-1) };
  });
  for (const encoding_format of ['float', 'base64'] as const) {
    await harness.check(`embeddings.${encoding_format}`, async () => {
      const body = await json(
        await call('/embeddings', {
          model: embeddingModel,
          input: 'SDK encoding check',
          dimensions: 32,
          encoding_format,
        }),
      );
      assert(Array.isArray(body.data) && body.data.length === 1);
      const embedding: unknown = body.data[0].embedding;
      if (encoding_format === 'float')
        assert(
          Array.isArray(embedding) && embedding.length === 32 && embedding.every(Number.isFinite),
        );
      else {
        assert.equal(typeof embedding, 'string');
        assert.equal(Buffer.from(embedding as string, 'base64').byteLength, 128);
      }
      return body;
    });
  }
  await harness.check('responses.create', async () => {
    const body = await json(
      await call('/responses', {
        model: chatModel,
        input: 'Reply with READY.',
        max_output_tokens: 128,
        store: false,
      }),
    );
    assert.equal(body.object, 'response');
    return body;
  });
  for (const [name, path, headers] of [
    ['models.list', '/models', {}],
    ['models.list.provider-slug', '/models', { 'x-portkey-provider': '@openai' }],
    ['models.get.provider-slug', '/models/gpt-5.6-terra', { 'x-portkey-provider': '@openai' }],
    ['files.list.provider-slug', '/files', { 'x-portkey-provider': '@openai' }],
    [
      'assistants.list.provider-slug',
      '/assistants?limit=1',
      { 'x-portkey-provider': '@openai', 'OpenAI-Beta': 'assistants=v2' },
    ],
    [
      'vector-stores.list.provider-slug',
      '/vector_stores?limit=1',
      { 'x-portkey-provider': '@openai', 'OpenAI-Beta': 'assistants=v2' },
    ],
    ['batches.list.provider-slug', '/batches?limit=1', { 'x-portkey-provider': '@openai' }],
  ] as const)
    await harness.check(name, async () => json(await call(path, undefined, headers)));
});
