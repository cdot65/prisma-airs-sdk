/** @internal Render separately timestamped, source-bound dashboard example executions. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { dashboardExampleNames, parseDashboardExampleOutput } from './dashboard-example-output.js';

const root = new URL('../../', import.meta.url);
export function dashboardExampleEvidence(base = root) {
  const capture = JSON.parse(
    readFileSync(new URL('artifacts/examples/dashboard-examples.json', base), 'utf8'),
  );
  const suite = JSON.parse(
    readFileSync(new URL('artifacts/e2e/dashboard-examples.json', base), 'utf8'),
  );
  assert.equal(capture.credentialsUnchanged, true);
  assert.equal(suite.credentialsUnchanged, true);
  assert.equal(capture.contentRequested, false);
  assert.equal(capture.mutations, false);
  assert.equal(capture.startedAt, suite.startedAt);
  assert(Date.parse(suite.finishedAt) >= Date.parse(suite.startedAt));
  assert(Date.parse(capture.finishedAt) >= Date.parse(suite.finishedAt));
  assert.equal(suite.total, dashboardExampleNames.length);
  assert.equal(suite.skipped, 0);
  assert.deepEqual(suite.fixtures, []);
  assert.deepEqual(
    capture.output.map((row: { script: string }) => row.script),
    [...dashboardExampleNames],
  );
  assert.deepEqual(
    suite.results.map((row: { name: string }) => row.name),
    dashboardExampleNames.map((name) => `example.${name}`),
  );
  for (const [index, name] of dashboardExampleNames.entries()) {
    const row = capture.output[index];
    assert([0, 1].includes(row.exitCode));
    assert.equal(suite.results[index].status, row.exitCode === 0 ? 'PASS' : 'FAIL');
    const source = readFileSync(new URL(`docs-site/examples/${name}.ts`, base));
    assert.equal(
      row.sourceSha256,
      createHash('sha256').update(source).digest('hex'),
      `Stale example capture: ${name}`,
    );
    if (row.exitCode === 0) {
      assert(Array.isArray(row.values));
      parseDashboardExampleOutput(
        name,
        row.values.map((value: unknown) => JSON.stringify(value)).join('\n'),
      );
    } else assert.equal(row.values, undefined, 'Failed examples cannot publish success values');
  }
  assert.equal(
    suite.passed,
    capture.output.filter((row: { exitCode: number }) => row.exitCode === 0).length,
  );
  assert.equal(suite.failed, suite.total - suite.passed);
  return { capture, suite };
}

export function dashboardExamplesSection(): string {
  const { capture, suite } = dashboardExampleEvidence();
  return `## SCM dashboard executable examples

The two new dashboard scripts were executed separately from the historical primary batch,
against this source checkout: **${suite.passed}/${suite.total} passed** at **${suite.finishedAt}**.
Each capture is bound to the exact example's SHA-256. OAuth credentials were loaded from the
read-only CLI config; no browser bearer token, system DNS change, mutation or scan-content read
was used. This is first-page discovery and one transaction drill-down, not an exhaustive inventory.
The independently installed CLI's complete pagination/report evidence is linked in the
[dashboard guide](./scm-dashboard.mdx).

Actual JSON-line output from the runnable scripts (separate requests need not share a snapshot):

${capture.output
  .map(
    (row: { script: string; exitCode: number; values?: unknown[] }) => `### ${row.script}.ts

${row.exitCode === 0 ? '```json\n' + row.values!.map((value) => JSON.stringify(value)).join('\n') + '\n```' : 'This execution failed. Raw child output is omitted; no successful transcript is substituted.'}
`,
  )
  .join('\n')}

Reproduce from the SDK checkout with \`node --import tsx scripts/e2e-dashboard-examples.ts\`.
The runner bounds each process to 90 seconds, validates an explicit non-sensitive output shape,
and preserves failed runs. Stored content requires a separate explicit opt-in and is not fetched here.

`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = new URL('docs-site/docs/guides/examples.mdx', root);
  const original = readFileSync(destination, 'utf8');
  const start = original.indexOf('## SCM dashboard executable examples');
  const anchor = '## Administration route availability';
  const end = original.indexOf(anchor);
  assert(end >= 0 && (start < 0 || start < end));
  const previous = original.slice(start >= 0 ? start : end, end) + anchor;
  const next = dashboardExamplesSection() + anchor;
  console.log(
    `*** Begin Patch\n*** Update File: ${fileURLToPath(destination)}\n@@\n${previous
      .split('\n')
      .map((line) => '-' + line)
      .join('\n')}\n${next
      .split('\n')
      .map((line) => '+' + line)
      .join('\n')}\n*** End Patch`,
  );
}
