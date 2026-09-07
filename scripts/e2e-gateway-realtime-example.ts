/** @internal Execute the actual documentation script against the source checkout; no generation. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { writePrivateReport } from './e2e/harness.js';

const suite = 'gateway-realtime-example';
const output: Record<string, unknown> = {
  script: 'gateway-realtime.ts',
  model: '@openai/gpt-5.6-terra',
  clientEventsSent: 0,
};
await runtimeSuite(suite, async ({ harness, endpoint, apiKey }) => {
  assert.equal(endpoint, 'https://airs.cdot.io/v1');
  await harness.check('realtime-example.provider-session', async () => {
    let exitCode = 0;
    let stdout = '';
    let stderr = '';
    try {
      const result = await promisify(execFile)(
        process.execPath,
        [
          '--import',
          'tsx',
          '--import',
          fileURLToPath(new URL('./e2e/gateway-child-bootstrap.mjs', import.meta.url)),
          'docs-site/examples/gateway-realtime.ts',
        ],
        {
          env: {
            ...process.env,
            PANW_AI_GW_INFERENCE_ENDPOINT: endpoint,
            PANW_AI_GW_INFERENCE_API_KEY: apiKey,
          },
          timeout: 25_000,
          maxBuffer: 8192,
        },
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      const failure = error as { code?: number; stdout?: string; stderr?: string };
      exitCode = typeof failure.code === 'number' ? failure.code : 1;
      stdout = failure.stdout ?? '';
      stderr = failure.stderr ?? '';
    }
    output.exitCode = exitCode;
    // Retain only these exact reviewed program outputs; never publish arbitrary child output.
    if (stderr.trim() === 'Example failed: Error') output.stderr = stderr.trim();
    if (exitCode === 0) {
      const parsed = JSON.parse(stdout) as unknown;
      assert.deepEqual(parsed, { upgraded: true, sessionCreated: true, clientEventsSent: 0 });
      output.result = parsed;
    }
    assert.equal(
      exitCode,
      0,
      'The executable realtime example did not establish a provider session',
    );
    return { sessionCreated: true, clientEventsSent: 0 };
  });
});
const report = JSON.parse(readFileSync(`artifacts/e2e/${suite}.json`, 'utf8')) as {
  startedAt: string;
  finishedAt: string;
  credentialsUnchanged: boolean;
};
assert(report.credentialsUnchanged);
const capture = { ...output, finishedAt: report.finishedAt };
writePrivateReport(`artifacts/examples/gateway-realtime.json`, capture);
writePrivateReport(
  `artifacts/e2e/history/${suite}-output-${report.startedAt.replaceAll(':', '-')}.json`,
  capture,
);
