// src/http-client.ts — internal fetch wrapper with retry

import { globalConfiguration } from './configuration.js';
import {
  HEADER_API_KEY,
  HEADER_AUTH_TOKEN,
  BEARER,
  PAYLOAD_HASH,
  USER_AGENT,
  HTTP_FORCE_RETRY_STATUS_CODES,
} from './constants.js';
import { AISecSDKException, ErrorType } from './errors.js';
import { generatePayloadHash } from './utils.js';

export interface HttpRequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  params?: Record<string, string>;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
  };

  const cfg = globalConfiguration;
  if (cfg.apiToken) {
    headers[HEADER_AUTH_TOKEN] = `${BEARER}${cfg.apiToken}`;
  }
  if (cfg.apiKey) {
    headers[HEADER_API_KEY] = cfg.apiKey;
  }

  return headers;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function httpRequest<T>(opts: HttpRequestOptions): Promise<HttpResponse<T>> {
  if (!globalConfiguration.initialized) {
    throw new AISecSDKException(
      'SDK not initialized. Call init() before making requests.',
      ErrorType.MISSING_VARIABLE,
    );
  }

  const baseUrl = globalConfiguration.apiEndpoint;
  const url = new URL(opts.path, baseUrl);

  if (opts.params) {
    for (const [key, value] of Object.entries(opts.params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers = buildHeaders();
  let bodyStr: string | undefined;
  if (opts.body !== undefined) {
    bodyStr = JSON.stringify(opts.body);
    // Add payload hash if api key is present
    if (globalConfiguration.apiKey) {
      headers[PAYLOAD_HASH] = generatePayloadHash(bodyStr, globalConfiguration.apiKey);
    }
  }

  const maxRetries = globalConfiguration.numRetries;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        method: opts.method,
        headers,
        body: bodyStr,
      });

      if (response.ok) {
        const data = (await response.json()) as T;
        return { status: response.status, data };
      }

      // Check if retryable
      if (HTTP_FORCE_RETRY_STATUS_CODES.includes(response.status) && attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }

      // Non-retryable error
      let errorMessage: string;
      try {
        const errorBody = await response.json();
        errorMessage =
          ((errorBody as Record<string, unknown>).message as string) ??
          ((errorBody as Record<string, Record<string, unknown>>).error?.message as string) ??
          `API error ${response.status}`;
      } catch {
        errorMessage = `API error ${response.status}`;
      }

      const errorType =
        response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR;
      throw new AISecSDKException(errorMessage, errorType);
    } catch (err) {
      if (err instanceof AISecSDKException) {
        throw err;
      }
      lastError = err as Error;
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
    }
  }

  throw new AISecSDKException(lastError?.message ?? 'Network error', ErrorType.CLIENT_SIDE_ERROR);
}
