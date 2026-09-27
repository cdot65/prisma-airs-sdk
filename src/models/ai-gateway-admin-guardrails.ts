import { z } from 'zod';
import {
  GatewayGuardrailActionsSchema,
  GatewayGuardrailCheckSchema,
} from './ai-gateway-requests.js';
import { GatewayMcpServerMappingSchema } from './ai-gateway-extensions.js';

/** Official admin-plane contract; organisation UUID is distinct from the numeric SCM TSG. */
export const GatewayAdminGuardrailCreateRequestSchema = z
  .object({
    name: z.string().min(1),
    target: z.enum(['llm', 'mcp_tools']).optional(),
    workspace_id: z.string().uuid().optional(),
    organisation_id: z.string().uuid().optional(),
    checks: z.array(GatewayGuardrailCheckSchema).min(1).optional(),
    actions: GatewayGuardrailActionsSchema.optional(),
  })
  .strict();
export type GatewayAdminGuardrailCreateRequest = z.infer<
  typeof GatewayAdminGuardrailCreateRequestSchema
>;

/** Optional workspace filtering is deployment-dependent; omission lists organisation guardrails. */
export const GatewayAdminGuardrailListOptionsSchema = z
  .object({
    workspaceId: z.string().uuid().optional(),
    pageSize: z.number().int().min(1).max(1000).optional(),
    currentPage: z.number().int().min(0).optional(),
  })
  .strict();
export type GatewayAdminGuardrailListOptions = z.infer<
  typeof GatewayAdminGuardrailListOptionsSchema
>;

/** Admin records can be organisation-scoped, without a workspace. Unknown fields are retained. */
export const GatewayAdminGuardrailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    owner_id: z.string(),
    target: z.enum(['llm', 'mcp_tools']).optional(),
    organisation_id: z.string().optional(),
    workspace_id: z.string().nullable().optional(),
    status: z.enum(['active', 'archived']).optional(),
    updated_by: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayAdminGuardrail = z.infer<typeof GatewayAdminGuardrailSchema>;
export const GatewayAdminGuardrailListResponseSchema = z
  .object({
    data: z.array(GatewayAdminGuardrailSchema),
    total: z.number().int().nonnegative(),
  })
  .passthrough();
export type GatewayAdminGuardrailListResponse = z.infer<
  typeof GatewayAdminGuardrailListResponseSchema
>;
export const GatewayAdminGuardrailDetailSchema = GatewayAdminGuardrailSchema.extend({
  checks: z.array(GatewayGuardrailCheckSchema.passthrough()).optional(),
  actions: GatewayGuardrailActionsSchema.innerType().optional(),
  mcp_server_mappings: z.array(GatewayMcpServerMappingSchema).optional(),
}).passthrough();
export type GatewayAdminGuardrailDetail = z.infer<typeof GatewayAdminGuardrailDetailSchema>;
export const GatewayAdminGuardrailCreateResponseSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    version_id: z.string(),
  })
  .passthrough();
export type GatewayAdminGuardrailCreateResponse = z.infer<
  typeof GatewayAdminGuardrailCreateResponseSchema
>;
export const GatewayAdminGuardrailUpdateResponseSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    version_id: z.string().optional(),
  })
  .passthrough();
export type GatewayAdminGuardrailUpdateResponse = z.infer<
  typeof GatewayAdminGuardrailUpdateResponseSchema
>;

/** Admin mapping input from the official spec; no arbitrary execution phases or capability IDs. */
export const GatewayAdminGuardrailMcpMappingRequestSchema = z
  .object({
    run_on: z
      .array(z.enum(['input', 'output']))
      .min(1)
      .optional(),
    mcp_integration_capability_ids: z.array(z.string().uuid()).optional(),
  })
  .strict();
export type GatewayAdminGuardrailMcpMappingRequest = z.infer<
  typeof GatewayAdminGuardrailMcpMappingRequestSchema
>;
export const GatewayAdminGuardrailMcpSyncRequestSchema = z
  .object({
    mcp_servers: z.record(z.string().uuid(), GatewayAdminGuardrailMcpMappingRequestSchema),
  })
  .strict();
export type GatewayAdminGuardrailMcpSyncRequest = z.infer<
  typeof GatewayAdminGuardrailMcpSyncRequestSchema
>;
