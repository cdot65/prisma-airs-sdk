/** SCM-exposed Portkey extension models.
 * Generated from openapi.yaml SHA-256 de7a1bd98bdb2edb7428a33054d9f6000b9568d1cd5b603d1a8302c053d094d9.
 * Regenerate with scripts/openapi/generate-gateway-extensions.ts; review compatibility changes.
 */
import { z } from 'zod';
import { GatewayJsonValueSchema, type GatewayJsonValue } from './ai-gateway-routing.js';

/** SCM McpServersClientListOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientListOptionsSchema: z.ZodType<{
  workspace_id?: string;
  current_page?: number;
  page_size?: number;
  id?: string;
  search?: string;
}> = z
  .object({
    workspace_id: z.string().optional(),
    current_page: z.number().finite().int().min(0).optional(),
    page_size: z.number().finite().int().min(1).max(100).optional(),
    id: z.string().optional(),
    search: z.string().max(255).optional(),
  })
  .strict();
export type GatewayMcpServersClientListOptions = z.infer<
  typeof GatewayMcpServersClientListOptionsSchema
>;

/** SCM McpServerListItem; unknown response fields are preserved. */
export const GatewayMcpServerListItemSchema: z.ZodType<{
  id?: string;
  organisation_id?: string;
  name?: string;
  description?: string | null;
  status?: string;
  created_at?: string;
  owner_id?: string;
  slug?: string;
  workspace_id?: string | null;
  mcp_integration_id?: string;
  mcp_integration_slug?: string | null;
  mcp_integration_url?: string | null;
  auth_type?: string;
  workspace_name?: string | null;
  workspace_slug?: string | null;
  url?: string;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string().optional(),
    organisation_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    owner_id: z.string().optional(),
    slug: z.string().optional(),
    workspace_id: z.string().nullable().optional(),
    mcp_integration_id: z.string().optional(),
    mcp_integration_slug: z.string().nullable().optional(),
    mcp_integration_url: z.string().nullable().optional(),
    auth_type: z.string().optional(),
    workspace_name: z.string().nullable().optional(),
    workspace_slug: z.string().nullable().optional(),
    url: z.string().optional(),
  })
  .passthrough();
export type GatewayMcpServerListItem = z.infer<typeof GatewayMcpServerListItemSchema>;

/** SCM McpServerListResponse; unknown response fields are preserved. */
export const GatewayMcpServerListResponseSchema: z.ZodType<{
  data?: Array<GatewayMcpServerListItem>;
  total?: number;
  [key: string]: unknown;
}> = z
  .object({
    data: z.array(GatewayMcpServerListItemSchema).optional(),
    total: z.number().finite().int().optional(),
  })
  .passthrough();
export type GatewayMcpServerListResponse = z.infer<typeof GatewayMcpServerListResponseSchema>;

/** SCM McpServersClientListResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientListResponseSchema: z.ZodType<GatewayMcpServerListResponse> =
  GatewayMcpServerListResponseSchema;
export type GatewayMcpServersClientListResponse = z.infer<
  typeof GatewayMcpServersClientListResponseSchema
>;

/** SCM CreateMcpServer; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestCreateMcpServerSchema: z.ZodType<{
  workspace_id?: string;
  name: string;
  description?: string | null;
  mcp_integration_id: string;
  slug?: string;
}> = z
  .object({
    workspace_id: z.string().optional(),
    name: z.string().min(1).max(255),
    description: z.string().max(500).nullable().optional(),
    mcp_integration_id: z.string(),
    slug: z.string().min(3).max(50).regex(new RegExp('^[a-zA-Z0-9_-]+$')).optional(),
  })
  .strict();
export type GatewayRequestCreateMcpServer = z.infer<typeof GatewayRequestCreateMcpServerSchema>;

/** SCM McpServersClientCreateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientCreateRequestSchema: z.ZodType<GatewayRequestCreateMcpServer> =
  GatewayRequestCreateMcpServerSchema;
export type GatewayMcpServersClientCreateRequest = z.infer<
  typeof GatewayMcpServersClientCreateRequestSchema
>;

/** SCM McpServerCreateResponse; unknown response fields are preserved. */
export const GatewayMcpServerCreateResponseSchema: z.ZodType<{
  id?: string;
  slug?: string;
  [key: string]: unknown;
}> = z.object({ id: z.string().optional(), slug: z.string().optional() }).passthrough();
export type GatewayMcpServerCreateResponse = z.infer<typeof GatewayMcpServerCreateResponseSchema>;

