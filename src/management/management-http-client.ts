import { USER_AGENT } from '../constants.js';
import { executeWithRetry } from '../http-retry.js';
import type { OAuthClient } from './oauth-client.js';

/** @internal Options for a management API HTTP request. */
export interface MgmtHttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  baseUrl: string;
  path: string;
  body?: unknown;
  params?: Record<string, string | string[]>;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** @internal Typed management API HTTP response. */
export interface MgmtHttpResponse<T = unknown> {
  status: number;
  data: T;
}

/**
 * @internal Execute an authenticated HTTP request against the management API.
 * Handles OAuth token refresh on 401/403 and retries with exponential backoff.
 * @param opts - Request options including method, path, body, and auth.
 * @returns Typed response with HTTP status and parsed JSON body.
 */
export async function managementHttpRequest<T>(
  opts: MgmtHttpRequestOptions,
): Promise<MgmtHttpResponse<T>> {
  const { method, baseUrl, path, body, params, oauthClient, numRetries } = opts;
  let hadTokenRefresh = false;

  const response = await executeWithRetry({
    maxRetries: numRetries,
    execute: async () => {
      const token = await oauthClient.getToken();
      const stripped = baseUrl.replace(/\/+$/, '');
      const url = new URL(`${stripped}${path}`);

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (Array.isArray(value)) {
            for (const v of value) {
              url.searchParams.append(key, v);
            }
          } else {
            url.searchParams.set(key, value);
          }
        }
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
      };

      let bodyStr: string | undefined;
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        bodyStr = JSON.stringify(body);
      }

      return fetch(url.toString(), { method, headers, body: bodyStr });
    },
    onRetryableFailure: async (response) => {
      if ((response.status === 401 || response.status === 403) && !hadTokenRefresh) {
        hadTokenRefresh = true;
        oauthClient.clearToken();
        return true;
      }
      return false;
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  return { status: response.status, data };
}
