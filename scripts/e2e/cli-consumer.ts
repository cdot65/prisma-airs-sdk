/** @internal Pin consumer versions and preserve historical reports across CLI releases. */
import assert from 'node:assert/strict';
import { accessSync, constants, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, resolve } from 'node:path';
import { SDK_VERSION } from '../../src/constants.js';

export function cliReleaseSelection(expected = process.env.E2E_CLI_EXPECTED_VERSION): {
  cliVersion: string;
  sdkVersion: string;
  suffix: string;
} {
  if (expected !== undefined) {
    assert(
      /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(expected),
      'Expected CLI version must be a stable numeric version',
    );
  }
  return {
    cliVersion: expected ?? '4.3.1',
    sdkVersion: expected === undefined ? '0.24.0' : SDK_VERSION,
    suffix: expected === undefined ? '' : `-v${expected}`,
  };
}

export function verifyCliConsumer(entry: string, selection = cliReleaseSelection()): void {
  assert(isAbsolute(entry), 'CLI entry must be absolute');
  accessSync(entry, constants.R_OK);
  const packageFile = resolve(dirname(entry), '../../package.json');
  const pkg = JSON.parse(readFileSync(packageFile, 'utf8')) as {
    name: string;
    version: string;
    dependencies: Record<string, string>;
  };
  assert.equal(pkg.name, '@cdot65/prisma-airs-cli');
  assert.equal(pkg.version, selection.cliVersion);
  assert.equal(pkg.dependencies['@cdot65/prisma-airs-sdk'], selection.sdkVersion);
  assert.equal(
    createRequire(packageFile)('@cdot65/prisma-airs-sdk').SDK_VERSION,
    selection.sdkVersion,
  );
}
