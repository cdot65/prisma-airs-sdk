import { describe, it, expect } from 'vitest';
import { isValidUuid, generatePayloadHash, validateJobId } from '../src/utils.js';
import { AISecSDKException, ErrorType } from '../src/errors.js';

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

describe('validateJobId', () => {
  it('does not throw for valid UUID', () => {
    expect(() => validateJobId('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
  });

  it('throws AISecSDKException with USER_REQUEST_PAYLOAD_ERROR for invalid UUID', () => {
    expect(() => validateJobId('not-a-uuid')).toThrow(AISecSDKException);
    try {
      validateJobId('bad-id');
    } catch (e) {
      expect(e).toBeInstanceOf(AISecSDKException);
      expect((e as AISecSDKException).errorType).toBe(ErrorType.USER_REQUEST_PAYLOAD_ERROR);
      expect((e as AISecSDKException).message).toContain('Invalid job id: bad-id');
    }
  });
});
