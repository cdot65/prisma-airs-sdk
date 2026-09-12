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
import {
  GatewayCatalogGuardrailParametersSchema,
  GatewayCatalogProviderConfigurationSchema,
  GatewayCatalogMcpConfigurationSchema,
  GatewayPricingAdjustmentsSchema,
  GatewayPricingConfigSchema,
  GatewayCatalogSecretMappingSchema,
  GatewayDeploymentTagsSchema,
  GatewayMcpServerMappingSchema,
} from './ai-gateway-extensions.js';
import { GatewayRoutingConfigSchema } from './ai-gateway-routing.js';

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
      success: z.boolean().optional(),
      has_more: z.boolean().optional(),
      data: z.array(item),
    })
    .passthrough();

/**
 * One usage-limit policy. Attached to workspaces and to integration/workspace bindings.
 *
 * Every field is optional: the upstream contract defines `credit_limit`, `type`,
 * `alert_threshold`, `periodic_reset`, `periodic_reset_days` and `next_usage_reset_at`, but a live
 * tenant also returns server-side bookkeeping the spec omits (`id`, `status`, `current_usage`,
 * `is_exhausted_alerts_sent`, `is_threshold_alerts_sent`). Passthrough keeps those rather than
 * stripping them, and optionality means a partial policy from either side still parses.
 */
export const GatewayUsageLimitSchema = z
  .object({
    credit_limit: z.number().optional(),
    type: z.string().optional(),
    alert_threshold: z.number().optional(),
    periodic_reset: z.string().nullable().optional(),
    periodic_reset_days: z.number().nullable().optional(),
    next_usage_reset_at: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayUsageLimit = z.infer<typeof GatewayUsageLimitSchema>;

/** One rate-limit policy: `type` requests|tokens, `unit` rpd|rph|rpm, `value`. */
export const GatewayRateLimitSchema = z
  .object({
    type: z.string().optional(),
    unit: z.string().optional(),
    value: z.number().optional(),
  })
  .passthrough();
export type GatewayRateLimit = z.infer<typeof GatewayRateLimitSchema>;

/**
 * `usage_limits` / `rate_limits` as they actually appear on the wire.
 *
 * These are **arrays** of policy objects. They were originally modelled as `record | null`,
 * because the tenant the schemas were derived from had `null` for every occurrence and the array
 * form was never observed — which made `workspaces.get()` throw AISEC_RESPONSE_VALIDATION against
 * any workspace that actually had limits configured (issue #211).
 *
 * The union keeps the old object form accepted. Dropping it would be a gratuitous breaking change
 * for any tenant or endpoint that does return an object, and costs nothing to retain.
 */
const limitsField = <T extends z.ZodTypeAny>(policy: T) =>
  z.union([z.array(policy), z.record(z.unknown())]).nullable();

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
  .object({
    x: z.string(),
    y: z.number(),
    avg: z.number().optional(),
    llm_count: z.number().optional(),
    mcp_count: z.number().optional(),
    a2a_count: z.number().optional(),
    llm_error_count: z.number().optional(),
    mcp_error_count: z.number().optional(),
    a2a_error_count: z.number().optional(),
  })
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
      total_llm_count: z.number().optional(),
      total_mcp_count: z.number().optional(),
      total_a2a_count: z.number().optional(),
      total_llm_error_count: z.number().optional(),
      total_mcp_error_count: z.number().optional(),
      total_a2a_error_count: z.number().optional(),
      ...quotaFlag,
    })
    .passthrough(),
);
export type CountChartResponse = z.infer<typeof CountChartResponseSchema>;

/**
 * `logs/charts/latency`. Percentiles appear per-bucket AND at top level; ms.
 * Empty cohorts retain zero-valued buckets, but the period mean/percentiles are null.
 */
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
      total: z.number().nullable(),
      p50: z.number().nullable(),
      p90: z.number().nullable(),
      p99: z.number().nullable(),
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
            llm_request_units: z.number().optional(),
            llm_response_units: z.number().optional(),
            mcp_request_units: z.number().optional(),
            mcp_response_units: z.number().optional(),
            a2a_request_units: z.number().optional(),
            a2a_response_units: z.number().optional(),
            avg: z.number(),
          })
          .passthrough(),
      ),
      total: z.number(),
      avg: z.number(),
      total_request_units: z.number(),
      total_response_units: z.number(),
      total_llm_request_units: z.number().optional(),
      total_llm_response_units: z.number().optional(),
      total_mcp_request_units: z.number().optional(),
      total_mcp_response_units: z.number().optional(),
      total_a2a_request_units: z.number().optional(),
      total_a2a_response_units: z.number().optional(),
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

