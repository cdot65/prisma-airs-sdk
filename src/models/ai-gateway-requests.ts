import { z } from 'zod';
import {
  GatewayApiKeyScopeSchema,
  GatewayDeploymentStatusSchema,
  GatewayDeploymentTypeSchema,
  GatewayJsonObjectSchema,
  GatewayJsonValueSchema,
  GatewayMcpAuthTypeSchema,
  GatewayMcpTransportSchema,
  GatewayMutableMcpCapabilityTypeSchema,
  GatewayRateLimitTypeSchema,
  GatewayRateLimitUnitSchema,
  GatewayRoutingConfigSchema,
} from './ai-gateway-routing.js';

const nonEmptyString = z.string().min(1);
const uuid = z.string().uuid();
const numericId = z.string().regex(/^\d+$/, 'Expected a numeric-string TSG id');
const workspaceRef = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const dateTime = z.string().datetime({ offset: true });

const nonEmptyObject = <T extends z.AnyZodObject>(
  schema: T,
  message = 'Provide at least one field',
) => schema.refine((body) => Object.keys(body).length > 0, { message });

export const GatewayRateLimitInputSchema = z
  .object({
    type: GatewayRateLimitTypeSchema,
    unit: GatewayRateLimitUnitSchema,
    value: z.number().int().min(0),
  })
  .strict();
export type GatewayRateLimitInput = z.infer<typeof GatewayRateLimitInputSchema>;

export const GatewayUsageLimitInputSchema = nonEmptyObject(
  z
    .object({
      credit_limit: z.number().min(0).optional(),
      type: z.enum(['cost', 'tokens']).optional(),
      alert_threshold: z.number().min(0).optional(),
      periodic_reset: z.enum(['monthly', 'weekly']).nullable().optional(),
      periodic_reset_days: z.number().int().min(1).max(365).nullable().optional(),
      next_usage_reset_at: dateTime.nullable().optional(),
    })
    .strict(),
).refine(
  (value) => value.periodic_reset == null || value.periodic_reset_days == null,
  'periodic_reset and periodic_reset_days are mutually exclusive',
);
export type GatewayUsageLimitInput = z.infer<typeof GatewayUsageLimitInputSchema>;

export const GatewayDefaultsInputSchema = z
  .object({
    metadata: z.record(GatewayJsonValueSchema).optional(),
    config_id: nonEmptyString.optional(),
    allow_config_override: z.boolean().optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayDefaultsInput = z.infer<typeof GatewayDefaultsInputSchema>;

export const GatewaySecretMappingSchema = z
  .object({
    target_field: nonEmptyString,
    secret_reference_id: nonEmptyString,
    secret_key: nonEmptyString.nullable().optional(),
    value_format: z.enum(['json', 'string']).nullable().optional(),
  })
  .strict();
export type GatewaySecretMapping = z.infer<typeof GatewaySecretMappingSchema>;

export const GatewayGlobalWorkspaceAccessInputSchema = z
  .object({
    enabled: z.boolean(),
    usage_limits: z.array(GatewayUsageLimitInputSchema).max(1).nullable().optional(),
    rate_limits: z.array(GatewayRateLimitInputSchema).max(1).nullable().optional(),
  })
  .strict();
export type GatewayGlobalWorkspaceAccessInput = z.infer<
  typeof GatewayGlobalWorkspaceAccessInputSchema
>;

export const GatewayWorkspaceBindingSchema = z
  .object({
    id: workspaceRef,
    enabled: z.boolean(),
    usage_limits: z.array(GatewayUsageLimitInputSchema).max(1).nullable().optional(),
    rate_limits: z.array(GatewayRateLimitInputSchema).max(1).nullable().optional(),
    reset_usage: z.boolean().optional(),
    create_default_provider: z.boolean().optional(),
    default_provider_slug: nonEmptyString.optional(),
  })
  .strict();
export type GatewayWorkspaceBinding = z.infer<typeof GatewayWorkspaceBindingSchema>;

export const GatewayWorkspaceCreateRequestSchema = z
  .object({
    name: nonEmptyString,
    scope_name: nonEmptyString,
    description: z.string().optional(),
    icon: z.string().optional(),
    defaults: GatewayDefaultsInputSchema.optional(),
    users: z.array(nonEmptyString).optional(),
    usage_limits: z.array(GatewayUsageLimitInputSchema).optional(),
    rate_limits: z.array(GatewayRateLimitInputSchema).optional(),
  })
  .strict();
export type GatewayWorkspaceCreateRequest = z.infer<typeof GatewayWorkspaceCreateRequestSchema>;

export const GatewayWorkspaceUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      name: nonEmptyString.optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      defaults: GatewayDefaultsInputSchema.optional(),
      usage_limits: z.array(GatewayUsageLimitInputSchema).optional(),
      rate_limits: z.array(GatewayRateLimitInputSchema).optional(),
    })
    .strict(),
);
export type GatewayWorkspaceUpdateRequest = z.infer<typeof GatewayWorkspaceUpdateRequestSchema>;

