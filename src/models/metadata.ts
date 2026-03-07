import { z } from 'zod';

/** Zod schema for AI agent metadata. */
export const AgentMetaSchema = z.object({
  agent_id: z.string().optional(),
  agent_version: z.string().optional(),
  agent_arn: z.string().optional(),
});

/** AI agent metadata (agent ID, version, ARN). */
export type AgentMeta = z.infer<typeof AgentMetaSchema>;

/** Zod schema for scan request metadata. */
export const MetadataSchema = z.object({
  app_name: z.string().optional(),
  app_user: z.string().optional(),
  ai_model: z.string().optional(),
  user_ip: z.string().optional(),
  agent_meta: AgentMetaSchema.optional(),
});

/** Application metadata attached to scan requests. */
export type Metadata = z.infer<typeof MetadataSchema>;
