import { z } from 'zod';
import { ScanRequestSchema } from './scan-request.js';

/** Zod schema for an async scan batch item. */
export const AsyncScanObjectSchema = z
  .object({
    req_id: z.number().int(),
    scan_req: ScanRequestSchema,
  })
  .passthrough();

/** Async scan batch item containing a request ID and scan request. */
export type AsyncScanObject = z.infer<typeof AsyncScanObjectSchema>;

/** Zod schema for the async scan API response. */
export const AsyncScanResponseSchema = z
  .object({
    received: z.string(),
    scan_id: z.string(),
    report_id: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough();

/** Async scan API response with scan ID for later querying. */
export type AsyncScanResponse = z.infer<typeof AsyncScanResponseSchema>;
