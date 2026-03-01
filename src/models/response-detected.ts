import { z } from 'zod';

export const ResponseDetectionDetailsSchema = z.object({
  topic_guardrails_details: z.record(z.unknown()).optional(),
});

export type ResponseDetectionDetails = z.infer<typeof ResponseDetectionDetailsSchema>;

export const ResponseDetectedSchema = z.object({
  url_cats: z.boolean().optional(),
  dlp: z.boolean().optional(),
  db_security: z.boolean().optional(),
  toxic_content: z.boolean().optional(),
  malicious_code: z.boolean().optional(),
  agent: z.boolean().optional(),
  ungrounded: z.boolean().optional(),
  topic_violation: z.boolean().optional(),
});

export type ResponseDetected = z.infer<typeof ResponseDetectedSchema>;
