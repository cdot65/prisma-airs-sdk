import { z } from 'zod';

export const PromptDetectionDetailsSchema = z.object({
  topic_guardrails_details: z.record(z.unknown()).optional(),
});

export type PromptDetectionDetails = z.infer<typeof PromptDetectionDetailsSchema>;

export const PromptDetectedSchema = z.object({
  url_cats: z.boolean().optional(),
  dlp: z.boolean().optional(),
  injection: z.boolean().optional(),
  toxic_content: z.boolean().optional(),
  malicious_code: z.boolean().optional(),
  agent: z.boolean().optional(),
  topic_violation: z.boolean().optional(),
});

export type PromptDetected = z.infer<typeof PromptDetectedSchema>;
