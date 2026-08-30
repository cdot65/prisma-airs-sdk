import { z } from 'zod';

/** Closed deployment types verified against SCM. Alphabetical for deterministic help output. */
export const AI_GATEWAY_DEPLOYMENT_TYPES = ['non_production', 'production'] as const;
export const GatewayDeploymentTypeSchema = z.enum(AI_GATEWAY_DEPLOYMENT_TYPES);
export type GatewayDeploymentType = z.infer<typeof GatewayDeploymentTypeSchema>;

/** Closed deployment lifecycle values accepted by deployment updates. */
export const AI_GATEWAY_DEPLOYMENT_STATUSES = ['active', 'archived'] as const;
export const GatewayDeploymentStatusSchema = z.enum(AI_GATEWAY_DEPLOYMENT_STATUSES);
export type GatewayDeploymentStatus = z.infer<typeof GatewayDeploymentStatusSchema>;

/** Capability kinds accepted by the MCP bulk-update endpoint. */
export const AI_GATEWAY_MUTABLE_MCP_CAPABILITY_TYPES = ['prompt', 'resource', 'tool'] as const;
export const GatewayMutableMcpCapabilityTypeSchema = z.enum(
  AI_GATEWAY_MUTABLE_MCP_CAPABILITY_TYPES,
);
export type GatewayMutableMcpCapabilityType = z.infer<typeof GatewayMutableMcpCapabilityTypeSchema>;

/** Positive-evidence catalogs. These are intentionally not treated as exhaustive SCM enums. */
export const AI_GATEWAY_KNOWN_API_KEY_SCOPES = [
  'agents.invoke',
  'completions.write',
  'logs.write',
  'mcp.invoke',
  'prompts.render',
] as const;
export const AI_GATEWAY_KNOWN_CACHE_MODES = ['semantic', 'simple'] as const;
export const AI_GATEWAY_KNOWN_CONFIG_STRATEGIES = ['fallback', 'loadbalance', 'single'] as const;
export const AI_GATEWAY_KNOWN_MCP_AUTH_TYPES = [
  'headers',
  'none',
  'oauth_auto',
  'oauth_client_credentials',
] as const;
export const AI_GATEWAY_KNOWN_MCP_TRANSPORTS = ['http', 'interactive', 'sse'] as const;
export const AI_GATEWAY_KNOWN_RATE_LIMIT_TYPES = ['requests', 'tokens'] as const;
export const AI_GATEWAY_KNOWN_RATE_LIMIT_UNITS = ['rpd', 'rph', 'rpm', 'rps', 'rpw'] as const;

/** Literal suggestions without falsely closing a research-derived value set. */
export type GatewayOpenValue<TKnown extends string> = TKnown | (string & Record<never, never>);

export type GatewayKnownApiKeyScope = (typeof AI_GATEWAY_KNOWN_API_KEY_SCOPES)[number];
export type GatewayApiKeyScope = GatewayOpenValue<GatewayKnownApiKeyScope>;
export type GatewayKnownCacheMode = (typeof AI_GATEWAY_KNOWN_CACHE_MODES)[number];
export type GatewayConfigCacheMode = GatewayOpenValue<GatewayKnownCacheMode>;
export type GatewayKnownConfigStrategy = (typeof AI_GATEWAY_KNOWN_CONFIG_STRATEGIES)[number];
export type GatewayConfigStrategy = GatewayOpenValue<GatewayKnownConfigStrategy>;
export type GatewayKnownMcpAuthType = (typeof AI_GATEWAY_KNOWN_MCP_AUTH_TYPES)[number];
export type GatewayMcpAuthType = GatewayOpenValue<GatewayKnownMcpAuthType>;
export type GatewayKnownMcpTransport = (typeof AI_GATEWAY_KNOWN_MCP_TRANSPORTS)[number];
export type GatewayMcpTransport = GatewayOpenValue<GatewayKnownMcpTransport>;
export type GatewayKnownRateLimitType = (typeof AI_GATEWAY_KNOWN_RATE_LIMIT_TYPES)[number];
export type GatewayRateLimitType = GatewayOpenValue<GatewayKnownRateLimitType>;
export type GatewayKnownRateLimitUnit = (typeof AI_GATEWAY_KNOWN_RATE_LIMIT_UNITS)[number];
export type GatewayRateLimitUnit = GatewayOpenValue<GatewayKnownRateLimitUnit>;

const openValue = <T extends string>() =>
  z.string().min(1) as unknown as z.ZodType<GatewayOpenValue<T>>;

