/** @internal Refresh the telemetry release section only from verified installed-release captures. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emitPatch } from '../openapi/emit-patch.js';
import type { LiveResult } from './harness.js';

const root = new URL('../../', import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
function report(name: string, count?: number) {
  const value = read(`artifacts/e2e/${name}.json`) as {
    credentialsUnchanged: boolean;
    passed: number;
    failed: number;
    total: number;
    skipped: number;
    finishedAt: string;
    results: LiveResult[];
  };
  assert.equal(value.credentialsUnchanged, true);
  assert.equal(value.total, value.results.length);
  assert.equal(value.failed, 0);
  assert.equal(value.skipped, 0);
  assert(value.results.every((result) => result.status === 'PASS'));
  assert.equal(value.passed, value.total);
  if (count !== undefined) assert.equal(value.total, count);
  return value;
}
const sdk = report('release-sdk-inference-024', 10);
const charts = report('gateway-analytics-query-contracts-sdk', 53);
const cliCharts = report('gateway-analytics-query-contracts-cli', 54);
const cli = report('cli-inference', 8);
const empty = report('cli-analytics', 3);
const core = report('cli', 12);
const audit = report('release-key-audit');
assert(
  Date.parse(audit.finishedAt) >= Math.max(Date.parse(sdk.finishedAt), Date.parse(cli.finishedAt)),
  'Retirement audit must follow both release-inference runs',
);
const chartCapture = read('artifacts/examples/gateway-analytics-query-contracts-sdk.json');
assert.equal(chartCapture.mode, 'installed-sdk');
assert.equal(chartCapture.sdkVersion, '0.24.0');
assert.equal(chartCapture.capturedAt, charts.finishedAt);
const emptyCapture = read('artifacts/examples/cli-analytics.json');
assert.equal(emptyCapture.capturedAt, empty.finishedAt);
assert.equal(emptyCapture.mutations, false);
assert.equal(emptyCapture.output.version, '4.3.0');
assert.equal(emptyCapture.output.sdkVersion, '0.24.0');
const cliChartCapture = read('artifacts/examples/gateway-analytics-query-contracts-cli.json');
assert.equal(cliChartCapture.capturedAt, cliCharts.finishedAt);
assert.equal(cliChartCapture.mode, 'installed-cli');
assert.equal(cliChartCapture.cliVersion, '4.3.0');
assert.equal(cliChartCapture.sdkVersion, '0.24.0');
assert.equal(cliChartCapture.mutations, false);
assert.equal(cliChartCapture.evidence.length, 52);
assert(cliChartCapture.evidence.every((row: { respected: boolean }) => row.respected === true));
const chat = read('artifacts/examples/cli-inference.json');
assert.equal(chat.capturedAt, cli.finishedAt);
for (const [path, version] of [
  ['artifacts/package/verification.json', '0.24.0'],
  ['artifacts/cli-430-registry-verification.json', '4.3.0'],
  ['artifacts/cli-430-installed-verification.json', '4.3.0'],
]) {
  const verification = read(path);
  assert.equal(verification.passed, true);
  assert.equal(verification.version, version);
}
function fenced(value: unknown) {
  const json = JSON.stringify(value, null, 2);
  const fence = '`'.repeat(
    Math.max(2, ...Array.from(json.matchAll(/`+/g), (match) => match[0].length)) + 1,
  );
  return `${fence}json\n${json}\n${fence}`;
}
const target = 'docs-site/docs/guides/release-verification.md';
const source = readFileSync(new URL(target, root), 'utf8');
const start = source.indexOf('## SDK 0.24.0 and CLI 4.3.0 registry verification');
const previous = source.indexOf('## SDK 0.23.0 and CLI 4.2.2 registry verification');
assert(previous >= 0);
const section = `## SDK 0.24.0 and CLI 4.3.0 registry verification

Both releases are published, installed independently from npm and payload-verified. CLI 4.3.0 pins SDK 0.24.0 exactly. The local user-prefix CLI is upgraded and independently checked. SDK publication preceded the CLI dependency update; existing runtime settings and the read-only credential configuration are unchanged.

- Registry SDK inference: **10/10**, **${sdk.finishedAt}**.
- Installed registry SDK query contracts: **53/53**, **${charts.finishedAt}**.
- Installed registry CLI query contracts: **54/54**, **${cliCharts.finishedAt}**.
- Registry CLI inference: **8/8**, **${cli.finishedAt}**.
- Registry CLI empty-window JSON/YAML: **3/3**, **${empty.finishedAt}**.
- Installed user CLI cross-service reads and benign scan: **12/12**, **${core.finishedAt}**.
- Independent all-history release-key retirement audit: **${audit.passed}/${audit.total}**, **${audit.finishedAt}**.

The SDK and CLI add verified query filters to four SCM chart adapters, sharing the SDK schema for validation before workspace resolution. Inclusive bounds, zero, fractional cents, CSV-OR lists and combined filters are verified against positive and empty cohorts. Empty latency aggregates remain null. Offline checks pass 10,931 SDK tests on Node 18/20/22/24 and 1,127 CLI tests, including 92 new flag/parser/public-command regressions against the actual dependency. Packed ESM/CommonJS, strict consumer types, source maps, OAuth deadlines and native WebSocket checks pass. Direct gateway coverage is unchanged at **138/242 (57.02%)**, with **22 partial analytics operations**. All original provider/service failures remain disclosed; full-scope assessment remains **5/10**.

Actual CLI 4.3.0 registry-run chat output (response identifiers redacted):

${fenced(chat.chat)}

Actual empty-window CLI output, projected as disclosed by its capture:

${emptyCapture.disclosure}

${fenced(emptyCapture.output)}

The analytics checks use existing owned traffic; they create no key, log or inference request. The separate release-inference checks use and retire short-lived dev keys with the prescribed models. TLS verification and the process-only LAN DNS accommodation are unchanged; WAN/container runtime readiness is not certified. Cost retains its rolling-day window and explicit cents/USD output; the other three charts support explicit timestamps. No realtime CLI command is added. See the [complete SDK query capture](./examples.mdx#verified-chart-query-contracts) and [complete CLI capture](https://cdot65.github.io/prisma-airs-cli/cli/aigateway/telemetry/#verified-chart-filter-output).

Three subsequent harness-preflight regressions bring the verification checkout to 10,934 tests in 137 files. A missing local executable now fails before temporary-key creation. The npm metadata-lag attempt remains in private history; only the independently installed passing captures above are published as verified.

The SDK's production dependency audit is clean. The CLI's production lockfile still has five high and one moderate advisory across YAML, ID generation and optional image dependencies; fresh npm resolution leaves the optional sharp advisory and its package-level propagation. Those require a focused security follow-up and are not reclassified by functional E2E success.

The earlier release checkpoints below retain their original output and timestamps.

`;
emitPatch(
  target,
  source.slice(0, start >= 0 ? start : previous) + section + source.slice(previous),
);
