import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { SDK_VERSION } from '../../src/constants.js';

const runtimeSuite = vi.hoisted(() => vi.fn());
vi.mock('../../scripts/e2e/gateway-runtime.js', () => ({ runtimeSuite }));

describe('CLI inference installation preflight', () => {
  beforeEach(() => {
    vi.resetModules();
    runtimeSuite.mockReset().mockRejectedValue(new Error('Stopped before live credentials'));
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(['relative/cli.js', '/nonexistent-prisma-airs-preflight/cli.js'])(
    'rejects an unavailable entry before the key lifecycle: %s',
    async (entry) => {
      vi.stubEnv('E2E_CLI_ENTRY', entry);
      await expect(import('../../scripts/e2e-cli-inference.js')).rejects.toThrow();
      expect(runtimeSuite).not.toHaveBeenCalled();
    },
  );

  it('rejects a readable non-CLI executable before the lifecycle', async () => {
    vi.stubEnv('E2E_CLI_ENTRY', process.execPath);
    await expect(import('../../scripts/e2e-cli-inference.js')).rejects.toThrow();
    expect(runtimeSuite).not.toHaveBeenCalled();
  });

  it.each(['valid', 'wrong-name', 'wrong-version', 'wrong-pin', 'wrong-installed-sdk'])(
    'checks the package and actual SDK before the lifecycle: %s',
    async (scenario) => {
      const directory = mkdtempSync(resolve(tmpdir(), 'prisma-airs-cli-preflight-'));
      try {
        const entry = resolve(directory, 'dist/cli/index.js');
        const sdk = resolve(directory, 'node_modules/@cdot65/prisma-airs-sdk');
        mkdirSync(resolve(directory, 'dist/cli'), { recursive: true });
        mkdirSync(sdk, { recursive: true });
        writeFileSync(entry, '// Offline fixture, never executed\n');
        writeFileSync(
          resolve(directory, 'package.json'),
          JSON.stringify({
            name: scenario === 'wrong-name' ? 'unrelated' : '@cdot65/prisma-airs-cli',
            version: scenario === 'wrong-version' ? '4.3.1' : '4.4.0',
            dependencies: {
              '@cdot65/prisma-airs-sdk': scenario === 'wrong-pin' ? '^0.25.0' : SDK_VERSION,
            },
          }),
        );
        writeFileSync(
          resolve(sdk, 'index.js'),
          `exports.SDK_VERSION = ${JSON.stringify(scenario === 'wrong-installed-sdk' ? '0.24.0' : SDK_VERSION)};\n`,
        );
        vi.stubEnv('E2E_CLI_ENTRY', entry);
        vi.stubEnv('E2E_CLI_EXPECTED_VERSION', '4.4.0');
        if (scenario === 'valid') {
          await expect(import('../../scripts/e2e-cli-inference.js')).rejects.toThrow(
            'Stopped before live credentials',
          );
          expect(runtimeSuite).toHaveBeenCalledOnce();
          expect(runtimeSuite.mock.calls[0][0]).toBe('cli-inference-v4.4.0');
        } else {
          await expect(import('../../scripts/e2e-cli-inference.js')).rejects.toThrow();
          expect(runtimeSuite).not.toHaveBeenCalled();
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});
