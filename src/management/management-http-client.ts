import { USER_AGENT, HTTP_FORCE_RETRY_STATUS_CODES } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return (
      (parsed.error_message as string) ??
      (parsed.message as string) ??
      `API error ${status}: ${body}`
    );
  } catch {
    return body ? `API error ${status}: ${body}` : `API error ${status}`;
  }
}

export async function managementHttpRequest<T>(
  opts: MgmtHttpRequestOptions,
): Promise<MgmtHttpResponse<T>> {
  const { method, baseUrl, path, body, params, oauthClient, numRetries } = opts;
  let hadTokenRefresh = false;

  for (let attempt = 0; attempt <= numRetries; attempt++) {
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

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: bodyStr,
      });
    } catch (err) {
      if (attempt < numRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      throw new AISecSDKException(
        (err as Error).message ?? 'Network error',
        ErrorType.CLIENT_SIDE_ERROR,
      );
    }

    if (response.ok) {
      const text = await response.text();
      const data = text ? (JSON.parse(text) as T) : ({} as T);
      return { status: response.status, data };
    }

    // 401: clear token and retry once (doesn't count against retry budget)
    if (response.status === 401 && !hadTokenRefresh) {
      hadTokenRefresh = true;
      oauthClient.clearToken();
      attempt--;
      continue;
    }

    // Retryable 5xx
    if (HTTP_FORCE_RETRY_STATUS_CODES.includes(response.status) && attempt < numRetries) {
      await sleep(Math.pow(2, attempt) * 1000);
      continue;
    }

    // Non-retryable error
    const errorText = await response.text();
    const errorMessage = extractError(errorText, response.status);
    const errorType =
      response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR;
    throw new AISecSDKException(errorMessage, errorType);
  }

  throw new AISecSDKException('Max retries exceeded', ErrorType.CLIENT_SIDE_ERROR);
}
