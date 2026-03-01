import { describe, it, expect } from 'vitest';
import { isValidUuid, generatePayloadHash } from '../src/utils.js';

describe('isValidUuid', () => {
  it('accepts valid v4 uuid', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects short strings', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });
});

describe('generatePayloadHash', () => {
  it('returns hex string', () => {
    const hash = generatePayloadHash('hello', 'secret');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const a = generatePayloadHash('data', 'key');
    const b = generatePayloadHash('data', 'key');
    expect(a).toBe(b);
  });

  it('differs for different payloads', () => {
    const a = generatePayloadHash('data1', 'key');
    const b = generatePayloadHash('data2', 'key');
    expect(a).not.toBe(b);
  });
});
