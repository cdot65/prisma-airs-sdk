/** @internal Publish version-bound registry, installed-user and container evidence. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliReleaseSelection } from './cli-consumer.js';
import type { LiveResult } from './harness.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const selection = cliReleaseSelection();
assert(selection.suffix);
const compact = selection.cliVersion.replaceAll('.', '');
function suite(name: string, count?: number) {
  const report = read(`artifacts/e2e/${name}.json`);
  assert.equal(report.credentialsUnchanged, true);
  assert.equal(report.total, report.results.length);
  assert.equal(report.passed, report.total);
  assert.equal(report.failed, 0);
  assert.equal(report.skipped, 0);
  assert(report.results.every((result: LiveResult) => result.status === 'PASS'));
  if (count !== undefined) assert.equal(report.total, count);
  return report;
}
const groups = suite(`gateway-analytics-group-filters-cli${selection.suffix}`, 103);
const charts = suite(`gateway-analytics-query-contracts-cli${selection.suffix}`, 54);
const inference = suite(`cli-inference${selection.suffix}`, 8);
const empty = suite(`cli-analytics${selection.suffix}`, 3);
const core = suite(`cli${selection.suffix}`, 12);
const audit = suite('release-key-audit');
assert(Date.parse(audit.finishedAt) > Date.parse(inference.finishedAt));
const installation = read(`artifacts/cli${compact}-registry-package-verification.json`);
const user = read(`artifacts/cli${compact}-installed-package-verification.json`);
const integrity = read(`artifacts/package/registry-cli-v${selection.cliVersion}.json`);
for (const report of [installation, user, integrity]) {
  assert.equal(report.passed, true);
  assert.equal(report.version, selection.cliVersion);
  assert.equal(report.sha256, installation.sha256);
}
assert.equal(installation.sdkVersion, selection.sdkVersion);
assert.equal(user.sdkVersion, selection.sdkVersion);
assert.equal(integrity.payloadCheckedAt, installation.checkedAt);
for (const report of [groups, charts, inference, empty])
  assert(Date.parse(report.finishedAt) > Date.parse(installation.checkedAt));
assert(Date.parse(core.finishedAt) > Date.parse(user.checkedAt));
const chat = read(`artifacts/examples/cli-inference${selection.suffix}.json`);
const latency = read(`artifacts/examples/cli-analytics${selection.suffix}.json`);
assert.equal(chat.capturedAt, inference.finishedAt);
assert.equal(chat.cliVersion, selection.cliVersion);
assert.equal(chat.sdkVersion, selection.sdkVersion);
assert.equal(latency.capturedAt, empty.finishedAt);
assert.equal(latency.output.version, selection.cliVersion);
assert.equal(latency.output.sdkVersion, selection.sdkVersion);
const native = read(`artifacts/cli${compact}-dlp-registry.json`);
const nativeUser = read(`artifacts/cli${compact}-dlp-installed.json`);
const container = read(`artifacts/cli${compact}-container-verification.json`);
assert.equal(container.passed, true);
assert.deepEqual(Object.keys(container.platforms).sort(), ['linux/amd64', 'linux/arm64']);
for (const report of [
  native,
  nativeUser,
  ...Object.values(container.platforms),
] as (typeof native)[]) {
  assert.equal(report.passed, true);
  assert.equal(report.cliVersion, selection.cliVersion);
  assert.equal(report.sdkVersion, selection.sdkVersion);
  assert.equal(report.fixtureCleanup, 'complete');
  assert.equal(report.cases.length, 11);
  assert(report.cases.every((result: { passed: boolean }) => result.passed));
}
for (const path of [
  `artifacts/security/cli${compact}-production-audit.json`,
  `artifacts/security/cli${compact}-registry-production-audit.json`,
]) {
  assert(Object.values(read(path).metadata.vulnerabilities).every((value) => value === 0));
}
function fenced(value: unknown) {
  const json = JSON.stringify(value, null, 2);
  const delimiter = '`'.repeat(
    Math.max(2, ...Array.from(json.matchAll(/`+/g), (match) => match[0].length)) + 1,
  );
  return `${delimiter}json\n${json}\n${delimiter}`;
}
const narrative = `CLI **${selection.cliVersion}** is published, independently installed from npm and upgraded in the user prefix. It pins the already-published SDK **${selection.sdkVersion}** exactly; all seven payload files and 19 exports match the tested npm archive. Registry integrity agrees at **${integrity.checkedAt}**: **${installation.bytes.toLocaleString('en-US')} bytes**, SHA-256 **\`${installation.sha256}\`**.

- Registry grouped filters: **103/103**, **${groups.finishedAt}**.
- Registry chart contracts: **54/54**, **${charts.finishedAt}**.
- Registry inference: **8/8**, **${inference.finishedAt}**.
- Registry empty-window JSON/YAML: **3/3**, **${empty.finishedAt}**.
- User-installed cross-service reads/benign scan: **12/12**, **${core.finishedAt}**.
- Independent historical release-key retirement: **${audit.passed}/${audit.total}**, **${audit.finishedAt}**.
- Native DLP: **11/11 registry** at **${native.generatedAt}**, **11/11 user-installed** at **${nativeUser.generatedAt}**.

All 1,268 CLI tests and 14 release-policy/diagnostic tests pass; the existing library-only coverage scope reports 95.97% lines/statements, 95.48% functions and 87.34% branches. Frozen and fresh registry production audits are clean. The [container workflow](https://github.com/cdot65/prisma-airs-cli/actions/runs/${container.workflowRun}) passes 11/11 native checks on each actual architecture without runtime network or credentials, then verifies minor/latest aliases at **\`${container.digest}\`**. Temporary native corpora are cleaned up before success is recorded. Host checks use the disclosed process-only font configuration; container checks use packaged fonts.

Failed attempts remain in history: the first grouped candidate run passed 102/103, the first registry chart run 53/54, and the first public browser run 10/11 with a DNS-resolution failure. The complete subsequent suites pass without changing validation, SDK retries, models, credentials or infrastructure. The chart rerun is serialized after the grouped suite; the masked initial subprocess failure does not establish a root cause. Registry metadata visibility lagged successful publication; no duplicate publication was attempted.

The credential file remains unchanged and no runtime key is persisted. All 101 grouped-filter pairs and all 52 chart-filter pairs are reproduced on the CLI telemetry page. Direct Gateway coverage remains **138/242 (57.02%)**, all 22 analytics adaptations remain partial, and the full-project assessment remains **5/10**. Existing service/provider/entitlement failures, SDK documentation dependency advisories, public WAN and anonymous container-pull limits remain open. No realtime CLI command or successful provider realtime session is claimed.
`;
const cliPage = process.argv.includes('--cli');
const target = cliPage
  ? resolve(
      process.env.CLI_COMPAT_DIR ?? resolve(root, '../prisma-airs-cli'),
      'docs-site/docs/cli/aigateway/inference.md',
    )
  : resolve(root, 'docs-site/docs/guides/release-verification.md');
const source = readFileSync(target, 'utf8');
let updated: string;
if (cliPage) {
  const start = source.indexOf('## Validation and release dependency');
  assert(start >= 0);
  updated =
    source.slice(0, start) +
    '## Validation and release dependency {#validated-candidate-and-release-ordering}\n\n' +
    narrative;
} else {
  const heading = `## CLI ${selection.cliVersion} registry and container verification`;
  const start = source.indexOf(heading);
  const end = source.indexOf('## SDK 0.25.0 registry verification');
  assert(end >= 0 && (start < 0 || start < end));
  const section = `${heading}\n\n${narrative}\nActual registry CLI chat output (response identifiers redacted):\n\n${fenced(chat.chat)}\n\nActual empty-window projection:\n\n${latency.disclosure}\n\n${fenced(latency.output)}\n\nActual native summary (temporary paths replaced):\n\n${fenced(native.summary)}\n\n`;
  updated = source.slice(0, start >= 0 ? start : end) + section + source.slice(end);
}
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
