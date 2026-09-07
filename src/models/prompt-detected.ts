import { z } from 'zod';
import { TopicGuardrailDetailsSchema } from './scan-detail.js';

/** Zod schema for prompt detection detail data. */
export const PromptDetectionDetailsSchema = z
  .object({
    toxic_content_details: z
      .object({ toxic_categories: z.array(z.string()).optional() })
      .passthrough()
      .optional(),
    topic_guardrails_details: TopicGuardrailDetailsSchema.optional(),
  })
  .passthrough();

/** Prompt detection detail data including topic guardrails. */
export type PromptDetectionDetails = z.infer<typeof PromptDetectionDetailsSchema>;

/** Zod schema for prompt-side detection flags. */
export const PromptDetectedSchema = z
  .object({
    url_cats: z.boolean().optional(),
    dlp: z.boolean().optional(),
    injection: z.boolean().optional(),
    toxic_content: z.boolean().optional(),
    malicious_code: z.boolean().optional(),
    source_code: z.boolean().optional(),
    agent: z.boolean().optional(),
    topic_violation: z.boolean().optional(),
  })
  .passthrough();

/** Flags indicating which detection types triggered on the prompt. */
export type PromptDetected = z.infer<typeof PromptDetectedSchema>;
