import { z } from 'zod';

/** Zod schema for toxic content report. */
export const TcReportSchema = z
  .object({
    confidence: z.string().optional(),
    verdict: z.string().optional(),
  })
  .passthrough();

/** Toxic content report with confidence and verdict. */
export type TcReport = z.infer<typeof TcReportSchema>;

/** Zod schema for a database security entry. */
export const DbsEntrySchema = z
  .object({
    sub_type: z.string().optional(),
    verdict: z.string().optional(),
    action: z.string().optional(),
  })
  .passthrough();

/** Database security entry with sub-type, verdict, and action. */
export type DbsEntry = z.infer<typeof DbsEntrySchema>;

/** Zod schema for database security report (array of entries). */
export const DbsReportSchema = z.array(DbsEntrySchema);

/** Database security report — array of DbsEntry. */
export type DbsReport = z.infer<typeof DbsReportSchema>;

/** Zod schema for a malicious code analysis entry. */
export const McEntrySchema = z
  .object({
    file_type: z.string().optional(),
    code_sha256: z.string().optional(),
  })
  .passthrough();

/** Malicious code analysis entry. */
export type McEntry = z.infer<typeof McEntrySchema>;

/** Zod schema for malware script report. */
export const MalwareReportSchema = z
  .object({
    verdict: z.string().optional(),
  })
  .passthrough();

/** Malware script scanning report. */
export type MalwareReport = z.infer<typeof MalwareReportSchema>;

/** Zod schema for a command injection entry. */
export const CmdEntrySchema = z
  .object({
    code_block: z.string().optional(),
    verdict: z.string().optional(),
  })
  .passthrough();

/** Command injection entry. */
export type CmdEntry = z.infer<typeof CmdEntrySchema>;

/** Zod schema for command injection report (array of entries). */
export const CmdInjectReportSchema = z.array(CmdEntrySchema);

/** Command injection report — array of CmdEntry. */
export type CmdInjectReport = z.infer<typeof CmdInjectReportSchema>;

/** Zod schema for malicious code report. */
export const McReportSchema = z
  .object({
    all_code_blocks: z.array(z.string()).optional(),
    code_analysis_by_type: z.array(McEntrySchema).optional(),
    verdict: z.string().optional(),
    malware_script_report: MalwareReportSchema.optional(),
    command_injection_report: CmdInjectReportSchema.optional(),
  })
  .passthrough();

/** Malicious code report with code blocks, analysis, and sub-reports. */
export type McReport = z.infer<typeof McReportSchema>;

/** Zod schema for an agent threat pattern entry. */
export const AgentEntrySchema = z
  .object({
    category_type: z.string().optional(),
    verdict: z.string().optional(),
  })
  .passthrough();

/** Agent threat pattern entry. */
export type AgentEntry = z.infer<typeof AgentEntrySchema>;

/** Zod schema for agent report. */
export const AgentReportSchema = z
  .object({
    model_verdict: z.string().optional(),
    agent_framework: z.string().optional(),
    agent_patterns: z.array(AgentEntrySchema).optional(),
  })
  .passthrough();

/** Agent security report with model verdict, framework, and patterns. */
export type AgentReport = z.infer<typeof AgentReportSchema>;

/** Zod schema for topic guardrails report. */
export const TgReportSchema = z
  .object({
    allowed_topic_list: z.string().optional(),
    blocked_topic_list: z.string().optional(),
    allowedTopics: z.array(z.string()).optional(),
    blockedTopics: z.array(z.string()).optional(),
  })
  .passthrough();

/** Topic guardrails report with matched allow/block topic lists. */
export type TgReport = z.infer<typeof TgReportSchema>;

/** Zod schema for contextual grounding report. */
export const CgReportSchema = z
  .object({
    status: z.string().optional(),
    explanation: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough();

/** Contextual grounding report with status, explanation, and category. */
export type CgReport = z.infer<typeof CgReportSchema>;

/** Zod schema for DLP pattern detection offset locations. */
export const OffsetSchema = z.array(z.array(z.number()));

/** Array of [start, end] offset pairs. */
export type Offset = z.infer<typeof OffsetSchema>;

/** Zod schema for DLP pattern detection with confidence levels. */
export const DlpPatternDetectionSchema = z
  .object({
    data_pattern_id: z.string().optional(),
    version: z.number().optional(),
    name: z.string().optional(),
    high_confidence_detections: OffsetSchema.optional(),
    medium_confidence_detections: OffsetSchema.optional(),
    low_confidence_detections: OffsetSchema.optional(),
  })
  .passthrough();

/** DLP pattern detection with matched pattern info and confidence-level offsets. */
export type DlpPatternDetection = z.infer<typeof DlpPatternDetectionSchema>;

/** Zod schema for pattern detection in masked data. */
export const PatternDetectionSchema = z
  .object({
    pattern: z.string().optional(),
    locations: OffsetSchema.optional(),
  })
  .passthrough();

/** Pattern detection with matched pattern and offset locations. */
export type PatternDetection = z.infer<typeof PatternDetectionSchema>;

/** Zod schema for content errors during scanning. */
export const ContentErrorSchema = z
  .object({
    content_type: z.string().optional(),
    feature: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

/** Error info for a detection service during scanning. */
export type ContentError = z.infer<typeof ContentErrorSchema>;
