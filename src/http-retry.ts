// src/http-retry.ts — shared retry logic for HTTP clients

import { HTTP_FORCE_RETRY_STATUS_CODES } from './constants.js';
import { AISecSDKException, ErrorType } from './errors.js';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function backoffDelay(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}

export function isRetryableStatus(status: number): boolean {
  return HTTP_FORCE_RETRY_STATUS_CODES.includes(status);
}

export function classifyErrorType(status: number): ErrorType {
  return status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR;
}

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

export interface RetryOptions {
  maxRetries: number;
  execute: (attempt: number) => Promise<Response>;
  onRetryableFailure?: (response: Response, attempt: number) => Promise<boolean>;
}

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
