import { z } from 'zod';
import { DlpReportSchema } from './dlp-report.js';
import { UrlfEntrySchema } from './urlf-report.js';

/** Zod schema for detection service detail results (URLF and DLP reports). */
export const DSDetailResultSchema = z.object({
  urlf_report: z.array(UrlfEntrySchema).optional(),
  dlp_report: DlpReportSchema.optional(),
});

/** Detection service detail results containing URLF and DLP reports. */
export type DSDetailResult = z.infer<typeof DSDetailResultSchema>;

/** Zod schema for detection service result metadata (score and confidence). */
export const DSResultMetadataSchema = z
  .object({
    score: z.number().optional(),
    confidence: z.string().optional(),
  })
  .passthrough();

/** Detection service result metadata with score and confidence. */
export type DSResultMetadata = z.infer<typeof DSResultMetadataSchema>;

/** Zod schema for an individual detection service result. */
export const DetectionServiceResultSchema = z.object({
  data_type: z.string().optional(),
  detection_service: z.string().optional(),
  verdict: z.string().optional(),
  action: z.string().optional(),
  metadata: DSResultMetadataSchema.optional(),
  result_detail: DSDetailResultSchema.optional(),
});

/** Individual detection service result with verdict, action, and details. */
export type DetectionServiceResult = z.infer<typeof DetectionServiceResultSchema>;
