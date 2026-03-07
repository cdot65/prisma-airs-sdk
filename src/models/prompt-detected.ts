import { z } from 'zod';

/** Zod schema for prompt detection detail data. */
export const PromptDetectionDetailsSchema = z.object({
  topic_guardrails_details: z.record(z.unknown()).optional(),
});

/** Prompt detection detail data including topic guardrails. */
export type PromptDetectionDetails = z.infer<typeof PromptDetectionDetailsSchema>;

/** Zod schema for prompt-side detection flags. */
export const PromptDetectedSchema = z.object({
  url_cats: z.boolean().optional(),
  dlp: z.boolean().optional(),
  injection: z.boolean().optional(),
  toxic_content: z.boolean().optional(),
  malicious_code: z.boolean().optional(),
  agent: z.boolean().optional(),
  topic_violation: z.boolean().optional(),
});

/** Flags indicating which detection types triggered on the prompt. */
export type PromptDetected = z.infer<typeof PromptDetectedSchema>;
