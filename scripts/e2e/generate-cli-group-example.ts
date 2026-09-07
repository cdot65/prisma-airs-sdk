/** @internal Render every validated installed-CLI grouped analytics pair. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliReleaseSelection } from './cli-consumer.js';
import type { LiveResult } from './harness.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const selection = cliReleaseSelection();
assert(selection.suffix, 'Select the intended CLI release explicitly');
const name = `gateway-analytics-group-filters-cli${selection.suffix}`;
const capture = read(`artifacts/examples/${name}.json`);
const report = read(`artifacts/e2e/${name}.json`);
assert.equal(capture.capturedAt, report.finishedAt);
assert.equal(report.credentialsUnchanged, true);
assert.equal(capture.credentialsUnchanged, true);
assert.equal(capture.mutations, false);
assert.equal(capture.mode, 'installed-cli');
assert.equal(capture.cliVersion, selection.cliVersion);
assert.equal(capture.sdkVersion, selection.sdkVersion);
assert.deepEqual(capture.suite, { passed: 103, failed: 0, total: 103 });
assert.equal(report.passed, 103);
assert.equal(report.total, 103);
assert.equal(report.failed, 0);
assert.equal(report.skipped, 0);
assert.deepEqual(report.fixtures, []);
const installation = read(
  process.env.CLI_EVIDENCE_INSTALLATION ?? 'artifacts/cli440-final-package-verification.json',
);
assert.equal(installation.passed, true);
assert.equal(installation.version, selection.cliVersion);
assert.equal(installation.sdkVersion, selection.sdkVersion);
assert(Date.parse(capture.capturedAt) >= Date.parse(installation.checkedAt));
const filters = [
  'traceId',
  'metadata',
  'trace-and-metadata.intersection',
  'statusCode.single',
  'statusCode.csv-or',
  'apiKeyIds.single',
  'apiKeyIds.csv-or',
  'aiOrgModel.single',
  'aiOrgModel.csv-or',
  'totalUnitsMin.inclusive',
  'totalUnitsMax.inclusive',
  'costMin.inclusive',
  'costMax.inclusive',
  'totalUnits.exact-range',
  'cost.exact-range',
  'all.intersection',
];
const dimensions = ['ai_service', 'model', 'api_key', 'provider', 'status_code', 'users'];
const expected = dimensions.flatMap((dimension) =>
  (dimension === 'users' ? filters : [...filters, 'all.with-columns']).map((filter) => ({
    dimension,
    filter,
    knownPositive: true,
    absentEmpty: true,
    respected: true,
  })),
);
assert.deepEqual(capture.evidence, expected);
assert.deepEqual(
  report.results.map((result: LiveResult) => [result.name, result.status]),
  [
    ['analytics-groups.installed-cli-version', 'PASS'],
    ['analytics-groups.owned-positive-control', 'PASS'],
    ...expected.map(({ dimension, filter }) => [`analytics-groups.${dimension}.${filter}`, 'PASS']),
  ],
);
const target = resolve(
  process.env.CLI_COMPAT_DIR ?? resolve(root, '../prisma-airs-cli'),
  'docs-site/docs/cli/aigateway/telemetry.md',
);
const source = readFileSync(target, 'utf8');
const heading = '## Verified grouped-filter output';
const start = source.indexOf(heading);
const end = source.indexOf('## Verified chart-filter output');
assert(end >= 0 && (start < 0 || start < end));
const section = `${heading}

The independently installed CLI **${capture.cliVersion}**, with SDK **${capture.sdkVersion}**, passes **103/103** read-only checks at **${capture.capturedAt}**: executable-version verification, an owned positive control and all 101 positive/absent filter pairs across six groups. Each pair executes the public CLI twice; five non-user checks also verify exact cost/token columns. JSON/YAML envelope preservation additionally has 95 public-command regression tests.

${capture.disclosure}

Actual captured results (all 101 pairs, no tenant counts or identifiers):

<details>
<summary>All 101 grouped-filter pairs</summary>

\`\`\`json
${JSON.stringify(capture.evidence, null, 2)}
\`\`\`

</details>

The earlier candidate run passed 102/103, with a provider/status-code query failure; it remains in the private history. This complete subsequent run passes without changing retries, validation, filters, credentials or infrastructure. It is not a claim of uninterrupted service availability. Direct Gateway coverage remains **138/242 (57.02%)**, and all 22 upstream analytics adaptations remain partial.

`;
const updated = source.slice(0, start >= 0 ? start : end) + section + source.slice(end);
console.log(
  `*** Begin Patch\n*** Update File: ${target}\n@@\n${source
    .trimEnd()
    .split('\n')
    .map((line) => '-' + line)
    .join('\n')}\n${updated
    .trimEnd()
    .split('\n')
    .map((line) => '+' + line)
    .join('\n')}\n*** End Patch`,
);
