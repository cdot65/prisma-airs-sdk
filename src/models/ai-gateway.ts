// src/models/ai-gateway.ts — Zod schemas + types for the Prisma AIRS AI Gateway API
//
// Derived from live responses against TSG 1852583913 on 2026-07-27, not from an OpenAPI
// spec (none exists for this API). Schema rationale, landmines, and the full endpoint
// inventory live in PRD-ai-gateway-client.md in the Obsidian vault.
//
// Conventions specific to this API:
//   - `cost` values are in CENTS. Never divided here.
//   - Booleans arrive as 0/1 integers. z.number(), not z.boolean().
//   - Observed-null fields use .nullable(), not .optional().

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Envelopes — three distinct families
// ---------------------------------------------------------------------------

/** Envelope A: `{ success, data }` — telemetry charts and the bare `logs` collection. */
const aiGatewayEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.boolean(), data }).passthrough();

/**
 * Envelope B: `{ object, total, data[] }` — config and admin collections.
 *
 * Module-private like its two siblings: it is only ever applied within this file, and
 * exporting it would put an internal factory on the package's public API surface.
 */
const aiGatewayList = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      object: z.string(),
      total: z.number(),
      has_more: z.boolean().optional(),
      data: z.array(item),
    })
    .passthrough();

/** Envelope C: `logs/groups/*` — note `is_quota_exceeded` is snake_case here only. */
const aiGatewayGroupList = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      object: z.string(),
      is_quota_exceeded: z.boolean(),
      total: z.number(),
      data: z.array(item),
    })
    .passthrough();

/** Present on every envelope-A telemetry payload. */
const quotaFlag = { isQuotaExceeded: z.boolean() };

// ---------------------------------------------------------------------------
// Telemetry — charts
// ---------------------------------------------------------------------------

/** A `{x, y}` time-bucket, optionally carrying a bucket average. */
export const GatewayChartRecordSchema = z
  .object({ x: z.string(), y: z.number(), avg: z.number().optional() })
  .passthrough();
export type GatewayChartRecord = z.infer<typeof GatewayChartRecordSchema>;

