import { AISecSDKException, ErrorType } from './errors.js';
import { isValidUuid } from './utils.js';

/**
 * @internal
 * Throw `AISecSDKException(USER_REQUEST_PAYLOAD_ERROR)` if `value` is not a valid RFC 4122 UUID.
 */
export function assertUuid(value: string, fieldName: string): void {
  if (!isValidUuid(value)) {
    throw new AISecSDKException(
      `Invalid ${fieldName}: ${value}`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
}

/**
 * @internal
 * Throw `AISecSDKException(USER_REQUEST_PAYLOAD_ERROR)` if `value.length` is outside `[min, max]`.
 */
export function assertLength(value: string, min: number, max: number, fieldName: string): void {
  const len = value.length;
  if (len < min || len > max) {
    throw new AISecSDKException(
      `Invalid ${fieldName}: length ${len} not in [${min}, ${max}]`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
}
