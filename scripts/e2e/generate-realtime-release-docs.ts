/** @internal Refresh the version-specific release section from independently checked registry evidence. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emitPatch } from '../openapi/emit-patch.js';
import type { LiveResult } from './harness.js';

const root = new URL('../../', import.meta.url);
function report(name: string, expectedPasses?: number) {
  const value = JSON.parse(readFileSync(new URL(`artifacts/e2e/${name}.json`, root), 'utf8')) as {
    credentialsUnchanged: boolean;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    finishedAt: string;
    results: LiveResult[];
  };
  assert.equal(value.credentialsUnchanged, true);
  assert.equal(value.total, value.results.length);
  assert.equal(value.failed, 0);
  assert.equal(value.skipped, 0);
  assert.equal(value.passed, value.total);
  assert(value.results.every((item) => item.status === 'PASS'));
  if (expectedPasses !== undefined) assert.equal(value.passed, expectedPasses);
  return value;
}
const sdk = report('release-sdk-inference-022', 10);
const cli = report('cli-inference', 8);
const core = report('cli', 12);
const audit = report('release-key-audit');
for (const [file, version] of [
  ['artifacts/package/verification.json', '0.22.0'],
  ['artifacts/cli-421-registry-verification.json', '4.2.1'],
] as const) {
  const verification = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
  assert.equal(verification.passed, true);
  assert.equal(verification.version, version);
}
const capture = JSON.parse(
  readFileSync(new URL('artifacts/examples/cli-inference.json', root), 'utf8'),
);
assert.equal(capture.capturedAt, cli.finishedAt);
assert.equal(capture.chat.model, 'gpt-5.6-terra');
const json = JSON.stringify(capture.chat, null, 2);
const fence = '`'.repeat(
  Math.max(2, ...Array.from(json.matchAll(/`+/g), (match) => match[0].length)) + 1,
);
const target = 'docs-site/docs/guides/release-verification.md';
const source = readFileSync(new URL(target, root), 'utf8');
const heading = '# Published-package examples\n';
const marker = '## Original 0.21.0 / 4.2.0 checkpoint\n';
const original = source.includes(marker)
  ? source.slice(source.indexOf(marker) + marker.length).trimStart()
  : source.slice(source.indexOf(heading) + heading.length).trimStart();
assert(original.startsWith('The release-inference checks exercise the published SDK **0.21.0**'));
const section = `
## SDK 0.22.0 and CLI 4.2.1 registry verification

Both packages are published and installed from npm, with CLI 4.2.1 pinning SDK 0.22.0 exactly. Registry payloads match the reviewed release candidates: nine SDK files and seven CLI files, including all five CLI distribution files. ESM/CommonJS SDK consumers also pass strict types, source-map integrity, real OAuth deadline recovery and native loopback WebSocket exchanges. This is separate from live provider-session certification.

- SDK registry inference: **10/10**, finished **${sdk.finishedAt}**.
- CLI registry inference: **8/8**, finished **${cli.finishedAt}**.
- Installed local CLI cross-service reads and benign runtime scan: **12/12**, finished **${core.finishedAt}**.
- Independent read-only key audit: **${audit.passed}/${audit.total}**, finished **${audit.finishedAt}**, covering all journaled SDK/CLI release-inference attempts, not just the newest keys. Credentials remained unchanged.

The local user-prefix \`airs\` installation reports 4.2.1 with SDK 0.22.0; its payload, version, library exports and inference help pass independent checks. Runtime endpoint/key settings were not written into the read-only config. The harness supplies and retires short-lived dev-workspace keys. The CLI still exposes chat, Responses and embeddings, not a realtime command.

Actual CLI 4.2.1 registry-run output, with response IDs redacted:

${fence}json
${json}
${fence}

The same passing inference suite covers JSON/JSONL chat and Responses, float/base64 embeddings, invalid-input exit 2 and key retirement. The prescribed models, TLS verification and disclosed process-only LAN DNS accommodation are unchanged; WAN reachability is not certified.

SDK 0.22.0 adds experimental realtime transport, raising direct gateway coverage to **138/242 (57.02%)**, with **29 experimental methods**. Its separate live run passes HTTP 101 but fails provider readiness with \`invalid_model\`; no alternate model, audio or generation was used. The [actual failed runnable example](./examples.mdx#latest-runtime-diagnostics-failures-remain-visible) and all earlier service failures remain visible. Successful release checks do not satisfy the original 99% full gateway target.

The historical results below retain their own versions and timestamps; they are not reruns of the new release.

${marker}
`;
emitPatch(
  target,
  source.slice(0, source.indexOf(heading) + heading.length) +
    '\n' +
    section.trimStart() +
    '\n' +
    original.replace(
      'The published SDK remains 0.21.0;',
      'At that checkpoint the published SDK was 0.21.0;',
    ),
);
