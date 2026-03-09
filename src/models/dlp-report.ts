import { z } from 'zod';
import { DlpPatternDetectionSchema } from './detection-reports.js';

/** Zod schema for a DLP (Data Loss Prevention) report. */
export const DlpReportSchema = z
  .object({
    dlp_report_id: z.string().optional(),
    dlp_profile_name: z.string().optional(),
    dlp_profile_id: z.string().optional(),
    dlp_profile_version: z.number().optional(),
    data_pattern_rule1_verdict: z.string().optional(),
    data_pattern_rule2_verdict: z.string().optional(),
    data_pattern_detection_offsets: z.array(DlpPatternDetectionSchema).optional(),
  })
  .passthrough();

/** DLP report with profile info, rule verdicts, and pattern detection offsets. */
export type DlpReport = z.infer<typeof DlpReportSchema>;