export const GatewayConfigCreateRequestSchema = z
  .object({
    name: nonEmptyString,
    workspace_id: uuid,
    config: GatewayRoutingConfigSchema,
  })
  .strict();
export type GatewayConfigCreateRequest = z.infer<typeof GatewayConfigCreateRequestSchema>;

export const GatewayConfigUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      name: nonEmptyString.optional(),
      workspace_id: uuid.optional(),
      config: GatewayRoutingConfigSchema.optional(),
      status: nonEmptyString.optional(),
    })
    .strict(),
);
export type GatewayConfigUpdateRequest = z.infer<typeof GatewayConfigUpdateRequestSchema>;

export const GatewayGuardrailCheckSchema = z
  .object({
    id: nonEmptyString,
    parameters: GatewayJsonObjectSchema.optional(),
    is_enabled: z.boolean().optional(),
    name: nonEmptyString.optional(),
  })
  .strict();
export type GatewayGuardrailCheck = z.infer<typeof GatewayGuardrailCheckSchema>;

const feedbackSchema = z
  .object({
    value: z.number(),
    weight: z.number(),
    metadata: z.string(),
  })
  .catchall(GatewayJsonValueSchema);
const actionResultSchema = z
  .object({ feedback: feedbackSchema.optional() })
  .catchall(GatewayJsonValueSchema);

export const GatewayGuardrailActionsSchema = nonEmptyObject(
  z
    .object({
      deny: z.boolean().optional(),
      async: z.boolean().optional(),
      on_success: actionResultSchema.optional(),
      on_fail: actionResultSchema.optional(),
    })
    .catchall(GatewayJsonValueSchema),
);
export type GatewayGuardrailActions = z.infer<typeof GatewayGuardrailActionsSchema>;

export const GatewayGuardrailCreateRequestSchema = z
  .object({
    workspace_id: uuid,
    name: nonEmptyString,
    checks: z.array(GatewayGuardrailCheckSchema).min(1),
    actions: GatewayGuardrailActionsSchema,
  })
  .strict();
export type GatewayGuardrailCreateRequest = z.infer<typeof GatewayGuardrailCreateRequestSchema>;

export const GatewayGuardrailUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      name: nonEmptyString.optional(),
      checks: z.array(GatewayGuardrailCheckSchema).min(1).optional(),
      actions: GatewayGuardrailActionsSchema.optional(),
    })
    .strict(),
);
export type GatewayGuardrailUpdateRequest = z.infer<typeof GatewayGuardrailUpdateRequestSchema>;

export const GatewayProviderCreateRequestSchema = z
  .object({
    workspace_id: uuid,
    ai_provider_id: uuid,
    name: nonEmptyString,
    integration_id: uuid,
    slug: nonEmptyString,
    note: z.string().nullable().optional(),
    usage_limits: GatewayUsageLimitInputSchema.nullable().optional(),
    rate_limits: GatewayRateLimitInputSchema.nullable().optional(),
    expires_at: dateTime.nullable().optional(),
  })
  .strict();
export type GatewayProviderCreateRequest = z.infer<typeof GatewayProviderCreateRequestSchema>;

export const GatewayProviderUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      name: nonEmptyString.optional(),
      note: z.string().nullable().optional(),
      usage_limits: GatewayUsageLimitInputSchema.nullable().optional(),
      rate_limits: GatewayRateLimitInputSchema.nullable().optional(),
      expires_at: dateTime.nullable().optional(),
      reset_usage: z.boolean().optional(),
    })
    .strict(),
);
export type GatewayProviderUpdateRequest = z.infer<typeof GatewayProviderUpdateRequestSchema>;

