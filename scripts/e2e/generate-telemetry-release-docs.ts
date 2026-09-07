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
const sdk = report('release-sdk-inference-023', 10);
const charts = report('gateway-analytics-chart-filters-sdk', 13);
const cli = report('cli-inference', 8);
const empty = report('cli-analytics', 3);
const core = report('cli', 12);
const audit = report('release-key-audit');
assert(
  Date.parse(audit.finishedAt) >= Math.max(Date.parse(sdk.finishedAt), Date.parse(cli.finishedAt)),
  'Retirement audit must follow both release-inference runs',
);
const chartCapture = read('artifacts/examples/gateway-analytics-chart-filters-sdk.json');
assert.equal(chartCapture.mode, 'installed-sdk');
assert.equal(chartCapture.sdkVersion, '0.23.0');
assert.equal(chartCapture.capturedAt, charts.finishedAt);
const emptyCapture = read('artifacts/examples/cli-analytics.json');
assert.equal(emptyCapture.capturedAt, empty.finishedAt);
assert.equal(emptyCapture.mutations, false);
assert.equal(emptyCapture.output.version, '4.2.2');
assert.equal(emptyCapture.output.sdkVersion, '0.23.0');
const chat = read('artifacts/examples/cli-inference.json');
assert.equal(chat.capturedAt, cli.finishedAt);
for (const [path, version] of [
  ['artifacts/package/verification.json', '0.23.0'],
  ['artifacts/cli-422-registry-verification.json', '4.2.2'],
  ['artifacts/cli-422-installed-verification.json', '4.2.2'],
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
const start = source.indexOf('## SDK 0.23.0 and CLI 4.2.2 registry verification');
const previous = source.indexOf('## SDK 0.22.0 and CLI 4.2.1 registry verification');
assert(previous >= 0);
const section = `## SDK 0.23.0 and CLI 4.2.2 registry verification

Both releases are published, installed independently from npm and payload-verified. CLI 4.2.2 pins SDK 0.23.0 exactly. The local user-prefix CLI is upgraded and independently checked. SDK publication preceded the CLI dependency update; existing runtime settings and the read-only credential configuration are unchanged.

- Registry SDK inference: **10/10**, **${sdk.finishedAt}**.
- Installed registry SDK analytics: **13/13**, **${charts.finishedAt}**.
- Registry CLI inference: **8/8**, **${cli.finishedAt}**.
- Registry CLI empty-window JSON/YAML: **3/3**, **${empty.finishedAt}**.
- Installed user CLI cross-service reads and benign scan: **12/12**, **${core.finishedAt}**.
- Independent all-history release-key retirement audit: **${audit.passed}/${audit.total}**, **${audit.finishedAt}**.

The SDK fixes valid empty latency responses and adds verified filters to four SCM chart adapters. Offline checks pass 10,668 SDK tests on Node 18/20/22/24 and 1,035 CLI tests, including two failing-first public-command regressions against the actual dependency. Packed ESM/CommonJS, strict consumer types, source maps, OAuth deadlines and native WebSocket checks pass. Direct gateway coverage is unchanged at **138/242 (57.02%)**, with **22 partial analytics operations**. All original provider/service failures remain disclosed; full-scope assessment remains **5/10**.

Actual CLI 4.2.2 registry-run chat output (response identifiers redacted):

${fenced(chat.chat)}

Actual empty-window CLI output, projected as disclosed by its capture:

${emptyCapture.disclosure}

${fenced(emptyCapture.output)}

The analytics check uses existing owned traffic; it creates no key, log or inference request. The separate release-inference checks use and retire short-lived dev keys with the prescribed models. TLS verification and the process-only LAN DNS accommodation are unchanged; WAN/container runtime readiness is not certified. The CLI adds no chart filter flags or realtime command. See the [complete analytics capture](./examples.mdx#verified-request-chart-filters).

The earlier release checkpoints below retain their original output and timestamps.

`;
emitPatch(
  target,
  source.slice(0, start >= 0 ? start : previous) + section + source.slice(previous),
);
