import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, it, expect } from 'vitest';

describe('@example coverage', () => {
  it('every public method/function has an @example', async () => {
    // TypeDoc builds the entire compiler/reflection graph. Keep that work out of
    // Vitest's instrumented worker so it cannot stall coverage/RPC processing.
    // Run the real strict gate, never --warn-only; nonzero exits reject this test.
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        '--import',
        'tsx',
        fileURLToPath(new URL('../../scripts/check-example-coverage.ts', import.meta.url)),
      ],
      {
        cwd: fileURLToPath(new URL('../../', import.meta.url)),
        timeout: 45_000,
        killSignal: 'SIGKILL',
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    );
    expect(stdout).toContain('@example coverage: every public method/function has an @example.');
  }, 60_000);
});