export const GatewayApiKeyScopeSchema = openValue<GatewayKnownApiKeyScope>();
export const GatewayConfigCacheModeSchema = openValue<GatewayKnownCacheMode>();
export const GatewayConfigStrategySchema = openValue<GatewayKnownConfigStrategy>();
export const GatewayMcpAuthTypeSchema = openValue<GatewayKnownMcpAuthType>();
export const GatewayMcpTransportSchema = openValue<GatewayKnownMcpTransport>();
export const GatewayRateLimitTypeSchema = openValue<GatewayKnownRateLimitType>();
export const GatewayRateLimitUnitSchema = openValue<GatewayKnownRateLimitUnit>();

/** A recursively JSON-serializable object. */
export interface GatewayJsonObject {
  [key: string]: GatewayJsonValue;
}

/** Finite JSON values accepted at documented AI Gateway extension points. */
export type GatewayJsonValue =
  | string
  | number
  | boolean
  | null
  | GatewayJsonValue[]
  | GatewayJsonObject;

const unsafeJsonKeys = new Set(['__proto__', 'constructor', 'prototype']);

function isFiniteJsonValue(value: unknown, ancestors = new WeakSet<object>()): boolean {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return true;
  }
  if (typeof value !== 'object' || ancestors.has(value)) return false;

  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (
      keys.length !== value.length ||
      keys.some((key, index) => key !== String(index)) ||
      Object.getOwnPropertySymbols(value).length > 0
    ) {
      return false;
    }
    ancestors.add(value);
    const valid = value.every((item) => isFiniteJsonValue(item, ancestors));
    ancestors.delete(value);
    return valid;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;

  ancestors.add(value);
  const valid = Object.entries(Object.getOwnPropertyDescriptors(value)).every(
    ([key, descriptor]) =>
      descriptor.enumerable === true &&
      'value' in descriptor &&
      !unsafeJsonKeys.has(key) &&
      isFiniteJsonValue(descriptor.value, ancestors),
  );
  ancestors.delete(value);
  return valid;
}

export const GatewayJsonValueSchema: z.ZodType<GatewayJsonValue> = z.custom<GatewayJsonValue>(
  (value) => isFiniteJsonValue(value),
  'Expected a finite, prototype-safe JSON value',
);

export const GatewayJsonObjectSchema: z.ZodType<GatewayJsonObject> = z.custom<GatewayJsonObject>(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    isFiniteJsonValue(value),
  'Expected a finite, prototype-safe JSON object',
);