/** `logs/charts/cost`. **`y` and `total` are in cents.** */
export const CostChartResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(GatewayChartRecordSchema),
      total: z.number(),
      avg: z.number(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type CostChartResponse = z.infer<typeof CostChartResponseSchema>;

/** `logs/charts/{requests,errors,users,feedback-trend,feedback-weighted}` — plain counts. */
export const CountChartResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(GatewayChartRecordSchema),
      total: z.number().nullable(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type CountChartResponse = z.infer<typeof CountChartResponseSchema>;

/** `logs/charts/latency`. Percentiles appear per-bucket AND at top level; ms. */
export const LatencyChartResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(
        z
          .object({
            x: z.string(),
            y: z.number(),
            p50: z.number(),
            p90: z.number(),
            p99: z.number(),
          })
          .passthrough(),
      ),
      total: z.number(),
      p50: z.number(),
      p90: z.number(),
      p99: z.number(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type LatencyChartResponse = z.infer<typeof LatencyChartResponseSchema>;

/** `logs/charts/tokens`. Request/response unit splits appear at both levels. */
export const TokensChartResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(
        z
          .object({
            x: z.string(),
            y: z.number(),
            total_request_units: z.number(),
            total_response_units: z.number(),
            avg: z.number(),
          })
          .passthrough(),
      ),
      total: z.number(),
      avg: z.number(),
      total_request_units: z.number(),
      total_response_units: z.number(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type TokensChartResponse = z.infer<typeof TokensChartResponseSchema>;

/** `logs/charts/cache-summary`. `avgCacheLatency` is null when there are no hits. */
export const CacheSummaryResponseSchema = aiGatewayEnvelope(
  z
    .object({
      summary: z
        .object({
          cacheHits: z.number(),
          avgCacheLatency: z.number().nullable(),
          totalRequests: z.number(),
          cacheSpeedup: z.number(),
        })
        .passthrough(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type CacheSummaryResponse = z.infer<typeof CacheSummaryResponseSchema>;

/** `logs/charts/cache-hit-trend`. Savings are CUMULATIVE cents — take the last non-zero bucket. */
export const CacheHitTrendResponseSchema = aiGatewayEnvelope(
  z
    .object({
      trend: z.array(
        z
          .object({
            x: z.string(),
            simpleHits: z.number(),
            semanticHits: z.number(),
            hitRate: z.number(),
            cumulativeSimpleHitSavings: z.number(),
            cumulativeSemanticHitSavings: z.number(),
          })
          .passthrough(),
      ),
      total: z.number(),
      summary: z.object({ totalCacheHits: z.number(), hitRate: z.number() }).passthrough(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type CacheHitTrendResponse = z.infer<typeof CacheHitTrendResponseSchema>;

/** `logs/charts/user-trends`. `summary.avg` is requests-per-user. */
export const UserTrendsResponseSchema = aiGatewayEnvelope(
  z
    .object({
      summary: z.object({ total: z.number(), unique: z.number(), avg: z.number() }).passthrough(),
      trend: z.array(GatewayChartRecordSchema),
      ...quotaFlag,
    })
    .passthrough(),
);
export type UserTrendsResponse = z.infer<typeof UserTrendsResponseSchema>;

/** `logs/charts/error-trends`. `trend[].y` is a percentage. */
export const ErrorTrendsResponseSchema = aiGatewayEnvelope(
  z
    .object({
      summary: z.object({ errorPercent: z.number() }).passthrough(),
      trend: z.array(GatewayChartRecordSchema),
      ...quotaFlag,
    })
    .passthrough(),
);
export type ErrorTrendsResponse = z.infer<typeof ErrorTrendsResponseSchema>;

/**
 * `logs/charts/rescued-retries`. **`trend[].y` is an array, not a scalar** — it cannot share
 * {@link GatewayChartRecordSchema}. Sparse: only populated on upstream failures.
 */
export const RescuedRetriesResponseSchema = aiGatewayEnvelope(
  z
    .object({
      trend: z.array(
        z
          .object({
            x: z.string(),
            // Element shape unobserved — sample tenants only ever produced an empty array.
            // Treated like the sibling trends[].retry/fallback below until a tenant with
            // actual gateway retries lets us confirm the real shape. See open questions in
            // PRD-ai-gateway-client.md.
            y: z.array(z.unknown()),
          })
          .passthrough(),
      ),
      total: z.number(),
      trends: z.array(
        z
          .object({ x: z.string(), retry: z.array(z.unknown()), fallback: z.array(z.unknown()) })
          .passthrough(),
      ),
      retryTotal: z.number(),
      fallbackTotal: z.number(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type RescuedRetriesResponse = z.infer<typeof RescuedRetriesResponseSchema>;

/** `logs/charts/feedback-score-distribution`. Feedback is binary ±5. */
export const FeedbackScoreDistributionResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(z.object({ x: z.number(), y: z.number() }).passthrough()),
      total: z.number().nullable(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type FeedbackScoreDistributionResponse = z.infer<
  typeof FeedbackScoreDistributionResponseSchema
>;

/** `logs/charts/feedback-models`. `x` is the model; `y` is an object, not a number. */
export const FeedbackModelsResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(
        z
          .object({
            x: z.string(),
            y: z
              .object({ avgWeightedFeedback: z.number(), feedbackCount: z.number() })
              .passthrough(),
          })
          .passthrough(),
      ),
      ...quotaFlag,
    })
    .passthrough(),
);
export type FeedbackModelsResponse = z.infer<typeof FeedbackModelsResponseSchema>;

// ---------------------------------------------------------------------------
// Telemetry — groups
// ---------------------------------------------------------------------------

/**
 * One `logs/groups/{dimension}` row. The dimension key itself varies by endpoint
 * (`model`, `ai_service`, `api_key`, `provider`, `status_code`), so only the shared
 * columns are declared; `.passthrough()` carries the dimension key through.
 */
export const GatewayGroupRowSchema = z
  .object({
    requests: z.number(),
    cost: z.number().optional(),
    avg_latency: z.number().optional(),
    avg_tokens: z.number().optional(),
    total_tokens: z.number().optional(),
    success_rate: z.number().optional(),
    last_seen: z.string().optional(),
    object: z.string(),
  })
  .passthrough();
export type GatewayGroupRow = z.infer<typeof GatewayGroupRowSchema>;

/** `logs/groups/{ai_service,model,api_key,provider,status_code}`. */
export const GroupListResponseSchema = aiGatewayGroupList(GatewayGroupRowSchema);
export type GroupListResponse = z.infer<typeof GroupListResponseSchema>;

/**
 * `logs/groups/users` — uses envelope A while every sibling uses envelope C.
 * Not a typo; verified live. `_user: ''` means calls with no end-user id.
 */
export const UserGroupResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(
        z.object({ _user: z.string(), count: z.number(), cost: z.number() }).passthrough(),
      ),
      total: z.number(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type UserGroupResponse = z.infer<typeof UserGroupResponseSchema>;

// ---------------------------------------------------------------------------
// Telemetry — raw logs
// ---------------------------------------------------------------------------

/** One per-request row from the bare `logs` collection — the deepest granularity available. */
export const GatewayLogRecordSchema = z
  .object({
    id: z.string(),
    workspace_slug: z.string(),
    ai_model: z.string(),
    _user: z.string(),
    total_units: z.number(),
    /** Cents. */
    cost: z.number(),
    trace_id: z.string(),
    /** 0/1, not boolean. */
    is_proxy_call: z.number(),
    created_at: z.string(),
    /** 0/1, not boolean. */
    is_success: z.number(),
    /** `HIT` | `MISS` | `DISABLED`. */
    cache_status: z.string(),
    retry_success_count: z.number(),
    mode: z.string(),
    last_used_option_index: z.number(),
    /** 200 success, 446 AIRS security block (cost 0), 400 validation. */
    response_status_code: z.number(),
    request_url: z.string(),
    request_method: z.string(),
    ai_org: z.string(),
    api_key_id: z.string(),
    license_id: z.string(),
    log_store_file_path_format: z.string(),
    metadataKey: z.array(z.string()),
    metadataValue: z.array(z.string()),
    prompt_slug: z.string(),
    feedback: z.array(z.unknown()),
  })
  .passthrough();
export type GatewayLogRecord = z.infer<typeof GatewayLogRecordSchema>;

/** Bare `logs`. `capturedTotal` is always 0 upstream; `total` is the full-period count. */
export const GatewayLogsResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(GatewayLogRecordSchema),
      total: z.number(),
      capturedTotal: z.number(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type GatewayLogsResponse = z.infer<typeof GatewayLogsResponseSchema>;

// ---------------------------------------------------------------------------
// Write responses
// ---------------------------------------------------------------------------

/**
 * Placeholder for write responses whose shape has NOT been verified against a live tenant.
 *
 * Verifying `deployments` proved a create response can differ completely from the record it
 * creates (5-field receipt vs 15-field record), so these shapes cannot be inferred from the
 * corresponding read. Tighten each into a named schema as it is verified. See
 * PRD-ai-gateway-client.md "Testing".
 */
export const GatewayWriteResponseSchema = z.object({}).passthrough();
export type GatewayWriteResponse = z.infer<typeof GatewayWriteResponseSchema>;

// ---------------------------------------------------------------------------
// Workspaces (data plane)
// ---------------------------------------------------------------------------

/** A workspace list row. `scope_name` is the SCM role scope that grants data-plane access. */
export const GatewayWorkspaceSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    icon: z.string().nullable(),
    description: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    is_default: z.number(),
    status: z.string(),
    scope_name: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayWorkspace = z.infer<typeof GatewayWorkspaceSchema>;

/** Workspace detail. Carries settings blocks absent from list rows. */
export const GatewayWorkspaceDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    is_default: z.number(),
    slug: z.string(),
    icon: z.string().nullable(),
    defaults: z.record(z.unknown()).nullable(),
    usage_limits: z.record(z.unknown()).nullable(),
    rate_limits: z.record(z.unknown()).nullable(),
    security_settings: z.record(z.boolean()).optional(),
    data_plane_security_settings: z.record(z.unknown()).optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .passthrough();
export type GatewayWorkspaceDetail = z.infer<typeof GatewayWorkspaceDetailSchema>;

export const ListWorkspacesResponseSchema = aiGatewayList(GatewayWorkspaceSchema);
export type ListWorkspacesResponse = z.infer<typeof ListWorkspacesResponseSchema>;

// ---------------------------------------------------------------------------
// Configs (data plane)
// ---------------------------------------------------------------------------

/**
 * A gateway config. **`config` is a JSON-encoded STRING, not an object** — the wire type is
 * preserved rather than silently parsed. Use `JSON.parse(config)` at the call site.
 */
export const GatewayConfigSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    /** Internal organisation UUID — NOT the TSG that write requests take. */
    organisation_id: z.string(),
    is_default: z.number(),
    status: z.string(),
    owner_id: z.string(),
    updated_by: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    workspace_id: z.string(),
    config: z.string(),
    format: z.string(),
    type: z.string(),
    version_id: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

export const ListConfigsResponseSchema = aiGatewayList(GatewayConfigSchema);
export type ListConfigsResponse = z.infer<typeof ListConfigsResponseSchema>;

// ---------------------------------------------------------------------------
// Guardrails / providers / API keys (data plane)
// ---------------------------------------------------------------------------

/** A workspace guardrail. Field set beyond the identifiers is tenant-dependent. */
export const GatewayGuardrailSchema = z
  .object({ id: z.string(), name: z.string().optional(), object: z.string().optional() })
  .passthrough();
export type GatewayGuardrail = z.infer<typeof GatewayGuardrailSchema>;
export const ListGuardrailsResponseSchema = aiGatewayList(GatewayGuardrailSchema);
export type ListGuardrailsResponse = z.infer<typeof ListGuardrailsResponseSchema>;

/** A workspace-scoped AI provider binding. */
export const GatewayProviderSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    slug: z.string().optional(),
    object: z.string().optional(),
  })
  .passthrough();
export type GatewayProvider = z.infer<typeof GatewayProviderSchema>;
export const ListProvidersResponseSchema = aiGatewayList(GatewayProviderSchema);
export type ListProvidersResponse = z.infer<typeof ListProvidersResponseSchema>;

/** A service or user API key. The secret itself is only returned at creation. */
export const GatewayApiKeySchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    object: z.string().optional(),
  })
  .passthrough();
export type GatewayApiKey = z.infer<typeof GatewayApiKeySchema>;
export const ListApiKeysResponseSchema = aiGatewayList(GatewayApiKeySchema);
export type ListApiKeysResponse = z.infer<typeof ListApiKeysResponseSchema>;

// ---------------------------------------------------------------------------
// Integrations (admin plane)
// ---------------------------------------------------------------------------

/** An organisation-level provider integration. */
export const GatewayIntegrationSchema = z
  .object({
    id: z.string(),
    organisation_id: z.string().optional(),
    name: z.string(),
    owner_id: z.string(),
    status: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    slug: z.string(),
    tags: z.unknown().nullable(),
    description: z.string().nullable(),
    workspaces_count: z.number().optional(),
    type: z.string().optional(),
    workspace_id: z.string().nullable(),
    ai_provider_id: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayIntegration = z.infer<typeof GatewayIntegrationSchema>;
export const ListIntegrationsResponseSchema = aiGatewayList(GatewayIntegrationSchema);
export type ListIntegrationsResponse = z.infer<typeof ListIntegrationsResponseSchema>;

/** `integrations/{id}/models` — per-model enablement for one integration. */
export const GatewayIntegrationModelsResponseSchema = z
  .object({
    models: z.array(z.object({ slug: z.string(), enabled: z.boolean() }).passthrough()),
    allow_all_models: z.boolean(),
    object: z.string(),
  })
  .passthrough();
export type GatewayIntegrationModelsResponse = z.infer<
  typeof GatewayIntegrationModelsResponseSchema
>;

/** `integrations/{id}/workspaces` — which workspaces may use this integration. */
export const GatewayIntegrationWorkspacesResponseSchema = z
  .object({
    workspaces: z.array(z.record(z.unknown())),
    global_workspace_access: z.boolean(),
    object: z.string(),
  })
  .passthrough();
export type GatewayIntegrationWorkspacesResponse = z.infer<
  typeof GatewayIntegrationWorkspacesResponseSchema
>;

/** An MCP server integration. */
export const McpIntegrationSchema = z
  .object({
    id: z.string(),
    organisation_id: z.string(),
    name: z.string(),
    owner_id: z.string(),
    status: z.string(),
    type: z.string(),
    url: z.string(),
    auth_type: z.string(),
    transport: z.string(),
    configurations: z.record(z.unknown()),
    created_at: z.string(),
    last_updated_at: z.string(),
  })
  .passthrough();
export type McpIntegration = z.infer<typeof McpIntegrationSchema>;
export const ListMcpIntegrationsResponseSchema = aiGatewayList(McpIntegrationSchema);
export type ListMcpIntegrationsResponse = z.infer<typeof ListMcpIntegrationsResponseSchema>;

// ---------------------------------------------------------------------------
// Deployments (admin plane) — three distinct shapes, verified live
// ---------------------------------------------------------------------------

/** A deployment list row. */
export const GatewayDeploymentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    type: z.string(),
    /** `active` | `archived`. DELETE archives rather than removes. */
    status: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    last_synced_at: z.string().nullable(),
    last_resynced_at: z.string().nullable(),
    is_default: z.number(),
    created_by: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayDeployment = z.infer<typeof GatewayDeploymentSchema>;

/** Deployment detail — adds credentials (masked), auth settings, and bound workspaces. */
export const GatewayDeploymentDetailSchema = GatewayDeploymentSchema.extend({
  credentials: z.object({ username: z.string(), password: z.string() }).passthrough().optional(),
  deployment_config: z.record(z.unknown()).nullable(),
  auth_settings: z
    .object({
      /** 0/1, not boolean — the create REQUEST sends a real boolean here. */
      disable_portkey_gateway: z.number(),
      workspaces_allowed: z.array(z.string()),
      allow_all_workspaces: z.number(),
    })
    .passthrough()
    .optional(),
  client_auth: z.string().optional(),
  workspaces: z.array(z.object({ id: z.string(), slug: z.string() }).passthrough()).optional(),
}).passthrough();
export type GatewayDeploymentDetail = z.infer<typeof GatewayDeploymentDetailSchema>;

/**
 * `POST /deployments` response — a 5-field creation receipt, **not** a {@link GatewayDeployment}.
 * Verified live 2026-07-27.
 *
 * This is the only time `credentials.password` and `client_auth` are readable; the detail
 * read masks them. Capture them at creation or they are unrecoverable.
 */
export const GatewayDeploymentCreateResponseSchema = z
  .object({
    id: z.string(),
    client_auth: z.string(),
    credentials: z.object({ username: z.string(), password: z.string() }).passthrough(),
    /** Internal organisation UUID — NOT the TSG sent in the request. */
    organisation_id: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayDeploymentCreateResponse = z.infer<typeof GatewayDeploymentCreateResponseSchema>;

export const ListDeploymentsResponseSchema = aiGatewayList(GatewayDeploymentSchema);
export type ListDeploymentsResponse = z.infer<typeof ListDeploymentsResponseSchema>;

// ---------------------------------------------------------------------------
// Plugins / organisations / audit logs (admin plane)
// ---------------------------------------------------------------------------

/** A gateway plugin binding (e.g. the Prisma AIRS scanner). Credentials arrive masked. */
export const GatewayPluginSchema = z
  .object({
    id: z.string(),
    integration_id: z.string(),
    credentials: z.record(z.string()),
    owner_id: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    status: z.string(),
    integration_slug: z.string(),
    plugin_provider_id: z.string(),
    plugin_provider_slug: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayPlugin = z.infer<typeof GatewayPluginSchema>;
export const ListPluginsResponseSchema = aiGatewayList(GatewayPluginSchema);
export type ListPluginsResponse = z.infer<typeof ListPluginsResponseSchema>;

/** `organisations/self`. Wrapped in `{success, data}` unlike the other admin resources. */
export const OrganisationSelfResponseSchema = z
  .object({ success: z.boolean(), data: z.record(z.unknown()) })
  .passthrough();
export type OrganisationSelfResponse = z.infer<typeof OrganisationSelfResponseSchema>;

/** `organisations/{tsg}/auth-settings`. */
export const AuthSettingsResponseSchema = z
  .object({ success: z.boolean(), data: z.record(z.unknown()) })
  .passthrough();
export type AuthSettingsResponse = z.infer<typeof AuthSettingsResponseSchema>;

/**
 * One audit-log record.
 *
 * SECURITY: `request_body` is returned **unredacted** by the API and can contain live
 * credentials (private keys, API keys) submitted through the SCM UI. The sibling
 * `request_headers` field IS masked. Never log this record wholesale.
 */
export const GatewayAuditLogRecordSchema = z
  .object({
    timestamp: z.string(),
    method: z.string(),
    uri: z.string(),
    request_id: z.string(),
    request_body: z.string(),
    query_params: z.string(),
    request_headers: z.string(),
    user_id: z.string(),
    user_type: z.string(),
    organisation_id: z.string(),
    workspace_id: z.string(),
    response_status_code: z.number(),
    resource_type: z.string(),
    action: z.string(),
    client_ip: z.string(),
    country: z.string(),
  })
  .passthrough();
export type GatewayAuditLogRecord = z.infer<typeof GatewayAuditLogRecordSchema>;

/** `audit-logs` — a bare `{records}` object, neither list envelope. */
export const GatewayAuditLogsResponseSchema = z
  .object({ records: z.array(GatewayAuditLogRecordSchema) })
  .passthrough();
export type GatewayAuditLogsResponse = z.infer<typeof GatewayAuditLogsResponseSchema>;
