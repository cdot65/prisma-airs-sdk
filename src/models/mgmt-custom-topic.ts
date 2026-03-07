import { z } from 'zod';

/** Zod schema for an AIRS custom topic. */
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

/** AIRS custom topic with name, description, examples, and audit metadata. */
export type CustomTopic = z.infer<typeof CustomTopicSchema>;

/** Zod schema for a custom topic create/update request. */
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

/** Request body for creating or updating a custom topic. */
export type CreateCustomTopicRequest = z.infer<typeof CreateCustomTopicRequestSchema>;

/** Zod schema for a paginated custom topic list response. */
export const CustomTopicListResponseSchema = z
  .object({
    custom_topics: z.array(CustomTopicSchema),
    next_offset: z.number().optional(),
  })
  .passthrough();

/** Paginated list of custom topics. */
export type CustomTopicListResponse = z.infer<typeof CustomTopicListResponseSchema>;

/** Zod schema for a topic deletion response. */
export const DeleteTopicResponseSchema = z
  .object({
    message: z.string(),
  })
  .passthrough();

/** Response from deleting a custom topic. */
export type DeleteTopicResponse = z.infer<typeof DeleteTopicResponseSchema>;

/** Zod schema for a topic deletion conflict (409). */
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

/** Conflict response when deleting a topic referenced by profiles. */
export type DeleteTopicConflict = z.infer<typeof DeleteTopicConflictSchema>;
