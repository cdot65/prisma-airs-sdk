import { z } from 'zod';
import {
  AI_GW_CHARTS_PATH,
  AI_GW_GROUPS_PATH,
  AI_GW_LOGS_PATH,
  AI_GW_CHART_METRICS,
  AI_GW_GROUP_DIMENSIONS,
  AI_GW_GROUP_COLUMNS,
} from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  CostChartResponseSchema,
  CountChartResponseSchema,
  LatencyChartResponseSchema,
  TokensChartResponseSchema,
  CacheSummaryResponseSchema,
  CacheHitTrendResponseSchema,
  UserTrendsResponseSchema,
  ErrorTrendsResponseSchema,
  RescuedRetriesResponseSchema,
  FeedbackScoreDistributionResponseSchema,
  FeedbackModelsResponseSchema,
  GroupListResponseSchema,
  UserGroupResponseSchema,
  GatewayLogsResponseSchema,
  type CostChartResponse,
  type CountChartResponse,
  type LatencyChartResponse,
  type TokensChartResponse,
  type CacheSummaryResponse,
  type CacheHitTrendResponse,
  type UserTrendsResponse,
  type ErrorTrendsResponse,
  type RescuedRetriesResponse,
  type FeedbackScoreDistributionResponse,
  type FeedbackModelsResponse,
  type GroupListResponse,
  type UserGroupResponse,
  type GatewayLogsResponse,
} from '../models/ai-gateway.js';
import { serializeWindow, telemetryWindowSchema, type AIGatewayWindowOptions } from './window.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { GatewayJsonObjectSchema } from '../models/ai-gateway-routing.js';

const nonBlankString = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0);
const groupOptionsSchema = telemetryWindowSchema
  .extend({
    columns: z.array(z.enum(AI_GW_GROUP_COLUMNS)).optional(),
  })
  .strict();
const logsOptionsSchema = telemetryWindowSchema
  .extend({
    pageSize: z.number().int().nonnegative().safe().optional(),
    traceId: nonBlankString.optional(),
    statusCode: z.number().int().nonnegative().safe().optional(),
  })
  .strict();
const filteredChartOptionsSchema = telemetryWindowSchema
  .extend({
    traceId: nonBlankString.optional(),
    metadata: GatewayJsonObjectSchema.pipe(z.record(z.string())).optional(),
  })
  .strict();

function serializeChartOptions(tsgId: string, opts: AIGatewayChartOptions): Record<string, string> {
  const params = serializeWindow(tsgId, opts, filteredChartOptionsSchema);
  if (opts.traceId !== undefined) params.traceId = opts.traceId;
  if (opts.metadata !== undefined) params.metadata = JSON.stringify(opts.metadata);
  return params;
}

/** @internal */
export interface AIGatewayTelemetryClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
  tsgId: string;
}

/** Options for a `logs/groups/{dimension}` query. */
export interface AIGatewayGroupOptions extends AIGatewayWindowOptions {
  /**
   * Extra columns to aggregate. The SDK rejects unsupported names before I/O; the API would
   * silently drop them. See {@link AI_GW_GROUP_COLUMNS} for the valid set.
   */
  columns?: (typeof AI_GW_GROUP_COLUMNS)[number][];
}

/**
 * Verified SCM filters for requests, cost, tokens and latency charts only.
 * These are partial adapters, not the complete upstream analytics query contract.
 * @example
 * ```ts
 * import { AIGatewayClient, type AIGatewayChartOptions } from '@cdot65/prisma-airs-sdk';
 * const options: AIGatewayChartOptions = {
 *   workspaceSlug: 'ws-dev', days: 1, metadata: { environment: 'dev' },
 * };
 * const cost = await new AIGatewayClient().telemetry.cost(options);
 * console.log(cost.data.total); // cents
 * ```
 */
export interface AIGatewayChartOptions extends AIGatewayWindowOptions {
  /** One trace ID. Serialized as SCM `traceId`, not the ignored upstream `trace_id`. */
  traceId?: string;
  /** Exact string-valued metadata matches. Serialized as JSON in the `metadata` query parameter. */
  metadata?: Record<string, string>;
}

/** Backwards-compatible name for the verified request-count chart options. */
// Preserve the interface's declaration-merging surface for existing consumers.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AIGatewayRequestChartOptions extends AIGatewayChartOptions {}

/**
 * Options for the raw `logs` collection.
 *
 * Deliberately NOT {@link ListingOptions}: offset paging is broken upstream. `skip`/`offset`/
 * `page` are ignored by the API and every unfiltered call returns the same most-recent batch.
 */
