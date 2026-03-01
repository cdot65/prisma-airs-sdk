import { z } from 'zod';

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

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