/** Bare `logs`. Preserve the server's capturedTotal; total is the full-period count. */
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
 * Backward-compatible receipt for gateway writes with varying or incompletely verified shapes.
 *
 * Verifying `deployments`, `configs`, `guardrails`, and `providers` create responses proved
 * every create returns a minimal receipt rather than the record it creates — never inferable
 * from the corresponding read. See {@link GatewayDeploymentCreateResponseSchema}, {@link
 * GatewayConfigCreateResponseSchema}, {@link GatewayGuardrailCreateResponseSchema}, and {@link
 * GatewayProviderCreateResponseSchema} for the four specialized receipts. This generic
 * receipt also covers update and create operations with different lifecycle fields. Several
 * are live-verified; others are not. See the operation-level gateway coverage ledger and
 * sanitized live-response fixtures rather than interpreting this shared type as verification.
 */
export const GatewayWriteResponseSchema = z
  .object({
    id: z.string().optional(),
    slug: z.string().optional(),
    version_id: z.string().optional(),
    success: z.boolean().optional(),
    data: z
      .union([
        z
          .object({
            id: z.string().optional(),
            slug: z.string().optional(),
            version_id: z.string().optional(),
          })
          .passthrough(),
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.unknown()),
        z.null(),
      ])
      .optional(),
  })
  .passthrough();
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
    // Nullable: a workspace created without one returns null, and upstream declares it
    // `nullable: true`. Observed on an archived workspace (#213).
    description: z.string().nullable(),
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
    /** Nullable — see `GatewayWorkspaceSchema.description`. */
    description: z.string().nullable(),
    created_at: z.string(),
    last_updated_at: z.string(),
    is_default: z.number(),
    slug: z.string(),
    icon: z.string().nullable(),
    defaults: z.record(z.unknown()).nullable(),
    usage_limits: limitsField(GatewayUsageLimitSchema),
    rate_limits: limitsField(GatewayRateLimitSchema),
    security_settings: z.record(z.boolean()).optional(),
    data_plane_security_settings: z.record(z.unknown()).optional(),
    settings: z.record(z.unknown()).optional(),
    /**
     * Lifecycle state. **Diverges from the list row**: `list()` reports `'active'` for a
     * workspace whose `get()` reports `null` (observed live 2026-08-01). Prefer the list value,
     * or treat a `null` here as "unknown", not as "inactive".
     */
    status: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayWorkspaceDetail = z.infer<typeof GatewayWorkspaceDetailSchema>;

/**
 * `POST /ai_gw/admin/v2/workspaces` response — verified live 2026-08-01.
 *
 * **The exception to this subsystem's "receipt, not record" write pattern.** `configs.create()`,
 * `guardrails.create()`, `providers.create()`, and `deployments.create()` each return a 4-5 field
 * receipt; workspace create returns most of the record instead.
 *
 * It is still not the full detail shape — `status`, `is_default`, `icon`, `usage_limits`,
 * `rate_limits`, and the settings blocks are all absent — so call `get()` when you need those.
 * Conversely `users` appears here and nowhere else.
 */
export const GatewayWorkspaceCreateResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    created_at: z.string(),
    last_updated_at: z.string(),
    scope_name: z.string(),
    object: z.string(),
    defaults: z.record(z.unknown()).nullable().optional(),
    /** Seeded workspace members. Present on create only. */
    users: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type GatewayWorkspaceCreateResponse = z.infer<typeof GatewayWorkspaceCreateResponseSchema>;

export const ListWorkspacesResponseSchema = aiGatewayList(GatewayWorkspaceSchema);
export type ListWorkspacesResponse = z.infer<typeof ListWorkspacesResponseSchema>;

