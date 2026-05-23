import { z } from 'zod';

/**
 * Audit metadata block shared by every DLP resource response. Tracks who created
 * and last updated the resource.
 *
 * All fields are optional; the DLP API may omit some on partially-managed records
 * (e.g. system-seeded predefined patterns).
 */
export const AuditResponseSchema = z
  .object({
    created_at: z.string().optional(),
    created_by: z.string().optional(),
    updated_at: z.string().optional(),
    updated_by: z.string().optional(),
  })
  .passthrough();

export type AuditResponse = z.infer<typeof AuditResponseSchema>;
