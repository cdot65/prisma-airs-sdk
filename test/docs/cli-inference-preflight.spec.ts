import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('enters the mocked lifecycle only after the entry is readable', async () => {
    vi.stubEnv('E2E_CLI_ENTRY', process.execPath);
    await expect(import('../../scripts/e2e-cli-inference.js')).rejects.toThrow(
      'Stopped before live credentials',
    );
    expect(runtimeSuite).toHaveBeenCalledOnce();
  });
});
