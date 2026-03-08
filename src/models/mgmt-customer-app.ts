import { z } from 'zod';

/** Zod schema for API key + deployment profile info. */
export const ApiKeyDPInfoSchema = z
  .object({
    api_key_name: z.string(),
    dp_name: z.string(),
    auth_code: z.string(),
  })
  .passthrough();

/** API key and deployment profile association. */
export type ApiKeyDPInfo = z.infer<typeof ApiKeyDPInfoSchema>;

/** Zod schema for a customer app. */
export const CustomerAppSchema = z
  .object({
    customer_appId: z.string().optional(),
    tsg_id: z.string(),
    app_name: z.string(),
    model_name: z.string().optional(),
    cloud_provider: z.string(),
    environment: z.string(),
    status: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    ai_agent_framework: z.string().optional(),
  })
  .passthrough();

/** Customer application object. */
export type CustomerApp = z.infer<typeof CustomerAppSchema>;

/** Zod schema for customer app with API key and DP info (used in list response). */
export const CustomerAppWithKeysSchema = z
  .object({
    customer_appId: z.string(),
    tsg_id: z.string(),
    app_name: z.string(),
    model_name: z.string().optional(),
    cloud_provider: z.string(),
    environment: z.string(),
    ai_agent_framework: z.string().optional(),
    api_keys_dp_info: z.array(ApiKeyDPInfoSchema).optional(),
  })
  .passthrough();

/** Customer app with API key and deployment profile info. */
export type CustomerAppWithKeys = z.infer<typeof CustomerAppWithKeysSchema>;

/** Zod schema for paginated customer app list response. */
export const CustomerAppListResponseSchema = z
  .object({
    customer_apps: z.array(CustomerAppWithKeysSchema).optional(),
    next_offset: z.number().optional(),
  })
  .passthrough();

/** Paginated customer app list response. */
export type CustomerAppListResponse = z.infer<typeof CustomerAppListResponseSchema>;
