import { z } from 'zod';

export const UrlfEntrySchema = z.object({
  url: z.string().optional(),
  risk_level: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

export type UrlfEntry = z.infer<typeof UrlfEntrySchema>;
