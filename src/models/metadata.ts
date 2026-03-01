import { z } from 'zod';

export const AgentMetaSchema = z.object({
  agent_id: z.string().optional(),
  agent_version: z.string().optional(),
  agent_arn: z.string().optional(),
});

export type AgentMeta = z.infer<typeof AgentMetaSchema>;

export const MetadataSchema = z.object({
  app_name: z.string().optional(),
  app_user: z.string().optional(),
  ai_model: z.string().optional(),
  user_ip: z.string().optional(),
  agent_meta: AgentMetaSchema.optional(),
});

export type Metadata = z.infer<typeof MetadataSchema>;
