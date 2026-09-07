/** @internal Read-only installed CLI regression for a valid empty latency window. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { promisify } from 'node:util';
import { parse } from 'yaml';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';
import { cliReleaseSelection, verifyCliConsumer } from './e2e/cli-consumer.js';

const selection = cliReleaseSelection();
const suiteName = `cli-analytics${selection.suffix}`;
const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const run = promisify(execFile);
const output: Record<string, unknown> = {};
try {
  const entry = process.env.E2E_CLI_ENTRY;
  assert(entry && isAbsolute(entry), 'Pass the absolute installed CLI entry');
  verifyCliConsumer(entry, selection);
  async function cli(args: string[]): Promise<string> {
    try {
      const result = await run(process.execPath, [entry!, ...args], {
        env: {
          ...process.env,
          NO_COLOR: '1',
          PANW_AI_SEC_NUM_RETRIES: '0',
          PANW_AI_SEC_TIMEOUT_MS: '20000',
        },
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
      });
      assert(result.stdout.trim().length > 0);
      return result.stdout;
    } catch (error) {
      // Child errors contain captured output; never propagate their raw message.
      const code = (error as { code?: unknown }).code;
      throw new Error(
        `CLI analytics failed; exit code ${typeof code === 'number' ? code : 'unknown'}`,
      );
    }
  }
  await harness.check('cli-analytics.installed-version', async () => {
    assert.equal((await cli(['--version'])).trim(), selection.cliVersion);
    output.version = selection.cliVersion;
    output.sdkVersion = selection.sdkVersion;
  });
  for (const format of ['json', 'yaml']) {
    await harness.check(`cli-analytics.empty-latency.${format}`, async () => {
      const raw = await cli([
        'aigateway',
        'telemetry',
        'latency',
        '--workspace',
        'ws-develo-71f8d8',
        '--start',
        '2020-01-01T00:00:00Z',
        '--end',
        '2020-01-01T00:00:01Z',
        '--output',
        format,
      ]);
      const parsed = (format === 'json' ? JSON.parse(raw) : parse(raw)) as {
        success: boolean;
        data: {
          total: number | null;
          p50: number | null;
          p90: number | null;
          p99: number | null;
          records: { y: number; p50: number; p90: number; p99: number }[];
        };
      };
      assert.equal(parsed.success, true);
      const { total, p50, p90, p99, records } = parsed.data;
      assert.deepEqual({ total, p50, p90, p99 }, { total: null, p50: null, p90: null, p99: null });
      assert(
        records.every((record) =>
          [record.y, record.p50, record.p90, record.p99].every((value) => value === 0),
        ),
      );
      output[format] = { exitCode: 0, total, p50, p90, p99, zeroValuedBuckets: true };
    });
  }
} catch (error) {
  await harness.check('cli-analytics.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish(suiteName, true);
  const report = JSON.parse(readFileSync(`artifacts/e2e/${suiteName}.json`, 'utf8')) as {
    finishedAt: string;
    passed: number;
    failed: number;
    total: number;
  };
  writePrivateReport(`artifacts/examples/${suiteName}.json`, {
    capturedAt: report.finishedAt,
    credentialsUnchanged: true,
    mutations: false,
    suite: { passed: report.passed, failed: report.failed, total: report.total },
    output,
    disclosure:
      'Actual installed CLI JSON/YAML output projected to exit status, period aggregate values and a zero-bucket check. No tenant identifiers, count aggregates or credentials are published. This historical empty-window check does not test new CLI filter flags.',
  });
}
