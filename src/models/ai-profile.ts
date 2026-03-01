import { z } from 'zod';
import { MAX_AI_PROFILE_NAME_LENGTH } from '../constants.js';

export const AiProfileSchema = z
  .object({
    profile_id: z.string().uuid().optional(),
    profile_name: z.string().max(MAX_AI_PROFILE_NAME_LENGTH).optional(),
  })
  .refine((d) => d.profile_id || d.profile_name, {
    message: 'Either profile_id or profile_name must be provided',
  });

export type AiProfile = z.infer<typeof AiProfileSchema>;
