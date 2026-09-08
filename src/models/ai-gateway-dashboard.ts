import { z } from 'zod';

// Undocumented SCM dashboard reads, observed 2026-09-08. Preserve future response fields.
const envelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.boolean(), data }).passthrough();
const errorCategory = z
  .object({ response_status_code: z.number(), count: z.number() })
  .passthrough();

/** Error counts by HTTP status code, not a time series. */
export const ErrorCategoryTrendsResponseSchema = envelope(
  z
    .object({
      summary: z
        .object({ totalErrors: z.number(), totalUniqueErrorCodes: z.number() })
        .passthrough(),
      trend: z.array(errorCategory),
      isQuotaExceeded: z.boolean(),
    })
    .passthrough(),
);
export type ErrorCategoryTrendsResponse = z.infer<typeof ErrorCategoryTrendsResponseSchema>;

/** Time buckets whose y values are arrays of HTTP status-code counts. */
export const GroupedErrorsResponseSchema = envelope(
  z
    .object({
      trend: z.array(z.object({ x: z.string(), y: z.array(errorCategory) }).passthrough()),
      total: z.number(),
      isQuotaExceeded: z.boolean(),
    })
    .passthrough(),
);
export type GroupedErrorsResponse = z.infer<typeof GroupedErrorsResponseSchema>;

/** Available filter values and numeric bounds for a workspace/time window; costs are cents. */
export const GatewayFilterBoundariesResponseSchema = envelope(
  z
    .object({
      total_units_max: z.number().nullable(),
      total_units_min: z.number().nullable(),
      cost_max: z.number().nullable(),
      cost_min: z.number().nullable(),
      unique_ai_models: z.array(
        z.object({ ai_model: z.string(), ai_organisation: z.string() }).passthrough(),
      ),
      unique_status_codes: z.array(z.number()),
      unique_environments: z.array(z.string()),
      unique_prompt_ids: z.array(z.string()),
      unique_virtual_keys: z.array(z.string()),
      unique_configs: z.array(z.string()),
      unique_api_keys: z.array(z.string()),
      unique_metadata_keys: z.array(z.string()),
      isQuotaExceeded: z.boolean(),
    })
    .passthrough(),
);
export type GatewayFilterBoundariesResponse = z.infer<typeof GatewayFilterBoundariesResponseSchema>;

/** Bare organisation info response, distinct from organisations/self's data envelope. */
export const GatewayOrganisationInfoSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    object: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    is_first_generation_done: z.number(),
    disable_portkey_gateway: z.number(),
    settings: z
      .object({
        dashboard_gateway_url: z.string(),
        dashboard_mcp_gateway_url: z.string(),
        debug_log: z.number(),
        user_api_key_count: z.number(),
        user_api_key_ttl: z.number(),
        user_api_key_max_ttl: z.number(),
        user_key_metadata: z.number(),
        user_key_metadata_override: z.number(),
        // Only null was observed; do not invent a rotation unit/type.
        user_api_key_rotation_period: z.unknown(),
        user_api_key_auto_create: z.boolean(),
        default_workspace_user_api_key_auto_create: z.boolean(),
      })
      .passthrough(),
    benefits: z
      .object({
        limits: z.record(z.number()),
        featureFlags: z.record(z.union([z.number(), z.array(z.string())])),
      })
      .passthrough(),
    subscription: z.object({ type: z.string(), name: z.string() }).passthrough(),
  })
  .passthrough();
export type GatewayOrganisationInfo = z.infer<typeof GatewayOrganisationInfoSchema>;

/** Guardrail capability catalog. Parameter JSON schemas and rich descriptions are data, not code. */
export const GatewayGuardrailCatalogResponseSchema = z
  .object({
    object: z.string(),
    evals: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
          guardrailCategory: z.string(),
          targets: z.array(z.string()).optional(),
          supportedHooks: z.array(z.string()).optional(),
          description: z.array(z.record(z.unknown())),
          parameters: z
            .object({
              type: z.string(),
              properties: z.record(z.unknown()),
              required: z.array(z.string()).optional(),
            })
            .passthrough(),
          source: z
            .object({ id: z.string(), name: z.string(), description: z.string() })
            .passthrough()
            .optional(),
          deny: z.boolean().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
export type GatewayGuardrailCatalogResponse = z.infer<typeof GatewayGuardrailCatalogResponseSchema>;
