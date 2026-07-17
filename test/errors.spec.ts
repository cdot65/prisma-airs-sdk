import { describe, it, expect } from 'vitest';
import { AISecSDKException, ErrorType } from '../src/errors.js';

describe('AISecSDKException', () => {
  it('creates with message only', () => {
    const err = new AISecSDKException('something broke');
    expect(err.message).toBe('something broke');
    expect(err.errorType).toBeUndefined();
    expect(err.name).toBe('AISecSDKException');
  });

  it('creates with errorType', () => {
    const err = new AISecSDKException('missing key', ErrorType.MISSING_VARIABLE);
    expect(err.message).toBe(`${ErrorType.MISSING_VARIABLE}:missing key`);
    expect(err.errorType).toBe(ErrorType.MISSING_VARIABLE);
  });

  it('exposes structured failure metadata without changing the legacy constructor', () => {
    const legacy = new AISecSDKException('missing key', ErrorType.MISSING_VARIABLE);
    const structured = new AISecSDKException('rate limited', ErrorType.CLIENT_SIDE_ERROR, {
      failureKind: 'http',
      statusCode: 429,
      retryAfterMs: 2_000,
    });

    expect(legacy).toMatchObject({
      name: 'AISecSDKException',
      message: `${ErrorType.MISSING_VARIABLE}:missing key`,
      errorType: ErrorType.MISSING_VARIABLE,
    });
    expect(legacy.failureKind).toBeUndefined();
    expect(legacy.statusCode).toBeUndefined();
    expect(legacy.retryAfterMs).toBeUndefined();
    expect(Object.keys(legacy)).toEqual(['errorType', 'name']);
    expect(structured).toMatchObject({
      message: `${ErrorType.CLIENT_SIDE_ERROR}:rate limited`,
      errorType: ErrorType.CLIENT_SIDE_ERROR,
      failureKind: 'http',
      statusCode: 429,
      retryAfterMs: 2_000,
    });
  });

  it('is instanceof Error', () => {
    const err = new AISecSDKException('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('has stack trace', () => {
    const err = new AISecSDKException('test');
    expect(err.stack).toBeDefined();
  });
});

describe('ErrorType', () => {
  it('has all expected values', () => {
    expect(ErrorType.SERVER_SIDE_ERROR).toBe('AISEC_SERVER_SIDE_ERROR');
    expect(ErrorType.CLIENT_SIDE_ERROR).toBe('AISEC_CLIENT_SIDE_ERROR');
    expect(ErrorType.USER_REQUEST_PAYLOAD_ERROR).toBe('AISEC_USER_REQUEST_PAYLOAD_ERROR');
    expect(ErrorType.MISSING_VARIABLE).toBe('AISEC_MISSING_VARIABLE');
    expect(ErrorType.AISEC_SDK_ERROR).toBe('AISEC_SDK_ERROR');
    expect(ErrorType.OAUTH_ERROR).toBe('AISEC_OAUTH_ERROR');
    expect(ErrorType.RESPONSE_VALIDATION).toBe('AISEC_RESPONSE_VALIDATION');
  });

  it('RESPONSE_VALIDATION can be thrown and round-tripped', () => {
    const err = new AISecSDKException('schema mismatch', ErrorType.RESPONSE_VALIDATION);
    expect(err.errorType).toBe(ErrorType.RESPONSE_VALIDATION);
    expect(err.message).toContain('schema mismatch');
  });
});
