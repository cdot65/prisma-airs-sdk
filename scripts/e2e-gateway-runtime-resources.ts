/** @internal Live typed resources; register owned IDs before response-schema validation. */
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { setTimeout as delay } from 'node:timers/promises';
import { AIGatewayInferenceClient } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

await runtimeSuite('gateway-runtime-resources', async ({ harness, endpoint, apiKey, tag }) => {
  const headers = { 'x-portkey-provider': '@openai' };
  const options = { headers };
  const inference = new AIGatewayInferenceClient({
    endpoint,
    apiKey,
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      const path = new URL(String(input)).pathname;
      if (
        response.ok &&
        init?.method === 'GET' &&
        /\/vector_stores\/[^/]+\/files\/[^/]+$/.test(path)
      ) {
        const body = (await response.clone().json()) as {
          chunking_strategy?: { static?: { max_chunk_size_tokens?: number } };
        };
        console.log(
          JSON.stringify({
            diagnostic: 'Observed chunk-size contract',
            max_chunk_size_tokens: body.chunking_strategy?.static?.max_chunk_size_tokens,
          }),
        );
      }
      if (
        response.ok &&
        init?.method === 'POST' &&
        ['/v1/files', '/v1/vector_stores', '/v1/responses'].includes(path)
      ) {
        const record: unknown = await response.clone().json();
        assert(
          record && typeof record === 'object' && 'id' in record && typeof record.id === 'string',
        );
        const id = record.id;
        const kind = path.split('/').at(-1)!;
        harness.own(`gateway.runtime.${kind}`, id, tag);
        harness.defer(`${kind}.${id}`, async () => {
          if (kind === 'files') await inference.deleteFile(id, options);
          else if (kind === 'vector_stores') await inference.deleteVectorStore(id, options);
          else await inference.deleteResponse(id, options);
        });
      }
      return response;
    },
  });
  await harness.check('sdk.models.list', async () => {
    const result = await inference.listModels({}, options);
    assert(result.data.some((model) => model.id === 'gpt-5.6-terra'));
    return result;
  });
  await harness.check('sdk.models.retrieve', () =>
    inference.retrieveModel('gpt-5.6-terra', options),
  );
  await harness.check('sdk.files.list', () => inference.listFiles({}, options));
  await harness.check('sdk.batches.list', () => inference.listBatches({ limit: 1 }, options));
  await harness.check('sdk.fine-tuning.list', async () => {
    const result = await inference.listPaginatedFineTuningJobs({ limit: 1 }, options);
    assert.equal(result.object, 'list');
    assert(result.data.length <= 1, 'The server must respect the requested page size');
    return result;
  });
  await harness.check('sdk.vector-stores.list', () =>
    inference.listVectorStores({ limit: 1 }, options),
  );
  const text = 'Prisma AIRS SDK disposable contract fixture. The readiness marker is READY.\n';
  const file = await harness.check('sdk.files.create.multipart', () =>
    inference.createFile(
      { file: new File([text], `${tag}.txt`, { type: 'text/plain' }), purpose: 'assistants' },
      options,
    ),
  );
  if (file) {
    await harness.check('sdk.files.retrieve', () => inference.retrieveFile(file.id, options));
    await harness.check('sdk.files.assistants-download-rejected', async () => {
      await assert.rejects(inference.downloadFile(file.id, options), { statusCode: 400 });
    });
  }
  const batchText =
    JSON.stringify({
      custom_id: 'sdk-contract-1',
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-5.6-terra',
        messages: [{ role: 'user', content: 'Reply READY.' }],
        max_completion_tokens: 128,
      },
    }) + '\n';
  const batchFile = await harness.check('sdk.files.create.batch-jsonl', () =>
    inference.createFile(
      {
        file: new File([batchText], `${tag}.jsonl`, { type: 'application/jsonl' }),
        purpose: 'batch',
      },
      options,
    ),
  );
  if (batchFile)
    await harness.check('sdk.files.download.binary-exact', async () => {
      const bytes = await inference.downloadFile(batchFile.id, options);
      assert.equal(new TextDecoder().decode(bytes), batchText);
      return { byteLength: bytes.byteLength, exactMatch: true };
    });
  const vector = await harness.check('sdk.vector-stores.create', () =>
    inference.createVectorStore(
      { name: tag, expires_after: { anchor: 'last_active_at', days: 1 } },
      options,
    ),
  );
  if (vector) {
    await harness.check('sdk.vector-stores.get', async () => {
      // Creation can precede read visibility. Retry only reads of this newly owned ID.
      for (let attempt = 0; ; attempt++) {
        try {
          return await inference.getVectorStore(vector.id, options);
        } catch (error) {
          if (attempt >= 9 || (error as { statusCode?: number }).statusCode !== 404) throw error;
          await delay(500);
        }
      }
    });
    await harness.check('sdk.vector-stores.modify', () =>
      inference.modifyVectorStore(vector.id, { name: `${tag}-updated` }, options),
    );
    if (file) {
      const attached = await harness.check('sdk.vector-stores.files.create', () =>
        inference.createVectorStoreFile(vector.id, { file_id: file.id }, options),
      );
      if (attached) {
        await harness.check('sdk.vector-stores.files.get-completed', async () => {
          for (let attempt = 0; attempt < 40; attempt++) {
            const result = await inference.getVectorStoreFile(vector.id, file.id, options);
            if (result.status === 'completed') return result;
            assert.equal(result.status, 'in_progress');
            await delay(500);
          }
          throw new Error('Owned file indexing did not finish within 20 seconds');
        });
        await harness.check('sdk.vector-stores.files.list', () =>
          inference.listVectorStoreFiles(vector.id, {}, options),
        );
        await harness.check('sdk.vector-stores.files.delete', () =>
          inference.deleteVectorStoreFile(vector.id, file.id, options),
        );
      }
    }
  }
  const response = await harness.check('sdk.responses.create-stored', () =>
    inference.createResponse({
      model: '@openai/gpt-5.6-terra',
      input: 'Reply with READY.',
      max_output_tokens: 128,
      store: true,
    }),
  );
  if (response) {
    await harness.check('sdk.responses.get', () => inference.getResponse(response.id, {}, options));
    await harness.check('sdk.responses.input-items', () =>
      inference.listInputItems(response.id, { limit: 1 }, options),
    );
  }
});
