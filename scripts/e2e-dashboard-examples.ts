/** @internal Execute the actual read-only examples; retain reviewed counters, never content. */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';
import {
  dashboardExampleNames,
  parseDashboardExampleOutput,
} from './e2e/dashboard-example-output.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const output: { script: string; sourceSha256: string; exitCode: number; values?: unknown }[] = [];
try {
  for (const script of dashboardExampleNames) {
    const path = `docs-site/examples/${script}.ts`;
    const row: (typeof output)[number] = {
      script,
      sourceSha256: createHash('sha256')
        .update(readFileSync(new URL(`../${path}`, import.meta.url)))
        .digest('hex'),
      exitCode: 1,
    };
    output.push(row);
    await harness.check(`example.${script}`, async () => {
      // --include-content and --writes are deliberately absent. A hard child deadline also
      // bounds an uncooperative transport; raw child failures never reach report output.
      const result = await promisify(execFile)(process.execPath, ['--import', 'tsx', path], {
        cwd: root,
        env: { ...process.env, NO_COLOR: '1' },
        timeout: 90_000,
        killSignal: 'SIGKILL',
        maxBuffer: 16_384,
      }).catch(() => {
        throw new Error('Dashboard example process failed; raw output omitted');
      });
      if (result.stderr) throw new Error('Unexpected example diagnostics; output omitted');
      try {
        row.values = parseDashboardExampleOutput(script, result.stdout);
      } catch {
        // Even opt-in harness diagnostics must not reveal rejected payload values.
        throw new Error('Dashboard example output failed review; raw output omitted');
      }
      row.exitCode = 0;
      return { outputValidated: true };
    });
  }
} finally {
  credentials.verifyUnchanged();
  harness.finish('dashboard-examples', true);
  const capture = {
    startedAt: harness.startedAt,
    finishedAt: new Date().toISOString(),
    credentialsUnchanged: true,
    contentRequested: false,
    mutations: false,
    output,
  };
  writePrivateReport(`${root}/artifacts/examples/dashboard-examples.json`, capture);
  writePrivateReport(
    `${root}/artifacts/e2e/history/dashboard-examples-output-${harness.startedAt.replaceAll(':', '-')}.json`,
    capture,
  );
}
