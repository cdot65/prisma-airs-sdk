// src/http-retry.ts — shared retry logic for HTTP clients

import { HTTP_FORCE_RETRY_STATUS_CODES } from './constants.js';
import { AISecSDKException, ErrorType } from './errors.js';
import { parseProblemDetails, problemMessage } from './http/problem.js';

/**
 * @internal
 * Sleep for the given number of milliseconds.
 * @param ms - Milliseconds to wait.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * @internal
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
 * @internal
 * Check if an HTTP status code should trigger a retry.
 * @param status - HTTP status code.
 */
export function isRetryableStatus(status: number): boolean {
  return HTTP_FORCE_RETRY_STATUS_CODES.includes(status);
}

/**
 * @internal
 * Classify an HTTP status code as server-side or client-side error.
 * @param status - HTTP status code.
 */
export function classifyErrorType(status: number): ErrorType {
  return status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR;
}

/**
 * @internal
 * Extract a human-readable error message from an API error response body.
 *
 * Tries, in order: `error_message`, `message`, `data.message` (the AI Gateway app-RBAC
 * shape, `{success:false,data:{message,errorCode}}`), `error.message`, and `msg` (the SCM
 * OPA-denial shape, `{"msg":"Access denied"}`). When the body carries an `errorCode` (e.g.
 * AI Gateway's `AB01`/`AB02`/`AB03`), it is appended to the message so callers can act on
 * the distinction without inspecting headers — see PRD-ai-gateway-client.md "Failure modes".
 *
 * @param body - Raw response body string.
 * @param status - HTTP status code for fallback message.
 */
export function extractErrorMessage(body: string, status: number): string {
  const problem = parseProblemDetails(body);
  if (problem) return problemMessage(problem, status);
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const data = parsed.data as Record<string, unknown> | undefined;
    const code = (data?.errorCode as string | undefined) ?? undefined;
    const base =
      (parsed.error_message as string) ??
      (parsed.message as string) ??
      (data?.message as string) ??
      ((parsed.error as Record<string, unknown> | undefined)?.message as string) ??
      (parsed.msg as string) ??
      `API error ${status}`;
    return code ? `${base} (errorCode: ${code})` : base;
  } catch {
    return body ? `API error ${status}: ${body}` : `API error ${status}`;
  }
}

/** @internal Normalize a Retry-After delta-seconds or HTTP-date header to milliseconds. */
export function parseRetryAfterHeader(value: string | null): number | undefined {
  if (value === null) return undefined;
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const milliseconds = Number(normalized) * 1_000;
    return Number.isFinite(milliseconds) ? milliseconds : undefined;
  }
  const weekday = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
  const longWeekday = '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)';
  const month = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
  const httpDatePatterns = [
    new RegExp(`^${weekday}, \\d{2} ${month} \\d{4} \\d{2}:\\d{2}:\\d{2} GMT$`),
    new RegExp(`^${longWeekday}, \\d{2}-${month}-\\d{2} \\d{2}:\\d{2}:\\d{2} GMT$`),
    new RegExp(`^${weekday} ${month} [ \\d]\\d \\d{2}:\\d{2}:\\d{2} \\d{4}$`),
  ];
  if (!httpDatePatterns.some((pattern) => pattern.test(normalized))) return undefined;
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, timestamp - Date.now());
}

/** @internal Normalize AIRS JSON retry guidance to milliseconds. */
export function parseRetryAfterBody(body: string): number | undefined {
  try {
    const parsed = JSON.parse(body) as { retry_after?: { interval?: unknown; unit?: unknown } };
    const interval = parsed.retry_after?.interval;
    const unit = parsed.retry_after?.unit;
    if (typeof interval !== 'number' || !Number.isFinite(interval) || interval < 0)
      return undefined;
    if (typeof unit !== 'string') return undefined;
    const unitMultipliers: Record<string, number> = {
      ms: 1,
      msec: 1,
      msecs: 1,
      millisecond: 1,
      milliseconds: 1,
      s: 1_000,
      sec: 1_000,
      secs: 1_000,
      second: 1_000,
      seconds: 1_000,
      m: 60_000,
      min: 60_000,
      mins: 60_000,
      minute: 60_000,
      minutes: 60_000,
    };
    const multiplier = unitMultipliers[unit.toLowerCase()];
    if (multiplier === undefined) return undefined;
    const milliseconds = interval * multiplier;
    return Number.isFinite(milliseconds) ? milliseconds : undefined;
  } catch {
    return undefined;
  }
}

