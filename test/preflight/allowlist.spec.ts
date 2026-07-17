import { describe, it, expect } from 'vitest';
import { isAllowlisted, PREFLIGHT_ALLOWLIST } from '../../scripts/preflight/allowlist.js';
import type { DriftFinding } from '../../scripts/preflight/diff-schemas.js';

const baseFinding: DriftFinding = {
  schemaName: 'X',
  path: '$',
  kind: 'extra-field',
  message: 'msg',
};

describe('isAllowlisted', () => {
  it('returns false for a schema with no allowlist entries', () => {
    expect(isAllowlisted({ ...baseFinding, schemaName: 'NoEntries', path: '$.foo' })).toBe(false);
  });

  it('returns true when schema, kind, and path substring all match', () => {
    expect(
      isAllowlisted({
        ...baseFinding,
        schemaName: 'DataProtectionObject',
        path: '$.database-security',
        kind: 'extra-field',
      }),
    ).toBe(true);
  });

  it('returns false when path substring does not match', () => {
    expect(
      isAllowlisted({
        ...baseFinding,
        schemaName: 'DataProtectionObject',
        path: '$.unrelated-field',
        kind: 'extra-field',
      }),
    ).toBe(false);
  });

  it('returns false when kind does not match (entry constrains kind)', () => {
    expect(
      isAllowlisted({
        ...baseFinding,
        schemaName: 'DataProtectionObject',
        path: '$.database-security',
        kind: 'missing-required-field',
      }),
    ).toBe(false);
  });

  it.each([
    ['PromptDetected', '$'],
    ['ScanIdResult', '$.result.prompt_detected'],
    ['ScanResponse', '$.prompt_detected'],
  ])('acknowledges live-observed source_code drift for %s', (schemaName, path) => {
    expect(
      isAllowlisted({
        ...baseFinding,
        schemaName,
        path,
        kind: 'extra-field',
      }),
    ).toBe(true);
  });

  it('every entry has a non-empty reason', () => {
    for (const entry of PREFLIGHT_ALLOWLIST) {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it('every entry has a schema and pathSubstring', () => {
    for (const entry of PREFLIGHT_ALLOWLIST) {
      expect(entry.schema.length).toBeGreaterThan(0);
      expect(entry.pathSubstring.length).toBeGreaterThan(0);
    }
  });
});
