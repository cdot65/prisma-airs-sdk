import { z } from 'zod';

/** Zod schema for an API key object. */
export const ApiKeySchema = z
  .object({
    api_key_id: z.string(),
    api_key_last8: z.string(),
    api_key_name: z.string().optional(),
    auth_code: z.string(),
    csp_id: z.string().optional(),
    tsg_id: z.string().optional(),
    expiration: z.string(),
    revoked: z.boolean(),
    revoke_reason: z.string().optional(),
    cust_app: z.string().optional(),
    cust_env: z.string().optional(),
    cust_ai_agent_framework: z.string().optional(),
    cust_cloud_provider: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    last_modified_ts: z.string().optional(),
    rotation_time_interval: z.number().optional(),
    rotation_time_unit: z.string().optional(),
    dp_name: z.string().optional(),
    status: z.string().optional(),
    api_key: z.string().optional(),
    lic_expiration: z.string().optional(),
    avg_text_records: z.number().optional(),
    creation_ts: z.string().optional(),
    customer_appId: z.string().optional(),
  })
  .passthrough();

/** API key object. */
export type ApiKey = z.infer<typeof ApiKeySchema>;

/** Zod schema for API key creation request. */
export const ApiKeyCreateRequestSchema = z.object({
  dp_name: z.string().optional(),
  auth_code: z.string(),
  cust_app: z.string(),
  cust_env: z.string().optional(),
  cust_cloud_provider: z.string().optional(),
  cust_ai_agent_framework: z.string().optional(),
  revoked: z.boolean(),
  created_by: z.string(),
  api_key_name: z.string(),
  rotation_time_interval: z.number(),
  rotation_time_unit: z.string(),
});

/** API key creation request. */
export type ApiKeyCreateRequest = z.infer<typeof ApiKeyCreateRequestSchema>;

/** Zod schema for API key regeneration request. */
export const ApiKeyRegenerateRequestSchema = z.object({
  rotation_time_interval: z.number(),
  rotation_time_unit: z.string(),
  updated_by: z.string().optional(),
});

/** API key regeneration request. */
export type ApiKeyRegenerateRequest = z.infer<typeof ApiKeyRegenerateRequestSchema>;

/** Zod schema for paginated API key list response. */
export const ApiKeyListResponseSchema = z
  .object({
    api_keys: z.array(ApiKeySchema).optional(),
    next_offset: z.number().optional(),
  })
  .passthrough();

/** Paginated API key list response. */
export type ApiKeyListResponse = z.infer<typeof ApiKeyListResponseSchema>;

/** Zod schema for API key delete response. */
export const ApiKeyDeleteResponseSchema = z
  .object({
    message: z.string().optional(),
  })
  .passthrough();

/** API key delete response. */
export type ApiKeyDeleteResponse = z.infer<typeof ApiKeyDeleteResponseSchema>;
