/** @internal Bounded live inference through the actual SDK client, with disposable SCM keys. */
import assert from 'node:assert/strict';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AIGatewayInferenceClient, ErrorType, SDK_VERSION } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

// Complete package loading/version checks before runtimeSuite reads credentials or creates a key.
const installedEntry = process.env.E2E_RELEASE_SDK_ENTRY;
let InferenceClient = AIGatewayInferenceClient;
if (installedEntry !== undefined) {
  assert(isAbsolute(installedEntry), 'The installed SDK entry must be an absolute local path');
  const installed = (await import(
    pathToFileURL(installedEntry).href
  )) as typeof import('../src/index.js');
  assert.equal(
    installed.SDK_VERSION,
    SDK_VERSION,
    'The installed SDK must match the candidate version',
  );
  assert.equal(typeof installed.AIGatewayInferenceClient, 'function');
  InferenceClient = installed.AIGatewayInferenceClient;
}
const suiteName =
  installedEntry === undefined ? 'gateway-inference' : `release-sdk-inference-v${SDK_VERSION}`;
await runtimeSuite(suiteName, async ({ harness, endpoint, apiKey }) => {
  const inference = new InferenceClient({ endpoint, apiKey, numRetries: 0 });
  const model = '@openai/gpt-5.6-terra';
  const embeddingModel = '@openai/text-embedding-3-small';
  const messages = [{ role: 'user' as const, content: 'Reply with READY.' }];
  await harness.check('sdk.chat.completions', async () => {
    const result = await inference.createChatCompletion({
      model,
      messages,
      max_completion_tokens: 128,
    });
    assert.equal(result.object, 'chat.completion');
    assert.equal(typeof result.choices[0].message.content, 'string');
    return result;
  });
  await harness.check('sdk.chat.stream.complete-with-usage', async () => {
    const stream = await inference.createChatCompletion({
      model,
      messages,
      max_completion_tokens: 128,
      stream: true,
      stream_options: { include_usage: true },
    });
    let content = '';
    let usage = false;
    let count = 0;
    for await (const event of stream) {
      count++;
      content += event.choices.map((choice) => choice.delta.content ?? '').join('');
      if (event.usage) usage = true;
      harness.captureResponseShape('sdk.chat.stream.chunk', event);
    }
    assert(content.length > 0);
    assert(usage);
    return { count, completed: true, usage };
  });
  await harness.check('sdk.chat.stream.consumer-break', async () => {
    const stream = await inference.createChatCompletion({
      model,
      messages,
      max_completion_tokens: 64,
      stream: true,
    });
    for await (const event of stream) {
      assert(event);
      break;
    }
    assert.equal((await stream.next()).done, true);
  });
  await harness.check('sdk.responses.create', async () => {
    const result = await inference.createResponse({
      model,
      input: 'Reply with READY.',
      max_output_tokens: 128,
      store: false,
    });
    assert.equal(result.object, 'response');
    assert.equal(result.status, 'completed');
    assert(result.output.length > 0);
    return result;
  });
  await harness.check('sdk.responses.stream', async () => {
    const events = [];
    const stream = await inference.createResponse({
      model,
      input: 'Reply with READY.',
      max_output_tokens: 128,
      store: false,
      stream: true,
    });
    for await (const event of stream) {
      events.push(event.type);
      harness.captureResponseShape('sdk.responses.stream.event', event);
    }
    assert(events.includes('response.output_text.delta'));
    assert.equal(events.at(-1), 'response.completed');
    return { events };
  });
  for (const encoding_format of ['float', 'base64'] as const) {
    await harness.check(`sdk.embeddings.${encoding_format}`, async () => {
      const result = await inference.createEmbedding({
        model: embeddingModel,
        input: ['SDK contract check', 'Gateway embedding check'],
        dimensions: 32,
        encoding_format,
      });
      assert.equal(result.data.length, 2);
      for (const item of result.data) {
        if (encoding_format === 'float') {
          assert(Array.isArray(item.embedding));
          assert.equal(item.embedding.length, 32);
          assert(item.embedding.every(Number.isFinite));
        } else {
          assert.equal(typeof item.embedding, 'string');
          assert.equal(Buffer.from(item.embedding as string, 'base64').byteLength, 128);
        }
      }
      return result;
    });
  }
  await harness.check('sdk.cancel.before-network', async () => {
    const controller = new AbortController();
    const reason = new Error('Intentional SDK cancellation test');
    controller.abort(reason);
    await assert.rejects(
      inference.createChatCompletion({ model, messages }, { signal: controller.signal }),
      (error) => error === reason,
    );
  });
  await harness.check('sdk.validation.before-network', async () => {
    await assert.rejects(inference.createChatCompletion({ model, messages: [] }), {
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
  });
});
