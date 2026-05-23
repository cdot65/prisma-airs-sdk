import { USER_AGENT } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { executeWithRetry } from '../http-retry.js';
import type { PreparedRequest, RequestSpec } from './types.js';

/**
 * @internal
 * Execute a single AIRS API request: build URL + headers + body, run the auth adapter, retry per
 * the spec's budget, and (if a response schema is declared) validate the response body.
 *
 * Returns the parsed response when `responseSchema` is provided, or `undefined` when omitted.
 *
 * Throws {@link AISecSDKException}:
 * - `RESPONSE_VALIDATION` if a 2xx body is invalid JSON or fails the schema.
 * - `CLIENT_SIDE_ERROR` for 4xx (or after `onUnauthorized` declines a 401/403).
 * - `SERVER_SIDE_ERROR` for 5xx after exhausting retries.
 */
export async function request<TResponse = void>(spec: RequestSpec<TResponse>): Promise<TResponse> {
  let hasRetriedAuth = false;

  const response = await executeWithRetry({
    maxRetries: spec.numRetries,
    execute: async () => {
      const baseUrl = spec.baseUrl.replace(/\/+$/, '');
      const url = new URL(`${baseUrl}${spec.path}`);
      if (spec.params) {
        for (const [key, value] of Object.entries(spec.params)) {
          if (Array.isArray(value)) {
            for (const v of value) url.searchParams.append(key, v);
          } else {
            url.searchParams.set(key, value);
          }
        }
      }

      const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
      let bodyText: string | undefined;
      let bodyForFetch: FormData | string | undefined;
      if (spec.formData !== undefined) {
        bodyForFetch = spec.formData;
      } else if (spec.body !== undefined) {
        headers['Content-Type'] = spec.contentType ?? 'application/json';
        bodyText = JSON.stringify(spec.body);
        bodyForFetch = bodyText;
      }

      const prepared: PreparedRequest = { method: spec.method, url, headers, bodyText };
      const final = await spec.auth.prepare(prepared);

      return fetch(final.url.toString(), {
        method: final.method,
        headers: final.headers,
        body: spec.formData !== undefined ? bodyForFetch : final.bodyText,
      });
    },
    onRetryableFailure: async (res) => {
      if (hasRetriedAuth) return false;
      if (!spec.auth.onUnauthorized) return false;
      const should = await spec.auth.onUnauthorized(res);
      if (should) {
        hasRetriedAuth = true;
        return true;
      }
      return false;
    },
  });

  const text = await response.text();

  if (!spec.responseSchema) {
    return undefined as TResponse;
  }

  // Endpoints that may return either 200+body or 204+no-body (e.g. DLP dictionaries PUT)
  // opt into returning `undefined` when the body is empty rather than the usual `{}`
  // hydration. Skips schema validation entirely on empty body.
  if (spec.allowEmptyBody && !text) {
    return undefined as TResponse;
  }

  let parsed: unknown;
  try {
    // Hydrate empty 2xx bodies as `{}` so all-optional-fields schemas parse cleanly
    // (the AIRS API returns no body when an endpoint has zero results, e.g.
    // /v1/mgmt/scanlogs with no logs in the requested time range). Schemas with
    // required fields will still fail validation, but on a specific path rather
    // than the cryptic root-level `expected object, received undefined`.
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new AISecSDKException('Response body is not valid JSON', ErrorType.RESPONSE_VALIDATION);
  }

  const result = spec.responseSchema.safeParse(parsed);
  if (!result.success) {
    throw new AISecSDKException(
      `Response did not match schema: ${result.error.message}`,
      ErrorType.RESPONSE_VALIDATION,
    );
  }
  return result.data;
}
