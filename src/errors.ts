// src/errors.ts — mirrors Python SDK exceptions.py

export enum ErrorType {
  SERVER_SIDE_ERROR = 'AISEC_SERVER_SIDE_ERROR',
  CLIENT_SIDE_ERROR = 'AISEC_CLIENT_SIDE_ERROR',
  USER_REQUEST_PAYLOAD_ERROR = 'AISEC_USER_REQUEST_PAYLOAD_ERROR',
  MISSING_VARIABLE = 'AISEC_MISSING_VARIABLE',
  AISEC_SDK_ERROR = 'AISEC_SDK_ERROR',
  OAUTH_ERROR = 'AISEC_OAUTH_ERROR',
}

export class AISecSDKException extends Error {
  public readonly errorType?: ErrorType;

  constructor(message: string, errorType?: ErrorType) {
    super(errorType ? `${errorType}:${message}` : message);
    this.name = 'AISecSDKException';
    this.errorType = errorType;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AISecSDKException);
    }
  }
}
