import { describe, it, expect, vi } from 'vitest';
import {
  sleep,
  backoffDelay,
  isRetryableStatus,
  classifyErrorType,
  extractErrorMessage,
  executeWithRetry,
} from '../src/http-retry.js';
import { AISecSDKException, ErrorType } from '../src/errors.js';

describe('sleep', () => {
  it('resolves after delay', async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});

describe('backoffDelay', () => {
  it('returns delays within jittered range', () => {
    // With jitter, delay should be between 0 and 2^attempt * 1000
    for (let attempt = 0; attempt < 4; attempt++) {
      const max = Math.pow(2, attempt) * 1000;
      const delay = backoffDelay(attempt);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(max);
    }
  });

  it('produces varying delays (jitter)', () => {
    // Run multiple times — with jitter, we should get different values
    const delays = Array.from({ length: 20 }, () => backoffDelay(3));
    const unique = new Set(delays);
    // With true randomness over 20 samples, we should get >1 unique value
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('isRetryableStatus', () => {
  it('returns true for 5xx retry codes', () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(504)).toBe(true);
  });

  it('returns false for non-retryable codes', () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(200)).toBe(false);
    expect(isRetryableStatus(501)).toBe(false);
  });
});

describe('classifyErrorType', () => {
  it('returns SERVER_SIDE_ERROR for 5xx', () => {
    expect(classifyErrorType(500)).toBe(ErrorType.SERVER_SIDE_ERROR);
    expect(classifyErrorType(503)).toBe(ErrorType.SERVER_SIDE_ERROR);
  });

  it('returns CLIENT_SIDE_ERROR for 4xx', () => {
    expect(classifyErrorType(400)).toBe(ErrorType.CLIENT_SIDE_ERROR);
    expect(classifyErrorType(404)).toBe(ErrorType.CLIENT_SIDE_ERROR);
  });
});

describe('extractErrorMessage', () => {
  it('extracts error_message field', () => {
    expect(extractErrorMessage(JSON.stringify({ error_message: 'bad input' }), 400)).toBe(
      'bad input',
    );
  });

  it('falls back to message field', () => {
    expect(extractErrorMessage(JSON.stringify({ message: 'not found' }), 404)).toBe('not found');
  });

  it('falls back to error.message field', () => {
    expect(extractErrorMessage(JSON.stringify({ error: { message: 'nested error' } }), 500)).toBe(
      'nested error',
    );
  });

  it('falls back to generic message for unknown JSON', () => {
    expect(extractErrorMessage(JSON.stringify({ code: 'UNKNOWN' }), 422)).toBe('API error 422');
  });

  it('handles non-JSON body', () => {
    expect(extractErrorMessage('Bad Gateway', 502)).toBe('API error 502: Bad Gateway');
  });

  it('handles empty body', () => {
    expect(extractErrorMessage('', 500)).toBe('API error 500');
  });
});

describe('executeWithRetry', () => {
  it('returns successful response', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const execute = vi.fn().mockResolvedValue(response);

    const result = await executeWithRetry({ maxRetries: 0, execute });
    expect(result).toBe(response);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable status codes', async () => {
    const failResponse = new Response('error', { status: 503 });
    Object.defineProperty(failResponse, 'ok', { value: false });
    const successResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });

    const execute = vi
      .fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await executeWithRetry({ maxRetries: 1, execute });
    expect(result).toBe(successResponse);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('retries on network errors', async () => {
    const successResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });

    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(successResponse);

    const result = await executeWithRetry({ maxRetries: 1, execute });
    expect(result).toBe(successResponse);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries on network error', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(executeWithRetry({ maxRetries: 0, execute })).rejects.toThrow(AISecSDKException);
    await expect(executeWithRetry({ maxRetries: 0, execute })).rejects.toThrow(/network down/);
  });

  it('throws non-retryable errors immediately', async () => {
    const response = new Response(JSON.stringify({ message: 'bad request' }), { status: 400 });
    Object.defineProperty(response, 'ok', { value: false });

    const execute = vi.fn().mockResolvedValue(response);

    await expect(executeWithRetry({ maxRetries: 3, execute })).rejects.toThrow(AISecSDKException);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('rethrows AISecSDKException without wrapping', async () => {
    const sdkError = new AISecSDKException('custom error', ErrorType.MISSING_VARIABLE);
    const execute = vi.fn().mockRejectedValue(sdkError);

    await expect(executeWithRetry({ maxRetries: 1, execute })).rejects.toBe(sdkError);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('calls onRetryableFailure for custom handling', async () => {
    const failResponse = new Response('', { status: 401 });
    Object.defineProperty(failResponse, 'ok', { value: false });
    const successResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });

    const execute = vi
      .fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse);

    const onRetryableFailure = vi.fn().mockResolvedValue(true);

    const result = await executeWithRetry({
      maxRetries: 1,
      execute,
      onRetryableFailure,
    });

    expect(result).toBe(successResponse);
    expect(onRetryableFailure).toHaveBeenCalledWith(failResponse, 0);
  });

  it('falls through when onRetryableFailure returns false', async () => {
    const response = new Response(JSON.stringify({ message: 'unauthorized' }), { status: 401 });
    Object.defineProperty(response, 'ok', { value: false });

    const execute = vi.fn().mockResolvedValue(response);
    const onRetryableFailure = vi.fn().mockResolvedValue(false);

    await expect(executeWithRetry({ maxRetries: 0, execute, onRetryableFailure })).rejects.toThrow(
      AISecSDKException,
    );
  });
});