/** @internal Options for {@link executeWithRetry}. */
export interface RetryOptions {
  /** Maximum number of retry attempts. */
  maxRetries: number;
  /** Only allowlisted problem diagnostics may be published for sensitive services. */
  safeErrorMessages?: boolean;
  /** Cancel attempts and backoff when the caller stops the operation. */
  signal?: AbortSignal;
  /** Function that performs the HTTP request for each attempt. */
  execute: (attempt: number) => Promise<Response>;
  /** Optional callback for handling special failure cases (e.g. 401 token refresh). Return true to retry without consuming the retry budget. */
  onRetryableFailure?: (response: Response, attempt: number) => Promise<boolean>;
  /** Optional body reader carrying the attempt deadline through HTTP error handling. */
  readErrorBody?: (response: Response) => Promise<string>;
}

/** Release an unused retry response without letting a broken stream mask the HTTP failure. */
function discardResponse(response: Response): void {
  try {
    void response.body?.cancel().catch(() => {});
  } catch {
    /* Already locked/closed stream. */
  }
}

/**
 * @internal
 * Execute an HTTP request with exponential backoff retry.
 * @param opts - Retry configuration and request function.
 * @returns Successful HTTP Response.
 * @throws {AISecSDKException} After exhausting retries or on non-retryable errors.
 */
export async function executeWithRetry(opts: RetryOptions): Promise<Response> {
  const { maxRetries, execute, onRetryableFailure, signal } = opts;
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 5) {
    throw new AISecSDKException(
      'maxRetries must be an integer between 0 and 5',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
  let lastError: Error | undefined;
  let specialRetryUsed = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    signal?.throwIfAborted();
    let response: Response;
    try {
      response = await execute(attempt);
    } catch (err) {
      if (signal?.aborted) throw signal.reason;
      if (err instanceof AISecSDKException) throw err;
      lastError = err instanceof Error ? err : new Error('Network error');
      if (attempt < maxRetries) {
        await sleep(backoffDelay(attempt), signal);
        continue;
      }
      throw new AISecSDKException(
        opts.safeErrorMessages ? 'Network request failed' : (lastError.message ?? 'Network error'),
        ErrorType.CLIENT_SIDE_ERROR,
        { failureKind: 'network' },
      );
    }

    if (response.ok) return response;

    // Let caller handle special status codes (e.g. 401 token refresh)
    // When handled, decrement attempt so it doesn't count against retry budget
    if (onRetryableFailure && !specialRetryUsed) {
      const handled = await onRetryableFailure(response, attempt);
      if (handled) {
        specialRetryUsed = true;
        discardResponse(response);
        attempt--;
        continue;
      }
    }

    if (isRetryableStatus(response.status) && attempt < maxRetries) {
      const retryAfterMs = parseRetryAfterHeader(response.headers?.get?.('Retry-After') ?? null);
      discardResponse(response);
      // Bound server-directed waits so a CLI cannot be parked for an unbounded duration.
      await sleep(Math.min(retryAfterMs ?? backoffDelay(attempt), 60_000), signal);
      continue;
    }

    // Non-retryable error
    let errorText = '';
    try {
      errorText = await (opts.readErrorBody ? opts.readErrorBody(response) : response.text());
    } catch {
      if (signal?.aborted) throw signal.reason;
    }
    const problem = parseProblemDetails(errorText);
    const errorMessage = problem
      ? problemMessage(problem, response.status)
      : opts.safeErrorMessages
        ? `API error ${response.status}`
        : extractErrorMessage(errorText, response.status);
    const retryAfterHeader = response.headers?.get?.('Retry-After') ?? null;
    const headerRetryAfterMs = parseRetryAfterHeader(retryAfterHeader);
    throw new AISecSDKException(errorMessage, classifyErrorType(response.status), {
      problem,
      failureKind: 'http',
      statusCode: response.status,
      retryAfterMs: headerRetryAfterMs ?? parseRetryAfterBody(errorText),
    });
  }

  throw new AISecSDKException(
    lastError?.message ?? 'Max retries exceeded',
    ErrorType.CLIENT_SIDE_ERROR,
    lastError ? { failureKind: 'network' } : {},
  );
}
