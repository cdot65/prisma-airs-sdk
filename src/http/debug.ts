import { createHash } from 'node:crypto';
import { HEADER_API_KEY, HEADER_AUTH_TOKEN } from '../constants.js';
import {
  redactAIGatewaySecrets,
  type AIGatewaySecretOperation,
  type GatewaySecretDirection,
} from '../ai-gateway/secret-fields.js';

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
const SENSITIVE_HEADERS = new Set([
  HEADER_AUTH_TOKEN.toLowerCase(),
  HEADER_API_KEY.toLowerCase(),
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-portkey-api-key',
  'x-portkey-config',
  'x-portkey-metadata',
  'x-portkey-forward-headers',
]);
const SENSITIVE_KEYS =
  /^(?:.*(?:secret|password|token|api_?key)|authorization|auth_code|access_id|license_key|auth_header|basic_auth_header|request_headers|oauth2_headers|oauth2_body_params|oauth2_inject_header|script_b64)$/i;

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

/** @internal Redact a JSON debug body; fail closed when a marked body is not valid JSON. */
export function sanitizeAIGatewayDebugBody(
  body: string,
  operation: AIGatewaySecretOperation,
  direction: GatewaySecretDirection,
): string {
  try {
    return JSON.stringify(redactAIGatewaySecrets(operation, JSON.parse(body), direction));
  } catch {
    return '[BODY OMITTED: REDACTION FAILED]';
  }
}

/** @internal Redact credentials in query strings, including OAuth invalidation tokens. */
export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.username) url.username = '[REDACTED]';
    if (url.password) url.password = '[REDACTED]';
    for (const key of new Set(url.searchParams.keys()))
      if (SENSITIVE_KEYS.test(key.replaceAll('-', '_'))) url.searchParams.set(key, '[REDACTED]');
    return url.toString();
  } catch {
    return '[INVALID URL OMITTED]';
  }
}

/** @internal Body logging requires separate opt-in; even then known credential fields are redacted. */
export function sanitizeDebugBody(body: string): string {
  try {
    const redact = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(redact);
      if (!value || typeof value !== 'object') return value;
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(record).map(([key, item]) => [
          key,
          SENSITIVE_KEYS.test(key.replaceAll('-', '_')) ||
          (key === 'value' && record.type === 'SECRET')
            ? '[REDACTED]'
            : redact(item),
        ]),
      );
    };
    return JSON.stringify(redact(JSON.parse(body)));
  } catch {
    return '[NON-JSON BODY OMITTED]';
  }
}

/** Log an outbound request. Headers are sanitized here so callers cannot leak a raw token. */
export function logRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): void {
  console.error(`${PREFIX} → ${method} ${sanitizeUrl(url)}`);
  console.error(`${PREFIX}   headers ${JSON.stringify(sanitizeHeaders(headers))}`);
  if (body !== undefined)
    console.error(
      `${PREFIX}   body ${body.startsWith('[BODY OMITTED') ? body : sanitizeDebugBody(body)}`,
    );
}

/** Log a response: status, elapsed milliseconds, and (optionally) the body. */
export function logResponse(status: number, ms: number, body?: string): void {
  console.error(
    `${PREFIX} ← ${status} (${ms}ms)${body !== undefined ? ` ${body.startsWith('[BODY OMITTED') ? body : sanitizeDebugBody(body)}` : ''}`,
  );
}
