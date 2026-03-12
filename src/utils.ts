// src/utils.ts — UUID validation + HMAC payload hash

import { createHmac } from 'node:crypto';
import { AISecSDKException, ErrorType } from './errors.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Test whether a string is a valid RFC 4122 UUID.
 * @param value - The string to validate.
 * @returns `true` if the string matches the UUID format.
 */
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Validate that a job ID is a valid UUID, throwing if not.
 * @param jobId - The job ID string to validate.
 * @throws {AISecSDKException} If the job ID is not a valid UUID.
 */
export function validateJobId(jobId: string): void {
  if (!isValidUuid(jobId)) {
    throw new AISecSDKException(`Invalid job id: ${jobId}`, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
  }
}

/**
 * Generate an HMAC-SHA256 hex digest for API key authentication.
 * @param payload - The JSON payload string to sign.
 * @param secret - The API key secret.
 * @returns Hex-encoded HMAC-SHA256 hash.
 */
export function generatePayloadHash(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
