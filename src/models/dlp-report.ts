import { z } from 'zod';

/** Zod schema for a DLP (Data Loss Prevention) report. */
export const DlpReportSchema = z.object({
  dlp_report_id: z.string().optional(),
  dlp_profile_name: z.string().optional(),
  dlp_profile_id: z.string().optional(),
  dlp_profile_version: z.number().optional(),
  data_pattern_rule1_verdict: z.string().optional(),
  data_pattern_rule2_verdict: z.string().optional(),
});

/** DLP report with profile info and data pattern rule verdicts. */
export type DlpReport = z.infer<typeof DlpReportSchema>;
