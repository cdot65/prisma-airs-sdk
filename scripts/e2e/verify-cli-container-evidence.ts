/** @internal Reconcile completed workflow jobs, actual native results and alias readbacks. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cliReleaseSelection } from './cli-consumer.js';
import { writePrivateReport } from './harness.js';

const selection = cliReleaseSelection();
assert(selection.suffix, 'Select a stable CLI release explicitly');
const prefix = `artifacts/cli${selection.cliVersion.replaceAll('.', '')}-container`;
const workflow = JSON.parse(readFileSync(`${prefix}-workflow.json`, 'utf8'));
const log = readFileSync(`${prefix}-publication.log`, 'utf8');
assert.equal(workflow.status, 'completed');
assert.equal(workflow.conclusion, 'success');
assert.equal(
  workflow.headSha,
  execFileSync(
    'git',
    [
      '-C',
      process.env.CLI_COMPAT_DIR ?? resolve('../prisma-airs-cli'),
      'rev-parse',
      `v${selection.cliVersion}^{commit}`,
    ],
    { encoding: 'utf8', timeout: 10000 },
  ).trim(),
);
const platforms = ['linux/amd64', 'linux/arm64'];
assert.deepEqual(
  workflow.jobs.map((job: { name: string }) => job.name).sort(),
  [
    'build-and-push',
    'promote-aliases',
    ...platforms.map((platform) => `verify-container (${platform})`),
  ].sort(),
);
assert(
  workflow.jobs.every(
    (job: { status: string; conclusion: string }) =>
      job.status === 'completed' && job.conclusion === 'success',
  ),
);

function lines(job: string): string[] {
  return log
    .split('\n')
    .filter((line) => line.startsWith(job + '\t'))
    .map((line) =>
      line
        .split('\t')
        .slice(2)
        .join('\t')
        .replace(/^\d{4}-\d{2}-\d{2}T\S+Z /, ''),
    );
}
const results: Record<string, unknown> = {};
for (const platform of platforms) {
  const output = lines(`verify-container (${platform})`);
  assert(output.some((line) => line.includes('docker run --rm --network none --platform')));
  assert(output.some((line) => line.includes(`PLATFORM: ${platform}`)));
  const candidates = [];
  for (let start = 0; start < output.length; start++) {
    if (output[start].trim() !== '{') continue;
    for (let end = start + 1; end < output.length; end++) {
      if (output[end].trim() !== '}') continue;
      let value;
      try {
        value = JSON.parse(output.slice(start, end + 1).join('\n'));
      } catch {
        continue;
      }
      if (value.cliVersion && Array.isArray(value.cases)) candidates.push(value);
      break;
    }
  }
  assert.equal(candidates.length, 1, `Expected one native consumer report for ${platform}`);
  const native = candidates[0];
  assert.equal(native.cliVersion, selection.cliVersion);
  assert.equal(native.sdkVersion, selection.sdkVersion);
  assert.equal(native.passed, true);
  assert.equal(native.fixtureCleanup, 'complete');
  assert.equal(native.customFontConfiguration, false);
  assert.equal(native.cases.length, 11);
  assert(native.cases.every((result: { passed: boolean }) => result.passed));
  assert.deepEqual(native.runtimeWarnings, []);
  results[platform] = native;
}
const promotion = lines('promote-aliases').join('\n');
const aliases = Array.from(
  promotion.matchAll(
    /Verified ghcr\.io\/cdot65\/prisma-airs-cli:([\d.]+|latest) at (sha256:[a-f0-9]{64})/g,
  ),
  (match) => ({ alias: match[1], digest: match[2] }),
);
assert.deepEqual(
  aliases.map((item) => item.alias).sort(),
  [selection.cliVersion.split('.').slice(0, 2).join('.'), 'latest'].sort(),
);
assert.equal(aliases[0].digest, aliases[1].digest);
for (const platform of platforms) {
  assert(
    lines(`verify-container (${platform})`).some((line) =>
      line.includes(`IMAGE_DIGEST: ${aliases[0].digest}`),
    ),
  );
}
const evidence = {
  checkedAt: new Date().toISOString(),
  workflowRun: workflow.databaseId,
  commit: workflow.headSha,
  passed: true,
  digest: aliases[0].digest,
  promotions: aliases,
  runtimeNetwork: 'none',
  platforms: results,
};
writePrivateReport(`${prefix}-verification.json`, evidence);
console.log(
  JSON.stringify({
    checkedAt: evidence.checkedAt,
    workflowRun: evidence.workflowRun,
    passed: true,
    digest: evidence.digest,
    platforms,
  }),
);
