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

/** Envelope B: `{ object, total, data[] }` — config and admin collections. */
export const aiGatewayList = <T extends z.ZodTypeAny>(item: T) =>
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
export const ChartRecordSchema = z
  .object({ x: z.string(), y: z.number(), avg: z.number().optional() })
  .passthrough();
export type ChartRecord = z.infer<typeof ChartRecordSchema>;

/** `logs/charts/cost`. **`y` and `total` are in cents.** */
export const CostChartResponseSchema = aiGatewayEnvelope(
  z
    .object({
      records: z.array(ChartRecordSchema),
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
      records: z.array(ChartRecordSchema),
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
      trend: z.array(ChartRecordSchema),
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
      trend: z.array(ChartRecordSchema),
      ...quotaFlag,
    })
    .passthrough(),
);
export type ErrorTrendsResponse = z.infer<typeof ErrorTrendsResponseSchema>;

/**
 * `logs/charts/rescued-retries`. **`trend[].y` is an array, not a scalar** — it cannot share
 * {@link ChartRecordSchema}. Sparse: only populated on upstream failures.
 */
export const RescuedRetriesResponseSchema = aiGatewayEnvelope(
  z
    .object({
      trend: z.array(
        z
          .object({
            x: z.string(),
            y: z.array(
              z.object({ retry_success_count: z.number(), count: z.number() }).passthrough(),
            ),
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
export const GroupRowSchema = z
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
export type GroupRow = z.infer<typeof GroupRowSchema>;

/** `logs/groups/{ai_service,model,api_key,provider,status_code}`. */
export const GroupListResponseSchema = aiGatewayGroupList(GroupRowSchema);
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
