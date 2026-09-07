/** @internal Render only a fully validated installed-CLI query-contract capture. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LiveResult } from './harness.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const name = 'gateway-analytics-query-contracts-cli';
const capture = read(`artifacts/examples/${name}.json`);
const report = read(`artifacts/e2e/${name}.json`);
assert.equal(capture.capturedAt, report.finishedAt);
assert.equal(report.credentialsUnchanged, true);
assert.equal(capture.credentialsUnchanged, true);
assert.equal(capture.mutations, false);
assert.equal(capture.mode, 'installed-cli');
assert.equal(capture.cliVersion, '4.3.1');
assert.equal(capture.sdkVersion, '0.24.0');
const installation = read('artifacts/cli-431-registry-verification.json');
assert.equal(installation.passed, true);
assert.equal(installation.version, capture.cliVersion);
assert(Date.parse(capture.capturedAt) >= Date.parse(installation.checkedAt));
assert.deepEqual(capture.suite, { passed: 54, failed: 0, total: 54 });
assert.equal(report.passed, 54);
assert.equal(report.total, 54);
assert.equal(report.failed, 0);
assert.equal(report.skipped, 0);
assert.deepEqual(report.fixtures, []);
const filters = [
  'statusCodes.single',
  'statusCodes.csv-or',
  'apiKeyIds.single',
  'apiKeyIds.csv-or',
  'aiOrgModels.single',
  'aiOrgModels.csv-or',
  'totalUnitsMin.inclusive',
  'totalUnitsMax.inclusive',
  'costMin.inclusive',
  'costMax.inclusive',
  'totalUnits.exact-range',
  'cost.exact-range',
  'all.intersection',
];
const metrics = ['requests', 'cost', 'tokens', 'latency'];
assert.deepEqual(
  report.results.map((r: LiveResult) => [r.name, r.status]),
  [
    ['analytics-query.installed-cli-version', 'PASS'],
    ['analytics-query.owned-positive-control', 'PASS'],
    ...metrics.flatMap((metric) =>
      filters.map((filter) => [`analytics-query.${metric}.${filter}`, 'PASS']),
    ),
  ],
);
assert.deepEqual(
  capture.evidence,
  metrics.flatMap((metric) =>
    filters.map((filter) => ({
      metric,
      filter,
      knownPositive: true,
      absentEmpty: true,
      absentAggregate: metric === 'latency' ? null : 0,
      respected: true,
    })),
  ),
);
const target = resolve(
  process.env.CLI_COMPAT_DIR ?? resolve(root, '../prisma-airs-cli'),
  'docs-site/docs/cli/aigateway/telemetry.md',
);
const source = readFileSync(target, 'utf8');
const heading = '## Verified chart-filter output';
const start = source.indexOf(heading);
const end = source.indexOf('## Verified empty-window output');
assert(end >= 0 && (start < 0 || start < end));
const section = `${heading}\n\nThe independently installed CLI **${capture.cliVersion}**, with SDK **${capture.sdkVersion}**, passed **54/54** read-only checks at **${capture.capturedAt}**: installed-version verification, an owned positive control and 13 positive/empty-cohort pairs for each of four charts. Every pair runs the public CLI executable.\n\n${capture.disclosure}\n\nCost uses its existing seven-day window and verifies explicit cents/USD conversion fields; requests, tokens and latency use the original fixture's exact window. Trace and metadata isolation select the same owned historical request. No inference, key or workspace is created by this suite.\n\nActual captured query-contract output (booleans and empty aggregates only):\n\n<details>\n<summary>All 52 positive/empty-cohort pairs</summary>\n\n\`\`\`json\n${JSON.stringify(capture.evidence, null, 2)}\n\`\`\`\n\n</details>\n\nThis certifies the listed filters on these four Prisma SCM chart adapters, not every upstream analytics option or public WAN access.\n\n`;
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
