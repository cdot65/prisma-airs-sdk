/** @internal Refresh native DLP examples only after independent registry installation checks. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliReleaseSelection } from './cli-consumer.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const selection = cliReleaseSelection();
const compactVersion = selection.cliVersion.replaceAll('.', '');
const native = read(`artifacts/cli${compactVersion}-dlp-registry.json`);
const installed = read(
  selection.suffix
    ? `artifacts/cli${compactVersion}-registry-package-verification.json`
    : 'artifacts/cli-431-registry-verification.json',
);
assert.equal(installed.passed, true);
assert.equal(installed.version, selection.cliVersion);
assert.equal(native.cliVersion, installed.version);
assert.equal(native.sdkVersion, selection.sdkVersion);
assert.equal(native.passed, true);
assert.equal(native.fixtureCleanup, 'complete');
assert.equal(native.cases.length, 11);
assert(native.cases.every((row: { passed: boolean }) => row.passed));
assert(Date.parse(native.generatedAt) >= Date.parse(installed.checkedAt));
assert.deepEqual(native.summary, {
  clean: 5,
  dirty: 21,
  out: '<temporary-corpus>',
  manifestPath: '<temporary-corpus>/manifest.json',
  seed: 431,
  byFormat: {
    pdf: { clean: 1, dirty: 5 },
    png: { clean: 1, dirty: 4 },
    jpeg: { clean: 1, dirty: 4 },
    svg: { clean: 1, dirty: 4 },
    docx: { clean: 1, dirty: 4 },
  },
});
for (const path of [
  `artifacts/security/cli${compactVersion}-production-audit.json`,
  `artifacts/security/cli${compactVersion}-registry-production-audit.json`,
]) {
  assert(Object.values(read(path).metadata.vulnerabilities).every((count) => count === 0));
}
const cli = process.env.CLI_COMPAT_DIR ?? resolve(root, '../prisma-airs-cli');
const paths = [
  'docs-site/docs/runtime/dlp/generate.md',
  'docs-site/docs/cli/runtime/dlp/generate.md',
];
const selected = process.argv.includes('--reference') ? paths[1] : paths[0];
const target = resolve(cli, selected);
const source = readFileSync(target, 'utf8');
const heading = `:::info CLI ${selection.cliVersion} validation\n`;
const start = source.includes(heading)
  ? source.indexOf(heading)
  : source.indexOf(':::info CLI 4.3.1 validation\n');
const end = source.indexOf('\n:::', start);
assert(start >= 0 && end > start);
const paragraph = `:::info CLI ${selection.cliVersion} validation

The independently registry-installed CLI **${selection.cliVersion}** passes **11/11** native public-CLI checks at **${native.generatedAt}**: all five formats, 26 file signatures, manifest counts, JSON stdout, output precedence and rejection of invalid input before file creation. It uses sharp **${native.sharpVersion}** / libvips **${native.libvipsVersion}**. Both the frozen production tree and fresh registry install report zero known advisories. This host uses its existing process-only font configuration; credential settings are unchanged, and temporary corpora are cleaned up before success is recorded.

Historical result: CLI 4.3.0 produced five valid PNG and five valid JPEG files at **2026-09-07T09:24:03.285Z**, but emitted a human-readable summary instead of JSON. That failure is retained in the release assessment; 4.3.1 fixes it.
`;
let updated = source.slice(0, start) + paragraph + source.slice(end);
if (selected === paths[1]) {
  const opening = updated.indexOf('```json\n');
  const closing = updated.indexOf('\n```', opening + 8);
  assert(opening >= 0 && closing > opening);
  updated =
    updated.slice(0, opening + 8) +
    JSON.stringify(native.summary, null, 2) +
    updated.slice(closing);
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
