import { z } from 'zod';
import { PromptDetectedSchema, PromptDetectionDetailsSchema } from './prompt-detected.js';
import { ResponseDetectedSchema, ResponseDetectionDetailsSchema } from './response-detected.js';
import { ToolEventMetadataSchema } from './tool-event.js';
import { PatternDetectionSchema, ContentErrorSchema } from './detection-reports.js';

/** Zod schema for masked data in scan results. */
export const MaskedDataSchema = z
  .object({
    data: z.string().optional(),
    pattern_detections: z.array(PatternDetectionSchema).optional(),
  })
  .passthrough();

/** Masked data containing redacted content and pattern detections. */
export type MaskedData = z.infer<typeof MaskedDataSchema>;

/**
 * Zod schema for the boolean detection flags returned by per-tool scans.
 *
 * Each flag indicates whether a particular detection service triggered on the
 * tool's input or output. Used inside {@link ToolDetectionEntrySchema} and
 * {@link ScanSummarySchema}.
 */
export const ToolDetectionFlagsSchema = z
  .object({
    injection: z.boolean().optional(),
    url_cats: z.boolean().optional(),
    dlp: z.boolean().optional(),
    db_security: z.boolean().optional(),
    toxic_content: z.boolean().optional(),
    malicious_code: z.boolean().optional(),
    agent: z.boolean().optional(),
    topic_violation: z.boolean().optional(),
  })
  .passthrough();

/** Boolean detection flags returned by per-tool scans. */
export type ToolDetectionFlags = z.infer<typeof ToolDetectionFlagsSchema>;

/** Zod schema for nested per-tool detection details (e.g. topic guardrails). */
export const ToolDetectionDetailsSchema = z
  .object({
    topic_guardrails_details: z.unknown().optional(),
  })
  .passthrough();

/** Nested per-tool detection details. */
export type ToolDetectionDetails = z.infer<typeof ToolDetectionDetailsSchema>;

/** Zod schema for a single tool-invocation detection entry. */
export const ToolDetectionEntrySchema = z
  .object({
    tool_invoked: z.string().optional(),
    detections: ToolDetectionFlagsSchema.optional(),
    threats: z.array(z.string()).optional(),
    details: ToolDetectionDetailsSchema.optional(),
    masked_data: MaskedDataSchema.optional(),
  })
  .passthrough();

/** A single tool-invocation detection entry inside `tool_detected.input_detected`. */
export type ToolDetectionEntry = z.infer<typeof ToolDetectionEntrySchema>;

/**
 * Zod schema for tool input/output detections.
 *
 * **Shape change** vs prior SDK versions: this used to be a flag-style schema
 * with `url_cats`, `dlp`, etc. directly on it. The flags now live inside
 * {@link ToolDetectionEntrySchema} entries (one per tool invocation).
 */
export const IODetectedSchema = z
  .object({
    detection_entries: z.array(ToolDetectionEntrySchema).optional(),
  })
  .passthrough();

/** Wrapper for per-tool detection entries on `tool_detected.input_detected` / `output_detected`. */
export type IODetected = z.infer<typeof IODetectedSchema>;

/**
 * Zod schema for the scan summary inside `tool_detected.summary`.
 *
 * **Shape change** vs prior SDK versions: this used to be `{ verdict?, action? }`.
 * The current API returns aggregated `{ detections, threats }` here. Top-level
 * verdict/action remain on `ScanResponse.category` / `ScanResponse.action`.
 */
export const ScanSummarySchema = z
  .object({
    detections: ToolDetectionFlagsSchema,
    threats: z.array(z.string()),
  })
  .passthrough();

/** Aggregated detection summary inside `tool_detected.summary`. */
export type ScanSummary = z.infer<typeof ScanSummarySchema>;

/** Zod schema for tool/agent detection results. */
export const ToolDetectedSchema = z
  .object({
    verdict: z.string().optional(),
    metadata: ToolEventMetadataSchema.optional(),
    summary: ScanSummarySchema.optional(),
    input_detected: IODetectedSchema.optional(),
    output_detected: IODetectedSchema.optional(),
  })
  .passthrough();

/** Detection results for tool/agent interactions. */
export type ToolDetected = z.infer<typeof ToolDetectedSchema>;

/** Zod schema for a complete scan response from the AIRS API. */
export const ScanResponseSchema = z
  .object({
    source: z.string().optional(),
    report_id: z.string(),
    scan_id: z.string(),
    tr_id: z.string().optional(),
    session_id: z.string().optional(),
    profile_id: z.string().optional(),
    profile_name: z.string().optional(),
    category: z.string(),
    action: z.string(),
    timeout: z.boolean(),
    error: z.boolean(),
    errors: z.array(ContentErrorSchema),
    prompt_detected: PromptDetectedSchema.optional(),
    response_detected: ResponseDetectedSchema.optional(),
    prompt_masked_data: MaskedDataSchema.optional(),
    response_masked_data: MaskedDataSchema.optional(),
    prompt_detection_details: PromptDetectionDetailsSchema.optional(),
    response_detection_details: ResponseDetectionDetailsSchema.optional(),
    tool_detected: ToolDetectedSchema.optional(),
    created_at: z.string().optional(),
    completed_at: z.string().optional(),
  })
  .passthrough();

/** Complete scan response with verdict, action, and detection details. */
export type ScanResponse = z.infer<typeof ScanResponseSchema>;
