import { z } from 'zod';
import { ScanResponseSchema, type ScanResponse } from './scan-response.js';

/** Result of querying a scan by its scan ID, including status and full scan response. */
export interface ScanIdResult {
  source?: string;
  req_id?: number;
  status?: string;
  scan_id?: string;
  result?: ScanResponse;
  [key: string]: unknown;
}

/** Zod schema for a scan ID query result. */
// Explicit type annotation: ScanResponseSchema is now structurally too complex
// for TypeScript to serialize the inferred type. The annotation breaks that cycle.
export const ScanIdResultSchema: z.ZodType<ScanIdResult> = z
  .object({
    source: z.string().optional(),
    req_id: z.number().optional(),
    status: z.string().optional(),
    scan_id: z.string().optional(),
    result: ScanResponseSchema.optional(),
  })
  .passthrough();
