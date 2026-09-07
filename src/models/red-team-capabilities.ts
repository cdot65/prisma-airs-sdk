import { z } from 'zod';

/** Goal category metadata for a target type. */
export const GoalCategoryOptionSchema = z
  .object({ category: z.string(), display_name: z.string(), description: z.string() })
  .passthrough();
export type GoalCategoryOption = z.infer<typeof GoalCategoryOptionSchema>;
export const GoalCategoryListResponseSchema = z
  .object({ target_type: z.string(), categories: z.array(GoalCategoryOptionSchema) })
  .passthrough();
export type GoalCategoryListResponse = z.infer<typeof GoalCategoryListResponseSchema>;
/** Starter script and test prompt returned by the adapter authoring endpoint. */
export const AdapterConfigResponseSchema = z
  .object({ default_script_b64: z.string(), default_test_prompt: z.string() })
  .passthrough();
export type AdapterConfigResponse = z.infer<typeof AdapterConfigResponseSchema>;
export const StartProfilingResponseSchema = z.object({ message: z.string() }).passthrough();
export type StartProfilingResponse = z.infer<typeof StartProfilingResponseSchema>;
/** Credentials used to initiate Copilot Studio authorization. Treat as secret. */
export const MSCopilotStudioAuthUrlRequestSchema = z
  .object({
    client_id: z.string(),
    client_secret: z.string(),
    tenant_id: z.string(),
    target_uuid: z.string().uuid().nullable().optional(),
    token_json_uuid: z.string().uuid().nullable().optional(),
  })
  .strict();
export type MSCopilotStudioAuthUrlRequest = z.infer<typeof MSCopilotStudioAuthUrlRequestSchema>;
export const MSCopilotStudioAuthUrlResponseSchema = z
  .object({ auth_url: z.string(), token_json_uuid: z.string().uuid(), state: z.string() })
  .passthrough();
export type MSCopilotStudioAuthUrlResponse = z.infer<typeof MSCopilotStudioAuthUrlResponseSchema>;
/** Exchange the authorization callback with its full state parameters. Treat as secret. */
export const MSCopilotStudioTokenRequestSchema = z
  .object({
    auth_response: z.record(z.string()),
    token_json_uuid: z.string().uuid(),
    client_id: z.string(),
    client_secret: z.string(),
    tenant_id: z.string(),
    target_uuid: z.string().uuid().nullable().optional(),
  })
  .strict();
export type MSCopilotStudioTokenRequest = z.infer<typeof MSCopilotStudioTokenRequestSchema>;
export const MSCopilotStudioTokenResponseSchema = z
  .object({ token_json_uuid: z.string().uuid() })
  .passthrough();
export type MSCopilotStudioTokenResponse = z.infer<typeof MSCopilotStudioTokenResponseSchema>;
