import { createHash } from 'node:crypto';
import { HEADER_API_KEY, HEADER_AUTH_TOKEN } from '../constants.js';

/**
 * @internal
 * Opt-in request/response debug logging for the AIRS SDK. Enabled via the
 * `PANW_AI_SEC_DEBUG` environment variable. Access-token header values are
 * replaced with a non-reversible `sha256:<prefix>` hash so logs are safe to
 * share while still correlating which token a request used.
 *
 * When disabled there is zero output and zero work beyond a single env read.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/** Header names whose values must be hashed before logging (compared case-insensitively). */
const SENSITIVE_HEADERS = new Set([HEADER_AUTH_TOKEN.toLowerCase(), HEADER_API_KEY.toLowerCase()]);

const PREFIX = '[airs-sdk]';

/** True when `PANW_AI_SEC_DEBUG` is set to a truthy value (`1`/`true`/`yes`/`on`, case-insensitive). */
export function isDebugEnabled(): boolean {
  const raw = process.env.PANW_AI_SEC_DEBUG;
  return raw !== undefined && TRUTHY.has(raw.trim().toLowerCase());
}

/** Hash a secret to a stable, non-reversible `sha256:<12 hex>` token for logging. */
export function hashToken(value: string): string {
  return 'sha256:' + createHash('sha256').update(value).digest('hex').slice(0, 12);
}

/**
 * Return a copy of `headers` with sensitive auth values replaced by {@link hashToken}.
 * Non-sensitive headers pass through unchanged. The input object is not mutated.
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? hashToken(value) : value;
  }
  return out;
}

/** Log an outbound request. Headers are sanitized here so callers cannot leak a raw token. */
export function logRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): void {
  console.error(`${PREFIX} → ${method} ${url}`);
  console.error(`${PREFIX}   headers ${JSON.stringify(sanitizeHeaders(headers))}`);
  if (body !== undefined) console.error(`${PREFIX}   body ${body}`);
}

/** Log a response: status, elapsed milliseconds, and (optionally) the body. */
export function logResponse(status: number, ms: number, body?: string): void {
  console.error(`${PREFIX} ← ${status} (${ms}ms)${body !== undefined ? ` ${body}` : ''}`);
}
