import { USER_AGENT } from '../constants.js';
import { executeWithRetry } from '../http-retry.js';
import type { OAuthClient } from './oauth-client.js';

export interface MgmtHttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  baseUrl: string;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
  oauthClient: OAuthClient;
  numRetries: number;
}

export interface MgmtHttpResponse<T = unknown> {
  status: number;
  data: T;
}

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
          url.searchParams.set(key, value);
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
      if (response.status === 401 && !hadTokenRefresh) {
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