// ---------------------------------------------------------------------------
// Configs (data plane)
// ---------------------------------------------------------------------------

/**
 * A gateway config **list row** — 12 fields. The list read (`GET /configs?workspace_id=`)
 * returns a strict subset of the detail read; it does NOT carry `config`, `format`, `type`,
 * or `version_id`. See {@link GatewayConfigDetailSchema} for the detail shape, and
 * {@link GatewayDeploymentSchema}/{@link GatewayDeploymentDetailSchema} for the same
 * list-vs-detail split already established for deployments.
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
    object: z.string(),
  })
  .passthrough();
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

export const ListConfigsResponseSchema = aiGatewayList(GatewayConfigSchema);
export type ListConfigsResponse = z.infer<typeof ListConfigsResponseSchema>;

/**
 * Config detail (`GET /configs/{id}`) — adds `config`, `format`, `type`, `version_id` on top
 * of the list row. **`config` is a JSON-encoded STRING, not an object** — the wire type is
 * preserved rather than silently parsed. Use `JSON.parse(config)` at the call site. Same
 * request/response asymmetry as `mcp-integrations.configurations`, see
 * {@link McpIntegrationSchema}.
 */
export const GatewayConfigDetailSchema = GatewayConfigSchema.extend({
  config: z.string(),
  format: z.string(),
  type: z.string(),
  version_id: z.string(),
  /** Upstream envelope fields remain readable when present; SCM normally returns a flat record. */
  success: z.boolean().optional(),
  data: z.object({ config: GatewayRoutingConfigSchema.optional() }).passthrough().optional(),
}).passthrough();
export type GatewayConfigDetail = z.infer<typeof GatewayConfigDetailSchema>;

/** One config version from `GET /configs/{id}/versions`. Verified live 2026-08-29. */
export const GatewayConfigVersionSchema = GatewayConfigDetailSchema.extend({
  version_created_at: z.string(),
  version_owner_id: z.string(),
}).passthrough();
export type GatewayConfigVersion = z.infer<typeof GatewayConfigVersionSchema>;
export const ListConfigVersionsResponseSchema = aiGatewayList(GatewayConfigVersionSchema);
export type ListConfigVersionsResponse = z.infer<typeof ListConfigVersionsResponseSchema>;

/**
 * `POST /configs` response — a 4-field creation receipt, **not** a {@link GatewayConfig} or
 * {@link GatewayConfigDetail}. Verified live 2026-07-28 (create -> read -> delete cycle).
 * Confirms the "create returns a receipt, not the record" pattern first established for
 * {@link GatewayDeploymentCreateResponseSchema} also holds for configs. Call {@link
 * GatewayConfigDetailSchema}'s `get()` for the full record.
 */
