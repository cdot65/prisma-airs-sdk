// src/errors.ts — mirrors Python SDK exceptions.py

/** Classification of SDK errors by origin. */
export enum ErrorType {
  /** 5xx response from the AIRS API. */
  SERVER_SIDE_ERROR = 'AISEC_SERVER_SIDE_ERROR',
  /** 4xx response or network failure. */
  CLIENT_SIDE_ERROR = 'AISEC_CLIENT_SIDE_ERROR',
  /** Invalid user-supplied input (bad UUID, oversized content, etc.). */
  USER_REQUEST_PAYLOAD_ERROR = 'AISEC_USER_REQUEST_PAYLOAD_ERROR',
  /** Required configuration value is missing. */
  MISSING_VARIABLE = 'AISEC_MISSING_VARIABLE',
  /** Internal SDK error. */
  AISEC_SDK_ERROR = 'AISEC_SDK_ERROR',
  /** OAuth2 token fetch failure. */
  OAUTH_ERROR = 'AISEC_OAUTH_ERROR',
  /** Server returned a 2xx body that did not match the declared response schema, or invalid JSON. */
  RESPONSE_VALIDATION = 'AISEC_RESPONSE_VALIDATION',
}

/** Transport-level facts attached to HTTP and network failures. */
export interface AISecSDKExceptionMetadata {
  /** Whether the request received an HTTP response or failed at the network boundary. */
  failureKind?: 'http' | 'network';
  /** HTTP response status, when a response was received. */
  statusCode?: number;
  /** Server-provided retry delay normalized to milliseconds. */
  retryAfterMs?: number;
}

/**
 * Base exception for all AIRS SDK errors.
 * The `errorType` field classifies the error origin.
 */
export class AISecSDKException extends Error {
  public readonly errorType?: ErrorType;
  declare public readonly failureKind?: 'http' | 'network';
  declare public readonly statusCode?: number;
  declare public readonly retryAfterMs?: number;

  /**
   * @param message - Human-readable error description.
   * @param errorType - Classification of the error.
   * @param metadata - Optional transport failure metadata.
   */
  constructor(message: string, errorType?: ErrorType, metadata: AISecSDKExceptionMetadata = {}) {
    super(errorType ? `${errorType}:${message}` : message);
    this.name = 'AISecSDKException';
    this.errorType = errorType;
    if (metadata.failureKind !== undefined) this.failureKind = metadata.failureKind;
    if (metadata.statusCode !== undefined) this.statusCode = metadata.statusCode;
    if (metadata.retryAfterMs !== undefined) this.retryAfterMs = metadata.retryAfterMs;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AISecSDKException);
    }
  }
}
