/** @internal One-request owned batch; bounded execution and cancellation, no customer data. */
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { AIGatewayInferenceClient } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

const cancel = process.argv.includes('--cancel');
let capturedOutput: unknown;
await runtimeSuite(
  `gateway-batches${cancel ? '-cancel' : ''}`,
  async ({ harness, endpoint, apiKey, tag }) => {
    const options = { headers: { 'x-portkey-provider': '@openai' } };
    const terminal = new Set(['completed', 'failed', 'expired', 'cancelled']);
    const jobs = new Map<string, string>();
    const files = new Set<string>();
    let lastDiagnostic = '';
    function registerFile(id: string) {
      if (files.has(id)) return;
      files.add(id);
      harness.own('gateway.runtime.files', id, tag);
    }
    function observeJob(body: Record<string, unknown>) {
      assert.equal(typeof body.id, 'string');
      assert.equal(typeof body.status, 'string');
      const id = body.id as string;
      if (!jobs.has(id)) harness.own('gateway.runtime.batch-audit-record', id, tag);
      jobs.set(id, body.status as string);
      for (const field of ['output_file_id', 'error_file_id'])
        if (typeof body[field] === 'string' && body[field]) registerFile(body[field]);
      harness.captureResponseShape('raw.batch', body);
      // Values other than status are intentionally omitted from diagnostics.
      const diagnostic = JSON.stringify({
        diagnostic: 'batch wire shape',
        status: body.status,
        nullFields: Object.keys(body).filter((key) => body[key] === null),
      });
      if (diagnostic !== lastDiagnostic) console.log(diagnostic);
      lastDiagnostic = diagnostic;
    }
    const client = new AIGatewayInferenceClient({
      endpoint,
      apiKey,
      numRetries: 0,
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        const path = new URL(String(input)).pathname;
        if (response.ok && path === '/v1/files' && init?.method === 'POST') {
          const body = (await response.clone().json()) as { id: string };
          assert.equal(typeof body.id, 'string');
          registerFile(body.id);
        }
        if (
          response.ok &&
          /^\/v1\/batches(?:\/[^/]+(?:\/cancel)?)?$/.test(path) &&
          !(path === '/v1/batches' && init?.method === 'GET')
        ) {
          const body = (await response.clone().json()) as Record<string, unknown>;
          if (path !== '/v1/batches') assert.equal(body.id, decodeURIComponent(path.split('/')[3]));
          observeJob(body);
        }
        return response;
      },
    });
    // Cleanup can still stop an owned job if SDK response validation rejects a live shape.
    // This raw fallback is cleanup evidence only, never a passing SDK operation test.
    async function rawJob(id: string, method: 'GET' | 'POST' = 'GET') {
      assert(jobs.has(id), 'Cleanup may only access a job journaled by this run');
      const response = await fetch(
        `${endpoint}/batches/${encodeURIComponent(id)}${method === 'POST' ? '/cancel' : ''}`,
        {
          method,
          headers: { ...options.headers, 'x-portkey-api-key': apiKey },
          signal: AbortSignal.timeout(30_000),
        },
      );
      assert(response.ok, `Owned batch cleanup HTTP ${response.status}`);
      const body = (await response.json()) as Record<string, unknown>;
      assert.equal(body.id, id);
      observeJob(body);
      return body;
    }
    harness.defer('batch-resources.retired', async () => {
      for (const id of jobs.keys()) {
        let job = await rawJob(id);
        if (!terminal.has(String(job.status))) {
          if (job.status !== 'cancelling') job = await rawJob(id, 'POST');
          const deadline = Date.now() + 11 * 60_000;
          while (!terminal.has(String(job.status)) && Date.now() < deadline) {
            await delay(10000);
            job = await rawJob(id);
          }
        }
        assert(
          terminal.has(String(job.status)),
          'Owned batch remains active; input file preserved for recovery',
        );
      }
      for (const id of files) await client.deleteFile(id, options);
      return { terminalJobs: jobs.size, deletedFiles: files.size, jobRecordsRetained: true };
    });
    const auth = await harness.check('batch.auth-control', () =>
      client.retrieveModel('gpt-5.6-terra', options),
    );
    if (!auth) return;
    const request = {
      custom_id: `${tag}-1`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-5.6-terra',
        messages: [{ role: 'user', content: 'Reply with exactly READY.' }],
        reasoning_effort: 'none',
        max_completion_tokens: 128,
      },
    };
    const file = await harness.check('batch.file.create', () =>
      client.createFile(
        {
          file: new File([JSON.stringify(request) + '\n'], `${tag}.jsonl`, {
            type: 'application/jsonl',
          }),
          purpose: 'batch',
        },
        options,
      ),
    );
    if (!file) return;
    const batch = await harness.check('batch.create', () =>
      client.createBatch(
        {
          input_file_id: file.id,
          completion_window: '24h',
          endpoint: '/v1/chat/completions',
          metadata: { sdk_e2e: tag },
        },
        options,
      ),
    );
    if (!batch) return;
    await harness.check('batch.retrieve', async () => {
      const result = await client.retrieveBatch(batch.id, options);
      assert.equal(result.id, batch.id);
      assert.equal(result.input_file_id, file.id);
      return result;
    });
    if (cancel) await harness.check('batch.cancel', () => client.cancelBatch(batch.id, options));
    const result = await harness.check(
      cancel ? 'batch.terminal.cancelled' : 'batch.terminal.completed',
      async () => {
        // Native completion has a 24h SLA. This smoke test waits at most 30 minutes,
        // then reports its local deadline and cancels; it does not claim an SLA failure.
        const deadline = Date.now() + (cancel ? 11 : 30) * 60_000;
        let current = await client.retrieveBatch(batch.id, options);
        while (!terminal.has(current.status) && Date.now() < deadline) {
          await delay(10000);
          current = await client.retrieveBatch(batch.id, options);
        }
        assert.equal(
          current.status,
          cancel ? 'cancelled' : 'completed',
          'No terminal success within the bounded test window',
        );
        if (!cancel) {
          assert.equal(current.request_counts?.total, 1);
          assert.equal(current.request_counts?.completed, 1);
          assert.equal(current.request_counts?.failed, 0);
        }
        return current;
      },
    );
    if (result && !cancel) {
      await harness.check('batch.output.gateway', async () => {
        const bytes = await client.getBatchOutput(batch.id, options);
        const rows = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim().split('\n');
        assert.equal(rows.length, 1);
        const row = JSON.parse(rows[0]) as {
          custom_id: string;
          response: { status_code: number; body: { choices: { message: { content: string } }[] } };
          error: unknown;
        };
        assert.equal(row.custom_id, request.custom_id);
        assert.equal(row.response.status_code, 200);
        assert.equal(row.error, null);
        assert.equal(row.response.body.choices[0].message.content.trim(), 'READY');
        assert(!JSON.stringify(row).includes(apiKey), 'Do not retain a runtime credential');
        capturedOutput = JSON.parse(
          JSON.stringify(row, (key, value) => (/(?:^|_)id$/.test(key) ? '<redacted-id>' : value)),
        );
        return { rows: rows.length, marker: 'READY' };
      });
      if (result.output_file_id)
        await harness.check('batch.output.file', async () => {
          const bytes = await client.downloadFile(result.output_file_id!, options);
          assert(bytes.byteLength > 0);
          return { bytes: bytes.byteLength };
        });
    }
  },
);

if (!cancel) {
  const report = JSON.parse(readFileSync('artifacts/e2e/gateway-batches.json', 'utf8')) as {
    finishedAt: string;
    total: number;
    passed: number;
    failed: number;
    credentialsUnchanged: boolean;
  };
  assert(
    capturedOutput && report.total === 9 && report.passed === 9 && report.credentialsUnchanged,
    'Do not publish an incomplete batch workflow as verified output',
  );
  mkdirSync('artifacts/examples', { recursive: true, mode: 0o700 });
  writeFileSync(
    'artifacts/examples/gateway-batch.json',
    JSON.stringify(
      {
        capturedAt: report.finishedAt,
        disclosure:
          'Actual output from one synthetic gpt-5.6-terra batch request through the dev gateway. Resource and request IDs are redacted. Input/output files and the temporary key were deleted; the terminal batch audit record has no deletion API.',
        suite: { passed: report.passed, total: report.total },
        output: capturedOutput,
      },
      null,
      2,
    ) + '\n',
    { mode: 0o600 },
  );
}
