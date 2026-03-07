// src/configuration.ts — mirrors Python SDK configuration.py

import {
  DEFAULT_ENDPOINT,
  AI_SEC_API_KEY,
  AI_SEC_API_TOKEN,
  AI_SEC_API_ENDPOINT,
  MAX_API_KEY_LENGTH,
  MAX_TOKEN_LENGTH,
  MAX_NUMBER_OF_RETRIES,
} from './constants.js';
import { AISecSDKException, ErrorType } from './errors.js';

/** Options for initializing the global scan API configuration. */
export interface InitOptions {
  /** AIRS API key. Falls back to `PANW_AI_SEC_API_KEY` env var. */
  apiKey?: string;
  /** Pre-obtained bearer token. Falls back to `PANW_AI_SEC_API_TOKEN` env var. */
  apiToken?: string;
  /** AIRS API endpoint URL. Falls back to `PANW_AI_SEC_API_ENDPOINT` env var. */
  apiEndpoint?: string;
  /** Max retry attempts (0–5). Defaults to 5. */
  numRetries?: number;
}

class Configuration {
  private _apiKey?: string;
  private _apiToken?: string;
  private _apiEndpoint: string = DEFAULT_ENDPOINT;
  private _numRetries: number = MAX_NUMBER_OF_RETRIES;
  private _initialized = false;

  get apiKey(): string | undefined {
    return this._apiKey;
  }
  get apiToken(): string | undefined {
    return this._apiToken;
  }
  get apiEndpoint(): string {
    return this._apiEndpoint;
  }
  get numRetries(): number {
    return this._numRetries;
  }
  get initialized(): boolean {
    return this._initialized;
  }

  init(opts: InitOptions = {}): void {
    // Resolve api key
    const apiKey = (opts.apiKey ?? process.env[AI_SEC_API_KEY] ?? '').trim() || undefined;
    const apiToken = (opts.apiToken ?? process.env[AI_SEC_API_TOKEN] ?? '').trim() || undefined;

    if (!apiKey && !apiToken) {
      throw new AISecSDKException(
        'Either apiKey or apiToken must be provided (or set via environment variables)',
        ErrorType.MISSING_VARIABLE,
      );
    }

    if (apiKey && apiKey.length > MAX_API_KEY_LENGTH) {
      throw new AISecSDKException(
        `apiKey exceeds max length of ${MAX_API_KEY_LENGTH}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    if (apiToken && apiToken.length > MAX_TOKEN_LENGTH) {
      throw new AISecSDKException(
        `apiToken exceeds max length of ${MAX_TOKEN_LENGTH}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    this._apiKey = apiKey;
    this._apiToken = apiToken;

    // Resolve endpoint
    const endpoint = opts.apiEndpoint ?? process.env[AI_SEC_API_ENDPOINT] ?? DEFAULT_ENDPOINT;
    this._apiEndpoint = endpoint.replace(/\/+$/, ''); // strip trailing slashes

    // Resolve retries
    if (opts.numRetries !== undefined) {
      if (opts.numRetries < 0 || opts.numRetries > MAX_NUMBER_OF_RETRIES) {
        throw new AISecSDKException(
          `numRetries must be between 0 and ${MAX_NUMBER_OF_RETRIES}`,
          ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        );
      }
      this._numRetries = opts.numRetries;
    }

    this._initialized = true;
  }

  reset(): void {
    this._apiKey = undefined;
    this._apiToken = undefined;
    this._apiEndpoint = DEFAULT_ENDPOINT;
    this._numRetries = MAX_NUMBER_OF_RETRIES;
    this._initialized = false;
  }
}

/** Global singleton holding scan API configuration. */
export const globalConfiguration = new Configuration();

/**
 * Initialize the global scan API configuration. Must be called before using {@link Scanner}.
 * @param opts - Configuration options. Reads env vars as fallbacks.
 * @throws {AISecSDKException} If neither apiKey nor apiToken is provided.
 */
export function init(opts: InitOptions = {}): void {
  globalConfiguration.init(opts);
}
