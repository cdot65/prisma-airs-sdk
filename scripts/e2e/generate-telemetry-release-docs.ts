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
assert.equal(emptyCapture.output.version, '4.3.1');
assert.equal(emptyCapture.output.sdkVersion, '0.24.0');
const cliChartCapture = read('artifacts/examples/gateway-analytics-query-contracts-cli.json');
assert.equal(cliChartCapture.capturedAt, cliCharts.finishedAt);
assert.equal(cliChartCapture.mode, 'installed-cli');
assert.equal(cliChartCapture.cliVersion, '4.3.1');
assert.equal(cliChartCapture.sdkVersion, '0.24.0');
assert.equal(cliChartCapture.mutations, false);
assert.equal(cliChartCapture.evidence.length, 52);
assert(cliChartCapture.evidence.every((row: { respected: boolean }) => row.respected === true));
const chat = read('artifacts/examples/cli-inference.json');
assert.equal(chat.capturedAt, cli.finishedAt);
for (const [path, version] of [
  ['artifacts/package/verification-registry-0.24.0.log', '0.24.0'],
  ['artifacts/cli-431-registry-verification.json', '4.3.1'],
  ['artifacts/cli-431-installed-verification.json', '4.3.1'],
]) {
  const verification = read(path);
  assert.equal(verification.passed, true);
  assert.equal(verification.version, version);
}
const native = read('artifacts/cli431-dlp-registry.json');
assert.equal(native.passed, true);
assert.equal(native.cliVersion, '4.3.1');
assert.equal(native.cases.length, 11);
assert(native.cases.every((result: { passed: boolean }) => result.passed));
assert.equal(native.fixtureCleanup, 'complete');
const frozenAudit = read('artifacts/security/cli431-production-audit.json');
const registryAudit = read('artifacts/security/cli431-registry-production-audit.json');
assert(Object.values(frozenAudit.metadata.vulnerabilities).every((count) => count === 0));
assert(Object.values(registryAudit.metadata.vulnerabilities).every((count) => count === 0));
const container = read('artifacts/cli431-container-verification.json');
assert.equal(container.passed, true);
assert.deepEqual(Object.keys(container.platforms).sort(), ['linux/amd64', 'linux/arm64']);
assert(Object.values(container.platforms).every((value) => (value as { passed: boolean }).passed));
function fenced(value: unknown) {
  const json = JSON.stringify(value, null, 2);
  const fence = '`'.repeat(
    Math.max(2, ...Array.from(json.matchAll(/`+/g), (match) => match[0].length)) + 1,
  );
  return `${fence}json\n${json}\n${fence}`;
}
const target = 'docs-site/docs/guides/release-verification.md';
const source = readFileSync(new URL(target, root), 'utf8');
const start = source.indexOf('## SDK 0.24.0 and CLI 4.3.1 registry verification');
const previous = source.indexOf('## SDK 0.24.0 and CLI 4.3.0 registry verification');
assert(previous >= 0);
const section = `## SDK 0.24.0 and CLI 4.3.1 registry verification

Both releases are published, installed independently from npm and payload-verified. CLI 4.3.1 pins SDK 0.24.0 exactly. The local user-prefix CLI is upgraded and independently checked. SDK publication preceded the CLI dependency update; existing runtime settings and the read-only credential configuration are unchanged.

- Registry SDK inference: **10/10**, **${sdk.finishedAt}**.
- Installed registry SDK query contracts: **53/53**, **${charts.finishedAt}**.
- Installed registry CLI query contracts: **54/54**, **${cliCharts.finishedAt}**.
- Registry CLI inference: **8/8**, **${cli.finishedAt}**.
- Registry CLI empty-window JSON/YAML: **3/3**, **${empty.finishedAt}**.
- Installed user CLI cross-service reads and benign scan: **12/12**, **${core.finishedAt}**.
- Independent all-history release-key retirement audit: **${audit.passed}/${audit.total}**, **${audit.finishedAt}**.

The SDK and CLI add verified query filters to four SCM chart adapters, sharing the SDK schema for validation before workspace resolution. Inclusive bounds, zero, fractional cents, CSV-OR lists and combined filters are verified against positive and empty cohorts. Empty latency aggregates remain null. Offline checks retain the 10,931-test SDK release matrix on Node 18/20/22/24; its verification checkout has 10,934 tests. CLI checks pass 1,173 tests plus 14 release-policy/diagnostic checks, including 46 new output and runtime-version regressions in this patch. Packed ESM/CommonJS, strict consumer types, source maps, OAuth deadlines and native WebSocket checks pass. Direct gateway coverage is unchanged at **138/242 (57.02%)**, with **22 partial analytics operations**. All original provider/service failures remain disclosed; full-scope assessment remains **5/10**.

Actual CLI 4.3.1 registry-run chat output (response identifiers redacted):

${fenced(chat.chat)}

Actual empty-window CLI output, projected as disclosed by its capture:

${emptyCapture.disclosure}

${fenced(emptyCapture.output)}

The analytics checks use existing owned traffic; they create no key, log or inference request. The separate release-inference checks use and retire short-lived dev keys with the prescribed models. TLS verification and the process-only LAN DNS accommodation are unchanged; public WAN and anonymous container access remain uncertified. Cost retains its rolling-day window and explicit cents/USD output; the other three charts support explicit timestamps. No realtime CLI command is added. See the [complete SDK query capture](./examples.mdx#verified-chart-query-contracts) and [complete CLI capture](https://cdot65.github.io/prisma-airs-cli/cli/aigateway/telemetry/#verified-chart-filter-output).

Three subsequent harness-preflight regressions bring the verification checkout to 10,934 tests in 137 files. A missing local executable now fails before temporary-key creation. The npm metadata-lag attempt remains in private history; only the independently installed passing captures above are published as verified.

Both the frozen CLI production tree and the fresh registry installation now report zero known advisories, after upgrading YAML, nanoid and optional sharp. This fixes the separately recorded 4.3.0 production audit; it does not clear the SDK documentation development-dependency advisories.

The installed CLI also passes **11/11 native DLP checks**, **${native.generatedAt}**, using sharp **${native.sharpVersion}** and libvips **${native.libvipsVersion}**. All five formats, 26 signatures, manifest counts, JSON stdout, output precedence and invalid-input preflight are verified. This host uses its existing process-only font configuration. Temporary fixtures are removed before success is recorded. Actual summary (only temporary paths replaced):

${fenced(native.summary)}

The package and doctor now agree on the existing dependency engine intersection: Node 20.17+, 22.13+, or 24+ (exactly \`^20.17.0 || ^22.13.0 || >=23.5.0\`). The [container workflow](https://github.com/cdot65/prisma-airs-cli/actions/runs/34110815270) passes all four jobs: exact-version publication, both native runtime architectures, and serialized current-tag-guarded alias promotion. Each architecture passes the same 11 checks without runtime network access or credentials. Both minor and latest aliases are independently checked at digest **${container.digest}**. Public anonymous pull access remains a separate limitation.

The earlier release checkpoints below retain their original output and timestamps.

`;
emitPatch(
  target,
  source.slice(0, start >= 0 ? start : previous) + section + source.slice(previous),
);
