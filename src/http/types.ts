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
  responseSchema?: z.ZodType<TResponse>;
  numRetries: number;
  auth: AuthAdapter;
}
