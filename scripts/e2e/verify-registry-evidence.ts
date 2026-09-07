/** @internal Bind the verified installed SDK payload to npm's registry integrity. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { writePrivateReport } from './harness.js';

const report = JSON.parse(readFileSync('artifacts/package/verification.json', 'utf8')) as {
  version: string;
  installed: string;
  archive: string;
  sha256: string;
  checkedAt: string;
  passed: boolean;
  installedPayloadIdentical: boolean;
};
assert.equal(report.passed, true);
assert.equal(report.installedPayloadIdentical, true);
assert(/^\d+\.\d+\.\d+$/.test(report.version));
const lock = JSON.parse(
  readFileSync(resolve(report.installed, '../../../package-lock.json'), 'utf8'),
);
const installed = lock.packages['node_modules/@cdot65/prisma-airs-sdk'];
assert.equal(installed.version, report.version);
const expectedUrl = `https://registry.npmjs.org/@cdot65/prisma-airs-sdk/-/prisma-airs-sdk-${report.version}.tgz`;
assert.equal(installed.resolved, expectedUrl);
const bytes = readFileSync(report.archive);
const integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
assert.equal(createHash('sha256').update(bytes).digest('hex'), report.sha256);
assert.equal(installed.integrity, integrity);
const result = JSON.parse(
  execFileSync(
    'npm',
    [
      'view',
      `@cdot65/prisma-airs-sdk@${report.version}`,
      'dist',
      '--json',
      '--prefer-online',
      '--registry=https://registry.npmjs.org',
    ],
    { encoding: 'utf8', timeout: 30_000, maxBuffer: 1_048_576 },
  ),
);
if (Array.isArray(result)) assert.equal(result.length, 1, 'Expected exactly one registry version');
const metadata = Array.isArray(result) ? result[0] : result;
assert.equal(metadata.tarball, expectedUrl);
assert.equal(metadata.integrity, integrity);
const evidence = {
  checkedAt: new Date().toISOString(),
  version: report.version,
  passed: true,
  payloadCheckedAt: report.checkedAt,
  installed: report.installed,
  registryUrl: expectedUrl,
  integrity,
  sha256: report.sha256,
  bytes: bytes.byteLength,
};
writePrivateReport(`artifacts/package/registry-v${report.version}.json`, evidence);
console.log(JSON.stringify(evidence));
