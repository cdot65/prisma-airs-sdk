import { AISecSDKException, ErrorType } from '../errors.js';

/** @internal Encode exactly one path segment, refusing URL-normalized dot segments. */
export function gatewayPathSegment(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value === '.' || value === '..')
    throw new AISecSDKException(
      'A nonempty resource identifier is required',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw new AISecSDKException(
      'Resource identifier must be valid Unicode',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
}

/** @internal Called only after schema validation; native fetch owns the multipart boundary. */
export function gatewayMultipart(value: unknown): FormData {
  const form = new FormData();
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (item === undefined || item === null) continue;
    if (item instanceof Blob) form.append(key, item);
    else if (Array.isArray(item)) {
      const arrayKey = key.endsWith('[]') ? key : `${key}[]`;
      for (const part of item) {
        if (part instanceof Blob) form.append(arrayKey, part);
        else form.append(arrayKey, typeof part === 'object' ? JSON.stringify(part) : String(part));
      }
    } else form.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item));
  }
  return form;
}
