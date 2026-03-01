import { z } from 'zod';
import { PromptDetectedSchema, PromptDetectionDetailsSchema } from './prompt-detected.js';
import { ResponseDetectedSchema, ResponseDetectionDetailsSchema } from './response-detected.js';
import { ToolEventMetadataSchema } from './tool-event.js';

export const MaskedDataSchema = z.object({
  data: z.string().optional(),
  pattern_detections: z.array(z.record(z.unknown())).optional(),
});

export type MaskedData = z.infer<typeof MaskedDataSchema>;

export const IODetectedSchema = z
  .object({
    url_cats: z.boolean().optional(),
    dlp: z.boolean().optional(),
    injection: z.boolean().optional(),
    toxic_content: z.boolean().optional(),
    malicious_code: z.boolean().optional(),
  })
  .passthrough();

export type IODetected = z.infer<typeof IODetectedSchema>;

export const ScanSummarySchema = z
  .object({
    verdict: z.string().optional(),
    action: z.string().optional(),
  })
  .passthrough();

export type ScanSummary = z.infer<typeof ScanSummarySchema>;

export const ToolDetectedSchema = z.object({
  verdict: z.string().optional(),
  metadata: ToolEventMetadataSchema.optional(),
  summary: ScanSummarySchema.optional(),
  input_detected: IODetectedSchema.optional(),
  output_detected: IODetectedSchema.optional(),
});

export type ToolDetected = z.infer<typeof ToolDetectedSchema>;

export const ScanResponseSchema = z.object({
  source: z.string().optional(),
  report_id: z.string(),
  scan_id: z.string(),
  tr_id: z.string().optional(),
  session_id: z.string().optional(),
  profile_id: z.string().optional(),
  profile_name: z.string().optional(),
  category: z.string(),
  action: z.string(),
  prompt_detected: PromptDetectedSchema.optional(),
  response_detected: ResponseDetectedSchema.optional(),
  prompt_masked_data: MaskedDataSchema.optional(),
  response_masked_data: MaskedDataSchema.optional(),
  prompt_detection_details: PromptDetectionDetailsSchema.optional(),
  response_detection_details: ResponseDetectionDetailsSchema.optional(),
  tool_detected: ToolDetectedSchema.optional(),
  created_at: z.string().optional(),
  completed_at: z.string().optional(),
});

export type ScanResponse = z.infer<typeof ScanResponseSchema>;
