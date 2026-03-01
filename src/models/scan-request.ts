import { z } from 'zod';
import { MAX_TRANSACTION_ID_STR_LENGTH, MAX_SESSION_ID_STR_LENGTH } from '../constants.js';
import { AiProfileSchema } from './ai-profile.js';
import { MetadataSchema } from './metadata.js';
import { ToolEventSchema } from './tool-event.js';

export const ScanRequestContentsInnerSchema = z.object({
  prompt: z.string().optional(),
  response: z.string().optional(),
  code_prompt: z.string().optional(),
  code_response: z.string().optional(),
  context: z.string().optional(),
  tool_event: ToolEventSchema.optional(),
});

export type ScanRequestContentsInner = z.infer<typeof ScanRequestContentsInnerSchema>;

export const ScanRequestSchema = z.object({
  tr_id: z.string().max(MAX_TRANSACTION_ID_STR_LENGTH).optional(),
  session_id: z.string().max(MAX_SESSION_ID_STR_LENGTH).optional(),
  ai_profile: AiProfileSchema,
  metadata: MetadataSchema.optional(),
  contents: z.array(ScanRequestContentsInnerSchema).min(1),
});

export type ScanRequest = z.infer<typeof ScanRequestSchema>;
