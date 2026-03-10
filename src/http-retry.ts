// src/http-retry.ts — shared retry logic for HTTP clients

import { HTTP_FORCE_RETRY_STATUS_CODES } from './constants.js';
import { AISecSDKException, ErrorType } from './errors.js';

/**
 * Sleep for the given number of milliseconds.
 * @param ms - Milliseconds to wait.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with full jitter for the given attempt.
 * Uses the "full jitter" strategy: uniform random in [0, 2^attempt * 1000].
 * @param attempt - Zero-based attempt number.
 * @returns Delay in milliseconds.
 */
export function backoffDelay(attempt: number): number {
  const maxDelay = Math.pow(2, attempt) * 1000;
  return Math.floor(Math.random() * (maxDelay + 1));
}

/**
 * Check if an HTTP status code should trigger a retry.
 * @param status - HTTP status code.
 */
export function isRetryableStatus(status: number): boolean {
  return HTTP_FORCE_RETRY_STATUS_CODES.includes(status);
}

/**
 * Classify an HTTP status code as server-side or client-side error.
 * @param status - HTTP status code.
 */
export function classifyErrorType(status: number): ErrorType {
  return status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR;
}

/**
 * Extract a human-readable error message from an API error response body.
 * Tries `error_message`, `message`, and `error.message` fields in order.
 * @param body - Raw response body string.
 * @param status - HTTP status code for fallback message.
 */
export function extractErrorMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return (
      (parsed.error_message as string) ??
      (parsed.message as string) ??
      ((parsed.error as Record<string, unknown> | undefined)?.message as string) ??
      `API error ${status}`
    );
  } catch {
    return body ? `API error ${status}: ${body}` : `API error ${status}`;
  }
}

/** Options for {@link executeWithRetry}. */
export interface RetryOptions {
  /** Maximum number of retry attempts. */
  maxRetries: number;
  /** Function that performs the HTTP request for each attempt. */
  execute: (attempt: number) => Promise<Response>;
  /** Optional callback for handling special failure cases (e.g. 401 token refresh). Return true to retry without consuming the retry budget. */
  onRetryableFailure?: (response: Response, attempt: number) => Promise<boolean>;
}

/**
 * Execute an HTTP request with exponential backoff retry.
 * @param opts - Retry configuration and request function.
 * @returns Successful HTTP Response.
 * @throws {AISecSDKException} After exhausting retries or on non-retryable errors.
 */
export async function executeWithRetry(opts: RetryOptions): Promise<Response> {
  const { maxRetries, execute, onRetryableFailure } = opts;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response;
    try {
      response = await execute(attempt);
    } catch (err) {
      if (err instanceof AISecSDKException) throw err;
      lastError = err as Error;
      if (attempt < maxRetries) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw new AISecSDKException(
        lastError.message ?? 'Network error',
        ErrorType.CLIENT_SIDE_ERROR,
      );
    }

    if (response.ok) return response;

    // Let caller handle special status codes (e.g. 401 token refresh)
    // When handled, decrement attempt so it doesn't count against retry budget
    if (onRetryableFailure) {
      const handled = await onRetryableFailure(response, attempt);
      if (handled) {
        attempt--;
        continue;
      }
    }

    if (isRetryableStatus(response.status) && attempt < maxRetries) {
      await sleep(backoffDelay(attempt));
      continue;
    }

    // Non-retryable error
    const errorText = await response.text();
    const errorMessage = extractErrorMessage(errorText, response.status);
    throw new AISecSDKException(errorMessage, classifyErrorType(response.status));
  }

  throw new AISecSDKException(
    lastError?.message ?? 'Max retries exceeded',
    ErrorType.CLIENT_SIDE_ERROR,
  );
}
