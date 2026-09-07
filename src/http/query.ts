import type { z } from 'zod';
import { AISecSDKException, ErrorType } from '../errors.js';

/** @internal Encode documented query values without dropping false, zero, or empty strings. */
export function queryParams(
  values: Record<string, string | number | boolean | string[] | null | undefined>,
  schema?: z.ZodTypeAny,
): Record<string, string | string[]> {
  if (schema) {
    const parsed = schema.safeParse(values);
    if (!parsed.success)
      throw new AISecSDKException(
        `Query parameters did not match schema: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.code}`).join('; ')}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    values = parsed.data;
  }
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null)
      result[key] = Array.isArray(value) ? value : String(value);
  }
  return result;
}