export const GatewayConfigCreateResponseSchema = z
  .object({
    id: z.string(),
    version_id: z.string(),
    slug: z.string(),
    object: z.string(),
    success: z.boolean().optional(),
    data: z
      .object({ id: z.string().optional(), version_id: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type GatewayConfigCreateResponse = z.infer<typeof GatewayConfigCreateResponseSchema>;

// ---------------------------------------------------------------------------
// Guardrails (data plane) — list row, detail, and create receipt, verified live
// ---------------------------------------------------------------------------

/**
 * A guardrail **list row** (`GET /guardrails?workspace_id=`) — 10 fields. It does NOT carry
 * `checks`, `actions`, or `version_id`; see {@link GatewayGuardrailDetailSchema} for those.
 * Verified live 2026-07-28.
 */
export const GatewayGuardrailSchema = z
  .object({
    target: z.enum(['llm', 'mcp_tools']).optional(),
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    organisation_id: z.string(),
    status: z.string(),
    owner_id: z.string(),
    updated_by: z.string().nullable(),
    created_at: z.string(),
    last_updated_at: z.string(),
    workspace_id: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayGuardrail = z.infer<typeof GatewayGuardrailSchema>;
export const ListGuardrailsResponseSchema = aiGatewayList(GatewayGuardrailSchema);
export type ListGuardrailsResponse = z.infer<typeof ListGuardrailsResponseSchema>;

/** One `on_success`/`on_fail` feedback action. Absent entirely on guardrails created without them. */
const guardrailFeedbackActionSchema = z
  .object({
    feedback: z
      .object({ value: z.number(), weight: z.number(), metadata: z.string() })
      .passthrough(),
  })
  .passthrough();

/**
 * Guardrail detail (`GET /guardrails/{id}`) — adds `checks`, `actions`, and `version_id` on
 * top of the list row. Verified live 2026-07-28.
 */
export const GatewayGuardrailDetailSchema = GatewayGuardrailSchema.extend({
  mcp_server_mappings: z.array(GatewayMcpServerMappingSchema).optional(),
  checks: z.array(
    z
      .object({
        /** e.g. `panw-prisma-airs.intercept`, the Prisma AIRS intercept check. */
        id: z.string(),
        parameters: GatewayCatalogGuardrailParametersSchema,
        name: z.string().optional(),
        is_enabled: z.boolean(),
      })
      .passthrough(),
  ),
  actions: z
    .object({
      deny: z.boolean(),
      async: z.boolean(),
      sequential: z.boolean(),
      /** Absent when the guardrail was created without a pass/fail feedback action. */
      on_success: guardrailFeedbackActionSchema.nullable().optional(),
      on_fail: guardrailFeedbackActionSchema.nullable().optional(),
    })
    .passthrough(),
  version_id: z.string(),
}).passthrough();
export type GatewayGuardrailDetail = z.infer<typeof GatewayGuardrailDetailSchema>;

/**
 * `POST /guardrails` response — a 4-field creation receipt, **not** a {@link GatewayGuardrail}
 * or {@link GatewayGuardrailDetail}. Verified live 2026-07-28. Same receipt pattern as
 * {@link GatewayConfigCreateResponseSchema}.
 */
export const GatewayGuardrailCreateResponseSchema = z
  .object({
    id: z.string(),
    version_id: z.string(),
    slug: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayGuardrailCreateResponse = z.infer<typeof GatewayGuardrailCreateResponseSchema>;

// ---------------------------------------------------------------------------
// Providers (data plane)
// ---------------------------------------------------------------------------

/** A workspace-scoped AI provider binding. */
export const GatewayProviderSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    slug: z.string().optional(),
    object: z.string().optional(),
    integration_id: z.string().optional(),
    note: z.string().nullable().optional(),
    status: z.string().optional(),
    usage_limits: z
      .union([GatewayUsageLimitSchema, z.array(GatewayUsageLimitSchema)])
      .nullable()
      .optional(),
    reset_usage: z.union([z.number(), z.boolean()]).nullable().optional(),
    created_at: z.string().optional(),
    rate_limits: z.array(GatewayRateLimitSchema).nullable().optional(),
    expires_at: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayProvider = z.infer<typeof GatewayProviderSchema>;
export const ListProvidersResponseSchema = aiGatewayList(GatewayProviderSchema);
export type ListProvidersResponse = z.infer<typeof ListProvidersResponseSchema>;

/** Provider detail from `GET /providers/{id}`. Verified live 2026-08-29. */
export const GatewayProviderDetailSchema = z
  .object({
    id: z.string(),
    ai_provider_name: z.string(),
    model_config: z.record(z.unknown()),
    /** Potentially secret-bearing. Never log or persist this field. */
    key: z.string(),
    masked_api_key: z.string(),
    slug: z.string(),
    name: z.string(),
    usage_limits: z.union([GatewayUsageLimitSchema, z.array(GatewayUsageLimitSchema)]).nullable(),
    status: z.string(),
    note: z.string().nullable(),
    created_at: z.string(),
    expires_at: z.string().nullable(),
    last_reset_at: z.string().nullable(),
    rate_limits: z.array(GatewayRateLimitSchema),
    reset_usage: z.union([z.number(), z.boolean()]).nullable().optional(),
    integration_id: z.string(),
    tags: z.unknown().nullable(),
    secret_mappings: z.array(GatewayCatalogSecretMappingSchema).optional(),
    object: z.string(),
  })
  .passthrough();
export type GatewayProviderDetail = z.infer<typeof GatewayProviderDetailSchema>;

/**
 * `POST /providers` response — a 3-field creation receipt, **not** a {@link GatewayProvider}.
 * Verified live 2026-07-28. **No `version_id`** — unlike its {@link
 * GatewayConfigCreateResponseSchema} and {@link GatewayGuardrailCreateResponseSchema}
 * siblings. Do not add one speculatively.
 */
export const GatewayProviderCreateResponseSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    object: z.string(),
  })
  .passthrough();
export type GatewayProviderCreateResponse = z.infer<typeof GatewayProviderCreateResponseSchema>;

// ---------------------------------------------------------------------------
// API keys (data plane)
// ---------------------------------------------------------------------------

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

/** One-time response from an explicit API-key rotation. Never log `key`. */
export const GatewayApiKeyRotateResponseSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    key_transition_expires_at: z.string(),
  })
  .passthrough();
export type GatewayApiKeyRotateResponse = z.infer<typeof GatewayApiKeyRotateResponseSchema>;

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
    /** Newly created integrations have not been updated yet. Verified live 2026-09-06. */
    last_updated_at: z.string().nullable(),
    slug: z.string(),
    tags: z.unknown().nullable(),
    description: z.string().nullable(),
    workspaces_count: z.number().optional(),
    type: z.string().optional(),
    workspace_id: z.string().nullable(),
    ai_provider_id: z.string(),
    object: z.string(),
    masked_key: z.string().nullable().optional(),
    configurations: z
      .union([GatewayCatalogProviderConfigurationSchema, z.string()])
      .nullable()
      .optional(),
    global_workspace_access_settings: z
      .lazy(() => GatewayGlobalWorkspaceAccessSchema)
      .nullable()
      .optional(),
    allow_all_models: z.boolean().optional(),
    workspace_count: z.number().optional(),
    secret_mappings: z.array(GatewayCatalogSecretMappingSchema).nullable().optional(),
    pricing_adjustments: GatewayPricingAdjustmentsSchema.nullable().optional(),
  })
  .passthrough();
export type GatewayIntegration = z.infer<typeof GatewayIntegrationSchema>;
export const ListIntegrationsResponseSchema = aiGatewayList(GatewayIntegrationSchema);
export type ListIntegrationsResponse = z.infer<typeof ListIntegrationsResponseSchema>;

/**
 * One provider family from `/utils/static-resources/ai-providers` (captured 2026-09-12:
 * 77 entries such as `open-ai`, `x-ai`, `azure-openai`, `bedrock`). The catalog carries no
 * configuration-field metadata; `ai_provider_id` on an integration is the `id` here.
 */
export const GatewayCatalogProviderSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    status: z.string(),
    description: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    last_updated_at: z.string().nullable().optional(),
  })
  .passthrough();
