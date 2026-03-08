import { z } from 'zod';
import { DlpReportSchema } from './dlp-report.js';
import { UrlfEntrySchema } from './urlf-report.js';
import {
  DbsReportSchema,
  TcReportSchema,
  McReportSchema,
  AgentReportSchema,
  TgReportSchema,
  CgReportSchema,
} from './detection-reports.js';

/** Zod schema for detection service detail results. */
export const DSDetailResultSchema = z
  .object({
    urlf_report: z.array(UrlfEntrySchema).optional(),
    dlp_report: DlpReportSchema.optional(),
    dbs_report: DbsReportSchema.optional(),
    tc_report: TcReportSchema.optional(),
    mc_report: McReportSchema.optional(),
    agent_report: AgentReportSchema.optional(),
    topic_guardrails_report: TgReportSchema.optional(),
    cg_report: CgReportSchema.optional(),
  })
  .passthrough();

/** Detection service detail results containing per-service reports. */
export type DSDetailResult = z.infer<typeof DSDetailResultSchema>;

/** Zod schema for detection service result metadata. */
export const DSResultMetadataSchema = z
  .object({
    score: z.number().optional(),
    confidence: z.string().optional(),
    ecosystem: z.string().optional(),
    method: z.string().optional(),
    server_name: z.string().optional(),
    tool_invoked: z.string().optional(),
    direction: z.string().optional(),
  })
  .passthrough();

/** Detection service result metadata. */
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
