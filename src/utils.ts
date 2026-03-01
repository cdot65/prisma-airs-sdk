// src/utils.ts — UUID validation + HMAC payload hash

import { createHmac } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function generatePayloadHash(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