export type GatewayCatalogProvider = z.infer<typeof GatewayCatalogProviderSchema>;
/** The catalog envelope is `{ success, data }` without the list `object`/`total` fields. */
export const ListCatalogProvidersResponseSchema = z
  .object({ success: z.boolean().optional(), data: z.array(GatewayCatalogProviderSchema) })
  .passthrough();
export type ListCatalogProvidersResponse = z.infer<typeof ListCatalogProvidersResponseSchema>;

/** `integrations/{id}/models` — per-model enablement for one integration. */
export const GatewayIntegrationModelsResponseSchema = z
  .object({
    models: z.array(
      z
        .object({
          slug: z.string(),
          enabled: z.boolean(),
          name: z.string().optional(),
          is_custom: z
            .union([z.boolean(), z.literal(0), z.literal(1)])
            .nullable()
            .optional(),
          is_finetune: z
            .union([z.boolean(), z.literal(0), z.literal(1)])
            .nullable()
            .optional(),
          base_model_slug: z.string().nullable().optional(),
          pricing_config: GatewayPricingConfigSchema.nullable().optional(),
        })
        .passthrough(),
    ),
    total: z.number().int().optional(),
    allow_all_models: z.boolean(),
    object: z.string(),
  })
  .passthrough();
export type GatewayIntegrationModelsResponse = z.infer<
  typeof GatewayIntegrationModelsResponseSchema
>;

/**
 * One `integrations/{id}/workspaces.workspaces[]` element — a workspace bound to the
 * integration. `usage_limits`, `rate_limits`, and `last_reset_at` are observed `null` on a
 * healthy tenant.
 */
