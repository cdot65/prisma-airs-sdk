import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fileURLToPath } from 'node:url';

const runtimeSuite = vi.hoisted(() => vi.fn());
vi.mock('../../scripts/e2e/gateway-runtime.js', () => ({ runtimeSuite }));

describe('SDK inference package preflight', () => {
  beforeEach(() => {
    vi.resetModules();
    runtimeSuite.mockReset().mockRejectedValue(new Error('Stopped before live credentials'));
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each(['relative/index.js', '', '/nonexistent-prisma-airs-preflight/index.js'])(
    'rejects unavailable package entry before the key lifecycle: %s',
    async (entry) => {
      vi.stubEnv('E2E_RELEASE_SDK_ENTRY', entry);
      await expect(import('../../scripts/e2e-gateway-inference.js')).rejects.toThrow();
      expect(runtimeSuite).not.toHaveBeenCalled();
    },
  );
  it('rejects a readable module with no SDK version before the key lifecycle', async () => {
    vi.stubEnv(
      'E2E_RELEASE_SDK_ENTRY',
      fileURLToPath(new URL('../../scripts/e2e/release-history.ts', import.meta.url)),
    );
    await expect(import('../../scripts/e2e-gateway-inference.js')).rejects.toThrow(
      'The installed SDK must match',
    );
    expect(runtimeSuite).not.toHaveBeenCalled();
  });
  it('preserves the original source workflow when no installed package is selected', async () => {
    vi.stubEnv('E2E_RELEASE_SDK_ENTRY', undefined);
    await expect(import('../../scripts/e2e-gateway-inference.js')).rejects.toThrow(
      'Stopped before live credentials',
    );
    expect(runtimeSuite).toHaveBeenCalledOnce();
    expect(runtimeSuite.mock.calls[0][0]).toBe('gateway-inference');
  });
  it('enters the mocked versioned lifecycle only after a matching SDK module loads', async () => {
    vi.stubEnv(
      'E2E_RELEASE_SDK_ENTRY',
      fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
    );
    await expect(import('../../scripts/e2e-gateway-inference.js')).rejects.toThrow(
      'Stopped before live credentials',
    );
    const { SDK_VERSION } = await import('../../src/index.js');
    expect(runtimeSuite).toHaveBeenCalledOnce();
    expect(runtimeSuite.mock.calls[0][0]).toBe(`release-sdk-inference-v${SDK_VERSION}`);
  });
});
