import { z } from 'zod';
import { MAX_AI_PROFILE_NAME_LENGTH } from '../constants.js';

/** Zod schema for AI security profile identifier. Requires profile_id or profile_name. */
export const AiProfileSchema = z
  .object({
    profile_id: z.string().uuid().optional(),
    profile_name: z.string().max(MAX_AI_PROFILE_NAME_LENGTH).optional(),
  })
  .passthrough()
  .refine((d) => d.profile_id || d.profile_name, {
    message: 'Either profile_id or profile_name must be provided',
  });

/** AI security profile identifier. At least one of profile_id or profile_name required. */
export type AiProfile = z.infer<typeof AiProfileSchema>;
