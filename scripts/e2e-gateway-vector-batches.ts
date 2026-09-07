/** @internal Owned vector-file batches: completion and cancellation, never user resources. */
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { setTimeout as delay } from 'node:timers/promises';
import { AIGatewayInferenceClient } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

const wire = process.argv.find((argument) => argument.startsWith('--cancel-wire='))?.slice(14);
assert(
  wire === undefined || ['json', 'beta', 'json-beta'].includes(wire),
  'Unknown cancel wire diagnostic',
);
await runtimeSuite(
  `gateway-vector-batches${wire ? `-${wire}` : ''}`,
  async ({ harness, endpoint, apiKey, tag }) => {
    const options = { headers: { 'x-portkey-provider': '@openai' } };
    const inference = new AIGatewayInferenceClient({
      endpoint,
      apiKey,
      fetch: async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (wire && path.endsWith('/cancel')) {
          const headers = new Headers(init?.headers);
          if (wire.includes('json')) headers.set('Content-Type', 'application/json');
          if (wire.includes('beta')) headers.set('OpenAI-Beta', 'assistants=v2');
          init = { ...init, headers, ...(wire.includes('json') ? { body: '{}' } : {}) };
        }
        const response = await fetch(input, init);
        if (!response.ok && path.endsWith('/cancel')) {
          const raw = await response.clone().text();
          console.log(
            JSON.stringify({
              diagnostic: 'cancel error classification (no raw server data)',
              jsonOrBodyError: /JSON|Unexpected end|body/i.test(raw),
              betaError: /beta|assistants=v2/i.test(raw),
              routingError: /route|URL|not found/i.test(raw),
              authenticationError: /unauthorized|api.key|credential|permission/i.test(raw),
            }),
          );
        }
        if (response.ok && /\/file_batches(?:\/|$)/.test(path)) {
          const body = (await response.clone().json()) as { object?: unknown };
          harness.captureResponseShape('raw.file-batch', body);
          console.log(
            JSON.stringify({ diagnostic: 'file-batch object discriminator', object: body.object }),
          );
        }
        if (
          response.ok &&
          init?.method === 'POST' &&
          ['/v1/files', '/v1/vector_stores'].includes(path)
        ) {
          // Register cleanup before response validation; the parent owns all file-batch children.
          const body = (await response.clone().json()) as { id?: unknown };
          assert.equal(typeof body.id, 'string');
          const id = body.id as string;
          const kind = path.endsWith('/files') ? 'files' : 'vector_stores';
          harness.own(`gateway.runtime.${kind}`, id, tag);
          harness.defer(`${kind}.retired`, () =>
            kind === 'files'
              ? inference.deleteFile(id, options)
              : inference.deleteVectorStore(id, options),
          );
        }
        return response;
      },
    });
    const completedFile = await harness.check('file-batch.file.complete.create', () =>
      inference.createFile(
        {
          file: new File(['Synthetic SDK batch indexing check. READY.\n'], `${tag}-complete.txt`, {
            type: 'text/plain',
          }),
          purpose: 'assistants',
        },
        options,
      ),
    );
    const cancelledFile = await harness.check('file-batch.file.cancel.create', () =>
      inference.createFile(
        {
          file: new File(
            ['Synthetic SDK cancellation fixture. No customer data.\n'.repeat(200)],
            `${tag}-cancel.txt`,
            { type: 'text/plain' },
          ),
          purpose: 'assistants',
        },
        options,
      ),
    );
    const store = await harness.check('file-batch.store.create', () =>
      inference.createVectorStore(
        {
          name: tag,
          expires_after: { anchor: 'last_active_at', days: 1 },
        },
        options,
      ),
    );
    if (!store || !completedFile || !cancelledFile) return;
    await harness.check('file-batch.store.visible', async () => {
      for (let i = 0; ; i++) {
        try {
          return await inference.getVectorStore(store.id, options);
        } catch (error) {
          if (i >= 9 || (error as { statusCode?: number }).statusCode !== 404) throw error;
          await delay(500);
        }
      }
    });
    async function terminal(id: string) {
      for (let i = 0; i < 60; i++) {
        const batch = await inference.getVectorStoreFileBatch(store!.id, id, options);
        if (batch.status !== 'in_progress') return batch;
        await delay(500);
      }
      throw new Error('Owned file batch did not reach terminal status within 30 seconds');
    }
    const completed = await harness.check('file-batch.create', () =>
      inference.createVectorStoreFileBatch(store.id, { file_ids: [completedFile.id] }, options),
    );
    if (completed) {
      await harness.check('file-batch.retrieve.completed', async () => {
        const batch = await terminal(completed.id);
        assert.equal(batch.status, 'completed');
        assert.equal(batch.file_counts.completed, 1);
        return batch;
      });
      await harness.check('file-batch.list-files.completed', async () => {
        const files = await inference.listFilesInVectorStoreBatch(
          store.id,
          completed.id,
          { limit: 1, filter: 'completed' },
          options,
        );
        assert.equal(files.data.length, 1);
        assert.equal(files.data[0].id, completedFile.id);
        return files;
      });
    }
    const cancelled = await harness.check('file-batch.create-for-cancel', () =>
      inference.createVectorStoreFileBatch(store.id, { file_ids: [cancelledFile.id] }, options),
    );
    if (cancelled) {
      await harness.check('file-batch.cancel', () =>
        inference.cancelVectorStoreFileBatch(store.id, cancelled.id, options),
      );
      await harness.check('file-batch.retrieve.cancelled', async () => {
        const batch = await terminal(cancelled.id);
        assert.equal(
          batch.status,
          'cancelled',
          'A completion race is not proof of successful cancellation',
        );
        return batch;
      });
      await harness.check('file-batch.list-files.cancelled', async () => {
        const files = await inference.listFilesInVectorStoreBatch(
          store.id,
          cancelled.id,
          { filter: 'cancelled' },
          options,
        );
        assert.equal(files.data.length, 1);
        assert.equal(files.data[0].id, cancelledFile.id);
        return files;
      });
    }
  },
);
