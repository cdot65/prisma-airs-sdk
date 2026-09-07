/** @internal Publish only a validated, projected CLI latency capture. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const capture = JSON.parse(
  readFileSync(resolve(root, 'artifacts/examples/cli-analytics.json'), 'utf8'),
);
const report = JSON.parse(readFileSync(resolve(root, 'artifacts/e2e/cli-analytics.json'), 'utf8'));
assert.equal(capture.capturedAt, report.finishedAt);
assert.equal(report.credentialsUnchanged, true);
assert.equal(capture.mutations, false);
assert.equal(report.passed, 3);
assert.equal(report.total, 3);
assert.equal(report.failed, 0);
assert(report.results.every((result: { status: string }) => result.status === 'PASS'));
assert.equal(capture.output.version, '4.3.1');
assert.equal(capture.output.sdkVersion, '0.24.0');
const target = resolve(
  process.env.CLI_COMPAT_DIR ?? resolve(root, '../prisma-airs-cli'),
  'docs-site/docs/cli/aigateway/telemetry.md',
);
const source = readFileSync(target, 'utf8').trimEnd();
const heading = '## Verified empty-window output';
const start = source.indexOf(heading);
const section = `${heading}\n\nThe separately installed CLI 4.3.1 passed **3/3** read-only checks at **${capture.capturedAt}**, including actual JSON and YAML commands with SDK 0.24.0. No traffic or key was created to populate the empty window.\n\n${capture.disclosure}\n\n\`\`\`json\n${JSON.stringify(capture.output, null, 2)}\n\`\`\`\n\nReproduce the empty-window read with:\n\n\`\`\`bash\nairs aigateway telemetry latency --workspace ws-develo-71f8d8 --start 2020-01-01T00:00:00Z --end 2020-01-01T00:00:01Z --output json\n\`\`\`\n\nThis uses the disclosed TLS-verified LAN path and unchanged read-only SCM credentials. It is not certification of every gateway operation or public WAN access.\n`;
const updated = (start >= 0 ? source.slice(0, start).trimEnd() : source) + '\n\n' + section;
console.log(
  `*** Begin Patch\n*** Update File: ${target}\n@@\n${source
    .split('\n')
    .map((line) => '-' + line)
    .join('\n')}\n${updated
    .trimEnd()
    .split('\n')
    .map((line) => '+' + line)
    .join('\n')}\n*** End Patch`,
);
