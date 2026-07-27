import type { z } from 'zod';
import { AI_GW_CHARTS_PATH } from '../constants.js';
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
} from '../models/ai-gateway.js';
import { serializeWindow, type AIGatewayWindowOptions } from './window.js';

/** @internal */
export interface AIGatewayTelemetryClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
  tsgId: string;
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
    metric: string,
    opts: AIGatewayWindowOptions,
    // `any` for Zod's def/input generics, mirroring RequestSpec.responseSchema — schemas
    // built with .passthrough() have input ≠ output and fail a stricter constraint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: z.ZodType<T, any, any>,
  ): Promise<T> {
    return request<T>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_CHARTS_PATH}/${metric}`,
      params: serializeWindow(this.tsgId, opts),
      responseSchema: schema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Total and per-day spend. **Values are in cents.**
   * @param opts - Workspace slug and time window.
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
  async cost(opts: AIGatewayWindowOptions): Promise<CostChartResponse> {
    return this.chart('cost', opts, CostChartResponseSchema);
  }

  /**
   * Per-day request counts.
   * @param opts - Workspace slug and time window.
   * @returns Request-count series plus the period total.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const r = await gw.telemetry.requests({ workspaceSlug: 'ws-main-a-349e0e' });
   * // r.data.total => 25746
   * ```
   */
  async requests(opts: AIGatewayWindowOptions): Promise<CountChartResponse> {
    return this.chart('requests', opts, CountChartResponseSchema);
  }

  /**
   * Latency in milliseconds. Percentiles are returned per-bucket and for the period.
   * @param opts - Workspace slug and time window.
   * @returns Latency series with p50/p90/p99; `data.total` is the period mean, not a sum.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const l = await gw.telemetry.latency({ workspaceSlug: 'ws-main-a-349e0e' });
   * // l.data.p99 => 8329.14
   * ```
   */
  async latency(opts: AIGatewayWindowOptions): Promise<LatencyChartResponse> {
    return this.chart('latency', opts, LatencyChartResponseSchema);
  }

  /**
   * Token usage, split into request and response units.
   * @param opts - Workspace slug and time window.
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
  async tokens(opts: AIGatewayWindowOptions): Promise<TokensChartResponse> {
    return this.chart('tokens', opts, TokensChartResponseSchema);
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
   * Distribution of feedback scores. Feedback is binary: +5 (thumbs up) or -5 (thumbs down).
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
}
