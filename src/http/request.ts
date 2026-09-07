import { USER_AGENT } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { executeWithRetry } from '../http-retry.js';
import { isDebugEnabled, logRequest, logResponse, sanitizeAIGatewayDebugBody } from './debug.js';
import type { PreparedRequest, RequestSpec } from './types.js';
import { abortable, deadline } from './abort.js';

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
  const timeoutMs = spec.timeoutMs ?? Number(process.env.PANW_AI_SEC_TIMEOUT_MS ?? 60_000);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new AISecSDKException(
      'timeoutMs must be a positive integer',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
  let validatedBody = spec.body;
  if (spec.requestSchema !== undefined) {
    const result = spec.requestSchema.safeParse(spec.body);
    if (!result.success) {
      const issues = result.error.issues
        .map(
          // Zod messages can quote rejected enum/literal values, including credentials.
          (issue) => `${issue.path.length > 0 ? issue.path.join('.') : '<root>'}: ${issue.code}`,
        )
        .join('; ');
      throw new AISecSDKException(
        `Request body for ${spec.method} ${spec.path} did not match schema: ${issues}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    validatedBody = result.data;
  }

  const baseUrl = spec.baseUrl.replace(/\/+$/, '');
  const url = new URL(`${baseUrl}${spec.path}`);
  for (const [key, value] of Object.entries(spec.params ?? {})) {
    if (Array.isArray(value)) for (const item of value) url.searchParams.append(key, item);
    else url.searchParams.set(key, value);
  }
  const formData = spec.encodeFormData ? spec.encodeFormData(validatedBody) : spec.formData;
  let bodyText: string | undefined;
  if (formData === undefined && validatedBody !== undefined) {
    try {
      bodyText = JSON.stringify(validatedBody, (_key, value: unknown) => {
        // JSON.stringify otherwise silently converts non-finite numbers to null, changing
        // the meaning of a validated payload (including values inside extension maps).
        if (typeof value === 'number' && !Number.isFinite(value))
          throw new Error('Non-finite JSON number');
        return value;
      });
    } catch {
      throw new AISecSDKException(
        'Request body is not JSON serializable',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
  }
  let hasRetriedAuth = false;
  const debug = isDebugEnabled();
  const includeBody =
    debug &&
    /^(1|true|yes|on)$/i.test(process.env.PANW_AI_SEC_DEBUG_BODY?.trim() ?? '') &&
    !spec.omitDebugBody;
  let disposeAttempt = () => {};
  let attemptSignal: AbortSignal | undefined;
  let streaming = false;

  try {
    const response = await executeWithRetry({
      maxRetries: spec.numRetries,
      signal: spec.signal,
      execute: async () => {
        disposeAttempt();
        const attempt = deadline(timeoutMs, spec.signal);
        attemptSignal = attempt.signal;
        disposeAttempt = attempt.dispose;
        attempt.signal.throwIfAborted();
        const headers: Record<string, string> = {
          'User-Agent': USER_AGENT,
          'service-name': 'api',
          ...spec.headers,
        };
        if (bodyText !== undefined) {
          headers['Content-Type'] = spec.contentType ?? 'application/json';
        }

        const prepared: PreparedRequest = {
          method: spec.method,
          url: new URL(url),
          headers,
          bodyText,
        };
        const final = await abortable(spec.auth.prepare(prepared), attempt.signal);

        const startedAt = debug ? Date.now() : 0;
        if (debug) {
          let logBody = formData !== undefined ? '[multipart/form-data]' : final.bodyText;
          if (logBody !== undefined && spec.secretOperation !== undefined) {
            logBody = sanitizeAIGatewayDebugBody(logBody, spec.secretOperation, 'request');
          }
          logRequest(
            final.method,
            final.url.toString(),
            final.headers,
            includeBody ? logBody : '[BODY OMITTED]',
          );
        }

        const res = await abortable(
          (spec.fetch ?? globalThis.fetch)(final.url.toString(), {
            method: final.method,
            headers: final.headers,
            body: formData ?? final.bodyText,
            signal: attempt.signal,
            ...(spec.redirect ? { redirect: spec.redirect } : {}),
          }),
          attempt.signal,
        );

        if (debug) {
          let respBody: string | undefined;
          try {
            respBody = includeBody
              ? await abortable(res.clone().text(), attempt.signal)
              : '[BODY OMITTED]';
            if (respBody && spec.secretOperation !== undefined) {
              respBody = sanitizeAIGatewayDebugBody(respBody, spec.secretOperation, 'response');
            }
          } catch {
            // Response not cloneable (e.g. a test stub) — log status/timing without the body.
          }
          logResponse(res.status, Date.now() - startedAt, respBody);
        }

        return res;
      },
      onRetryableFailure: async (res) => {
        if (hasRetriedAuth) return false;
        if (!spec.auth.onUnauthorized) return false;
        const refresh = spec.auth.onUnauthorized(res);
        let should: boolean;
        try {
          should = attemptSignal ? await abortable(refresh, attemptSignal) : await refresh;
        } catch (error) {
          if (spec.signal?.aborted) throw spec.signal.reason;
          if (attemptSignal?.aborted)
            throw new AISecSDKException(
              'Authentication refresh timed out',
              ErrorType.CLIENT_SIDE_ERROR,
              { failureKind: 'network' },
            );
          throw error;
        }
        if (should) {
          hasRetriedAuth = true;
          return true;
        }
        return false;
      },
      readErrorBody: (res) => (attemptSignal ? abortable(res.text(), attemptSignal) : res.text()),
    });

    if (spec.streamResponse) {
      const stream = spec.streamResponse(response, attemptSignal!, disposeAttempt);
      streaming = true;
      return stream;
    }
    if (spec.responseType === 'bytes') {
      try {
        return new Uint8Array(await abortable(response.arrayBuffer(), attemptSignal!)) as TResponse;
      } catch {
        if (spec.signal?.aborted) throw spec.signal.reason;
        throw new AISecSDKException(
          'Failed to read binary response body',
          ErrorType.CLIENT_SIDE_ERROR,
          { failureKind: 'network', statusCode: response.status },
        );
      }
    }

    let text: string;
    try {
      text = attemptSignal
        ? await abortable(response.text(), attemptSignal)
        : await response.text();
    } catch {
      if (spec.signal?.aborted) throw spec.signal.reason;
      throw new AISecSDKException('Failed to read response body', ErrorType.CLIENT_SIDE_ERROR, {
        failureKind: 'network',
        statusCode: response.status,
      });
    }

    if (spec.responseType === 'text') return text as TResponse;

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
        `Response did not match schema: ${result.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.code}`).join('; ')}`,
        ErrorType.RESPONSE_VALIDATION,
      );
    }
    return result.data;
  } finally {
    if (!streaming) disposeAttempt();
  }
}
