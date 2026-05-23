import { z } from 'zod';

/**
 * Wraps a Zod schema for use in a JSON Merge Patch (RFC 7396) request body.
 *
 * Merge-patch semantics:
 * - Field omitted → leave unchanged on the server.
 * - Field set to `null` → clear/null on the server.
 * - Field set to a value → replace on the server.
 *
 * The DLP OpenAPI generator emits a `JsonNullable<T>` wrapper type with a
 * `present: boolean` discriminator, but the actual wire shape is just
 * `T | null | undefined`. This helper keeps the Zod surface minimal while
 * documenting the intent.
 *
 * @example
 * const PatchBody = z.object({
 *   description: jsonNullable(z.string()),
 *   tags: jsonNullable(z.array(z.string())),
 * });
 * // Clear `description`, leave `tags` untouched:
 * const body = { description: null };
 */
export function jsonNullable<T extends z.ZodTypeAny>(inner: T) {
  return inner.nullable().optional();
}

/** Resolved type of a `jsonNullable<T>` field. */
export type JsonNullable<T extends z.ZodTypeAny> = z.infer<T> | null | undefined;