export const GatewayApiKeyRotationPolicySchema = nonEmptyObject(
  z
    .object({
      rotation_period: z.enum(['monthly', 'weekly']).nullable().optional(),
      next_rotation_at: dateTime.nullable().optional(),
      key_transition_period_ms: z.number().int().min(1_800_000).optional(),
    })
    .strict(),
).refine(
  (value) => value.rotation_period == null || value.next_rotation_at == null,
  'rotation_period and next_rotation_at are mutually exclusive',
);
export type GatewayApiKeyRotationPolicy = z.infer<typeof GatewayApiKeyRotationPolicySchema>;

const apiKeyMutableFields = {
  name: nonEmptyString,
  description: z.string().optional(),
  scopes: z.array(GatewayApiKeyScopeSchema).min(1),
  rate_limits: z.array(GatewayRateLimitInputSchema).nullable().optional(),
  usage_limits: GatewayUsageLimitInputSchema.nullable().optional(),
  defaults: GatewayDefaultsInputSchema.nullable().optional(),
  alert_emails: z.array(z.string().email()).optional(),
  expires_at: dateTime.nullable().optional(),
  rotation_policy: GatewayApiKeyRotationPolicySchema.nullable().optional(),
} as const;

const serviceApiKeyCreateFields = {
  ...apiKeyMutableFields,
  organisation_id: numericId,
  workspace_id: uuid,
  type: nonEmptyString,
} as const;

export const GatewayServiceApiKeyCreateRequestSchema = z.object(serviceApiKeyCreateFields).strict();
export type GatewayServiceApiKeyCreateRequest = z.infer<
  typeof GatewayServiceApiKeyCreateRequestSchema
>;

export const GatewayUserApiKeyCreateRequestSchema = z
  .object({ ...serviceApiKeyCreateFields, user_id: uuid })
  .strict();
export type GatewayUserApiKeyCreateRequest = z.infer<typeof GatewayUserApiKeyCreateRequestSchema>;

/** Compatibility union for callers that construct create bodies outside a specific method. */
export const GatewayApiKeyCreateRequestSchema = z.union([
  GatewayUserApiKeyCreateRequestSchema,
  GatewayServiceApiKeyCreateRequestSchema,
]);
export type GatewayApiKeyCreateRequest = z.infer<typeof GatewayApiKeyCreateRequestSchema>;

export const GatewayApiKeyUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      name: nonEmptyString.optional(),
      description: z.string().optional(),
      scopes: z.array(GatewayApiKeyScopeSchema).min(1).optional(),
      rate_limits: z.array(GatewayRateLimitInputSchema).nullable().optional(),
      usage_limits: GatewayUsageLimitInputSchema.nullable().optional(),
      reset_usage: z.boolean().optional(),
      defaults: GatewayDefaultsInputSchema.nullable().optional(),
      alert_emails: z.array(z.string().email()).optional(),
      expires_at: dateTime.nullable().optional(),
      rotation_policy: GatewayApiKeyRotationPolicySchema.nullable().optional(),
    })
    .strict(),
);
export type GatewayApiKeyUpdateRequest = z.infer<typeof GatewayApiKeyUpdateRequestSchema>;

export const GatewayApiKeyRotateRequestSchema = z
  .object({ key_transition_period_ms: z.number().int().min(1_800_000).optional() })
  .strict();
export type GatewayApiKeyRotateRequest = z.infer<typeof GatewayApiKeyRotateRequestSchema>;

export const GatewayIntegrationCreateRequestSchema = z
  .object({
    organisation_id: numericId,
    ai_provider_id: uuid,
    name: nonEmptyString,
    slug: nonEmptyString,
    description: z.string().optional(),
    configurations: GatewayJsonObjectSchema.optional(),
    key: nonEmptyString.optional(),
    secret_mappings: z.array(GatewaySecretMappingSchema).optional(),
  })
  .strict();
export type GatewayIntegrationCreateRequest = z.infer<typeof GatewayIntegrationCreateRequestSchema>;

