import { z } from 'zod';

/** Zod schema for tool/function call event metadata. */
export const ToolEventMetadataSchema = z.object({
  ecosystem: z.string(),
  method: z.string(),
  server_name: z.string(),
  tool_invoked: z.string().optional(),
});

/** Tool/function call event metadata (ecosystem, method, server, tool). */
export type ToolEventMetadata = z.infer<typeof ToolEventMetadataSchema>;

/** Zod schema for a tool/function call event with input and output. */
export const ToolEventSchema = z.object({
  metadata: ToolEventMetadataSchema.optional(),
  input: z.string().optional(),
  output: z.string().optional(),
});

/** Tool/function call event with optional input and output strings. */
export type ToolEvent = z.infer<typeof ToolEventSchema>;
