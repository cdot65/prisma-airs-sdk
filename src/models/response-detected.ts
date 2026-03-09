import { z } from 'zod';

/** Zod schema for response detection detail data. */
export const ResponseDetectionDetailsSchema = z
  .object({
    topic_guardrails_details: z.record(z.unknown()).optional(),
  })
  .passthrough();

/** Response detection detail data including topic guardrails. */
export type ResponseDetectionDetails = z.infer<typeof ResponseDetectionDetailsSchema>;

/** Zod schema for response-side detection flags. */
export const ResponseDetectedSchema = z
  .object({
    url_cats: z.boolean().optional(),
    dlp: z.boolean().optional(),
    db_security: z.boolean().optional(),
    toxic_content: z.boolean().optional(),
    malicious_code: z.boolean().optional(),
    agent: z.boolean().optional(),
    ungrounded: z.boolean().optional(),
    topic_violation: z.boolean().optional(),
  })
  .passthrough();

/** Flags indicating which detection types triggered on the response. */
export type ResponseDetected = z.infer<typeof ResponseDetectedSchema>;
