import type { AISecSDKProblemDetails } from '../errors.js';

// Only protocol/validation vocabulary is publishable. Blacklisting credentials or quoting
// rejected values is insufficient: any title, detail or property can contain dictionary words.
const safeText = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Method Not Allowed',
  'Conflict',
  'Unsupported Media Type',
  'Unprocessable Entity',
  'Too Many Requests',
  'Internal Server Error',
  'Bad Gateway',
  'Service Unavailable',
  'Gateway Timeout',
  'Validation failed',
  'Invalid request payload',
  'Access denied',
  'must not be blank',
  'must not be null',
  'must not be empty',
  'is required',
  "Required request part 'json' is not present",
  "Required request part 'file' is not present",
  "Content-Type 'application/octet-stream' is not supported",
  "Content-Type 'text/plain' is not supported",
]);
const safeProperties = new Set([
  'name',
  'category',
  'description',
  'type',
  'classification',
  'tags',
  'file',
  'json',
  'originalFileName',
  'original_file_name',
  'regionName',
  'region_name',
  'isCaseSensitive',
  'is_case_sensitive',
  'profileType',
  'profile_type',
  'detectionRules',
  'detection_rules',
  'dataPatterns',
  'data_patterns',
  'supportedConfidenceLevels',
  'supported_confidence_levels',
]);

/** @internal Decode only allowlisted diagnostics; never retain raw bodies or extensions. */
export function parseProblemDetails(body: string): AISecSDKProblemDetails | undefined {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (!('title' in record || 'detail' in record || 'errors' in record)) return undefined;
  // Other AIRS APIs use message/error_message/msg alongside an unrelated errors
  // extension. Do not reinterpret those established envelopes as RFC 7807.
  if (
    !('title' in record || 'detail' in record) &&
    ('message' in record ||
      'error_message' in record ||
      'msg' in record ||
      'data' in record ||
      'error' in record)
  )
    return undefined;
  const problem: AISecSDKProblemDetails = { redacted: false };
  const sanitize = (text: unknown, allowed: Set<string>): string => {
    if (typeof text === 'string' && allowed.has(text)) return text;
    problem.redacted = true;
    return '[withheld]';
  };
  if (record.title != null) problem.title = sanitize(record.title, safeText);
  if (record.detail != null) problem.detail = sanitize(record.detail, safeText);
  if (Array.isArray(record.errors)) {
    problem.errors = record.errors.slice(0, 20).map((entry: unknown) => {
      const field = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
      return {
        property: sanitize(field.property, safeProperties),
        reason: sanitize(field.reason, safeText),
      };
    });
    if (record.errors.length > 20) problem.redacted = true;
  } else if (record.errors != null) problem.redacted = true;
  return problem;
}

/** @internal Render sanitized diagnostics without duplicating equal title and detail. */
export function problemMessage(problem: AISecSDKProblemDetails, status: number): string {
  const parts = [
    ...new Set(
      [problem.title, problem.detail].filter((part): part is string => part !== undefined),
    ),
  ];
  for (const error of problem.errors ?? []) parts.push(`${error.property}: ${error.reason}`);
  return [`API error ${status}`, ...parts].join('; ');
}