export const GatewayIntegrationUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      name: nonEmptyString.optional(),
      description: z.string().optional(),
      configurations: GatewayJsonObjectSchema.optional(),
      key: nonEmptyString.optional(),
      secret_mappings: z.array(GatewaySecretMappingSchema).optional(),
    })
    .strict(),
);
export type GatewayIntegrationUpdateRequest = z.infer<typeof GatewayIntegrationUpdateRequestSchema>;

export const GatewayIntegrationModelUpdateSchema = z
  .object({
    slug: nonEmptyString,
    enabled: z.boolean(),
    is_custom: z.boolean().nullable().optional(),
    is_finetune: z.boolean().nullable().optional(),
    base_model_slug: nonEmptyString.nullable().optional(),
    configurations: GatewayJsonObjectSchema.optional(),
    pricing_config: GatewayJsonObjectSchema.optional(),
  })
  .strict();
export type GatewayIntegrationModelUpdate = z.infer<typeof GatewayIntegrationModelUpdateSchema>;

export const GatewayIntegrationModelsBulkUpdateRequestSchema = z
  .object({
    models: z.array(GatewayIntegrationModelUpdateSchema).min(1),
    allow_all_models: z.boolean().optional(),
  })
  .strict();
export type GatewayIntegrationModelsBulkUpdateRequest = z.infer<
  typeof GatewayIntegrationModelsBulkUpdateRequestSchema
>;
/** @deprecated Use GatewayIntegrationModelsBulkUpdateRequest. */
export type GatewayIntegrationModelsRequest = GatewayIntegrationModelsBulkUpdateRequest;

export const GatewayIntegrationWorkspacesBulkUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      workspaces: z.array(GatewayWorkspaceBindingSchema).optional(),
      global_workspace_access: GatewayGlobalWorkspaceAccessInputSchema.optional(),
      override_existing_workspace_access: z.boolean().optional(),
      create_default_provider: z.boolean().optional(),
      default_provider_slug: nonEmptyString.optional(),
    })
    .strict(),
);
export type GatewayIntegrationWorkspacesBulkUpdateRequest = z.infer<
  typeof GatewayIntegrationWorkspacesBulkUpdateRequestSchema
>;
/** @deprecated Use GatewayIntegrationWorkspacesBulkUpdateRequest. */
export type GatewayIntegrationWorkspacesRequest = GatewayIntegrationWorkspacesBulkUpdateRequest;

export const McpIntegrationCreateRequestSchema = z
  .object({
    name: nonEmptyString,
    organisation_id: numericId,
    slug: nonEmptyString,
    url: z.string().url(),
    auth_type: GatewayMcpAuthTypeSchema,
    transport: GatewayMcpTransportSchema,
    description: z.string().nullable().optional(),
    configurations: GatewayJsonObjectSchema.optional(),
    secret_mappings: z.array(GatewaySecretMappingSchema).optional(),
  })
  .strict();
export type McpIntegrationCreateRequest = z.infer<typeof McpIntegrationCreateRequestSchema>;

export const McpIntegrationUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      name: nonEmptyString.optional(),
      description: z.string().nullable().optional(),
      configurations: GatewayJsonObjectSchema.optional(),
      url: z.string().url().optional(),
      auth_type: GatewayMcpAuthTypeSchema.optional(),
      transport: GatewayMcpTransportSchema.optional(),
      secret_mappings: z.array(GatewaySecretMappingSchema).optional(),
    })
    .strict(),
);
export type McpIntegrationUpdateRequest = z.infer<typeof McpIntegrationUpdateRequestSchema>;

export const McpIntegrationCapabilityUpdateSchema = z
  .object({
    name: nonEmptyString,
    type: GatewayMutableMcpCapabilityTypeSchema,
    enabled: z.boolean(),
  })
  .strict();
export type McpIntegrationCapabilityUpdate = z.infer<typeof McpIntegrationCapabilityUpdateSchema>;

export const McpIntegrationCapabilitiesBulkUpdateRequestSchema = z
  .object({ capabilities: z.array(McpIntegrationCapabilityUpdateSchema).min(1) })
  .strict();
export type McpIntegrationCapabilitiesBulkUpdateRequest = z.infer<
  typeof McpIntegrationCapabilitiesBulkUpdateRequestSchema