export const GatewayIntegrationWorkspaceSchema = z
  .object({
    id: z.string(),
    usage_limits: limitsField(GatewayUsageLimitSchema),
    rate_limits: limitsField(GatewayRateLimitSchema),
    enabled: z.boolean(),
    status: z.string(),
    created_at: z.string(),
    last_updated_at: z.string().nullable(),
    last_reset_at: z.string().nullable(),
  })
  .passthrough();
export type GatewayIntegrationWorkspace = z.infer<typeof GatewayIntegrationWorkspaceSchema>;

/**
 * `integrations/{id}/workspaces.global_workspace_access` — **an object, not a boolean**
 * despite the field name (the request-side `GatewayIntegrationWorkspacesRequest` DOES send a
 * plain boolean here; only the response is an object).
 */
export const GatewayGlobalWorkspaceAccessSchema = z
  .object({
    enabled: z.boolean(),
    /** Disabled access can omit both policy fields entirely. */
    rate_limits: limitsField(GatewayRateLimitSchema).optional(),
    usage_limits: limitsField(GatewayUsageLimitSchema).optional(),
  })
  .passthrough();
export type GatewayGlobalWorkspaceAccess = z.infer<typeof GatewayGlobalWorkspaceAccessSchema>;

/** `integrations/{id}/workspaces` — which workspaces may use this integration. */
export const GatewayIntegrationWorkspacesResponseSchema = z
  .object({
    total: z.number().int().optional(),
    workspaces: z.array(GatewayIntegrationWorkspaceSchema),
    global_workspace_access: GatewayGlobalWorkspaceAccessSchema,
    object: z.string(),
  })
  .passthrough();
export type GatewayIntegrationWorkspacesResponse = z.infer<
  typeof GatewayIntegrationWorkspacesResponseSchema
>;

/** An MCP server integration. */
export const McpIntegrationSchema = z
  .object({
    slug: z.string().optional(),
    workspace_id: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    workspaces_count: z.number().nullable().optional(),
    secret_mappings: z.array(GatewayCatalogSecretMappingSchema).nullable().optional(),
    id: z.string(),
    organisation_id: z.string(),
    name: z.string(),
    owner_id: z.string(),
    status: z.string(),
    type: z.string(),
    url: z.string(),
    auth_type: z.string(),
    transport: z.string(),
    /**
     * JSON-encoded STRING on reads — the same request/response asymmetry as
     * `configs.config` (see {@link GatewayConfigDetailSchema}). The CREATE request
     * (`McpIntegrationCreateRequest.configurations`) sends an object; this is the read shape.
     */
    configurations: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
  })
  .passthrough();
export type McpIntegration = z.infer<typeof McpIntegrationSchema>;
export const ListMcpIntegrationsResponseSchema = aiGatewayList(McpIntegrationSchema);
export type ListMcpIntegrationsResponse = z.infer<typeof ListMcpIntegrationsResponseSchema>;

/** MCP integration detail. Its `configurations` field is an object, unlike list rows. */
export const McpIntegrationDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    owner_id: z.string(),
    status: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    configurations: GatewayCatalogMcpConfigurationSchema,
    global_workspace_access: z.object({ enabled: z.boolean() }).passthrough().nullable(),
    workspace_id: z.string().nullable(),
    slug: z.string(),
    url: z.string(),
    auth_type: z.string(),
    transport: z.string(),
    type: z.string(),
    secret_mappings: z.array(GatewayCatalogSecretMappingSchema).nullable(),
    object: z.string(),
  })
  .passthrough();
export type McpIntegrationDetail = z.infer<typeof McpIntegrationDetailSchema>;

const McpCapabilityCountSchema = z.object({ total: z.number(), enabled: z.number() }).passthrough();

