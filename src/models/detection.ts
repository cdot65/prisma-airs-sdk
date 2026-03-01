import { z } from 'zod';
import { DlpReportSchema } from './dlp-report.js';
import { UrlfEntrySchema } from './urlf-report.js';

export const DSDetailResultSchema = z.object({
  urlf_report: z.array(UrlfEntrySchema).optional(),
  dlp_report: DlpReportSchema.optional(),
});

export type DSDetailResult = z.infer<typeof DSDetailResultSchema>;

export const DSResultMetadataSchema = z
  .object({
    score: z.number().optional(),
    confidence: z.string().optional(),
  })
  .passthrough();

export type DSResultMetadata = z.infer<typeof DSResultMetadataSchema>;

export const DetectionServiceResultSchema = z.object({
  data_type: z.string().optional(),
  detection_service: z.string().optional(),
  verdict: z.string().optional(),
  action: z.string().optional(),
  metadata: DSResultMetadataSchema.optional(),
  result_detail: DSDetailResultSchema.optional(),
});

export type DetectionServiceResult = z.infer<typeof DetectionServiceResultSchema>;