export interface AIGatewayLogsOptions extends AIGatewayWindowOptions {
  /** Rows per response. The only working pagination control. */
  pageSize?: number;
  /** Return the single row for one trace id. */
  traceId?: string;
  /** Filter by HTTP status. **Bypasses the ~50-row cap** — use 446 to pull every AIRS block. */
  statusCode?: number;
}

/**
 * Client for AI Gateway runtime telemetry — the data behind the SCM Observability tabs.
 *
 * Endpoint slugs are bespoke and inconsistent (`user-trends` is plural, `cache-hit-trend`
 * is singular, `cache-hits-trend` 404s). They are hardcoded, not derived.
 */
export class AIGatewayTelemetryClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;
  private readonly tsgId: string;

  constructor(opts: AIGatewayTelemetryClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
    this.tsgId = opts.tsgId;
  }

  /** @internal Shared GET for every `logs/charts/*` endpoint. */
  private chart<T>(
    metric: (typeof AI_GW_CHART_METRICS)[number],
    opts: AIGatewayWindowOptions,
    // `any` for Zod's def/input generics, mirroring RequestSpec.responseSchema — schemas
    // built with .passthrough() have input ≠ output and fail a stricter constraint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: z.ZodType<T, any, any>,
    validatedParams?: Record<string, string>,
  ): Promise<T> {
    return request<T>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_CHARTS_PATH}/${metric}`,
      params: validatedParams ?? serializeWindow(this.tsgId, opts),
      responseSchema: schema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Total and per-day spend. **Values are in cents.**
   * @param opts - Workspace slug, time window and optional verified trace/metadata filters.
   * @returns Cost series plus the period total, in cents.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const cost = await gw.telemetry.cost({ workspaceSlug: 'ws-main-a-349e0e', days: 7 });
   * console.log(`$${(cost.data.total / 100).toFixed(2)}`); // => "$4110.83"
   * ```
   */
  async cost(opts: AIGatewayChartOptions): Promise<CostChartResponse> {
    return this.chart(
      'cost',
      opts,
      CostChartResponseSchema,
      serializeChartOptions(this.tsgId, opts),
    );
  }

  /**
   * Per-day request counts.
   * @param opts - Workspace slug, time window and optional verified trace/metadata filters.
   * @returns Request-count series plus the filtered period total.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const r = await gw.telemetry.requests({ workspaceSlug: 'ws-main-a-349e0e' });
   * // r.data.total => 25746
   * ```
   */
  async requests(opts: AIGatewayRequestChartOptions): Promise<CountChartResponse> {
    return this.chart(
      'requests',
      opts,
      CountChartResponseSchema,
      serializeChartOptions(this.tsgId, opts),
    );
  }

  /**
   * Latency in milliseconds. Percentiles are returned per-bucket and for the period.
   * @param opts - Workspace slug, time window and optional verified trace/metadata filters.
   * @returns Latency series with p50/p90/p99; `data.total` is the period mean, not a sum.
   * The period mean and percentiles are null when the cohort has no matching requests.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const l = await gw.telemetry.latency({ workspaceSlug: 'ws-main-a-349e0e' });
   * // l.data.p99 => 8329.14
   * ```
   */
  async latency(opts: AIGatewayChartOptions): Promise<LatencyChartResponse> {
    return this.chart(
      'latency',
      opts,
      LatencyChartResponseSchema,
      serializeChartOptions(this.tsgId, opts),
    );
  }

  /**
   * Token usage, split into request and response units.
   * @param opts - Workspace slug, time window and optional verified trace/metadata filters.
   * @returns Token series plus request/response unit totals.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const t = await gw.telemetry.tokens({ workspaceSlug: 'ws-main-a-349e0e' });
   * // t.data.total_request_units => 4919015459
   * ```
   */
  async tokens(opts: AIGatewayChartOptions): Promise<TokensChartResponse> {
    return this.chart(
      'tokens',
      opts,
      TokensChartResponseSchema,
      serializeChartOptions(this.tsgId, opts),
    );
  }

  /**
   * Per-day error counts.
   * @param opts - Workspace slug and time window.
   * @returns Error-count series plus the period total.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const e = await gw.telemetry.errors({ workspaceSlug: 'ws-main-a-349e0e' });
   * // e.data.total => 125
   * ```
   */
  async errors(opts: AIGatewayWindowOptions): Promise<CountChartResponse> {
    return this.chart('errors', opts, CountChartResponseSchema);
  }

  /**
   * Per-day distinct end-user counts.
   * @param opts - Workspace slug and time window.
   * @returns Unique-user series plus the period total.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const u = await gw.telemetry.users({ workspaceSlug: 'ws-main-a-349e0e' });
   * // u.data.total => 1
   * ```
   */
  async users(opts: AIGatewayWindowOptions): Promise<CountChartResponse> {
    return this.chart('users', opts, CountChartResponseSchema);
  }

  /**
   * Cache hit count, speedup, and average cached-response latency.
   * @param opts - Workspace slug and time window.
   * @returns Cache summary; `avgCacheLatency` is null when there were no hits.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const c = await gw.telemetry.cacheSummary({ workspaceSlug: 'ws-main-a-349e0e' });
   * // c.data.summary => { cacheHits: 0, avgCacheLatency: null, totalRequests: 25621, cacheSpeedup: 0 }
   * ```
   */
  async cacheSummary(opts: AIGatewayWindowOptions): Promise<CacheSummaryResponse> {
    return this.chart('cache-summary', opts, CacheSummaryResponseSchema);
  }

  /**
   * Cache hit-rate trend and cumulative savings.
   * @param opts - Workspace slug and time window.
   * @returns Per-bucket hits and **cumulative** savings in cents — the last non-zero bucket is the period total.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const t = await gw.telemetry.cacheHitTrend({ workspaceSlug: 'ws-main-a-349e0e' });
   * const last = t.data.trend.at(-1);
   * const savedUsd = ((last?.cumulativeSimpleHitSavings ?? 0) + (last?.cumulativeSemanticHitSavings ?? 0)) / 100;
   * ```
   */
  async cacheHitTrend(opts: AIGatewayWindowOptions): Promise<CacheHitTrendResponse> {
    return this.chart('cache-hit-trend', opts, CacheHitTrendResponseSchema);
  }

  /**
   * Requests-per-user trend.
   * @param opts - Workspace slug and time window.
   * @returns Daily request counts plus `summary.avg` (requests per user).
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const t = await gw.telemetry.userTrends({ workspaceSlug: 'ws-main-a-349e0e' });
   * // t.data.summary => { total: 25748, unique: 1, avg: 25748 }
   * ```
   */
  async userTrends(opts: AIGatewayWindowOptions): Promise<UserTrendsResponse> {
    return this.chart('user-trends', opts, UserTrendsResponseSchema);
  }

  /**
   * Error-rate trend as a percentage.
   * @param opts - Workspace slug and time window.
   * @returns Daily error percentages plus `summary.errorPercent` for the period.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const t = await gw.telemetry.errorTrends({ workspaceSlug: 'ws-main-a-349e0e' });
   * // t.data.summary.errorPercent => 0.485
   * ```
   */
  async errorTrends(opts: AIGatewayWindowOptions): Promise<ErrorTrendsResponse> {
    return this.chart('error-trends', opts, ErrorTrendsResponseSchema);
  }

  /**
   * Gateway auto-retry and fallback resilience. Sparse — only populated on upstream failures.
   * @param opts - Workspace slug and time window.
   * @returns Retry/fallback trends; note `trend[].y` is an **array**, not a scalar.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const r = await gw.telemetry.rescuedRetries({ workspaceSlug: 'ws-main-a-349e0e' });
   * // r.data.retryTotal => 0
   * ```
   */
  async rescuedRetries(opts: AIGatewayWindowOptions): Promise<RescuedRetriesResponse> {
    return this.chart('rescued-retries', opts, RescuedRetriesResponseSchema);
  }

  /**
   * Daily count of feedback submissions.
   * @param opts - Workspace slug and time window.
   * @returns Feedback-count series plus the period total.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const f = await gw.telemetry.feedbackTrend({ workspaceSlug: 'ws-main-a-349e0e' });
   * // f.data.total => 61
   * ```
   */
  async feedbackTrend(opts: AIGatewayWindowOptions): Promise<CountChartResponse> {
    return this.chart('feedback-trend', opts, CountChartResponseSchema);
  }

  /**
   * Weighted average feedback score, averaged over days.
   * @param opts - Workspace slug and time window.
   * @returns Weighted score series; `data.total` is null when there is no feedback.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const f = await gw.telemetry.feedbackWeighted({ workspaceSlug: 'ws-main-a-349e0e' });
   * // f.data.total => -2.58
   * ```
   */
  async feedbackWeighted(opts: AIGatewayWindowOptions): Promise<CountChartResponse> {
    return this.chart('feedback-weighted', opts, CountChartResponseSchema);
  }

  /**
   * Distribution of feedback scores. Runtime feedback accepts integer scores from -10 to 10;
   * the SCM UI commonly uses +5/-5 for thumbs up/down, but feedback is not limited to those values.
   * @param opts - Workspace slug and time window.
   * @returns Score histogram as `{x: score, y: count}` records.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const d = await gw.telemetry.feedbackScoreDistribution({ workspaceSlug: 'ws-main-a-349e0e' });
   * // d.data.records => [{ x: 5, y: 30 }, { x: -5, y: 33 }]
   * ```
   */
  async feedbackScoreDistribution(
    opts: AIGatewayWindowOptions,
  ): Promise<FeedbackScoreDistributionResponse> {
    return this.chart('feedback-score-distribution', opts, FeedbackScoreDistributionResponseSchema);
  }

  /**
   * Feedback broken down by AI model.
   * @param opts - Workspace slug and time window.
   * @returns Records where `x` is the model and `y` is an object, not a number.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const m = await gw.telemetry.feedbackModels({ workspaceSlug: 'ws-main-a-349e0e' });
   * // m.data.records[0] => { x: 'claude-sonnet-5', y: { avgWeightedFeedback: 4.2, feedbackCount: 12 } }
   * ```
   */
  async feedbackModels(opts: AIGatewayWindowOptions): Promise<FeedbackModelsResponse> {
    return this.chart('feedback-models', opts, FeedbackModelsResponseSchema);
  }

  /**
   * Aggregate requests by a dimension.
   * @param dimension - One of {@link AI_GW_GROUP_DIMENSIONS}. Underscore names only.
   * @param opts - Window plus optional extra columns.
   * @returns One row per distinct dimension value.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const byModel = await gw.telemetry.groupBy('model', {
   *   workspaceSlug: 'ws-main-a-349e0e',
   *   columns: ['cost', 'total_tokens'],
   * });
   * // byModel.data[0] => { model: 'claude-sonnet-5', requests: 10506, cost: 29704.16, ... }
   * ```
   */
  async groupBy(
    dimension: (typeof AI_GW_GROUP_DIMENSIONS)[number],
    opts: AIGatewayGroupOptions,
  ): Promise<GroupListResponse> {
    if (!AI_GW_GROUP_DIMENSIONS.includes(dimension))
      throw new AISecSDKException(
        'Invalid telemetry grouping dimension',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    const params = serializeWindow(this.tsgId, opts, groupOptionsSchema);
    if (opts.columns?.length) params.columns = opts.columns.join(',');

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GROUPS_PATH}/${dimension}`,
      params,
      responseSchema: GroupListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Requests and cost per end user.
   * @param opts - Workspace slug and time window.
   * @returns One record per user; `_user: ''` means calls with no end-user id. Costs in cents.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const users = await gw.telemetry.byUser({ workspaceSlug: 'ws-main-a-349e0e' });
   * // users.data.records[0] => { _user: '', count: 25748, cost: 411060.85 }
   * ```
   */
  async byUser(opts: AIGatewayWindowOptions): Promise<UserGroupResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GROUPS_PATH}/users`,
      params: serializeWindow(this.tsgId, opts),
      responseSchema: UserGroupResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Requests grouped by HTTP status code.
   * @param opts - Window plus optional extra columns.
   * @returns One row per status. **446 = AIRS security block** (cost 0, never reached the LLM).
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const codes = await gw.telemetry.byStatusCode({
   *   workspaceSlug: 'ws-main-a-349e0e',
   *   columns: ['cost', 'avg_latency'],
   * });
   * // codes.data => [{ status_code: 200, requests: 25623, ... }, { status_code: 446, ... }]
   * ```
   */
  async byStatusCode(opts: AIGatewayGroupOptions): Promise<GroupListResponse> {
    const params = serializeWindow(this.tsgId, opts, groupOptionsSchema);
    if (opts.columns?.length) params.columns = opts.columns.join(',');

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GROUPS_PATH}/status_code`,
      params,
      responseSchema: GroupListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Raw per-request log rows — the deepest granularity this API offers.
   *
   * @remarks
   * Upstream pagination is broken: only `pageSize` works, and an unfiltered call always
   * returns the same most-recent batch (~50 rows) regardless of offset. To read beyond that,
   * filter by `statusCode`, which bypasses the cap and returns every match in the window.
   *
   * @param opts - Window plus `pageSize` / `traceId` / `statusCode` filters.
   * @returns Log records plus the full-period `total` (which you cannot page to).
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * // Every AIRS security block in the window, not just the most recent page.
   * const blocked = await gw.telemetry.logs({
   *   workspaceSlug: 'ws-main-a-349e0e',
   *   statusCode: 446,
   * });
   * // blocked.data.records[0] => { response_status_code: 446, cost: 0, is_success: 0, ... }
   * ```
   */
  async logs(opts: AIGatewayLogsOptions): Promise<GatewayLogsResponse> {
    const params = serializeWindow(this.tsgId, opts, logsOptionsSchema);
    if (opts.pageSize !== undefined) params.pageSize = String(opts.pageSize);
    if (opts.traceId !== undefined) params.traceId = opts.traceId;
    if (opts.statusCode !== undefined) params.statusCode = String(opts.statusCode);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_LOGS_PATH,
      params,
      responseSchema: GatewayLogsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
