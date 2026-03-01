import { z } from 'zod';
import { ScanResponseSchema } from './scan-response.js';

export const ScanIdResultSchema = z.object({
  source: z.string().optional(),
  req_id: z.number().optional(),
  status: z.string().optional(),
  scan_id: z.string().optional(),
  result: ScanResponseSchema.optional(),
});

export type ScanIdResult = z.infer<typeof ScanIdResultSchema>;
