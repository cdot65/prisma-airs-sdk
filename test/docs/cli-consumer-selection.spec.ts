import { describe, expect, it } from 'vitest';
import { cliReleaseSelection, verifyCliConsumer } from '../../scripts/e2e/cli-consumer.js';
import { SDK_VERSION } from '../../src/constants.js';

describe('versioned CLI consumer evidence', () => {
  it('preserves the historical release baseline when no override is selected', () => {
    expect(cliReleaseSelection()).toEqual({
      cliVersion: '4.3.1',
      sdkVersion: '0.24.0',
      suffix: '',
    });
  });
  it.each(['4.4.0', '5.120.34', '0.0.0'])(
    'isolates stable %s against the current SDK',
    (version) => {
      expect(cliReleaseSelection(version)).toEqual({
        cliVersion: version,
        sdkVersion: SDK_VERSION,
        suffix: `-v${version}`,
      });
    },
  );
  it.each(['', 'v4.4.0', '4.4', '04.4.0', '4.4.0-beta', '../4.4.0', '4.4.0\n'])(
    'rejects unsafe or ambiguous version %j',
    (version) => {
      expect(() => cliReleaseSelection(version)).toThrow();
    },
  );
  it.each(['relative/dist/cli/index.js', '/nonexistent-prisma-airs-consumer/dist/cli/index.js'])(
    'rejects unavailable consumers: %s',
    (entry) => {
      expect(() => verifyCliConsumer(entry, cliReleaseSelection('4.4.0'))).toThrow();
    },
  );
});
