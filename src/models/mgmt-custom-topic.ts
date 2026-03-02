import { z } from 'zod';

export const CustomTopicSchema = z
  .object({
    topic_id: z.string().optional(),
    topic_name: z.string(),
    revision: z.number().optional(),
    active: z.boolean().optional(),
    description: z.string().optional(),
    examples: z.array(z.string()).optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    last_modified_ts: z.string().optional(),
    created_ts: z.string().optional(),
  })
  .passthrough();

export type CustomTopic = z.infer<typeof CustomTopicSchema>;

export const CreateCustomTopicRequestSchema = z
  .object({
    topic_id: z.string().optional(),
    topic_name: z.string(),
    revision: z.number().optional(),
    active: z.boolean().optional(),
    description: z.string().optional(),
    examples: z.array(z.string()).optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    last_modified_ts: z.string().optional(),
    created_ts: z.string().optional(),
  })
  .passthrough();

export type CreateCustomTopicRequest = z.infer<typeof CreateCustomTopicRequestSchema>;

export const CustomTopicListResponseSchema = z
  .object({
    custom_topics: z.array(CustomTopicSchema),
    next_offset: z.number().optional(),
  })
  .passthrough();

export type CustomTopicListResponse = z.infer<typeof CustomTopicListResponseSchema>;

export const DeleteTopicResponseSchema = z
  .object({
    message: z.string(),
  })
  .passthrough();

export type DeleteTopicResponse = z.infer<typeof DeleteTopicResponseSchema>;

export const DeleteTopicConflictSchema = z
  .object({
    message: z.string(),
    payload: z.array(
      z
        .object({
          profile_id: z.string(),
          profile_name: z.string(),
          revision: z.number(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type DeleteTopicConflict = z.infer<typeof DeleteTopicConflictSchema>;
