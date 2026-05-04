import { describe, it, expect } from 'vitest';
import { assertUuid, assertLength } from '../src/validators.js';
import { AISecSDKException, ErrorType } from '../src/errors.js';

describe('assertUuid', () => {
  it('accepts canonical v4 UUID', () => {
    expect(() => assertUuid('550e8400-e29b-41d4-a716-446655440000', 'scanId')).not.toThrow();
  });

  it('accepts mixed-case UUID', () => {
    expect(() => assertUuid('550E8400-E29B-41D4-A716-446655440000', 'jobId')).not.toThrow();
  });

  it('throws USER_REQUEST_PAYLOAD_ERROR on malformed UUID', () => {
    try {
      assertUuid('not-a-uuid', 'scanId');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AISecSDKException);
      expect((err as AISecSDKException).errorType).toBe(ErrorType.USER_REQUEST_PAYLOAD_ERROR);
      expect((err as Error).message).toContain('scanId');
      expect((err as Error).message).toContain('not-a-uuid');
    }
  });

  it('throws on empty string', () => {
    expect(() => assertUuid('', 'reportId')).toThrow(AISecSDKException);
  });

  it('throws on UUID with extra characters', () => {
    expect(() => assertUuid('550e8400-e29b-41d4-a716-446655440000-extra', 'scanId')).toThrow(
      AISecSDKException,
    );
  });

  it('embeds field name in error message', () => {
    try {
      assertUuid('bad', 'targetId');
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).toMatch(/targetId/);
    }
  });
});

describe('assertLength', () => {
  it('accepts string at min boundary', () => {
    expect(() => assertLength('abc', 3, 10, 'name')).not.toThrow();
  });

  it('accepts string at max boundary', () => {
    expect(() => assertLength('abcdefghij', 3, 10, 'name')).not.toThrow();
  });

  it('accepts string in range', () => {
    expect(() => assertLength('hello', 1, 100, 'description')).not.toThrow();
  });

  it('throws when shorter than min', () => {
    try {
      assertLength('ab', 3, 10, 'name');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AISecSDKException);
      expect((err as AISecSDKException).errorType).toBe(ErrorType.USER_REQUEST_PAYLOAD_ERROR);
      expect((err as Error).message).toContain('name');
    }
  });

  it('throws when longer than max', () => {
    expect(() => assertLength('abcdefghijk', 3, 10, 'name')).toThrow(AISecSDKException);
  });

  it('embeds field name and bounds in error message', () => {
    try {
      assertLength('x', 5, 20, 'sessionId');
      expect.fail('should have thrown');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/sessionId/);
      expect(msg).toMatch(/5/);
      expect(msg).toMatch(/20/);
    }
  });
});
