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
  });
});
