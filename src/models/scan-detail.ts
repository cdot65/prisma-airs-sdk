import { z } from 'zod';

/** Topics matched by the allow and block guardrails. */
export interface TopicGuardrailDetails {
  allowed_topics?: string[];
  blocked_topics?: string[];
  [key: string]: unknown;
}
export const TopicGuardrailDetailsSchema: z.ZodType<TopicGuardrailDetails> = z
  .object({
    allowed_topics: z.array(z.string()).optional(),
    blocked_topics: z.array(z.string()).optional(),
  })
  .passthrough();
