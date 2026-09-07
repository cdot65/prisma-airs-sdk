/** @internal Refresh only the CLI inference transcript section from validated built-CLI output. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const capture = JSON.parse(
  readFileSync(resolve(root, 'artifacts/examples/cli-inference.json'), 'utf8'),
);
const suite = JSON.parse(readFileSync(resolve(root, 'artifacts/e2e/cli-inference.json'), 'utf8'));
assert.equal(capture.capturedAt, suite.finishedAt);
assert.equal(suite.credentialsUnchanged, true);
assert.equal(suite.passed, 8);
assert.equal(suite.total, 8);
assert.equal(suite.failed, 0);
assert.equal(
  suite.results.filter((result: { status: string }) => result.status === 'PASS').length,
  8,
);
const cli = process.env.CLI_COMPAT_DIR ?? resolve(root, '../prisma-airs-cli');
const path = resolve(cli, 'docs-site/docs/cli/aigateway/inference.md');
const source = readFileSync(path, 'utf8');
const start = source.indexOf('## Latest verified example output\n');
const releaseSection = source.indexOf('## Validation and release dependency', start);
const end =
  releaseSection >= 0
    ? releaseSection
    : source.indexOf('## Validated candidate and release ordering\n', start);
assert(start >= 0 && end > start, 'Expected CLI transcript section was not found');
const json = JSON.stringify(capture.chat, null, 2);
const fence = '`'.repeat(
  Math.max(2, ...Array.from(json.matchAll(/`+/g), (match) => match[0].length)) + 1,
);
const replacement = `## Latest verified example output

Captured **${capture.capturedAt}** from actual CLI execution against AI Gateway.
${capture.disclosure}

The chat command above returned:

${fence}json
${json}
${fence}

Streaming chat/Responses, both embedding encodings, invalid-input exit codes and temporary-key cleanup passed in the same 8/8 suite. This verifies those workflows, not the missing or failed AI Gateway operations.

This run used an opt-in, process-only DNS accommodation in the test workspace: fully qualified service lookups and the gateway's existing LAN ingress address, independently verified through its configured secondary DNS resolver. The original HTTPS hostname/SNI, certificate verification and gateway authentication were preserved. No infrastructure settings changed. The public WAN path timed out from this workspace and is not certified by these results.

`;
console.log(
  `*** Begin Patch\n*** Update File: ${path}\n@@\n${source
    .slice(start, end)
    .trimEnd()
    .split('\n')
    .map((line) => '-' + line)
    .join('\n')}\n${replacement
    .trimEnd()
    .split('\n')
    .map((line) => '+' + line)
    .join('\n')}\n*** End Patch`,
);
