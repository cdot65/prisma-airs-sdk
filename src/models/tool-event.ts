import { z } from 'zod';

export const ToolEventMetadataSchema = z.object({
  ecosystem: z.string(),
  method: z.string(),
  server_name: z.string(),
  tool_invoked: z.string().optional(),
});

export type ToolEventMetadata = z.infer<typeof ToolEventMetadataSchema>;

export const ToolEventSchema = z.object({
  metadata: ToolEventMetadataSchema.optional(),
  input: z.string().optional(),
  output: z.string().optional(),
});

export type ToolEvent = z.infer<typeof ToolEventSchema>;
