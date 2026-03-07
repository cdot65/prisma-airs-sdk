import { z } from 'zod';
import { ScanResponseSchema } from './scan-response.js';

/** Zod schema for a scan ID query result. */
export const ScanIdResultSchema = z.object({
  source: z.string().optional(),
  req_id: z.number().optional(),
  status: z.string().optional(),
  scan_id: z.string().optional(),
  result: ScanResponseSchema.optional(),
});

/** Result of querying a scan by its scan ID, including status and full scan response. */
export type ScanIdResult = z.infer<typeof ScanIdResultSchema>;