>;
/** @deprecated Use McpIntegrationCapabilitiesBulkUpdateRequest. */
export type McpIntegrationCapabilitiesUpdateRequest = McpIntegrationCapabilitiesBulkUpdateRequest;

export const McpIntegrationWorkspacesBulkUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      workspaces: z.array(z.object({ id: workspaceRef, enabled: z.boolean() }).strict()).optional(),
      global_workspace_access: z.object({ enabled: z.boolean() }).strict().nullable().optional(),
      override_existing_workspace_access: z.boolean().optional(),
    })
    .strict(),
);
export type McpIntegrationWorkspacesBulkUpdateRequest = z.infer<
  typeof McpIntegrationWorkspacesBulkUpdateRequestSchema
>;
/** @deprecated Use McpIntegrationWorkspacesBulkUpdateRequest. */
export type McpIntegrationWorkspacesRequest = McpIntegrationWorkspacesBulkUpdateRequest;

export const GatewayDeploymentAuthSettingsInputSchema = z
  .object({
    gateway_base_url: z.string().url().optional(),
    mcp_gateway_base_url: z.string().url().optional(),
    is_dataservice_hosted: z.union([z.literal(0), z.literal(1)]).optional(),
    is_playground_proxy_allowed: z.union([z.literal(0), z.literal(1)]).optional(),
    workspaces_allowed: z.array(workspaceRef).optional(),
    jwt_subs_allowed: z.array(nonEmptyString).optional(),
    jwt_sub_workspace_mapping: z.record(workspaceRef).optional(),
    allow_all_workspaces: z.boolean().optional(),
    remove_workspaces_allowed: z.array(workspaceRef).optional(),
    remove_subs_allowed: z.array(nonEmptyString).optional(),
  })
  .strict();
export type GatewayDeploymentAuthSettingsInput = z.infer<
  typeof GatewayDeploymentAuthSettingsInputSchema
>;

export const GatewayDeploymentCreateRequestSchema = z
  .object({
    name: nonEmptyString,
    type: GatewayDeploymentTypeSchema,
    organisation_id: numericId,
    auth_settings: GatewayDeploymentAuthSettingsInputSchema.optional(),
    deployment_config: GatewayJsonObjectSchema.optional(),
    is_default: z.boolean().optional(),
    slug: nonEmptyString.optional(),
  })
  .strict();
export type GatewayDeploymentCreateRequest = z.infer<typeof GatewayDeploymentCreateRequestSchema>;

export const GatewayDeploymentUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      name: nonEmptyString.optional(),
      type: GatewayDeploymentTypeSchema.optional(),
      status: GatewayDeploymentStatusSchema.optional(),
      deployment_config: GatewayJsonObjectSchema.nullable().optional(),
      is_default: z.boolean().optional(),
      rotate_auth: z.boolean().optional(),
      override_existing: z.boolean().optional(),
      auth_settings: GatewayDeploymentAuthSettingsInputSchema.optional(),
    })
    .strict(),
);
export type GatewayDeploymentUpdateRequest = z.infer<typeof GatewayDeploymentUpdateRequestSchema>;

export const GatewayPluginCreateRequestSchema = z
  .object({
    organisation_id: numericId,
    integration_id: uuid,
    credentials: z.record(z.string().min(1)).refine((value) => Object.keys(value).length > 0),
  })
  .strict();
export type GatewayPluginCreateRequest = z.infer<typeof GatewayPluginCreateRequestSchema>;

export const GatewayOrganisationUpdateRequestSchema = nonEmptyObject(
  z.object({ name: nonEmptyString.optional() }).catchall(GatewayJsonValueSchema),
);
export type GatewayOrganisationUpdateRequest = z.infer<
  typeof GatewayOrganisationUpdateRequestSchema
>;

export const GatewayOrganisationAuthSettingsUpdateRequestSchema = nonEmptyObject(
  z
    .object({
      auth_settings: GatewayJsonObjectSchema.optional(),
      domains: z.array(nonEmptyString).optional(),
      scim_token: nonEmptyString.optional(),
    })
    .catchall(GatewayJsonValueSchema),
);
export type GatewayOrganisationAuthSettingsUpdateRequest = z.infer<
  typeof GatewayOrganisationAuthSettingsUpdateRequestSchema
>;
