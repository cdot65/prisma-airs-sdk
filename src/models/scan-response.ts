import { z } from 'zod';
import { PromptDetectedSchema, PromptDetectionDetailsSchema } from './prompt-detected.js';
import { ResponseDetectedSchema, ResponseDetectionDetailsSchema } from './response-detected.js';
import { ToolEventMetadataSchema } from './tool-event.js';
import { PatternDetectionSchema, ContentErrorSchema } from './detection-reports.js';

/** Zod schema for masked data in scan results. */
export const MaskedDataSchema = z.object({
  data: z.string().optional(),
  pattern_detections: z.array(PatternDetectionSchema).optional(),
});

/** Masked data containing redacted content and pattern detections. */
export type MaskedData = z.infer<typeof MaskedDataSchema>;

/** Zod schema for I/O detection flags. */
export const IODetectedSchema = z
  .object({
    url_cats: z.boolean().optional(),
    dlp: z.boolean().optional(),
    injection: z.boolean().optional(),
    toxic_content: z.boolean().optional(),
    malicious_code: z.boolean().optional(),
  })
  .passthrough();

/** Flags indicating which detection types triggered on input or output. */
export type IODetected = z.infer<typeof IODetectedSchema>;

/** Zod schema for the scan summary (verdict + action). */
export const ScanSummarySchema = z
  .object({
    verdict: z.string().optional(),
    action: z.string().optional(),
  })
  .passthrough();

/** Scan summary containing overall verdict and action. */
export type ScanSummary = z.infer<typeof ScanSummarySchema>;

/** Zod schema for tool/agent detection results. */
export const ToolDetectedSchema = z.object({
  verdict: z.string().optional(),
  metadata: ToolEventMetadataSchema.optional(),
  summary: ScanSummarySchema.optional(),
  input_detected: IODetectedSchema.optional(),
  output_detected: IODetectedSchema.optional(),
});

/** Detection results for tool/agent interactions. */
export type ToolDetected = z.infer<typeof ToolDetectedSchema>;

/** Zod schema for a complete scan response from the AIRS API. */
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
  timeout: z.boolean().optional(),
  error: z.boolean().optional(),
  errors: z.array(ContentErrorSchema).optional(),
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

/** Complete scan response with verdict, action, and detection details. */
export type ScanResponse = z.infer<typeof ScanResponseSchema>;
