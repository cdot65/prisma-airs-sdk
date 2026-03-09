import { z } from 'zod';
import { DetectionServiceResultSchema } from './detection.js';

/** Zod schema for a detailed threat scan report. */
export const ThreatScanReportSchema = z
  .object({
    source: z.string().optional(),
    report_id: z.string().optional(),
    scan_id: z.string().optional(),
    req_id: z.number().optional(),
    transaction_id: z.string().optional(),
    session_id: z.string().optional(),
    detection_results: z.array(DetectionServiceResultSchema).optional(),
  })
  .passthrough();

/** Detailed threat scan report with per-service detection results. */
export type ThreatScanReport = z.infer<typeof ThreatScanReportSchema>;