export const GatewayRoutingRetrySchema = z
  .object({
    attempts: z.number().int().min(0).optional(),
    on_status_codes: z.array(z.number().int().min(100).max(599)).optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayRoutingRetry = z.infer<typeof GatewayRoutingRetrySchema>;

export const GatewayRoutingCacheSchema = z
  .object({
    mode: GatewayConfigCacheModeSchema.optional(),
    max_age: z.number().int().min(0).optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayRoutingCache = z.infer<typeof GatewayRoutingCacheSchema>;

export const GatewayRoutingStrategySchema = z
  .object({ mode: GatewayConfigStrategySchema })
  .catchall(GatewayJsonValueSchema);
export type GatewayRoutingStrategy = z.infer<typeof GatewayRoutingStrategySchema>;

export const GatewayRoutingTargetSchema = z
  .object({
    provider: z.string().min(1).optional(),
    virtual_key: z.string().min(1).optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayRoutingTarget = z.infer<typeof GatewayRoutingTargetSchema>;

/**
 * Portkey-backed routing fields observed in concrete examples, with a JSON extension point for
 * Prisma- or provider-specific configuration.
 */
export const GatewayRoutingConfigSchema = z
  .object({
    retry: GatewayRoutingRetrySchema.optional(),
    cache: GatewayRoutingCacheSchema.optional(),
    strategy: GatewayRoutingStrategySchema.optional(),
    targets: z.array(GatewayRoutingTargetSchema).optional(),
    provider: z.string().min(1).optional(),
    virtual_key: z.string().min(1).optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayRoutingConfig = z.infer<typeof GatewayRoutingConfigSchema>;

// Provider-specific integration configuration. Each known shape stays independently reusable;
// integrations also accept GatewayJsonObject for providers not represented by the research spec.

export const GatewayOpenAIConfigurationSchema = z
  .object({
    openai_organization: z.string().min(1).optional(),
    openai_project: z.string().min(1).optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayOpenAIConfiguration = z.infer<typeof GatewayOpenAIConfigurationSchema>;

export const GatewayAzureDeploymentConfigurationSchema = z
  .object({
    alias: z.string().min(1).optional(),
    azure_api_version: z.string().min(1).max(30),
    azure_deployment_name: z.string().min(1),
    is_default: z.boolean().optional(),
    azure_model_slug: z.string().min(1),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayAzureDeploymentConfiguration = z.infer<
  typeof GatewayAzureDeploymentConfigurationSchema
>;

const azureAuthModeSchema = z.enum(['default', 'entra', 'managed']);

export const GatewayAzureOpenAIConfigurationSchema = z
  .object({
    azure_auth_mode: azureAuthModeSchema,
    azure_resource_name: z.string().min(1),
    azure_deployment_config: z.array(GatewayAzureDeploymentConfigurationSchema).min(1),
    azure_entra_tenant_id: z.string().min(1).optional(),
    azure_entra_client_id: z.string().min(1).optional(),
    azure_entra_client_secret: z.string().min(1).optional(),
    azure_managed_client_id: z.string().min(1).optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayAzureOpenAIConfiguration = z.infer<typeof GatewayAzureOpenAIConfigurationSchema>;

export const GatewayBedrockConfigurationSchema = z
  .object({
    aws_auth_type: z.enum(['accessKey', 'assumedRole']),
    aws_region: z.string().min(1),
    aws_access_key_id: z.string().min(1).optional(),
    aws_secret_access_key: z.string().min(1).optional(),
    aws_role_arn: z.string().min(1).optional(),
    aws_external_id: z.string().min(1).nullable().optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayBedrockConfiguration = z.infer<typeof GatewayBedrockConfigurationSchema>;

export const GatewaySageMakerConfigurationSchema = GatewayBedrockConfigurationSchema.extend({
  amzn_sagemaker_custom_attributes: z.string().optional(),
  amzn_sagemaker_target_model: z.string().optional(),
  amzn_sagemaker_target_variant: z.string().optional(),
  amzn_sagemaker_target_container_hostname: z.string().optional(),
  amzn_sagemaker_inference_id: z.string().optional(),
  amzn_sagemaker_enable_explanations: z.string().optional(),
  amzn_sagemaker_inference_component: z.string().optional(),
  amzn_sagemaker_session_id: z.string().optional(),
  amzn_sagemaker_model_name: z.string().optional(),
}).catchall(GatewayJsonValueSchema);
export type GatewaySageMakerConfiguration = z.infer<typeof GatewaySageMakerConfigurationSchema>;

export const GatewayVertexAIConfigurationSchema = z
  .object({
    vertex_auth_type: z.enum(['basic', 'serviceAccount']),
    vertex_region: z.string().min(1),
    vertex_project_id: z.string().min(1).optional(),
    vertex_service_account_json: GatewayJsonObjectSchema.optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayVertexAIConfiguration = z.infer<typeof GatewayVertexAIConfigurationSchema>;

export const GatewayAzureAIConfigurationSchema = z
  .object({
    azure_auth_mode: azureAuthModeSchema,
    azure_foundry_url: z.string().url(),
    azure_api_version: z.string().min(1).max(30).optional(),
    azure_deployment_name: z.string().min(1).optional(),
    azure_entra_tenant_id: z.string().min(1).optional(),
    azure_entra_client_id: z.string().min(1).optional(),
    azure_entra_client_secret: z.string().min(1).optional(),
    azure_managed_client_id: z.string().min(1).optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayAzureAIConfiguration = z.infer<typeof GatewayAzureAIConfigurationSchema>;

export const GatewayWorkersAIConfigurationSchema = z
  .object({ workers_ai_account_id: z.string().min(1) })
  .catchall(GatewayJsonValueSchema);
export type GatewayWorkersAIConfiguration = z.infer<typeof GatewayWorkersAIConfigurationSchema>;

export const GatewayHuggingFaceConfigurationSchema = z
  .object({ huggingface_base_url: z.string().url().optional() })
  .catchall(GatewayJsonValueSchema);
export type GatewayHuggingFaceConfiguration = z.infer<typeof GatewayHuggingFaceConfigurationSchema>;

export const GatewayCortexConfigurationSchema = z
  .object({ snowflake_account: z.string().min(1) })
  .catchall(GatewayJsonValueSchema);
export type GatewayCortexConfiguration = z.infer<typeof GatewayCortexConfigurationSchema>;

export const GatewayCustomHostConfigurationSchema = z
  .object({
    custom_host: z.string().url().optional(),
    custom_headers: z.record(z.string()).optional(),
  })
  .catchall(GatewayJsonValueSchema);
export type GatewayCustomHostConfiguration = z.infer<typeof GatewayCustomHostConfigurationSchema>;

export type GatewayIntegrationConfiguration =
  | GatewayOpenAIConfiguration
  | GatewayAzureOpenAIConfiguration
  | GatewayBedrockConfiguration
  | GatewaySageMakerConfiguration
  | GatewayVertexAIConfiguration
  | GatewayAzureAIConfiguration
  | GatewayWorkersAIConfiguration
  | GatewayHuggingFaceConfiguration
  | GatewayCortexConfiguration
  | GatewayCustomHostConfiguration
  | GatewayJsonObject;
