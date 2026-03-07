import { z } from 'zod';

/** Zod schema for a URL filtering report entry. */
export const UrlfEntrySchema = z.object({
  url: z.string().optional(),
  risk_level: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

/** URL filtering report entry with URL, risk level, and categories. */
export type UrlfEntry = z.infer<typeof UrlfEntrySchema>;
