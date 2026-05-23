import type { z } from 'zod';

/** @internal HTTP methods supported by the request pipeline. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * @internal
 * The in-flight request as an {@link AuthAdapter} sees it. Body is JSON-serialized to `bodyText`
 * before the adapter runs; adapters mutate headers, not body, by convention.
 */
export interface PreparedRequest {
  method: HttpMethod;
  url: URL;
  headers: Record<string, string>;
  bodyText?: string;
}

/**
 * @internal
 * Plug-point for authentication strategy. `prepare()` augments outgoing requests (typically with
 * auth headers). `onUnauthorized()` is called at most once per request after a retryable auth
 * failure; returning `true` triggers a free retry that does not consume the retry budget.
 */
export interface AuthAdapter {
  prepare(req: PreparedRequest): Promise<PreparedRequest>;
  onUnauthorized?(res: Response): Promise<boolean>;
}

/**
 * @internal
 * Declarative description of one endpoint call.
 */
export interface RequestSpec<TResponse = void> {
  method: HttpMethod;
  baseUrl: string;
  path: string;
  params?: Record<string, string | string[]>;
  body?: unknown;
  /**
   * Override the request Content-Type when a JSON `body` is sent. Defaults to `application/json`.
   * Used by DLP endpoints that require `application/merge-patch+json` (RFC 7396).
   * Ignored when `body` is omitted or when `formData` is set.
   */
  contentType?: string;
  /**
   * Multipart payload. When set, the body is sent as-is and Content-Type is left to the runtime
   * (so the browser/Node fetch impl writes the correct multipart boundary). Takes precedence
   * over `body`.
   */
  formData?: FormData;
  // `any` for Zod's def/input generics so schemas where input ≠ output (e.g. those built with
  // `.default()` or `.passthrough()`) still satisfy the constraint. Only the parsed output shape
  // is consumed at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema?: z.ZodType<TResponse, any, any>;
  numRetries: number;
  auth: AuthAdapter;
}