/** SCM McpServersClientCreateResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientCreateResponseSchema: z.ZodType<GatewayMcpServerCreateResponse> =
  GatewayMcpServerCreateResponseSchema;
export type GatewayMcpServersClientCreateResponse = z.infer<
  typeof GatewayMcpServersClientCreateResponseSchema
>;

/** SCM McpServer; unknown response fields are preserved. */
export const GatewayMcpServerSchema: z.ZodType<{
  id?: string;
  slug?: string;
  name?: string;
  status?: string;
  description?: string | null;
  created_at?: string;
  mcp_integration_id?: string;
  mcp_integration_details?: {
    id?: string;
    slug?: string;
    status?: string;
    configurations?: { [key: string]: unknown } | null;
    url?: string;
    transport?: string;
    auth_type?: string;
    [key: string]: unknown;
  } | null;
  workspace_id?: string | null;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string().optional(),
    slug: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    description: z.string().nullable().optional(),
    created_at: z.string().optional(),
    mcp_integration_id: z.string().optional(),
    mcp_integration_details: z
      .object({
        id: z.string().optional(),
        slug: z.string().optional(),
        status: z.string().optional(),
        configurations: z.object({}).passthrough().nullable().optional(),
        url: z.string().optional(),
        transport: z.string().optional(),
        auth_type: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    workspace_id: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayMcpServer = z.infer<typeof GatewayMcpServerSchema>;

/** SCM McpServersClientGetResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientGetResponseSchema: z.ZodType<GatewayMcpServer> =
  GatewayMcpServerSchema;
export type GatewayMcpServersClientGetResponse = z.infer<
  typeof GatewayMcpServersClientGetResponseSchema
>;

/** SCM UpdateMcpServer; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestUpdateMcpServerSchema: z.ZodType<{
  name?: string;
  description?: string | null;
}> = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .strict();
export type GatewayRequestUpdateMcpServer = z.infer<typeof GatewayRequestUpdateMcpServerSchema>;

/** SCM McpServersClientUpdateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientUpdateRequestSchema: z.ZodType<GatewayRequestUpdateMcpServer> =
  GatewayRequestUpdateMcpServerSchema;
export type GatewayMcpServersClientUpdateRequest = z.infer<
  typeof GatewayMcpServersClientUpdateRequestSchema
>;

/** SCM McpServersClientUpdateResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientUpdateResponseSchema: z.ZodType<{ [key: string]: unknown }> = z
  .object({})
  .passthrough();
export type GatewayMcpServersClientUpdateResponse = z.infer<
  typeof GatewayMcpServersClientUpdateResponseSchema
>;

/** SCM McpServersClientDeleteResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientDeleteResponseSchema: z.ZodType<{ [key: string]: unknown }> = z
  .object({})
  .passthrough();
export type GatewayMcpServersClientDeleteResponse = z.infer<
  typeof GatewayMcpServersClientDeleteResponseSchema
>;

/** SCM McpServerTestResponse; unknown response fields are preserved. */
export const GatewayMcpServerTestResponseSchema: z.ZodType<{
  success?: boolean;
  status_code?: number | null;
  response_time_ms?: number | null;
  url?: string | null;
  server_name?: string;
  error?: string | null;
  [key: string]: unknown;
}> = z
  .object({
    success: z.boolean().optional(),
    status_code: z.number().finite().int().nullable().optional(),
    response_time_ms: z.number().finite().int().nullable().optional(),
    url: z.string().nullable().optional(),
    server_name: z.string().optional(),
    error: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayMcpServerTestResponse = z.infer<typeof GatewayMcpServerTestResponseSchema>;

/** SCM McpServersClientTestResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientTestResponseSchema: z.ZodType<GatewayMcpServerTestResponse> =
  GatewayMcpServerTestResponseSchema;
export type GatewayMcpServersClientTestResponse = z.infer<
  typeof GatewayMcpServersClientTestResponseSchema
>;

/** SCM McpServersClientGetCapabilitiesOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientGetCapabilitiesOptionsSchema: z.ZodType<{
  page?: number;
  page_size?: number;
  type?: string;
}> = z
  .object({
    page: z.number().finite().int().min(1).optional(),
    page_size: z.number().finite().int().min(1).max(500).optional(),
    type: z.string().min(1).optional(),
  })
  .strict();
export type GatewayMcpServersClientGetCapabilitiesOptions = z.infer<
  typeof GatewayMcpServersClientGetCapabilitiesOptionsSchema
>;

/** SCM McpServerCapabilityItem; unknown response fields are preserved. */
export const GatewayMcpServerCapabilityItemSchema: z.ZodType<{
  name?: string;
  type?: string;
  title?: string | null;
  description?: string | null;
  icons?: Array<unknown> | null;
  enabled?: boolean;
  integration_enabled?: boolean | null;
  input_schema?: { [key: string]: unknown } | null;
  output_schema?: { [key: string]: unknown } | null;
  execution?: { [key: string]: unknown } | null;
  annotations?: { [key: string]: unknown } | null;
  arguments?: Array<unknown> | null;
  uri?: string | null;
  uri_template?: string | null;
  mime_type?: string | null;
  size?: number | null;
  [key: string]: unknown;
}> = z
  .object({
    name: z.string().optional(),
    type: z.string().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    icons: z.array(z.unknown()).nullable().optional(),
    enabled: z.boolean().optional(),
    integration_enabled: z.boolean().nullable().optional(),
    input_schema: z.object({}).passthrough().nullable().optional(),
    output_schema: z.object({}).passthrough().nullable().optional(),
    execution: z.object({}).passthrough().nullable().optional(),
    annotations: z.object({}).passthrough().nullable().optional(),
    arguments: z.array(z.unknown()).nullable().optional(),
    uri: z.string().nullable().optional(),
    uri_template: z.string().nullable().optional(),
    mime_type: z.string().nullable().optional(),
    size: z.number().finite().nullable().optional(),
  })
  .passthrough();
export type GatewayMcpServerCapabilityItem = z.infer<typeof GatewayMcpServerCapabilityItemSchema>;

/** SCM McpServerCapabilitiesCounts; unknown response fields are preserved. */
export const GatewayMcpServerCapabilitiesCountsSchema: z.ZodType<{
  tools?: { total?: number; enabled?: number; [key: string]: unknown };
  prompts?: { total?: number; enabled?: number; [key: string]: unknown };
  resources?: { total?: number; enabled?: number; [key: string]: unknown };
  resource_templates?: { total?: number; enabled?: number; [key: string]: unknown };
  [key: string]: unknown;
}> = z
  .object({
    tools: z
      .object({
        total: z.number().finite().int().optional(),
        enabled: z.number().finite().int().optional(),
      })
      .passthrough()
      .optional(),
    prompts: z
      .object({
        total: z.number().finite().int().optional(),
        enabled: z.number().finite().int().optional(),
      })
      .passthrough()
      .optional(),
    resources: z
      .object({
        total: z.number().finite().int().optional(),
        enabled: z.number().finite().int().optional(),
      })
      .passthrough()
      .optional(),
    resource_templates: z
      .object({
        total: z.number().finite().int().optional(),
        enabled: z.number().finite().int().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type GatewayMcpServerCapabilitiesCounts = z.infer<
  typeof GatewayMcpServerCapabilitiesCountsSchema
>;

/** SCM McpServerCapabilitiesListResponse; unknown response fields are preserved. */
export const GatewayMcpServerCapabilitiesListResponseSchema: z.ZodType<{
  data?: Array<GatewayMcpServerCapabilityItem>;
  counts?: GatewayMcpServerCapabilitiesCounts;
  total?: number;
  has_more?: boolean;
  [key: string]: unknown;
}> = z
  .object({
    data: z.array(GatewayMcpServerCapabilityItemSchema).optional(),
    counts: GatewayMcpServerCapabilitiesCountsSchema.optional(),
    total: z.number().finite().int().optional(),
    has_more: z.boolean().optional(),
  })
  .passthrough();
export type GatewayMcpServerCapabilitiesListResponse = z.infer<
  typeof GatewayMcpServerCapabilitiesListResponseSchema
>;

/** SCM McpServersClientGetCapabilitiesResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientGetCapabilitiesResponseSchema: z.ZodType<GatewayMcpServerCapabilitiesListResponse> =
  GatewayMcpServerCapabilitiesListResponseSchema;
export type GatewayMcpServersClientGetCapabilitiesResponse = z.infer<
  typeof GatewayMcpServersClientGetCapabilitiesResponseSchema
>;

/** SCM BulkUpdateMcpServerCapabilities; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestBulkUpdateMcpServerCapabilitiesSchema: z.ZodType<{
  capabilities: Array<{ name: string; type: string; enabled: boolean }>;
}> = z
  .object({
    capabilities: z
      .array(z.object({ name: z.string(), type: z.string().min(1), enabled: z.boolean() }).strict())
      .min(1),
  })
  .strict();
export type GatewayRequestBulkUpdateMcpServerCapabilities = z.infer<
  typeof GatewayRequestBulkUpdateMcpServerCapabilitiesSchema
>;

/** SCM McpServersClientUpdateCapabilitiesRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientUpdateCapabilitiesRequestSchema: z.ZodType<GatewayRequestBulkUpdateMcpServerCapabilities> =
  GatewayRequestBulkUpdateMcpServerCapabilitiesSchema;
export type GatewayMcpServersClientUpdateCapabilitiesRequest = z.infer<
  typeof GatewayMcpServersClientUpdateCapabilitiesRequestSchema
>;

/** SCM McpServerCapabilitiesBulkUpdateResponse; unknown response fields are preserved. */
export const GatewayMcpServerCapabilitiesBulkUpdateResponseSchema: z.ZodType<{
  success?: boolean;
  [key: string]: unknown;
}> = z.object({ success: z.boolean().optional() }).passthrough();
export type GatewayMcpServerCapabilitiesBulkUpdateResponse = z.infer<
  typeof GatewayMcpServerCapabilitiesBulkUpdateResponseSchema
>;

/** SCM McpServersClientUpdateCapabilitiesResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientUpdateCapabilitiesResponseSchema: z.ZodType<GatewayMcpServerCapabilitiesBulkUpdateResponse> =
  GatewayMcpServerCapabilitiesBulkUpdateResponseSchema;
export type GatewayMcpServersClientUpdateCapabilitiesResponse = z.infer<
  typeof GatewayMcpServersClientUpdateCapabilitiesResponseSchema
>;

/** SCM McpServersClientGetUserAccessOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientGetUserAccessOptionsSchema: z.ZodType<{
  page?: number;
  page_size?: number;
  search?: string;
}> = z
  .object({
    page: z.number().finite().int().min(1).optional(),
    page_size: z.number().finite().int().min(1).max(500).optional(),
    search: z.string().optional(),
  })
  .strict();
export type GatewayMcpServersClientGetUserAccessOptions = z.infer<
  typeof GatewayMcpServersClientGetUserAccessOptionsSchema
>;

/** SCM McpServerUserAccessItem; unknown response fields are preserved. */
export const GatewayMcpServerUserAccessItemSchema: z.ZodType<{
  user_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  enabled?: boolean;
  has_override?: boolean;
  connection_status?: string;
  [key: string]: unknown;
}> = z
  .object({
    user_id: z.string().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
    has_override: z.boolean().optional(),
    connection_status: z.string().optional(),
  })
  .passthrough();
export type GatewayMcpServerUserAccessItem = z.infer<typeof GatewayMcpServerUserAccessItemSchema>;

/** SCM McpServerUserAccessListResponse; unknown response fields are preserved. */
export const GatewayMcpServerUserAccessListResponseSchema: z.ZodType<{
  data?: Array<GatewayMcpServerUserAccessItem>;
  default_user_access?: string;
  total?: number;
  has_more?: boolean;
  [key: string]: unknown;
}> = z
  .object({
    data: z.array(GatewayMcpServerUserAccessItemSchema).optional(),
    default_user_access: z.string().optional(),
    total: z.number().finite().int().optional(),
    has_more: z.boolean().optional(),
  })
  .passthrough();
export type GatewayMcpServerUserAccessListResponse = z.infer<
  typeof GatewayMcpServerUserAccessListResponseSchema
>;

/** SCM McpServersClientGetUserAccessResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientGetUserAccessResponseSchema: z.ZodType<GatewayMcpServerUserAccessListResponse> =
  GatewayMcpServerUserAccessListResponseSchema;
export type GatewayMcpServersClientGetUserAccessResponse = z.infer<
  typeof GatewayMcpServersClientGetUserAccessResponseSchema
>;

/** SCM BulkUpdateMcpServerUserAccess; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestBulkUpdateMcpServerUserAccessSchema: z.ZodType<{
  user_access?: Array<{ user_id: string; enabled: boolean }>;
  default_user_access?: string;
}> = z
  .object({
    user_access: z
      .array(z.object({ user_id: z.string(), enabled: z.boolean() }).strict())
      .optional(),
    default_user_access: z.string().min(1).optional(),
  })
  .strict();
export type GatewayRequestBulkUpdateMcpServerUserAccess = z.infer<
  typeof GatewayRequestBulkUpdateMcpServerUserAccessSchema
>;

/** SCM McpServersClientUpdateUserAccessRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientUpdateUserAccessRequestSchema: z.ZodType<GatewayRequestBulkUpdateMcpServerUserAccess> =
  GatewayRequestBulkUpdateMcpServerUserAccessSchema;
export type GatewayMcpServersClientUpdateUserAccessRequest = z.infer<
  typeof GatewayMcpServersClientUpdateUserAccessRequestSchema
>;

/** SCM McpServerUserAccessBulkUpdateResponse; unknown response fields are preserved. */
export const GatewayMcpServerUserAccessBulkUpdateResponseSchema: z.ZodType<{
  success?: boolean;
  [key: string]: unknown;
}> = z.object({ success: z.boolean().optional() }).passthrough();
export type GatewayMcpServerUserAccessBulkUpdateResponse = z.infer<
  typeof GatewayMcpServerUserAccessBulkUpdateResponseSchema
>;

/** SCM McpServersClientUpdateUserAccessResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientUpdateUserAccessResponseSchema: z.ZodType<GatewayMcpServerUserAccessBulkUpdateResponse> =
  GatewayMcpServerUserAccessBulkUpdateResponseSchema;
export type GatewayMcpServersClientUpdateUserAccessResponse = z.infer<
  typeof GatewayMcpServersClientUpdateUserAccessResponseSchema
>;

/** SCM McpServersClientGetConnectionsOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientGetConnectionsOptionsSchema: z.ZodType<{
  user_id?: string;
  workspace_id?: string;
  current_page?: number;
  page_size?: number;
}> = z
  .object({
    user_id: z.string().optional(),
    workspace_id: z.string().optional(),
    current_page: z.number().finite().int().min(0).optional(),
    page_size: z.number().finite().int().min(1).max(500).optional(),
  })
  .strict();
export type GatewayMcpServersClientGetConnectionsOptions = z.infer<
  typeof GatewayMcpServersClientGetConnectionsOptionsSchema
>;

/** SCM McpServerConnectionItem; unknown response fields are preserved. */
export const GatewayMcpServerConnectionItemSchema: z.ZodType<{
  user_id?: string;
  connected?: boolean;
  created_at?: string;
  last_updated_at?: string;
  [key: string]: unknown;
}> = z
  .object({
    user_id: z.string().optional(),
    connected: z.boolean().optional(),
    created_at: z.string().optional(),
    last_updated_at: z.string().optional(),
  })
  .passthrough();
export type GatewayMcpServerConnectionItem = z.infer<typeof GatewayMcpServerConnectionItemSchema>;

/** SCM McpServerConnectionsListResponse; unknown response fields are preserved. */
export const GatewayMcpServerConnectionsListResponseSchema: z.ZodType<{
  data?: Array<GatewayMcpServerConnectionItem>;
  total?: number;
  has_more?: boolean;
  [key: string]: unknown;
}> = z
  .object({
    data: z.array(GatewayMcpServerConnectionItemSchema).optional(),
    total: z.number().finite().int().optional(),
    has_more: z.boolean().optional(),
  })
  .passthrough();
export type GatewayMcpServerConnectionsListResponse = z.infer<
  typeof GatewayMcpServerConnectionsListResponseSchema
>;

/** SCM McpServersClientGetConnectionsResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientGetConnectionsResponseSchema: z.ZodType<GatewayMcpServerConnectionsListResponse> =
  GatewayMcpServerConnectionsListResponseSchema;
export type GatewayMcpServersClientGetConnectionsResponse = z.infer<
  typeof GatewayMcpServersClientGetConnectionsResponseSchema
>;

/** SCM McpServersClientDeleteConnectionsOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayMcpServersClientDeleteConnectionsOptionsSchema: z.ZodType<{
  user_id?: string;
  workspace_id?: string;
}> = z.object({ user_id: z.string().optional(), workspace_id: z.string().optional() }).strict();
export type GatewayMcpServersClientDeleteConnectionsOptions = z.infer<
  typeof GatewayMcpServersClientDeleteConnectionsOptionsSchema
>;

/** SCM McpServerConnectionDeleteResponse; unknown response fields are preserved. */
export const GatewayMcpServerConnectionDeleteResponseSchema: z.ZodType<{
  success?: boolean;
  [key: string]: unknown;
}> = z.object({ success: z.boolean().optional() }).passthrough();
export type GatewayMcpServerConnectionDeleteResponse = z.infer<
  typeof GatewayMcpServerConnectionDeleteResponseSchema
>;

/** SCM McpServersClientDeleteConnectionsResponse; unknown response fields are preserved. */
export const GatewayMcpServersClientDeleteConnectionsResponseSchema: z.ZodType<GatewayMcpServerConnectionDeleteResponse> =
  GatewayMcpServerConnectionDeleteResponseSchema;
export type GatewayMcpServersClientDeleteConnectionsResponse = z.infer<
  typeof GatewayMcpServersClientDeleteConnectionsResponseSchema
>;

/** SCM UsageLimitsClientListOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUsageLimitsClientListOptionsSchema: z.ZodType<{
  workspace_id?: string;
  status?: string;
  type?: string;
  page_size?: number;
  current_page?: number;
}> = z
  .object({
    workspace_id: z.string().optional(),
    status: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    page_size: z.number().finite().int().min(0).optional(),
    current_page: z.number().finite().int().min(0).optional(),
  })
  .strict();
export type GatewayUsageLimitsClientListOptions = z.infer<
  typeof GatewayUsageLimitsClientListOptionsSchema
>;

/** SCM Condition; unknown response fields are preserved. */
export const GatewayConditionSchema: z.ZodType<{
  key: string;
  value: string | Array<string>;
  excludes?: string | Array<string>;
  [key: string]: unknown;
}> = z
  .object({
    key: z.string(),
    value: z.union([z.string(), z.array(z.string())]),
    excludes: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();
export type GatewayCondition = z.infer<typeof GatewayConditionSchema>;

/** SCM GroupBy; unknown response fields are preserved. */
export const GatewayGroupBySchema: z.ZodType<{ key: string; [key: string]: unknown }> = z
  .object({ key: z.string() })
  .passthrough();
export type GatewayGroupBy = z.infer<typeof GatewayGroupBySchema>;

/** SCM ValueKeyUsage; unknown response fields are preserved. */
export const GatewayValueKeyUsageSchema: z.ZodType<{
  current_usage?: number;
  status?: string;
  is_threshold_alerts_sent?: boolean;
  is_exhausted_alerts_sent?: boolean;
  [key: string]: unknown;
}> = z
  .object({
    current_usage: z.number().finite().optional(),
    status: z.string().optional(),
    is_threshold_alerts_sent: z.boolean().optional(),
    is_exhausted_alerts_sent: z.boolean().optional(),
  })
  .passthrough();
export type GatewayValueKeyUsage = z.infer<typeof GatewayValueKeyUsageSchema>;

/** SCM UsageLimitsPolicy; unknown response fields are preserved. */
export const GatewayUsageLimitsPolicySchema: z.ZodType<{
  id: string;
  name?: string | null;
  conditions?: Array<GatewayCondition>;
  group_by?: Array<GatewayGroupBy>;
  type: string;
  credit_limit?: number;
  alert_threshold?: number | null;
  periodic_reset?: string | null;
  periodic_reset_days?: number | null;
  next_usage_reset_at?: string | null;
  last_reset_at?: string | null;
  status: string;
  workspace_id: string;
  organisation_id: string;
  created_at: string;
  last_updated_at: string;
  value_key_usage_map?: { [key: string]: GatewayValueKeyUsage };
  [key: string]: unknown;
}> = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    conditions: z.array(GatewayConditionSchema).optional(),
    group_by: z.array(GatewayGroupBySchema).optional(),
    type: z.string(),
    credit_limit: z.number().finite().optional(),
    alert_threshold: z.number().finite().nullable().optional(),
    periodic_reset: z.string().nullable().optional(),
    periodic_reset_days: z.number().finite().int().min(1).max(365).nullable().optional(),
    next_usage_reset_at: z.string().nullable().optional(),
    last_reset_at: z.string().nullable().optional(),
    status: z.string(),
    workspace_id: z.string(),
    organisation_id: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    value_key_usage_map: z.object({}).catchall(GatewayValueKeyUsageSchema).optional(),
  })
  .passthrough();
export type GatewayUsageLimitsPolicy = z.infer<typeof GatewayUsageLimitsPolicySchema>;

/** SCM UsageLimitsPolicyListResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsPolicyListResponseSchema: z.ZodType<{
  object?: string;
  data?: Array<GatewayUsageLimitsPolicy>;
  total?: number;
  [key: string]: unknown;
}> = z
  .object({
    object: z.string().optional(),
    data: z.array(GatewayUsageLimitsPolicySchema).optional(),
    total: z.number().finite().int().optional(),
  })
  .passthrough();
export type GatewayUsageLimitsPolicyListResponse = z.infer<
  typeof GatewayUsageLimitsPolicyListResponseSchema
>;

/** SCM UsageLimitsClientListResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsClientListResponseSchema: z.ZodType<GatewayUsageLimitsPolicyListResponse> =
  GatewayUsageLimitsPolicyListResponseSchema;
export type GatewayUsageLimitsClientListResponse = z.infer<
  typeof GatewayUsageLimitsClientListResponseSchema
>;

/** SCM Condition; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestConditionSchema: z.ZodType<{
  key: string;
  value: string | Array<string>;
  excludes?: string | Array<string>;
}> = z
  .object({
    key: z.string(),
    value: z.union([z.string(), z.array(z.string())]),
    excludes: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .strict();
export type GatewayRequestCondition = z.infer<typeof GatewayRequestConditionSchema>;

/** SCM GroupBy; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestGroupBySchema: z.ZodType<{ key: string }> = z
  .object({ key: z.string() })
  .strict();
export type GatewayRequestGroupBy = z.infer<typeof GatewayRequestGroupBySchema>;

/** SCM CreateUsageLimitsPolicyRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayCreateUsageLimitsPolicyRequestSchema: z.ZodType<{
  name?: string;
  conditions: Array<GatewayRequestCondition>;
  group_by: Array<GatewayRequestGroupBy>;
  type: string;
  credit_limit: number;
  alert_threshold?: number | null;
  periodic_reset?: string | null;
  workspace_id?: string;
  organisation_id?: string;
}> = z
  .object({
    name: z.string().max(255).optional(),
    conditions: z.array(GatewayRequestConditionSchema).min(1),
    group_by: z.array(GatewayRequestGroupBySchema).min(1),
    type: z.string().min(1),
    credit_limit: z.number().finite().min(0),
    alert_threshold: z.number().finite().min(0).nullable().optional(),
    periodic_reset: z.string().min(1).nullable().optional(),
    workspace_id: z.string().optional(),
    organisation_id: z.string().optional(),
  })
  .strict();
export type GatewayCreateUsageLimitsPolicyRequest = z.infer<
  typeof GatewayCreateUsageLimitsPolicyRequestSchema
>;

/** SCM UsageLimitsClientCreateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUsageLimitsClientCreateRequestSchema: z.ZodType<GatewayCreateUsageLimitsPolicyRequest> =
  GatewayCreateUsageLimitsPolicyRequestSchema;
export type GatewayUsageLimitsClientCreateRequest = z.infer<
  typeof GatewayUsageLimitsClientCreateRequestSchema
>;

/** SCM CreatePolicyResponse; unknown response fields are preserved. */
export const GatewayCreatePolicyResponseSchema: z.ZodType<{
  id?: string;
  object?: string;
  [key: string]: unknown;
}> = z.object({ id: z.string().optional(), object: z.string().optional() }).passthrough();
export type GatewayCreatePolicyResponse = z.infer<typeof GatewayCreatePolicyResponseSchema>;

/** SCM UsageLimitsClientCreateResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsClientCreateResponseSchema: z.ZodType<GatewayCreatePolicyResponse> =
  GatewayCreatePolicyResponseSchema;
export type GatewayUsageLimitsClientCreateResponse = z.infer<
  typeof GatewayUsageLimitsClientCreateResponseSchema
>;

/** SCM UsageLimitsClientGetOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUsageLimitsClientGetOptionsSchema: z.ZodType<{
  status?: string;
  include_usage?: boolean;
}> = z
  .object({ status: z.string().min(1).optional(), include_usage: z.boolean().optional() })
  .strict();
export type GatewayUsageLimitsClientGetOptions = z.infer<
  typeof GatewayUsageLimitsClientGetOptionsSchema
>;

/** SCM UsageLimitsPolicyResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsPolicyResponseSchema: z.ZodType<
  GatewayUsageLimitsPolicy & { object?: string; [key: string]: unknown }
> = z.intersection(
  GatewayUsageLimitsPolicySchema,
  z.object({ object: z.string().optional() }).passthrough(),
);
export type GatewayUsageLimitsPolicyResponse = z.infer<
  typeof GatewayUsageLimitsPolicyResponseSchema
>;

/** SCM UsageLimitsClientGetResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsClientGetResponseSchema: z.ZodType<GatewayUsageLimitsPolicyResponse> =
  GatewayUsageLimitsPolicyResponseSchema;
export type GatewayUsageLimitsClientGetResponse = z.infer<
  typeof GatewayUsageLimitsClientGetResponseSchema
>;

/** SCM UpdateUsageLimitsPolicyRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUpdateUsageLimitsPolicyRequestSchema: z.ZodType<{
  name?: string;
  description?: string | null;
  conditions?: Array<GatewayRequestCondition>;
  credit_limit?: number;
  alert_threshold?: number | null;
  periodic_reset?: string | null;
  periodic_reset_days?: number | null;
  next_usage_reset_at?: string | null;
  reset_usage_for_value?: string;
}> = z
  .object({
    name: z.string().max(255).optional(),
    description: z.string().max(500).nullable().optional(),
    conditions: z.array(GatewayRequestConditionSchema).min(1).optional(),
    credit_limit: z.number().finite().min(0).optional(),
    alert_threshold: z.number().finite().min(0).nullable().optional(),
    periodic_reset: z.string().min(1).nullable().optional(),
    periodic_reset_days: z.number().finite().int().min(1).max(365).nullable().optional(),
    next_usage_reset_at: z.string().nullable().optional(),
    reset_usage_for_value: z.string().optional(),
  })
  .strict();
export type GatewayUpdateUsageLimitsPolicyRequest = z.infer<
  typeof GatewayUpdateUsageLimitsPolicyRequestSchema
>;

/** SCM UsageLimitsClientUpdateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUsageLimitsClientUpdateRequestSchema: z.ZodType<GatewayUpdateUsageLimitsPolicyRequest> =
  GatewayUpdateUsageLimitsPolicyRequestSchema;
export type GatewayUsageLimitsClientUpdateRequest = z.infer<
  typeof GatewayUsageLimitsClientUpdateRequestSchema
>;

/** SCM UsageLimitsClientUpdateResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsClientUpdateResponseSchema: z.ZodType<{ [key: string]: unknown }> = z
  .object({})
  .passthrough();
export type GatewayUsageLimitsClientUpdateResponse = z.infer<
  typeof GatewayUsageLimitsClientUpdateResponseSchema
>;

/** SCM UsageLimitsClientDeleteResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsClientDeleteResponseSchema: z.ZodType<{ [key: string]: unknown }> = z
  .object({})
  .passthrough();
export type GatewayUsageLimitsClientDeleteResponse = z.infer<
  typeof GatewayUsageLimitsClientDeleteResponseSchema
>;

/** SCM UsageLimitsClientListEntitiesOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUsageLimitsClientListEntitiesOptionsSchema: z.ZodType<{
  status?: string;
  search?: string;
  page_size?: number;
  current_page?: number;
}> = z
  .object({
    status: z.string().min(1).optional(),
    search: z.string().optional(),
    page_size: z.number().finite().int().min(1).max(100).optional(),
    current_page: z.number().finite().int().min(0).optional(),
  })
  .strict();
export type GatewayUsageLimitsClientListEntitiesOptions = z.infer<
  typeof GatewayUsageLimitsClientListEntitiesOptionsSchema
>;

/** SCM UsageLimitsPolicyEntity; unknown response fields are preserved. */
export const GatewayUsageLimitsPolicyEntitySchema: z.ZodType<{
  id?: string;
  value_key?: string;
  current_usage?: number;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string().optional(),
    value_key: z.string().optional(),
    current_usage: z.number().finite().optional(),
  })
  .passthrough();
export type GatewayUsageLimitsPolicyEntity = z.infer<typeof GatewayUsageLimitsPolicyEntitySchema>;

/** SCM UsageLimitsPolicyEntityListResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsPolicyEntityListResponseSchema: z.ZodType<{
  object?: string;
  data?: Array<GatewayUsageLimitsPolicyEntity>;
  total?: number;
  [key: string]: unknown;
}> = z
  .object({
    object: z.string().optional(),
    data: z.array(GatewayUsageLimitsPolicyEntitySchema).optional(),
    total: z.number().finite().int().optional(),
  })
  .passthrough();
export type GatewayUsageLimitsPolicyEntityListResponse = z.infer<
  typeof GatewayUsageLimitsPolicyEntityListResponseSchema
>;

/** SCM UsageLimitsClientListEntitiesResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsClientListEntitiesResponseSchema: z.ZodType<GatewayUsageLimitsPolicyEntityListResponse> =
  GatewayUsageLimitsPolicyEntityListResponseSchema;
export type GatewayUsageLimitsClientListEntitiesResponse = z.infer<
  typeof GatewayUsageLimitsClientListEntitiesResponseSchema
>;

/** SCM UsageLimitsClientResetEntityResponse; unknown response fields are preserved. */
export const GatewayUsageLimitsClientResetEntityResponseSchema: z.ZodType<{
  [key: string]: unknown;
}> = z.object({}).passthrough();
export type GatewayUsageLimitsClientResetEntityResponse = z.infer<
  typeof GatewayUsageLimitsClientResetEntityResponseSchema
>;

/** SCM RateLimitsClientListOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRateLimitsClientListOptionsSchema: z.ZodType<{
  workspace_id?: string;
  status?: string;
  type?: string;
  unit?: string;
  target?: string;
  page_size?: number;
  current_page?: number;
}> = z
  .object({
    workspace_id: z.string().optional(),
    status: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    target: z.string().min(1).optional(),
    page_size: z.number().finite().int().min(0).optional(),
    current_page: z.number().finite().int().min(0).optional(),
  })
  .strict();
export type GatewayRateLimitsClientListOptions = z.infer<
  typeof GatewayRateLimitsClientListOptionsSchema
>;

/** SCM RateLimitsPolicy; unknown response fields are preserved. */
export const GatewayRateLimitsPolicySchema: z.ZodType<{
  id: string;
  name?: string | null;
  conditions?: Array<GatewayCondition>;
  group_by?: Array<GatewayGroupBy>;
  type: string;
  unit: string;
  value: number;
  status: string;
  workspace_id: string;
  organisation_id: string;
  created_at: string;
  last_updated_at: string;
  target?: string;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    conditions: z.array(GatewayConditionSchema).optional(),
    group_by: z.array(GatewayGroupBySchema).optional(),
    type: z.string(),
    unit: z.string(),
    value: z.number().finite(),
    status: z.string(),
    workspace_id: z.string(),
    organisation_id: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    target: z.string().optional(),
  })
  .passthrough();
export type GatewayRateLimitsPolicy = z.infer<typeof GatewayRateLimitsPolicySchema>;

/** SCM RateLimitsPolicyListResponse; unknown response fields are preserved. */
export const GatewayRateLimitsPolicyListResponseSchema: z.ZodType<{
  object?: string;
  data?: Array<GatewayRateLimitsPolicy>;
  total?: number;
  [key: string]: unknown;
}> = z
  .object({
    object: z.string().optional(),
    data: z.array(GatewayRateLimitsPolicySchema).optional(),
    total: z.number().finite().int().optional(),
  })
  .passthrough();
export type GatewayRateLimitsPolicyListResponse = z.infer<
  typeof GatewayRateLimitsPolicyListResponseSchema
>;

/** SCM RateLimitsClientListResponse; unknown response fields are preserved. */
export const GatewayRateLimitsClientListResponseSchema: z.ZodType<GatewayRateLimitsPolicyListResponse> =
  GatewayRateLimitsPolicyListResponseSchema;
export type GatewayRateLimitsClientListResponse = z.infer<
  typeof GatewayRateLimitsClientListResponseSchema
>;

/** SCM CreateRateLimitsPolicyRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayCreateRateLimitsPolicyRequestSchema: z.ZodType<{
  name?: string;
  conditions: Array<GatewayRequestCondition>;
  group_by: Array<GatewayRequestGroupBy>;
  type: string;
  unit: string;
  value: number;
  target?: string;
  workspace_id?: string;
  organisation_id?: string;
}> = z
  .object({
    name: z.string().max(255).optional(),
    conditions: z.array(GatewayRequestConditionSchema).min(1),
    group_by: z.array(GatewayRequestGroupBySchema).min(1),
    type: z.string().min(1),
    unit: z.string().min(1),
    value: z.number().finite(),
    target: z.string().min(1).optional(),
    workspace_id: z.string().optional(),
    organisation_id: z.string().optional(),
  })
  .strict();
export type GatewayCreateRateLimitsPolicyRequest = z.infer<
  typeof GatewayCreateRateLimitsPolicyRequestSchema
>;

/** SCM RateLimitsClientCreateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRateLimitsClientCreateRequestSchema: z.ZodType<GatewayCreateRateLimitsPolicyRequest> =
  GatewayCreateRateLimitsPolicyRequestSchema;
export type GatewayRateLimitsClientCreateRequest = z.infer<
  typeof GatewayRateLimitsClientCreateRequestSchema
>;

/** SCM RateLimitsClientCreateResponse; unknown response fields are preserved. */
export const GatewayRateLimitsClientCreateResponseSchema: z.ZodType<GatewayCreatePolicyResponse> =
  GatewayCreatePolicyResponseSchema;
export type GatewayRateLimitsClientCreateResponse = z.infer<
  typeof GatewayRateLimitsClientCreateResponseSchema
>;

/** SCM RateLimitsClientGetOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRateLimitsClientGetOptionsSchema: z.ZodType<{ status?: string }> = z
  .object({ status: z.string().min(1).optional() })
  .strict();
export type GatewayRateLimitsClientGetOptions = z.infer<
  typeof GatewayRateLimitsClientGetOptionsSchema
>;

/** SCM RateLimitsPolicyResponse; unknown response fields are preserved. */
export const GatewayRateLimitsPolicyResponseSchema: z.ZodType<
  GatewayRateLimitsPolicy & { object?: string; [key: string]: unknown }
> = z.intersection(
  GatewayRateLimitsPolicySchema,
  z.object({ object: z.string().optional() }).passthrough(),
);
export type GatewayRateLimitsPolicyResponse = z.infer<typeof GatewayRateLimitsPolicyResponseSchema>;

/** SCM RateLimitsClientGetResponse; unknown response fields are preserved. */
export const GatewayRateLimitsClientGetResponseSchema: z.ZodType<GatewayRateLimitsPolicyResponse> =
  GatewayRateLimitsPolicyResponseSchema;
export type GatewayRateLimitsClientGetResponse = z.infer<
  typeof GatewayRateLimitsClientGetResponseSchema
>;

/** SCM UpdateRateLimitsPolicyRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUpdateRateLimitsPolicyRequestSchema: z.ZodType<{
  name?: string;
  unit?: string;
  value?: number;
  conditions?: Array<GatewayRequestCondition>;
}> = z
  .object({
    name: z.string().max(255).optional(),
    unit: z.string().min(1).optional(),
    value: z.number().finite().optional(),
    conditions: z.array(GatewayRequestConditionSchema).min(1).optional(),
  })
  .strict();
export type GatewayUpdateRateLimitsPolicyRequest = z.infer<
  typeof GatewayUpdateRateLimitsPolicyRequestSchema
>;

/** SCM RateLimitsClientUpdateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRateLimitsClientUpdateRequestSchema: z.ZodType<GatewayUpdateRateLimitsPolicyRequest> =
  GatewayUpdateRateLimitsPolicyRequestSchema;
export type GatewayRateLimitsClientUpdateRequest = z.infer<
  typeof GatewayRateLimitsClientUpdateRequestSchema
>;

/** SCM RateLimitsClientUpdateResponse; unknown response fields are preserved. */
export const GatewayRateLimitsClientUpdateResponseSchema: z.ZodType<{ [key: string]: unknown }> = z
  .object({})
  .passthrough();
export type GatewayRateLimitsClientUpdateResponse = z.infer<
  typeof GatewayRateLimitsClientUpdateResponseSchema
>;

/** SCM RateLimitsClientDeleteResponse; unknown response fields are preserved. */
export const GatewayRateLimitsClientDeleteResponseSchema: z.ZodType<{ [key: string]: unknown }> = z
  .object({})
  .passthrough();
export type GatewayRateLimitsClientDeleteResponse = z.infer<
  typeof GatewayRateLimitsClientDeleteResponseSchema
>;

/** SCM LogExportsClientListOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayLogExportsClientListOptionsSchema: z.ZodType<{ workspace_id?: string }> = z
  .object({ workspace_id: z.string().optional() })
  .strict();
export type GatewayLogExportsClientListOptions = z.infer<
  typeof GatewayLogExportsClientListOptionsSchema
>;

/** SCM GenerationsFilterSchema; unknown response fields are preserved. */
export const GatewayGenerationsFilterSchemaSchema: z.ZodType<{
  time_of_generation_min?: string;
  time_of_generation_max?: string;
  total_units_min?: number;
  total_units_max?: number;
  cost_min?: number;
  cost_max?: number;
  ai_model?: string;
  prompt_token_min?: number;
  prompt_token_max?: number;
  completion_token_min?: number;
  completion_token_max?: number;
  status_code?: string;
  metadata?: { [key: string]: unknown };
  ai_org_model?: string;
  weighted_feedback_min?: number;
  weighted_feedback_max?: number;
  virtual_keys?: string;
  trace_id?: string | Array<string>;
  configs?: string;
  workspace_slug?: string;
  prompt_slug?: string;
  page_size?: number;
  current_page?: number;
  [key: string]: unknown;
}> = z
  .object({
    time_of_generation_min: z.string().optional(),
    time_of_generation_max: z.string().optional(),
    total_units_min: z.number().finite().int().optional(),
    total_units_max: z.number().finite().int().optional(),
    cost_min: z.number().finite().optional(),
    cost_max: z.number().finite().optional(),
    ai_model: z.string().optional(),
    prompt_token_min: z.number().finite().int().optional(),
    prompt_token_max: z.number().finite().int().optional(),
    completion_token_min: z.number().finite().int().optional(),
    completion_token_max: z.number().finite().int().optional(),
    status_code: z.string().optional(),
    metadata: z.object({}).passthrough().optional(),
    ai_org_model: z.string().optional(),
    weighted_feedback_min: z.number().finite().optional(),
    weighted_feedback_max: z.number().finite().optional(),
    virtual_keys: z.string().optional(),
    trace_id: z.union([z.string(), z.array(z.string())]).optional(),
    configs: z.string().optional(),
    workspace_slug: z.string().optional(),
    prompt_slug: z.string().optional(),
    page_size: z.number().finite().optional(),
    current_page: z.number().finite().optional(),
  })
  .passthrough();
export type GatewayGenerationsFilterSchema = z.infer<typeof GatewayGenerationsFilterSchemaSchema>;

/** SCM LogExportsRequestedData; unknown response fields are preserved. */
export const GatewayLogExportsRequestedDataSchema: z.ZodType<Array<string>> = z.array(z.string());
export type GatewayLogExportsRequestedData = z.infer<typeof GatewayLogExportsRequestedDataSchema>;

/** SCM ExportItem; unknown response fields are preserved. */
export const GatewayExportItemSchema: z.ZodType<{
  id: string;
  organisation_id: string;
  filters: GatewayGenerationsFilterSchema;
  requested_data: GatewayLogExportsRequestedData;
  status: string;
  description: string;
  created_at: string;
  last_updated_at: string;
  created_by: string;
  workspace_id: string;
  object: string;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string(),
    organisation_id: z.string(),
    filters: GatewayGenerationsFilterSchemaSchema,
    requested_data: GatewayLogExportsRequestedDataSchema,
    status: z.string(),
    description: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    created_by: z.string(),
    workspace_id: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayExportItem = z.infer<typeof GatewayExportItemSchema>;

/** SCM ExportListResponse; unknown response fields are preserved. */
export const GatewayExportListResponseSchema: z.ZodType<{
  object?: string;
  total?: number;
  data?: Array<GatewayExportItem>;
  [key: string]: unknown;
}> = z
  .object({
    object: z.string().optional(),
    total: z.number().finite().int().optional(),
    data: z.array(GatewayExportItemSchema).optional(),
  })
  .passthrough();
export type GatewayExportListResponse = z.infer<typeof GatewayExportListResponseSchema>;

/** SCM LogExportsClientListResponse; unknown response fields are preserved. */
export const GatewayLogExportsClientListResponseSchema: z.ZodType<GatewayExportListResponse> =
  GatewayExportListResponseSchema;
export type GatewayLogExportsClientListResponse = z.infer<
  typeof GatewayLogExportsClientListResponseSchema
>;

/** SCM LogExportsRequestedData; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestLogExportsRequestedDataSchema: z.ZodType<Array<string>> = z.array(
  z.string().min(1),
);
export type GatewayRequestLogExportsRequestedData = z.infer<
  typeof GatewayRequestLogExportsRequestedDataSchema
>;

/** SCM LogExportsClientCreateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayLogExportsClientCreateRequestSchema: z.ZodType<{
  workspace_id?: string;
  filters: {
    time_of_generation_min: string;
    time_of_generation_max: string;
    total_units_min?: number;
    total_units_max?: number;
    cost_min?: number;
    cost_max?: number;
    ai_model?: string;
    prompt_token_min?: number;
    prompt_token_max?: number;
    completion_token_min?: number;
    completion_token_max?: number;
    status_code?: string;
    metadata?: { [key: string]: GatewayJsonValue };
    ai_org_model?: string;
    weighted_feedback_min?: number;
    weighted_feedback_max?: number;
    virtual_keys?: string;
    trace_id?: string;
    configs?: string;
    workspace_slug?: string;
    prompt_slug?: string;
    page_size?: number;
    current_page?: number;
  };
  requested_data: GatewayRequestLogExportsRequestedData;
  description: string;
}> = z
  .object({
    workspace_id: z.string().optional(),
    filters: z
      .object({
        time_of_generation_min: z.string(),
        time_of_generation_max: z.string(),
        total_units_min: z.number().finite().int().optional(),
        total_units_max: z.number().finite().int().optional(),
        cost_min: z.number().finite().optional(),
        cost_max: z.number().finite().optional(),
        ai_model: z.string().optional(),
        prompt_token_min: z.number().finite().int().optional(),
        prompt_token_max: z.number().finite().int().optional(),
        completion_token_min: z.number().finite().int().optional(),
        completion_token_max: z.number().finite().int().optional(),
        status_code: z.string().optional(),
        metadata: z.object({}).catchall(GatewayJsonValueSchema).optional(),
        ai_org_model: z.string().optional(),
        weighted_feedback_min: z.number().finite().optional(),
        weighted_feedback_max: z.number().finite().optional(),
        virtual_keys: z.string().optional(),
        trace_id: z.string().optional(),
        configs: z.string().optional(),
        workspace_slug: z.string().optional(),
        prompt_slug: z.string().optional(),
        page_size: z.number().finite().optional(),
        current_page: z.number().finite().optional(),
      })
      .strict(),
    requested_data: GatewayRequestLogExportsRequestedDataSchema,
    description: z.string().min(1),
  })
  .strict();
export type GatewayLogExportsClientCreateRequest = z.infer<
  typeof GatewayLogExportsClientCreateRequestSchema
>;

/** SCM UpdateExportResponse; unknown response fields are preserved. */
export const GatewayUpdateExportResponseSchema: z.ZodType<{
  id: string;
  total?: number;
  object: string;
  [key: string]: unknown;
}> = z
  .object({ id: z.string(), total: z.number().finite().int().optional(), object: z.string() })
  .passthrough();
export type GatewayUpdateExportResponse = z.infer<typeof GatewayUpdateExportResponseSchema>;

/** SCM LogExportsClientCreateResponse; unknown response fields are preserved. */
export const GatewayLogExportsClientCreateResponseSchema: z.ZodType<GatewayUpdateExportResponse> =
  GatewayUpdateExportResponseSchema;
export type GatewayLogExportsClientCreateResponse = z.infer<
  typeof GatewayLogExportsClientCreateResponseSchema
>;

/** SCM LogExportsClientGetResponse; unknown response fields are preserved. */
export const GatewayLogExportsClientGetResponseSchema: z.ZodType<GatewayExportItem> =
  GatewayExportItemSchema;
export type GatewayLogExportsClientGetResponse = z.infer<
  typeof GatewayLogExportsClientGetResponseSchema
>;

/** SCM LogExportsClientUpdateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayLogExportsClientUpdateRequestSchema: z.ZodType<{
  workspace_id?: string;
  filters: {
    time_of_generation_min: string;
    time_of_generation_max: string;
    total_units_min?: number;
    total_units_max?: number;
    cost_min?: number;
    cost_max?: number;
    ai_model?: string;
    prompt_token_min?: number;
    prompt_token_max?: number;
    completion_token_min?: number;
    completion_token_max?: number;
    status_code?: string;
    metadata?: { [key: string]: GatewayJsonValue };
    ai_org_model?: string;
    weighted_feedback_min?: number;
    weighted_feedback_max?: number;
    virtual_keys?: string;
    trace_id?: string;
    configs?: string;
    workspace_slug?: string;
    prompt_slug?: string;
    page_size?: number;
    current_page?: number;
  };
  requested_data?: GatewayRequestLogExportsRequestedData;
  description: string;
}> = z
  .object({
    workspace_id: z.string().optional(),
    filters: z
      .object({
        time_of_generation_min: z.string(),
        time_of_generation_max: z.string(),
        total_units_min: z.number().finite().int().optional(),
        total_units_max: z.number().finite().int().optional(),
        cost_min: z.number().finite().optional(),
        cost_max: z.number().finite().optional(),
        ai_model: z.string().optional(),
        prompt_token_min: z.number().finite().int().optional(),
        prompt_token_max: z.number().finite().int().optional(),
        completion_token_min: z.number().finite().int().optional(),
        completion_token_max: z.number().finite().int().optional(),
        status_code: z.string().optional(),
        metadata: z.object({}).catchall(GatewayJsonValueSchema).optional(),
        ai_org_model: z.string().optional(),
        weighted_feedback_min: z.number().finite().optional(),
        weighted_feedback_max: z.number().finite().optional(),
        virtual_keys: z.string().optional(),
        trace_id: z.string().optional(),
        configs: z.string().optional(),
        workspace_slug: z.string().optional(),
        prompt_slug: z.string().optional(),
        page_size: z.number().finite().optional(),
        current_page: z.number().finite().optional(),
      })
      .strict(),
    requested_data: GatewayRequestLogExportsRequestedDataSchema.optional(),
    description: z.string().min(1),
  })
  .strict();
export type GatewayLogExportsClientUpdateRequest = z.infer<
  typeof GatewayLogExportsClientUpdateRequestSchema
>;

/** SCM LogExportsClientUpdateResponse; unknown response fields are preserved. */
export const GatewayLogExportsClientUpdateResponseSchema: z.ZodType<GatewayUpdateExportResponse> =
  GatewayUpdateExportResponseSchema;
export type GatewayLogExportsClientUpdateResponse = z.infer<
  typeof GatewayLogExportsClientUpdateResponseSchema
>;

/** SCM ExportTaskResponse; unknown response fields are preserved. */
export const GatewayExportTaskResponseSchema: z.ZodType<{
  message: string;
  object: string;
  [key: string]: unknown;
}> = z.object({ message: z.string(), object: z.string() }).passthrough();
export type GatewayExportTaskResponse = z.infer<typeof GatewayExportTaskResponseSchema>;

/** SCM LogExportsClientStartResponse; unknown response fields are preserved. */
export const GatewayLogExportsClientStartResponseSchema: z.ZodType<GatewayExportTaskResponse> =
  GatewayExportTaskResponseSchema;
export type GatewayLogExportsClientStartResponse = z.infer<
  typeof GatewayLogExportsClientStartResponseSchema
>;

/** SCM LogExportsClientCancelResponse; unknown response fields are preserved. */
export const GatewayLogExportsClientCancelResponseSchema: z.ZodType<GatewayExportTaskResponse> =
  GatewayExportTaskResponseSchema;
export type GatewayLogExportsClientCancelResponse = z.infer<
  typeof GatewayLogExportsClientCancelResponseSchema
>;

/** SCM DownloadLogsResponse; unknown response fields are preserved. */
export const GatewayDownloadLogsResponseSchema: z.ZodType<{
  signed_url: string;
  [key: string]: unknown;
}> = z.object({ signed_url: z.string() }).passthrough();
export type GatewayDownloadLogsResponse = z.infer<typeof GatewayDownloadLogsResponseSchema>;

/** SCM LogExportsClientDownloadResponse; unknown response fields are preserved. */
export const GatewayLogExportsClientDownloadResponseSchema: z.ZodType<GatewayDownloadLogsResponse> =
  GatewayDownloadLogsResponseSchema;
export type GatewayLogExportsClientDownloadResponse = z.infer<
  typeof GatewayLogExportsClientDownloadResponseSchema
>;

/** SCM SecretReferencesClientListOptions; stable request fields are strict; extension maps accept finite JSON. */
export const GatewaySecretReferencesClientListOptionsSchema: z.ZodType<{
  manager_type?: 'aws_sm' | 'azure_kv' | 'hashicorp_vault';
  tags?: string;
  search?: string;
  current_page?: number;
  page_size?: number;
}> = z
  .object({
    manager_type: z
      .union([z.literal('aws_sm'), z.literal('azure_kv'), z.literal('hashicorp_vault')])
      .optional(),
    tags: z.string().optional(),
    search: z.string().min(1).max(255).optional(),
    current_page: z.number().finite().int().min(0).optional(),
    page_size: z.number().finite().int().min(1).max(100).optional(),
  })
  .strict();
export type GatewaySecretReferencesClientListOptions = z.infer<
  typeof GatewaySecretReferencesClientListOptionsSchema
>;

/** SCM SecretReferenceListItem; unknown response fields are preserved. */
export const GatewaySecretReferenceListItemSchema: z.ZodType<{
  id?: string;
  name?: string;
  slug?: string;
  manager_type?: string;
  status?: string;
  created_at?: string;
  last_updated_at?: string;
  object?: string;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    manager_type: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    last_updated_at: z.string().optional(),
    object: z.string().optional(),
  })
  .passthrough();
export type GatewaySecretReferenceListItem = z.infer<typeof GatewaySecretReferenceListItemSchema>;

/** SCM SecretReferencesClientListResponse; unknown response fields are preserved. */
export const GatewaySecretReferencesClientListResponseSchema: z.ZodType<{
  object?: string;
  total?: number;
  data?: Array<GatewaySecretReferenceListItem>;
  [key: string]: unknown;
}> = z
  .object({
    object: z.string().optional(),
    total: z.number().finite().int().optional(),
    data: z.array(GatewaySecretReferenceListItemSchema).optional(),
  })
  .passthrough();
export type GatewaySecretReferencesClientListResponse = z.infer<
  typeof GatewaySecretReferencesClientListResponseSchema
>;

/** SCM AwsAccessKeyAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestAwsAccessKeyAuthConfigSchema: z.ZodType<{
  aws_auth_type: 'accessKey';
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_region: string;
}> = z
  .object({
    aws_auth_type: z.literal('accessKey'),
    aws_access_key_id: z.string(),
    aws_secret_access_key: z.string(),
    aws_region: z.string(),
  })
  .strict();
export type GatewayRequestAwsAccessKeyAuthConfig = z.infer<
  typeof GatewayRequestAwsAccessKeyAuthConfigSchema
>;

/** SCM AwsAssumedRoleAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestAwsAssumedRoleAuthConfigSchema: z.ZodType<{
  aws_auth_type: 'assumedRole';
  aws_role_arn: string;
  aws_external_id?: string | null;
  aws_region: string;
}> = z
  .object({
    aws_auth_type: z.literal('assumedRole'),
    aws_role_arn: z.string(),
    aws_external_id: z.string().nullable().optional(),
    aws_region: z.string(),
  })
  .strict();
export type GatewayRequestAwsAssumedRoleAuthConfig = z.infer<
  typeof GatewayRequestAwsAssumedRoleAuthConfigSchema
>;

/** SCM AwsServiceRoleAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestAwsServiceRoleAuthConfigSchema: z.ZodType<{
  aws_auth_type: 'serviceRole';
  aws_region?: string;
}> = z
  .object({ aws_auth_type: z.literal('serviceRole'), aws_region: z.string().optional() })
  .strict();
export type GatewayRequestAwsServiceRoleAuthConfig = z.infer<
  typeof GatewayRequestAwsServiceRoleAuthConfigSchema
>;

/** SCM AzureEntraAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestAzureEntraAuthConfigSchema: z.ZodType<{
  azure_auth_mode: 'entra';
  azure_entra_tenant_id: string;
  azure_entra_client_id: string;
  azure_entra_client_secret: string;
  azure_vault_url: string;
}> = z
  .object({
    azure_auth_mode: z.literal('entra'),
    azure_entra_tenant_id: z.string(),
    azure_entra_client_id: z.string(),
    azure_entra_client_secret: z.string(),
    azure_vault_url: z.string(),
  })
  .strict();
export type GatewayRequestAzureEntraAuthConfig = z.infer<
  typeof GatewayRequestAzureEntraAuthConfigSchema
>;

/** SCM AzureManagedAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestAzureManagedAuthConfigSchema: z.ZodType<{
  azure_auth_mode: 'managed';
  azure_managed_client_id?: string;
  azure_vault_url: string;
}> = z
  .object({
    azure_auth_mode: z.literal('managed'),
    azure_managed_client_id: z.string().optional(),
    azure_vault_url: z.string(),
  })
  .strict();
export type GatewayRequestAzureManagedAuthConfig = z.infer<
  typeof GatewayRequestAzureManagedAuthConfigSchema
>;

/** SCM AzureDefaultAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestAzureDefaultAuthConfigSchema: z.ZodType<{
  azure_auth_mode: 'default';
  azure_vault_url: string;
}> = z.object({ azure_auth_mode: z.literal('default'), azure_vault_url: z.string() }).strict();
export type GatewayRequestAzureDefaultAuthConfig = z.infer<
  typeof GatewayRequestAzureDefaultAuthConfigSchema
>;

/** SCM HashicorpTokenAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestHashicorpTokenAuthConfigSchema: z.ZodType<{
  vault_auth_type: 'token';
  vault_addr: string;
  vault_token: string;
  vault_namespace?: string;
}> = z
  .object({
    vault_auth_type: z.literal('token'),
    vault_addr: z.string(),
    vault_token: z.string(),
    vault_namespace: z.string().optional(),
  })
  .strict();
export type GatewayRequestHashicorpTokenAuthConfig = z.infer<
  typeof GatewayRequestHashicorpTokenAuthConfigSchema
>;

/** SCM HashicorpAppRoleAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestHashicorpAppRoleAuthConfigSchema: z.ZodType<{
  vault_auth_type: 'approle';
  vault_addr: string;
  vault_role_id: string;
  vault_secret_id: string;
  vault_namespace?: string;
}> = z
  .object({
    vault_auth_type: z.literal('approle'),
    vault_addr: z.string(),
    vault_role_id: z.string(),
    vault_secret_id: z.string(),
    vault_namespace: z.string().optional(),
  })
  .strict();
export type GatewayRequestHashicorpAppRoleAuthConfig = z.infer<
  typeof GatewayRequestHashicorpAppRoleAuthConfigSchema
>;

/** SCM HashicorpKubernetesAuthConfig; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestHashicorpKubernetesAuthConfigSchema: z.ZodType<{
  vault_auth_type: 'kubernetes';
  vault_addr: string;
  vault_role: string;
  vault_namespace?: string;
}> = z
  .object({
    vault_auth_type: z.literal('kubernetes'),
    vault_addr: z.string(),
    vault_role: z.string(),
    vault_namespace: z.string().optional(),
  })
  .strict();
export type GatewayRequestHashicorpKubernetesAuthConfig = z.infer<
  typeof GatewayRequestHashicorpKubernetesAuthConfigSchema
>;

/** SCM CreateSecretReferenceRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayCreateSecretReferenceRequestSchema: z.ZodType<{
  organisation_id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  manager_type: 'aws_sm' | 'azure_kv' | 'hashicorp_vault';
  auth_config:
    | GatewayRequestAwsAccessKeyAuthConfig
    | GatewayRequestAwsAssumedRoleAuthConfig
    | GatewayRequestAwsServiceRoleAuthConfig
    | GatewayRequestAzureEntraAuthConfig
    | GatewayRequestAzureManagedAuthConfig
    | GatewayRequestAzureDefaultAuthConfig
    | GatewayRequestHashicorpTokenAuthConfig
    | GatewayRequestHashicorpAppRoleAuthConfig
    | GatewayRequestHashicorpKubernetesAuthConfig;
  secret_path: string;
  secret_key?: string | null;
  allow_all_workspaces?: boolean;
  allowed_workspaces?: Array<string>;
  tags?: { [key: string]: string } | null;
}> = z
  .object({
    organisation_id: z.string().optional(),
    name: z.string().min(1).max(255),
    slug: z.string().max(255).regex(new RegExp('^[a-zA-Z0-9_-]+$')).optional(),
    description: z.string().max(1024).nullable().optional(),
    manager_type: z.union([
      z.literal('aws_sm'),
      z.literal('azure_kv'),
      z.literal('hashicorp_vault'),
    ]),
    auth_config: z.union([
      GatewayRequestAwsAccessKeyAuthConfigSchema,
      GatewayRequestAwsAssumedRoleAuthConfigSchema,
      GatewayRequestAwsServiceRoleAuthConfigSchema,
      GatewayRequestAzureEntraAuthConfigSchema,
      GatewayRequestAzureManagedAuthConfigSchema,
      GatewayRequestAzureDefaultAuthConfigSchema,
      GatewayRequestHashicorpTokenAuthConfigSchema,
      GatewayRequestHashicorpAppRoleAuthConfigSchema,
      GatewayRequestHashicorpKubernetesAuthConfigSchema,
    ]),
    secret_path: z.string().max(1024),
    secret_key: z.string().max(255).nullable().optional(),
    allow_all_workspaces: z.boolean().optional(),
    allowed_workspaces: z.array(z.string()).min(1).optional(),
    tags: z.object({}).catchall(z.string()).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.allow_all_workspaces === true && value.allowed_workspaces !== undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowed_workspaces'],
        message: 'Cannot combine allowed_workspaces with allow_all_workspaces=true',
      });
    const config = value.auth_config;
    const matches =
      value.manager_type === 'aws_sm'
        ? 'aws_auth_type' in config
        : value.manager_type === 'azure_kv'
          ? 'azure_auth_mode' in config
          : 'vault_auth_type' in config;
    if (!matches)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['auth_config'],
        message: 'Authentication configuration must match manager_type',
      });
  });
export type GatewayCreateSecretReferenceRequest = z.infer<
  typeof GatewayCreateSecretReferenceRequestSchema
>;

/** SCM SecretReferencesClientCreateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewaySecretReferencesClientCreateRequestSchema: z.ZodType<GatewayCreateSecretReferenceRequest> =
  GatewayCreateSecretReferenceRequestSchema;
export type GatewaySecretReferencesClientCreateRequest = z.infer<
  typeof GatewaySecretReferencesClientCreateRequestSchema
>;

/** SCM SecretReferencesClientCreateResponse; unknown response fields are preserved. */
export const GatewaySecretReferencesClientCreateResponseSchema: z.ZodType<{
  id?: string;
  slug?: string;
  object?: string;
  [key: string]: unknown;
}> = z
  .object({ id: z.string().optional(), slug: z.string().optional(), object: z.string().optional() })
  .passthrough();
export type GatewaySecretReferencesClientCreateResponse = z.infer<
  typeof GatewaySecretReferencesClientCreateResponseSchema
>;

/** SCM SecretReferenceDetailResponse; unknown response fields are preserved. */
export const GatewaySecretReferenceDetailResponseSchema: z.ZodType<{
  id?: string;
  organisation_id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  manager_type?: string;
  secret_path?: string;
  secret_key?: string | null;
  allow_all_workspaces?: boolean;
  tags?: { [key: string]: string } | null;
  status?: string;
  created_by?: string;
  created_at?: string;
  last_updated_at?: string;
  auth_config?: { [key: string]: unknown };
  object?: string;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string().optional(),
    organisation_id: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().nullable().optional(),
    manager_type: z.string().optional(),
    secret_path: z.string().optional(),
    secret_key: z.string().nullable().optional(),
    allow_all_workspaces: z.boolean().optional(),
    tags: z.object({}).catchall(z.string()).nullable().optional(),
    status: z.string().optional(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    last_updated_at: z.string().optional(),
    auth_config: z.object({}).passthrough().optional(),
    object: z.string().optional(),
  })
  .passthrough();
export type GatewaySecretReferenceDetailResponse = z.infer<
  typeof GatewaySecretReferenceDetailResponseSchema
>;

/** SCM SecretReferencesClientGetResponse; unknown response fields are preserved. */
export const GatewaySecretReferencesClientGetResponseSchema: z.ZodType<GatewaySecretReferenceDetailResponse> =
  GatewaySecretReferenceDetailResponseSchema;
export type GatewaySecretReferencesClientGetResponse = z.infer<
  typeof GatewaySecretReferencesClientGetResponseSchema
>;

/** SCM UpdateSecretReferenceRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUpdateSecretReferenceRequestSchema: z.ZodType<{
  name?: string;
  description?: string | null;
  auth_config?: { [key: string]: GatewayJsonValue };
  secret_path?: string;
  secret_key?: string | null;
  allow_all_workspaces?: boolean;
  allowed_workspaces?: Array<string>;
  tags?: { [key: string]: string } | null;
}> = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1024).nullable().optional(),
    auth_config: z.object({}).catchall(GatewayJsonValueSchema).optional(),
    secret_path: z.string().max(1024).optional(),
    secret_key: z.string().max(255).nullable().optional(),
    allow_all_workspaces: z.boolean().optional(),
    allowed_workspaces: z.array(z.string()).min(1).optional(),
    tags: z.object({}).catchall(z.string()).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.allow_all_workspaces === true && value.allowed_workspaces !== undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowed_workspaces'],
        message: 'Cannot combine allowed_workspaces with allow_all_workspaces=true',
      });
    if (Object.keys(value).length === 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide at least one update field' });
  });
export type GatewayUpdateSecretReferenceRequest = z.infer<
  typeof GatewayUpdateSecretReferenceRequestSchema
>;

/** SCM SecretReferencesClientUpdateRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewaySecretReferencesClientUpdateRequestSchema: z.ZodType<GatewayUpdateSecretReferenceRequest> =
  GatewayUpdateSecretReferenceRequestSchema;
export type GatewaySecretReferencesClientUpdateRequest = z.infer<
  typeof GatewaySecretReferencesClientUpdateRequestSchema
>;

/** SCM SecretReferencesClientUpdateResponse; unknown response fields are preserved. */
export const GatewaySecretReferencesClientUpdateResponseSchema: z.ZodType<{
  [key: string]: unknown;
}> = z.object({}).passthrough();
export type GatewaySecretReferencesClientUpdateResponse = z.infer<
  typeof GatewaySecretReferencesClientUpdateResponseSchema
>;

/** SCM SecretReferencesClientDeleteResponse; unknown response fields are preserved. */
export const GatewaySecretReferencesClientDeleteResponseSchema: z.ZodType<{
  [key: string]: unknown;
}> = z.object({}).passthrough();
export type GatewaySecretReferencesClientDeleteResponse = z.infer<
  typeof GatewaySecretReferencesClientDeleteResponseSchema
>;

/** SCM BulkSyncMcpServerMappingsRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayBulkSyncMcpServerMappingsRequestSchema: z.ZodType<{
  mcp_servers: {
    [key: string]: { run_on?: Array<string>; mcp_integration_capability_ids?: Array<string> };
  };
}> = z
  .object({
    mcp_servers: z.object({}).catchall(
      z
        .object({
          run_on: z.array(z.string().min(1)).min(1).optional(),
          mcp_integration_capability_ids: z.array(z.string()).optional(),
        })
        .strict(),
    ),
  })
  .strict();
export type GatewayBulkSyncMcpServerMappingsRequest = z.infer<
  typeof GatewayBulkSyncMcpServerMappingsRequestSchema
>;

/** SCM BulkSyncMcpServerMappingsResponse; unknown response fields are preserved. */
export const GatewayBulkSyncMcpServerMappingsResponseSchema: z.ZodType<{
  changed: boolean;
  added: number;
  updated: number;
  removed: number;
  [key: string]: unknown;
}> = z
  .object({
    changed: z.boolean(),
    added: z.number().finite().int().min(0),
    updated: z.number().finite().int().min(0),
    removed: z.number().finite().int().min(0),
  })
  .passthrough();
export type GatewayBulkSyncMcpServerMappingsResponse = z.infer<
  typeof GatewayBulkSyncMcpServerMappingsResponseSchema
>;

/** SCM McpServerMapping; unknown response fields are preserved. */
export const GatewayMcpServerMappingSchema: z.ZodType<{
  id: string;
  guardrail_id: string;
  mcp_server_id: string;
  run_on: Array<string>;
  capability_ids?: Array<string>;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string(),
    guardrail_id: z.string(),
    mcp_server_id: z.string(),
    run_on: z.array(z.string()).min(1),
    capability_ids: z.array(z.string()).optional(),
  })
  .passthrough();
export type GatewayMcpServerMapping = z.infer<typeof GatewayMcpServerMappingSchema>;

/** SCM UpsertMcpServerMappingRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayUpsertMcpServerMappingRequestSchema: z.ZodType<{
  run_on?: Array<string>;
  mcp_integration_capability_ids?: Array<string>;
}> = z
  .object({
    run_on: z.array(z.string().min(1)).min(1).optional(),
    mcp_integration_capability_ids: z.array(z.string()).optional(),
  })
  .strict();
export type GatewayUpsertMcpServerMappingRequest = z.infer<
  typeof GatewayUpsertMcpServerMappingRequestSchema
>;

/** SCM UpsertMcpServerMappingResponse; unknown response fields are preserved. */
export const GatewayUpsertMcpServerMappingResponseSchema: z.ZodType<{
  map_id: string;
  [key: string]: unknown;
}> = z.object({ map_id: z.string() }).passthrough();
export type GatewayUpsertMcpServerMappingResponse = z.infer<
  typeof GatewayUpsertMcpServerMappingResponseSchema
>;

/** SCM McpIntegrationWorkspaceItem; unknown response fields are preserved. */
export const GatewayMcpIntegrationWorkspaceItemSchema: z.ZodType<{
  id?: string;
  enabled?: boolean;
  status?: string;
  created_at?: string;
  last_updated_at?: string;
  [key: string]: unknown;
}> = z
  .object({
    id: z.string().optional(),
    enabled: z.boolean().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    last_updated_at: z.string().optional(),
  })
  .passthrough();
export type GatewayMcpIntegrationWorkspaceItem = z.infer<
  typeof GatewayMcpIntegrationWorkspaceItemSchema
>;

/** SCM McpIntegrationWorkspacesListResponse; unknown response fields are preserved. */
export const GatewayMcpIntegrationWorkspacesListResponseSchema: z.ZodType<{
  data?: Array<GatewayMcpIntegrationWorkspaceItem>;
  global_workspace_access?: { [key: string]: unknown } | null;
  total?: number;
  [key: string]: unknown;
}> = z
  .object({
    data: z.array(GatewayMcpIntegrationWorkspaceItemSchema).optional(),
    global_workspace_access: z.object({}).passthrough().nullable().optional(),
    total: z.number().finite().int().optional(),
  })
  .passthrough();
export type GatewayMcpIntegrationWorkspacesListResponse = z.infer<
  typeof GatewayMcpIntegrationWorkspacesListResponseSchema
>;

/** SCM McpIntegrationWorkspacesLegacyResponse; unknown response fields are preserved. */
export const GatewayMcpIntegrationWorkspacesLegacyResponseSchema: z.ZodType<{
  workspaces?: Array<GatewayMcpIntegrationWorkspaceItem>;
  global_workspace_access?: { [key: string]: unknown } | null;
  [key: string]: unknown;
}> = z
  .object({
    workspaces: z.array(GatewayMcpIntegrationWorkspaceItemSchema).optional(),
    global_workspace_access: z.object({}).passthrough().nullable().optional(),
  })
  .passthrough();
export type GatewayMcpIntegrationWorkspacesLegacyResponse = z.infer<
  typeof GatewayMcpIntegrationWorkspacesLegacyResponseSchema
>;

/** SCM JWTParameters; unknown response fields are preserved. */
export const GatewayJWTParametersSchema: z.ZodType<{
  jwksUri: string;
  headerKey: string;
  cacheMaxAge?: number;
  clockTolerance?: number;
  maxTokenAge?: string;
  algorithms?: Array<string>;
  [key: string]: unknown;
}> = z
  .object({
    jwksUri: z.string(),
    headerKey: z.string(),
    cacheMaxAge: z.number().finite().optional(),
    clockTolerance: z.number().finite().optional(),
    maxTokenAge: z.string().optional(),
    algorithms: z.array(z.string()).optional(),
  })
  .passthrough();
export type GatewayJWTParameters = z.infer<typeof GatewayJWTParametersSchema>;

/** SCM ModelWhitelistParameters; unknown response fields are preserved. */
export const GatewayModelWhitelistParametersSchema: z.ZodType<{
  models: Array<string>;
  [key: string]: unknown;
}> = z.object({ models: z.array(z.string()) }).passthrough();
export type GatewayModelWhitelistParameters = z.infer<typeof GatewayModelWhitelistParametersSchema>;

/** SCM RegexMatchParameters; unknown response fields are preserved. */
export const GatewayRegexMatchParametersSchema: z.ZodType<{
  rule: string;
  not?: boolean;
  [key: string]: unknown;
}> = z.object({ rule: z.string(), not: z.boolean().optional() }).passthrough();
export type GatewayRegexMatchParameters = z.infer<typeof GatewayRegexMatchParametersSchema>;

/** SCM SentenceCountParameters; unknown response fields are preserved. */
export const GatewaySentenceCountParametersSchema: z.ZodType<{
  minSentences?: number;
  maxSentences?: number;
  not?: boolean;
  [key: string]: unknown;
}> = z
  .object({
    minSentences: z.number().finite().optional(),
    maxSentences: z.number().finite().optional(),
    not: z.boolean().optional(),
  })
  .passthrough();
export type GatewaySentenceCountParameters = z.infer<typeof GatewaySentenceCountParametersSchema>;

/** SCM WordCountParameters; unknown response fields are preserved. */
export const GatewayWordCountParametersSchema: z.ZodType<{
  minWords?: number;
  maxWords?: number;
  not?: boolean;
  [key: string]: unknown;
}> = z
  .object({
    minWords: z.number().finite().optional(),
    maxWords: z.number().finite().optional(),
    not: z.boolean().optional(),
  })
  .passthrough();
export type GatewayWordCountParameters = z.infer<typeof GatewayWordCountParametersSchema>;

/** SCM CharacterCountParameters; unknown response fields are preserved. */
export const GatewayCharacterCountParametersSchema: z.ZodType<{
  minCharacters?: number;
  maxCharacters?: number;
  not?: boolean;
  [key: string]: unknown;
}> = z
  .object({
    minCharacters: z.number().finite().optional(),
    maxCharacters: z.number().finite().optional(),
    not: z.boolean().optional(),
  })
  .passthrough();
export type GatewayCharacterCountParameters = z.infer<typeof GatewayCharacterCountParametersSchema>;

/** SCM JSONSchemaParameters; unknown response fields are preserved. */
export const GatewayJSONSchemaParametersSchema: z.ZodType<{
  schema: { [key: string]: unknown };
  not?: boolean;
  [key: string]: unknown;
}> = z.object({ schema: z.object({}).passthrough(), not: z.boolean().optional() }).passthrough();
export type GatewayJSONSchemaParameters = z.infer<typeof GatewayJSONSchemaParametersSchema>;

/** SCM JSONKeysParameters; unknown response fields are preserved. */
export const GatewayJSONKeysParametersSchema: z.ZodType<{
  keys: Array<string>;
  operator: string;
  [key: string]: unknown;
}> = z.object({ keys: z.array(z.string()), operator: z.string() }).passthrough();
export type GatewayJSONKeysParameters = z.infer<typeof GatewayJSONKeysParametersSchema>;

/** SCM ContainsParameters; unknown response fields are preserved. */
export const GatewayContainsParametersSchema: z.ZodType<{
  words: Array<string>;
  operator: string;
  [key: string]: unknown;
}> = z.object({ words: z.array(z.string()), operator: z.string() }).passthrough();
export type GatewayContainsParameters = z.infer<typeof GatewayContainsParametersSchema>;

/** SCM ValidUrlsParameters; unknown response fields are preserved. */
export const GatewayValidUrlsParametersSchema: z.ZodType<{
  onlyDNS?: boolean;
  not?: boolean;
  [key: string]: unknown;
}> = z.object({ onlyDNS: z.boolean().optional(), not: z.boolean().optional() }).passthrough();
export type GatewayValidUrlsParameters = z.infer<typeof GatewayValidUrlsParametersSchema>;

/** SCM ContainsCodeParameters; unknown response fields are preserved. */
export const GatewayContainsCodeParametersSchema: z.ZodType<{
  format: string;
  not?: boolean;
  [key: string]: unknown;
}> = z.object({ format: z.string(), not: z.boolean().optional() }).passthrough();
export type GatewayContainsCodeParameters = z.infer<typeof GatewayContainsCodeParametersSchema>;

/** SCM WebhookParameters; unknown response fields are preserved. */
export const GatewayWebhookParametersSchema: z.ZodType<{
  webhookURL: string;
  headers?: { [key: string]: unknown };
  timeout?: number;
  failOnError?: boolean;
  [key: string]: unknown;
}> = z
  .object({
    webhookURL: z.string(),
    headers: z.object({}).passthrough().optional(),
    timeout: z.number().finite().optional(),
    failOnError: z.boolean().optional(),
  })
  .passthrough();
export type GatewayWebhookParameters = z.infer<typeof GatewayWebhookParametersSchema>;

/** SCM EndsWithParameters; unknown response fields are preserved. */
export const GatewayEndsWithParametersSchema: z.ZodType<{
  suffix: string;
  not?: boolean;
  [key: string]: unknown;
}> = z.object({ suffix: z.string(), not: z.boolean().optional() }).passthrough();
export type GatewayEndsWithParameters = z.infer<typeof GatewayEndsWithParametersSchema>;

/** SCM UppercaseParameters; unknown response fields are preserved. */
export const GatewayUppercaseParametersSchema: z.ZodType<{
  not?: boolean;
  [key: string]: unknown;
}> = z.object({ not: z.boolean().optional() }).passthrough();
export type GatewayUppercaseParameters = z.infer<typeof GatewayUppercaseParametersSchema>;

/** SCM RequiredMetadataKeysParameters; unknown response fields are preserved. */
export const GatewayRequiredMetadataKeysParametersSchema: z.ZodType<{
  metadataKeys: Array<string>;
  operator: string;
  [key: string]: unknown;
}> = z.object({ metadataKeys: z.array(z.string()), operator: z.string() }).passthrough();
export type GatewayRequiredMetadataKeysParameters = z.infer<
  typeof GatewayRequiredMetadataKeysParametersSchema
>;

/** SCM AllowedRequestTypesParameters; unknown response fields are preserved. */
export const GatewayAllowedRequestTypesParametersSchema: z.ZodType<{
  allowedTypes?: Array<string>;
  blockedTypes?: Array<string>;
  [key: string]: unknown;
}> = z
  .object({
    allowedTypes: z.array(z.string()).optional(),
    blockedTypes: z.array(z.string()).optional(),
  })
  .passthrough();
export type GatewayAllowedRequestTypesParameters = z.infer<
  typeof GatewayAllowedRequestTypesParametersSchema
>;

/** SCM SydeGuardParameters; unknown response fields are preserved. */
export const GatewaySydeGuardParametersSchema: z.ZodType<{
  prompt_injection_threshold?: number;
  toxicity_threshold?: number;
  evasion_threshold?: number;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({
    prompt_injection_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    toxicity_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    evasion_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    timeout: z.number().finite().optional(),
  })
  .passthrough();
export type GatewaySydeGuardParameters = z.infer<typeof GatewaySydeGuardParametersSchema>;

/** SCM AporiaParameters; unknown response fields are preserved. */
export const GatewayAporiaParametersSchema: z.ZodType<{
  projectID: string;
  timeout?: number;
  [key: string]: unknown;
}> = z.object({ projectID: z.string(), timeout: z.number().finite().optional() }).passthrough();
export type GatewayAporiaParameters = z.infer<typeof GatewayAporiaParametersSchema>;

/** SCM PillarScanParameters; unknown response fields are preserved. */
export const GatewayPillarScanParametersSchema: z.ZodType<{
  scanners: Array<string>;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({ scanners: z.array(z.string()), timeout: z.number().finite().optional() })
  .passthrough();
export type GatewayPillarScanParameters = z.infer<typeof GatewayPillarScanParametersSchema>;

/** SCM PatronusParameters; unknown response fields are preserved. */
export const GatewayPatronusParametersSchema: z.ZodType<{
  redact?: boolean;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({ redact: z.boolean().optional(), timeout: z.number().finite().optional() })
  .passthrough();
export type GatewayPatronusParameters = z.infer<typeof GatewayPatronusParametersSchema>;

/** SCM PatronusCustomParameters; unknown response fields are preserved. */
export const GatewayPatronusCustomParametersSchema: z.ZodType<{
  profile: string;
  timeout?: number;
  [key: string]: unknown;
}> = z.object({ profile: z.string(), timeout: z.number().finite().optional() }).passthrough();
export type GatewayPatronusCustomParameters = z.infer<typeof GatewayPatronusCustomParametersSchema>;

/** SCM PortkeyModerationParameters; unknown response fields are preserved. */
export const GatewayPortkeyModerationParametersSchema: z.ZodType<{
  categories: Array<string>;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({ categories: z.array(z.string()), timeout: z.number().finite().optional() })
  .passthrough();
export type GatewayPortkeyModerationParameters = z.infer<
  typeof GatewayPortkeyModerationParametersSchema
>;

/** SCM PortkeyLanguageParameters; unknown response fields are preserved. */
export const GatewayPortkeyLanguageParametersSchema: z.ZodType<{
  language?: string;
  not?: boolean;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({
    language: z.string().optional(),
    not: z.boolean().optional(),
    timeout: z.number().finite().optional(),
  })
  .passthrough();
export type GatewayPortkeyLanguageParameters = z.infer<
  typeof GatewayPortkeyLanguageParametersSchema
>;

/** SCM PortkeyPIIParameters; unknown response fields are preserved. */
export const GatewayPortkeyPIIParametersSchema: z.ZodType<{
  redact?: boolean;
  categories: Array<string>;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({
    redact: z.boolean().optional(),
    categories: z.array(z.string()),
    timeout: z.number().finite().optional(),
  })
  .passthrough();
export type GatewayPortkeyPIIParameters = z.infer<typeof GatewayPortkeyPIIParametersSchema>;

/** SCM MistralModerationParameters; unknown response fields are preserved. */
export const GatewayMistralModerationParametersSchema: z.ZodType<{
  categories: Array<string>;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({ categories: z.array(z.string()), timeout: z.number().finite().optional() })
  .passthrough();
export type GatewayMistralModerationParameters = z.infer<
  typeof GatewayMistralModerationParametersSchema
>;

/** SCM BedrockGuardParameters; unknown response fields are preserved. */
export const GatewayBedrockGuardParametersSchema: z.ZodType<{
  guardrailVersion: string;
  guardrailId: string;
  redact?: boolean;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({
    guardrailVersion: z.string(),
    guardrailId: z.string(),
    redact: z.boolean().optional(),
    timeout: z.number().finite().optional(),
  })
  .passthrough();
export type GatewayBedrockGuardParameters = z.infer<typeof GatewayBedrockGuardParametersSchema>;

/** SCM PromptfooParameters; unknown response fields are preserved. */
export const GatewayPromptfooParametersSchema: z.ZodType<{
  redact?: boolean;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({ redact: z.boolean().optional(), timeout: z.number().finite().optional() })
  .passthrough();
export type GatewayPromptfooParameters = z.infer<typeof GatewayPromptfooParametersSchema>;

/** SCM AcuvityScanParameters; unknown response fields are preserved. */
export const GatewayAcuvityScanParametersSchema: z.ZodType<{
  prompt_injection?: boolean;
  prompt_injection_threshold?: number;
  toxic?: boolean;
  toxic_threshold?: number;
  jail_break?: boolean;
  jail_break_threshold?: number;
  malicious_url?: boolean;
  malicious_url_threshold?: number;
  biased?: boolean;
  biased_threshold?: number;
  harmful?: boolean;
  harmful_threshold?: number;
  language?: boolean;
  language_values?: string;
  pii?: boolean;
  pii_redact?: boolean;
  pii_categories?: Array<string>;
  secrets?: boolean;
  secrets_redact?: boolean;
  secrets_categories?: Array<string>;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({
    prompt_injection: z.boolean().optional(),
    prompt_injection_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    toxic: z.boolean().optional(),
    toxic_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    jail_break: z.boolean().optional(),
    jail_break_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    malicious_url: z.boolean().optional(),
    malicious_url_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    biased: z.boolean().optional(),
    biased_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    harmful: z.boolean().optional(),
    harmful_threshold: z.number().finite().min(0).max(1).multipleOf(0.01).optional(),
    language: z.boolean().optional(),
    language_values: z.string().optional(),
    pii: z.boolean().optional(),
    pii_redact: z.boolean().optional(),
    pii_categories: z.array(z.string()).optional(),
    secrets: z.boolean().optional(),
    secrets_redact: z.boolean().optional(),
    secrets_categories: z.array(z.string()).optional(),
    timeout: z.number().finite().optional(),
  })
  .passthrough();
export type GatewayAcuvityScanParameters = z.infer<typeof GatewayAcuvityScanParametersSchema>;

/** SCM AzureContentSafetyParameters; unknown response fields are preserved. */
export const GatewayAzureContentSafetyParametersSchema: z.ZodType<{
  blocklistNames?: Array<string>;
  apiVersion?: string;
  severity?: number;
  categories?: Array<string>;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({
    blocklistNames: z.array(z.string()).optional(),
    apiVersion: z.string().optional(),
    severity: z.number().finite().optional(),
    categories: z.array(z.string()).optional(),
    timeout: z.number().finite().optional(),
  })
  .passthrough();
export type GatewayAzureContentSafetyParameters = z.infer<
  typeof GatewayAzureContentSafetyParametersSchema
>;

/** SCM AzurePIIParameters; unknown response fields are preserved. */
export const GatewayAzurePIIParametersSchema: z.ZodType<{
  domain?: string;
  apiVersion?: string;
  modelVersion?: string;
  redact?: boolean;
  timeout?: number;
  [key: string]: unknown;
}> = z
  .object({
    domain: z.string().optional(),
    apiVersion: z.string().optional(),
    modelVersion: z.string().optional(),
    redact: z.boolean().optional(),
    timeout: z.number().finite().optional(),
  })
  .passthrough();
export type GatewayAzurePIIParameters = z.infer<typeof GatewayAzurePIIParametersSchema>;

/** SCM PANWPrismaParameters; unknown response fields are preserved. */
export const GatewayPANWPrismaParametersSchema: z.ZodType<{
  profile_name: string;
  ai_model?: string;
  app_user?: string;
  [key: string]: unknown;
}> = z
  .object({
    profile_name: z.string(),
    ai_model: z.string().optional(),
    app_user: z.string().optional(),
  })
  .passthrough();
export type GatewayPANWPrismaParameters = z.infer<typeof GatewayPANWPrismaParametersSchema>;

/** SCM BasicParameters; unknown response fields are preserved. */
export const GatewayBasicParametersSchema: z.ZodType<{ [key: string]: unknown }> = z
  .object({})
  .passthrough();
export type GatewayBasicParameters = z.infer<typeof GatewayBasicParametersSchema>;

/** SCM CatalogGuardrailParameters; unknown response fields are preserved. */
export const GatewayCatalogGuardrailParametersSchema: z.ZodType<
  | GatewayJWTParameters
  | GatewayModelWhitelistParameters
  | GatewayRegexMatchParameters
  | GatewaySentenceCountParameters
  | GatewayWordCountParameters
  | GatewayCharacterCountParameters
  | GatewayJSONSchemaParameters
  | GatewayJSONKeysParameters
  | GatewayContainsParameters
  | GatewayValidUrlsParameters
  | GatewayContainsCodeParameters
  | GatewayWebhookParameters
  | GatewayEndsWithParameters
  | GatewayUppercaseParameters
  | GatewayRequiredMetadataKeysParameters
  | GatewayAllowedRequestTypesParameters
  | GatewaySydeGuardParameters
  | GatewayAporiaParameters
  | GatewayPillarScanParameters
  | GatewayPatronusParameters
  | GatewayPatronusCustomParameters
  | GatewayPortkeyModerationParameters
  | GatewayPortkeyLanguageParameters
  | GatewayPortkeyPIIParameters
  | GatewayMistralModerationParameters
  | GatewayBedrockGuardParameters
  | GatewayPromptfooParameters
  | GatewayAcuvityScanParameters
  | GatewayAzureContentSafetyParameters
  | GatewayAzurePIIParameters
  | GatewayPANWPrismaParameters
  | GatewayBasicParameters
> = z.union([
  GatewayJWTParametersSchema,
  GatewayModelWhitelistParametersSchema,
  GatewayRegexMatchParametersSchema,
  GatewaySentenceCountParametersSchema,
  GatewayWordCountParametersSchema,
  GatewayCharacterCountParametersSchema,
  GatewayJSONSchemaParametersSchema,
  GatewayJSONKeysParametersSchema,
  GatewayContainsParametersSchema,
  GatewayValidUrlsParametersSchema,
  GatewayContainsCodeParametersSchema,
  GatewayWebhookParametersSchema,
  GatewayEndsWithParametersSchema,
  GatewayUppercaseParametersSchema,
  GatewayRequiredMetadataKeysParametersSchema,
  GatewayAllowedRequestTypesParametersSchema,
  GatewaySydeGuardParametersSchema,
  GatewayAporiaParametersSchema,
  GatewayPillarScanParametersSchema,
  GatewayPatronusParametersSchema,
  GatewayPatronusCustomParametersSchema,
  GatewayPortkeyModerationParametersSchema,
  GatewayPortkeyLanguageParametersSchema,
  GatewayPortkeyPIIParametersSchema,
  GatewayMistralModerationParametersSchema,
  GatewayBedrockGuardParametersSchema,
  GatewayPromptfooParametersSchema,
  GatewayAcuvityScanParametersSchema,
  GatewayAzureContentSafetyParametersSchema,
  GatewayAzurePIIParametersSchema,
  GatewayPANWPrismaParametersSchema,
  GatewayBasicParametersSchema,
]);
export type GatewayCatalogGuardrailParameters = z.infer<
  typeof GatewayCatalogGuardrailParametersSchema
>;

/** SCM OpenAIConfiguration; unknown response fields are preserved. */
export const GatewayCatalogOpenAIConfigurationSchema: z.ZodType<{
  openai_organization?: string;
  openai_project?: string;
  [key: string]: unknown;
}> = z
  .object({ openai_organization: z.string().optional(), openai_project: z.string().optional() })
  .passthrough();
export type GatewayCatalogOpenAIConfiguration = z.infer<
  typeof GatewayCatalogOpenAIConfigurationSchema
>;

/** SCM AzureDeploymentConfig; unknown response fields are preserved. */
export const GatewayAzureDeploymentConfigSchema: z.ZodType<{
  alias?: string;
  azure_api_version: string;
  azure_deployment_name: string;
  is_default?: boolean;
  azure_model_slug: string;
  [key: string]: unknown;
}> = z
  .object({
    alias: z.string().optional(),
    azure_api_version: z.string().max(30),
    azure_deployment_name: z.string(),
    is_default: z.boolean().optional(),
    azure_model_slug: z.string(),
  })
  .passthrough();
export type GatewayAzureDeploymentConfig = z.infer<typeof GatewayAzureDeploymentConfigSchema>;

/** SCM AzureOpenAIConfiguration; unknown response fields are preserved. */
export const GatewayCatalogAzureOpenAIConfigurationSchema: z.ZodType<{
  azure_auth_mode: string;
  azure_resource_name: string;
  azure_deployment_config: Array<GatewayAzureDeploymentConfig>;
  azure_entra_tenant_id?: string;
  azure_entra_client_id?: string;
  azure_entra_client_secret?: string;
  azure_managed_client_id?: string;
  [key: string]: unknown;
}> = z
  .object({
    azure_auth_mode: z.string(),
    azure_resource_name: z.string(),
    azure_deployment_config: z.array(GatewayAzureDeploymentConfigSchema).min(1),
    azure_entra_tenant_id: z.string().optional(),
    azure_entra_client_id: z.string().optional(),
    azure_entra_client_secret: z.string().optional(),
    azure_managed_client_id: z.string().optional(),
  })
  .passthrough();
export type GatewayCatalogAzureOpenAIConfiguration = z.infer<
  typeof GatewayCatalogAzureOpenAIConfigurationSchema
>;

/** SCM BedrockConfiguration; unknown response fields are preserved. */
export const GatewayCatalogBedrockConfigurationSchema: z.ZodType<{
  aws_auth_type: string;
  aws_region: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  aws_role_arn?: string;
  aws_external_id?: string | null;
  [key: string]: unknown;
}> = z
  .object({
    aws_auth_type: z.string(),
    aws_region: z.string(),
    aws_access_key_id: z.string().optional(),
    aws_secret_access_key: z.string().optional(),
    aws_role_arn: z.string().optional(),
    aws_external_id: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayCatalogBedrockConfiguration = z.infer<
  typeof GatewayCatalogBedrockConfigurationSchema
>;

/** SCM VertexAIConfiguration; unknown response fields are preserved. */
export const GatewayCatalogVertexAIConfigurationSchema: z.ZodType<{
  vertex_auth_type: string;
  vertex_region: string;
  vertex_project_id?: string;
  vertex_service_account_json?: { [key: string]: unknown };
  [key: string]: unknown;
}> = z
  .object({
    vertex_auth_type: z.string(),
    vertex_region: z.string(),
    vertex_project_id: z.string().optional(),
    vertex_service_account_json: z.object({}).passthrough().optional(),
  })
  .passthrough();
export type GatewayCatalogVertexAIConfiguration = z.infer<
  typeof GatewayCatalogVertexAIConfigurationSchema
>;

/** SCM AzureAIConfiguration; unknown response fields are preserved. */
export const GatewayCatalogAzureAIConfigurationSchema: z.ZodType<{
  azure_auth_mode: string;
  azure_foundry_url: string;
  azure_api_version?: string;
  azure_deployment_name?: string;
  azure_entra_tenant_id?: string;
  azure_entra_client_id?: string;
  azure_entra_client_secret?: string;
  azure_managed_client_id?: string;
  [key: string]: unknown;
}> = z
  .object({
    azure_auth_mode: z.string(),
    azure_foundry_url: z.string(),
    azure_api_version: z.string().max(30).optional(),
    azure_deployment_name: z.string().optional(),
    azure_entra_tenant_id: z.string().optional(),
    azure_entra_client_id: z.string().optional(),
    azure_entra_client_secret: z.string().optional(),
    azure_managed_client_id: z.string().optional(),
  })
  .passthrough();
export type GatewayCatalogAzureAIConfiguration = z.infer<
  typeof GatewayCatalogAzureAIConfigurationSchema
>;

/** SCM WorkersAIConfiguration; unknown response fields are preserved. */
export const GatewayCatalogWorkersAIConfigurationSchema: z.ZodType<{
  workers_ai_account_id: string;
  [key: string]: unknown;
}> = z.object({ workers_ai_account_id: z.string() }).passthrough();
export type GatewayCatalogWorkersAIConfiguration = z.infer<
  typeof GatewayCatalogWorkersAIConfigurationSchema
>;

/** SCM SageMakerConfiguration; unknown response fields are preserved. */
export const GatewayCatalogSageMakerConfigurationSchema: z.ZodType<
  GatewayCatalogBedrockConfiguration & {
    amzn_sagemaker_custom_attributes?: string;
    amzn_sagemaker_target_model?: string;
    amzn_sagemaker_target_variant?: string;
    amzn_sagemaker_target_container_hostname?: string;
    amzn_sagemaker_inference_id?: string;
    amzn_sagemaker_enable_explanations?: string;
    amzn_sagemaker_inference_component?: string;
    amzn_sagemaker_session_id?: string;
    amzn_sagemaker_model_name?: string;
    [key: string]: unknown;
  }
> = z.intersection(
  GatewayCatalogBedrockConfigurationSchema,
  z
    .object({
      amzn_sagemaker_custom_attributes: z.string().optional(),
      amzn_sagemaker_target_model: z.string().optional(),
      amzn_sagemaker_target_variant: z.string().optional(),
      amzn_sagemaker_target_container_hostname: z.string().optional(),
      amzn_sagemaker_inference_id: z.string().optional(),
      amzn_sagemaker_enable_explanations: z.string().optional(),
      amzn_sagemaker_inference_component: z.string().optional(),
      amzn_sagemaker_session_id: z.string().optional(),
      amzn_sagemaker_model_name: z.string().optional(),
    })
    .passthrough(),
);
export type GatewayCatalogSageMakerConfiguration = z.infer<
  typeof GatewayCatalogSageMakerConfigurationSchema
>;

/** SCM HuggingFaceConfiguration; unknown response fields are preserved. */
export const GatewayCatalogHuggingFaceConfigurationSchema: z.ZodType<{
  huggingface_base_url?: string;
  [key: string]: unknown;
}> = z.object({ huggingface_base_url: z.string().optional() }).passthrough();
export type GatewayCatalogHuggingFaceConfiguration = z.infer<
  typeof GatewayCatalogHuggingFaceConfigurationSchema
>;

/** SCM CortexConfiguration; unknown response fields are preserved. */
export const GatewayCatalogCortexConfigurationSchema: z.ZodType<{
  snowflake_account: string;
  [key: string]: unknown;
}> = z.object({ snowflake_account: z.string() }).passthrough();
export type GatewayCatalogCortexConfiguration = z.infer<
  typeof GatewayCatalogCortexConfigurationSchema
>;

/** SCM CustomHostConfiguration; unknown response fields are preserved. */
export const GatewayCatalogCustomHostConfigurationSchema: z.ZodType<{
  custom_host?: string;
  custom_headers?: { [key: string]: string };
  [key: string]: unknown;
}> = z
  .object({
    custom_host: z.string().optional(),
    custom_headers: z.object({}).catchall(z.string()).optional(),
  })
  .passthrough();
export type GatewayCatalogCustomHostConfiguration = z.infer<
  typeof GatewayCatalogCustomHostConfigurationSchema
>;

/** SCM CatalogProviderConfiguration; unknown response fields are preserved. */
export const GatewayCatalogProviderConfigurationSchema: z.ZodType<
  | GatewayCatalogOpenAIConfiguration
  | GatewayCatalogAzureOpenAIConfiguration
  | GatewayCatalogBedrockConfiguration
  | GatewayCatalogVertexAIConfiguration
  | GatewayCatalogAzureAIConfiguration
  | GatewayCatalogWorkersAIConfiguration
  | GatewayCatalogSageMakerConfiguration
  | GatewayCatalogHuggingFaceConfiguration
  | GatewayCatalogCortexConfiguration
  | GatewayCatalogCustomHostConfiguration
> = z.union([
  GatewayCatalogOpenAIConfigurationSchema,
  GatewayCatalogAzureOpenAIConfigurationSchema,
  GatewayCatalogBedrockConfigurationSchema,
  GatewayCatalogVertexAIConfigurationSchema,
  GatewayCatalogAzureAIConfigurationSchema,
  GatewayCatalogWorkersAIConfigurationSchema,
  GatewayCatalogSageMakerConfigurationSchema,
  GatewayCatalogHuggingFaceConfigurationSchema,
  GatewayCatalogCortexConfigurationSchema,
  GatewayCatalogCustomHostConfigurationSchema,
]);
export type GatewayCatalogProviderConfiguration = z.infer<
  typeof GatewayCatalogProviderConfigurationSchema
>;

/** SCM CatalogMcpConfiguration; unknown response fields are preserved. */
export const GatewayCatalogMcpConfigurationSchema: z.ZodType<{
  custom_headers?: { [key: string]: unknown };
  passthrough_header?: { [key: string]: unknown };
  [key: string]: unknown;
}> = z
  .object({
    custom_headers: z.object({}).passthrough().optional(),
    passthrough_header: z.object({}).passthrough().optional(),
  })
  .passthrough();
export type GatewayCatalogMcpConfiguration = z.infer<typeof GatewayCatalogMcpConfigurationSchema>;

/** SCM PricingMultiplier; unknown response fields are preserved. */
export const GatewayPricingMultiplierSchema: z.ZodType<{
  default?: number | null;
  request_token?: number | null;
  response_token?: number | null;
  cache_read_input_token?: number | null;
  cache_write_input_token?: number | null;
  cache_read_audio_input_token?: number | null;
  request_audio_token?: number | null;
  response_audio_token?: number | null;
  reasoning_token?: number | null;
  prediction_accepted_token?: number | null;
  prediction_rejected_token?: number | null;
  request_image_token?: number | null;
  response_image_token?: number | null;
  request_text_token?: number | null;
  response_text_token?: number | null;
  cache_read_image_input_token?: number | null;
  cache_read_text_input_token?: number | null;
  cache_write_text_input_token?: number | null;
  cache_write_image_input_token?: number | null;
  image?: { default?: number | null } | null;
  additional_units?: { [key: string]: number | null } | null;
}> = z
  .object({
    default: z.number().finite().min(0).nullable().optional(),
    request_token: z.number().finite().min(0).nullable().optional(),
    response_token: z.number().finite().min(0).nullable().optional(),
    cache_read_input_token: z.number().finite().min(0).nullable().optional(),
    cache_write_input_token: z.number().finite().min(0).nullable().optional(),
    cache_read_audio_input_token: z.number().finite().min(0).nullable().optional(),
    request_audio_token: z.number().finite().min(0).nullable().optional(),
    response_audio_token: z.number().finite().min(0).nullable().optional(),
    reasoning_token: z.number().finite().min(0).nullable().optional(),
    prediction_accepted_token: z.number().finite().min(0).nullable().optional(),
    prediction_rejected_token: z.number().finite().min(0).nullable().optional(),
    request_image_token: z.number().finite().min(0).nullable().optional(),
    response_image_token: z.number().finite().min(0).nullable().optional(),
    request_text_token: z.number().finite().min(0).nullable().optional(),
    response_text_token: z.number().finite().min(0).nullable().optional(),
    cache_read_image_input_token: z.number().finite().min(0).nullable().optional(),
    cache_read_text_input_token: z.number().finite().min(0).nullable().optional(),
    cache_write_text_input_token: z.number().finite().min(0).nullable().optional(),
    cache_write_image_input_token: z.number().finite().min(0).nullable().optional(),
    image: z
      .object({ default: z.number().finite().min(0).nullable().optional() })
      .strict()
      .nullable()
      .optional(),
    additional_units: z
      .object({})
      .catchall(z.number().finite().min(0).nullable())
      .nullable()
      .optional(),
  })
  .strict();
export type GatewayPricingMultiplier = z.infer<typeof GatewayPricingMultiplierSchema>;

/** SCM PricingAdjustments; unknown response fields are preserved. */
export const GatewayPricingAdjustmentsSchema: z.ZodType<{
  multiplier?: GatewayPricingMultiplier;
} | null> = z.object({ multiplier: GatewayPricingMultiplierSchema.optional() }).strict().nullable();
export type GatewayPricingAdjustments = z.infer<typeof GatewayPricingAdjustmentsSchema>;

/** SCM TokenPricing; unknown response fields are preserved. */
export const GatewayTokenPricingSchema: z.ZodType<{ price?: number; [key: string]: unknown }> = z
  .object({ price: z.number().finite().optional() })
  .passthrough();
export type GatewayTokenPricing = z.infer<typeof GatewayTokenPricingSchema>;

/** SCM PayAsYouGoPricing; unknown response fields are preserved. */
export const GatewayPayAsYouGoPricingSchema: z.ZodType<{
  request_token?: GatewayTokenPricing;
  response_token?: GatewayTokenPricing;
  [key: string]: unknown;
}> = z
  .object({
    request_token: GatewayTokenPricingSchema.optional(),
    response_token: GatewayTokenPricingSchema.optional(),
  })
  .passthrough();
export type GatewayPayAsYouGoPricing = z.infer<typeof GatewayPayAsYouGoPricingSchema>;

/** SCM PricingConfig; unknown response fields are preserved. */
export const GatewayPricingConfigSchema: z.ZodType<{
  type?: string;
  pay_as_you_go?: GatewayPayAsYouGoPricing;
  [key: string]: unknown;
}> = z
  .object({ type: z.string().optional(), pay_as_you_go: GatewayPayAsYouGoPricingSchema.optional() })
  .passthrough();
export type GatewayPricingConfig = z.infer<typeof GatewayPricingConfigSchema>;

/** SCM SecretMapping; unknown response fields are preserved. */
export const GatewayCatalogSecretMappingSchema: z.ZodType<{
  target_field: string;
  secret_reference_id: string;
  secret_key?: string | null;
  value_format?: string | null;
  [key: string]: unknown;
}> = z
  .object({
    target_field: z.string(),
    secret_reference_id: z.string(),
    secret_key: z.string().nullable().optional(),
    value_format: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayCatalogSecretMapping = z.infer<typeof GatewayCatalogSecretMappingSchema>;

/** SCM DeploymentTags; unknown response fields are preserved. */
export const GatewayDeploymentTagsSchema: z.ZodType<{ [key: string]: string } | null> = z
  .object({})
  .catchall(z.string())
  .nullable();
export type GatewayDeploymentTags = z.infer<typeof GatewayDeploymentTagsSchema>;

/** SCM PricingMultiplier; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestPricingMultiplierSchema: z.ZodType<{
  default?: number | null;
  request_token?: number | null;
  response_token?: number | null;
  cache_read_input_token?: number | null;
  cache_write_input_token?: number | null;
  cache_read_audio_input_token?: number | null;
  request_audio_token?: number | null;
  response_audio_token?: number | null;
  reasoning_token?: number | null;
  prediction_accepted_token?: number | null;
  prediction_rejected_token?: number | null;
  request_image_token?: number | null;
  response_image_token?: number | null;
  request_text_token?: number | null;
  response_text_token?: number | null;
  cache_read_image_input_token?: number | null;
  cache_read_text_input_token?: number | null;
  cache_write_text_input_token?: number | null;
  cache_write_image_input_token?: number | null;
  image?: { default?: number | null } | null;
  additional_units?: { [key: string]: number | null } | null;
}> = z
  .object({
    default: z.number().finite().min(0).nullable().optional(),
    request_token: z.number().finite().min(0).nullable().optional(),
    response_token: z.number().finite().min(0).nullable().optional(),
    cache_read_input_token: z.number().finite().min(0).nullable().optional(),
    cache_write_input_token: z.number().finite().min(0).nullable().optional(),
    cache_read_audio_input_token: z.number().finite().min(0).nullable().optional(),
    request_audio_token: z.number().finite().min(0).nullable().optional(),
    response_audio_token: z.number().finite().min(0).nullable().optional(),
    reasoning_token: z.number().finite().min(0).nullable().optional(),
    prediction_accepted_token: z.number().finite().min(0).nullable().optional(),
    prediction_rejected_token: z.number().finite().min(0).nullable().optional(),
    request_image_token: z.number().finite().min(0).nullable().optional(),
    response_image_token: z.number().finite().min(0).nullable().optional(),
    request_text_token: z.number().finite().min(0).nullable().optional(),
    response_text_token: z.number().finite().min(0).nullable().optional(),
    cache_read_image_input_token: z.number().finite().min(0).nullable().optional(),
    cache_read_text_input_token: z.number().finite().min(0).nullable().optional(),
    cache_write_text_input_token: z.number().finite().min(0).nullable().optional(),
    cache_write_image_input_token: z.number().finite().min(0).nullable().optional(),
    image: z
      .object({ default: z.number().finite().min(0).nullable().optional() })
      .strict()
      .nullable()
      .optional(),
    additional_units: z
      .object({})
      .catchall(z.number().finite().min(0).nullable())
      .nullable()
      .optional(),
  })
  .strict();
export type GatewayRequestPricingMultiplier = z.infer<typeof GatewayRequestPricingMultiplierSchema>;

/** SCM PricingAdjustmentsRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayPricingAdjustmentsRequestSchema: z.ZodType<{
  multiplier?: GatewayRequestPricingMultiplier;
} | null> = z
  .object({ multiplier: GatewayRequestPricingMultiplierSchema.optional() })
  .strict()
  .nullable();
export type GatewayPricingAdjustmentsRequest = z.infer<
  typeof GatewayPricingAdjustmentsRequestSchema
>;

/** SCM TokenPricing; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestTokenPricingSchema: z.ZodType<{ price?: number }> = z
  .object({ price: z.number().finite().optional() })
  .strict();
export type GatewayRequestTokenPricing = z.infer<typeof GatewayRequestTokenPricingSchema>;

/** SCM PayAsYouGoPricing; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayRequestPayAsYouGoPricingSchema: z.ZodType<{
  request_token?: GatewayRequestTokenPricing;
  response_token?: GatewayRequestTokenPricing;
}> = z
  .object({
    request_token: GatewayRequestTokenPricingSchema.optional(),
    response_token: GatewayRequestTokenPricingSchema.optional(),
  })
  .strict();
export type GatewayRequestPayAsYouGoPricing = z.infer<typeof GatewayRequestPayAsYouGoPricingSchema>;

/** SCM PricingConfigRequest; stable request fields are strict; extension maps accept finite JSON. */
export const GatewayPricingConfigRequestSchema: z.ZodType<{
  type?: string;
  pay_as_you_go?: GatewayRequestPayAsYouGoPricing;
}> = z
  .object({
    type: z.string().min(1).optional(),
    pay_as_you_go: GatewayRequestPayAsYouGoPricingSchema.optional(),
  })
  .strict();
export type GatewayPricingConfigRequest = z.infer<typeof GatewayPricingConfigRequestSchema>;

/** Normalize the upstream bare array and the live SCM data envelope to one result. */
export const GatewayMcpServerMappingsResponseSchema = z.union([
  z.array(GatewayMcpServerMappingSchema),
  z
    .object({ data: z.array(GatewayMcpServerMappingSchema) })
    .passthrough()
    .transform((value) => value.data),
]);
export type GatewayMcpServerMappingsResponse = z.infer<
  typeof GatewayMcpServerMappingsResponseSchema
>;