/** One tool, prompt, resource, or resource-template exposed by an MCP integration. */
export const McpIntegrationCapabilitySchema = z
  .object({
    name: z.string(),
    type: z.string(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    icons: z.array(z.unknown()).nullable(),
    enabled: z.boolean(),
    created_at: z.string(),
    last_updated_at: z.string(),
    input_schema: z.record(z.unknown()).nullable(),
    output_schema: z.record(z.unknown()).nullable(),
    execution: z.record(z.unknown()).nullable(),
    arguments: z.array(z.unknown()).nullable().optional(),
    uri: z.string().nullable().optional(),
    uri_template: z.string().nullable().optional(),
    mime_type: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    annotations: z.record(z.unknown()).nullable(),
    object: z.string(),
  })
  .passthrough();
export type McpIntegrationCapability = z.infer<typeof McpIntegrationCapabilitySchema>;

/** Capabilities exposed by one MCP integration. Verified live 2026-08-29. */
export const McpIntegrationCapabilitiesResponseSchema = z
  .object({
    object: z.string(),
    counts: z
      .object({
        tools: McpCapabilityCountSchema.optional(),
        prompts: McpCapabilityCountSchema.optional(),
        resources: McpCapabilityCountSchema.optional(),
        resource_templates: McpCapabilityCountSchema.optional(),
      })
      .passthrough(),
    total: z.number(),
    has_more: z.boolean(),
    data: z.array(McpIntegrationCapabilitySchema),
  })
  .passthrough();
export type McpIntegrationCapabilitiesResponse = z.infer<
  typeof McpIntegrationCapabilitiesResponseSchema
>;

export const McpIntegrationCapabilitiesUpdateResponseSchema = z
  .object({ success: z.boolean() })
  .passthrough();
export type McpIntegrationCapabilitiesUpdateResponse = z.infer<
  typeof McpIntegrationCapabilitiesUpdateResponseSchema
>;

/** Empty response from an MCP workspace-binding replacement. Verified live 2026-08-30. */
export const McpIntegrationWorkspacesUpdateResponseSchema = z.object({}).strict();
export type McpIntegrationWorkspacesUpdateResponse = z.infer<
  typeof McpIntegrationWorkspacesUpdateResponseSchema
>;

/** Metadata discovered from an MCP server. Verified live 2026-08-29. */
export const McpIntegrationMetadataSchema = z
  .object({
    server_name: z.string(),
    server_version: z.string(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    website_url: z.string().nullable(),
    icons: z.unknown().nullable(),
    protocol_version: z.string().nullable(),
    capability_flags: z.record(z.unknown()),
    instructions: z.string().nullable(),
    sync_status: z.string(),
    last_synced_at: z.string().nullable(),
    sync_error: z.string().nullable(),
    object: z.string(),
  })
  .passthrough();
export type McpIntegrationMetadata = z.infer<typeof McpIntegrationMetadataSchema>;

// ---------------------------------------------------------------------------
// Deployments (admin plane) — three distinct shapes, verified live
// ---------------------------------------------------------------------------

/** A deployment list row. */
export const GatewayDeploymentSchema = z
  .object({
    connection_status: z.string().optional(),
    tags: GatewayDeploymentTagsSchema.nullable().optional(),
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
      gateway_base_url: z.string().optional(),
      mcp_gateway_base_url: z.string().optional(),
      private_link_endpoint: z.string().optional(),
      use_private_link_proxy: z.number().int().optional(),
      is_dataservice_hosted: z.number().int().optional(),
      is_playground_proxy_allowed: z.number().int().optional(),
      jwt_subs_allowed: z.array(z.string()).optional(),
      jwt_sub_workspace_mapping: z.record(z.string()).optional(),
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

/** Two-way connectivity result for a configured self-hosted deployment. */
export const GatewayDeploymentPingResponseSchema = z
  .object({
    status: z.string(),
    gateway_base_url: z.string(),
    outbound: z
      .object({
        status: z.string(),
        status_code: z.number().optional(),
        version: z.string().optional(),
        error: z.string().optional(),
      })
      .passthrough(),
    inbound: z.object({ status: z.string(), error: z.string().optional() }).passthrough(),
    object: z.string(),
  })
  .passthrough();
export type GatewayDeploymentPingResponse = z.infer<typeof GatewayDeploymentPingResponseSchema>;

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
  .object({
    records: z.array(GatewayAuditLogRecordSchema),
    total: z.number().int().optional(),
    object: z.string().optional(),
  })
  .passthrough();
export type GatewayAuditLogsResponse = z.infer<typeof GatewayAuditLogsResponseSchema>;
