import { describe, expect, it } from 'vitest';
import { isReleaseInferenceHistoryFile } from '../../scripts/e2e/release-history.js';

describe('release inference history inventory', () => {
  const timestamp = '2026-09-07T11-16-35.767Z.json';
  it.each([
    'release-sdk-inference',
    'release-sdk-inference-022',
    'release-sdk-inference-023',
    'release-sdk-inference-024',
    'release-sdk-inference-v0.25.0',
    'release-sdk-inference-v1.120.34',
    'cli-inference',
    'cli-inference-v4.4.0',
    'cli-inference-v5.12.2',
  ])('includes %s without a per-release allowlist change', (suite) => {
    expect(isReleaseInferenceHistoryFile(`${suite}-${timestamp}`)).toBe(true);
  });
  it.each([
    'gateway-inference',
    'cli',
    'release-sdk-inference-025',
    'release-sdk-inference-v0.25.0-beta.1',
    'release-sdk-inference-v0.25',
    'cli-inference-v4.4.0-beta',
    'cli-inference-v4.4',
  ])('does not broaden the audit to an unknown suite: %s', (suite) => {
    expect(isReleaseInferenceHistoryFile(`${suite}-${timestamp}`)).toBe(false);
  });
  it('requires a history timestamp and JSON extension, not a canonical report or traversal', () => {
    for (const file of [
      'release-sdk-inference-v0.25.0.json',
      `../cli-inference-${timestamp}`,
      `cli-inference-${timestamp}.bak`,
    ])
      expect(isReleaseInferenceHistoryFile(file)).toBe(false);
  });
});
