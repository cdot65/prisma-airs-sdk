import { z } from 'zod';

export const DlpReportSchema = z.object({
  dlp_report_id: z.string().optional(),
  dlp_profile_name: z.string().optional(),
  dlp_profile_id: z.string().optional(),
  dlp_profile_version: z.number().optional(),
  data_pattern_rule1_verdict: z.string().optional(),
  data_pattern_rule2_verdict: z.string().optional(),
});

export type DlpReport = z.infer<typeof DlpReportSchema>;
