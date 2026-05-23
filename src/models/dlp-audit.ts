import { z } from 'zod';

/**
 * Audit metadata block shared by every DLP resource response. Tracks who created
 * and last updated the resource.
 *
 * All fields are nullish (the live API emits `null` for unset values, not `undefined`).
 * Timestamps accept either ISO string or numeric epoch (ms) — the API has been
 * observed to emit both shapes across different records.
 */
export const AuditResponseSchema = z
  .object({
    created_at: z.union([z.string(), z.number()]).nullish(),
    created_by: z.string().nullish(),
    updated_at: z.union([z.string(), z.number()]).nullish(),
    updated_by: z.string().nullish(),
  })
  .passthrough();

export type AuditResponse = z.infer<typeof AuditResponseSchema>;
