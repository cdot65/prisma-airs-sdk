import { z } from 'zod';
import { DlpPatternDetectionSchema } from './detection-reports.js';

/**
 * Zod schema for a DLP (Data Loss Prevention) report.
 *
 * Every field is `.nullish()` — the live API emits `null` (not `undefined`) for
 * unset values across all DLP responses.
 */
export const DlpReportSchema = z
  .object({
    dlp_report_id: z.string().nullish(),
    dlp_profile_name: z.string().nullish(),
    dlp_profile_id: z.string().nullish(),
    dlp_profile_version: z.number().nullish(),
    data_pattern_rule1_verdict: z.string().nullish(),
    data_pattern_rule2_verdict: z.string().nullish(),
    data_pattern_detection_offsets: z.array(DlpPatternDetectionSchema).nullish(),
  })
  .passthrough();

/** DLP report with profile info, rule verdicts, and pattern detection offsets. */
export type DlpReport = z.infer<typeof DlpReportSchema>;
