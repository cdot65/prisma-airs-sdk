// src/http-client.ts — internal fetch wrapper with retry

import { globalConfiguration } from './configuration.js';
import {
  HEADER_API_KEY,
  HEADER_AUTH_TOKEN,
  BEARER,
  PAYLOAD_HASH,
  USER_AGENT,
} from './constants.js';
import { AISecSDKException, ErrorType } from './errors.js';
import { executeWithRetry } from './http-retry.js';
import { generatePayloadHash } from './utils.js';

/** Options for a scan API HTTP request. */
export interface HttpRequestOptions {
  /** HTTP method. */
  method: 'GET' | 'POST';
  /** API path (appended to the configured endpoint). */
  path: string;
  /** Request body (JSON-serialized). */
  body?: unknown;
  /** URL query parameters. */
  params?: Record<string, string>;
}

/** Typed HTTP response wrapper. */
export interface HttpResponse<T = unknown> {
  /** HTTP status code. */
  status: number;
  /** Parsed response body. */
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
    if (globalConfiguration.apiKey) {
      headers[PAYLOAD_HASH] = generatePayloadHash(bodyStr, globalConfiguration.apiKey);
    }
  }

  const response = await executeWithRetry({
    maxRetries: globalConfiguration.numRetries,
    execute: () =>
      fetch(url.toString(), {
        method: opts.method,
        headers,
        body: bodyStr,
      }),
  });

  const data = (await response.json()) as T;
  return { status: response.status, data };
}
