import { z } from 'zod';
import { ScanRequestSchema } from './scan-request.js';

export const AsyncScanObjectSchema = z.object({
  req_id: z.number().int(),
  scan_req: ScanRequestSchema,
});

export type AsyncScanObject = z.infer<typeof AsyncScanObjectSchema>;

export const AsyncScanResponseSchema = z.object({
  received: z.string(),
  scan_id: z.string(),
  report_id: z.string().optional(),
  source: z.string().optional(),
});

export type AsyncScanResponse = z.infer<typeof AsyncScanResponseSchema>;
