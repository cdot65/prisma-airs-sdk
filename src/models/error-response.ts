import { z } from 'zod';

/** Zod schema for an AIRS API error response. */
export const ErrorResponseSchema = z.object({
  status_code: z.number().optional(),
  message: z.string().optional(),
  error: z
    .object({
      message: z.string().optional(),
    })
    .passthrough()
    .optional(),
  retry_after: z
    .object({
      interval: z.number().optional(),
      unit: z.string().optional(),
    })
    .optional(),
});

/** AIRS API error response with optional retry-after guidance. */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
