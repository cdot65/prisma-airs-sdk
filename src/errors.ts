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
}

/**
 * Base exception for all AIRS SDK errors.
 * The `errorType` field classifies the error origin.
 */
export class AISecSDKException extends Error {
  public readonly errorType?: ErrorType;

  /**
   * @param message - Human-readable error description.
   * @param errorType - Classification of the error.
   */
  constructor(message: string, errorType?: ErrorType) {
    super(errorType ? `${errorType}:${message}` : message);
    this.name = 'AISecSDKException';
    this.errorType = errorType;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AISecSDKException);
    }
  }
}
