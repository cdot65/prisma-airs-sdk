import { z } from 'zod';
import {
  MGMT_DASHBOARD_APPLICATION_PATH,
  MGMT_DASHBOARD_APPLICATIONS_OVERVIEW_PATH,
  MGMT_DASHBOARD_APPLICATION_VIOLATION_BREAKDOWN_PATH,
  MGMT_DASHBOARD_TOP_APPLICATIONS_VIOLATIONS_PATH,
  MGMT_DASHBOARD_APPLICATIONS_VIOLATIONS_TREND_PATH,
  MGMT_DASHBOARD_APPS_LIST_PATH,
  MGMT_DASHBOARD_SESSIONS_CHART_PATH,
  MGMT_DASHBOARD_SESSIONS_OVERVIEW_PATH,
  MGMT_DASHBOARD_SESSION_PATH,
  MGMT_DASHBOARD_SESSION_TRANSACTION_PATH,
  MGMT_REPORT_SCAN_CONTENT_PATH,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  DashboardApplicationSchema,
  DashboardApplicationsOverviewSchema,
  DashboardApplicationViolationBreakdownSchema,
  DashboardTopApplicationsViolationsSchema,
  DashboardApplicationsViolationsTrendSchema,
  type DashboardApplication,
  type DashboardApplicationsOverview,
  type DashboardApplicationViolationBreakdown,
  type DashboardTopApplicationsViolations,
  type DashboardApplicationsViolationsTrend,
} from '../models/mgmt-dashboard.js';
import {
  DashboardAppsListSchema,
  type DashboardAppsList,
  DashboardSessionsChartSchema,
  type DashboardSessionsChart,
  DashboardSessionsOverviewSchema,
  type DashboardSessionsOverview,
  DashboardSessionSchema,
  type DashboardSession,
  DashboardSessionTransactionSchema,
  type DashboardSessionTransaction,
  DashboardScanContentSchema,
  type DashboardScanContent,
} from '../models/mgmt-dashboard-sessions.js';

/** @internal */
export interface DashboardClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
  /** Tenant routing header for SCM dashboard hosts. */
  tsgId?: string;
}

/**
 * Query parameters shared by both dashboard application endpoints.
 *
 * Both `appId` and a non-empty `appName` are required by the API. Sending an empty `appname`
 * returns HTTP 400; omitting the parameter entirely (different code path) returns an all-null
 * body. The SDK signature requires a non-empty `appName` to keep both failure modes off the
 * happy path.
 */
export interface DashboardAppQuery {
  /**
   * Customer application UUID. Source it from `CustomerAppsClient.list()`'s
   * `customer_appId` field.
   */
  appId: string;
  /**
   * Application display name as the dashboard tracks it - the literal `metadata.app_name`
   * value scan payloads sent. This may differ from the `customer_apps.app_name` field when
   * the integration overrides it (LiteLLM's `panw_prisma_airs` guardrail does this by default,
   * for example). Required, non-empty. URL encoding is handled internally.
   *
   * To enumerate all valid `(appId, appName)` pairs the dashboard tracks, use
   * {@link DashboardClient.applicationsOverview} - one item per dashboard bucket.
   */
  appName: string;
  /**
   * Look-back window length, in days. Defaults to 30 (matches the SCM UI's "30 days" claim).
   * The API accepts an enum-like set rather than an arbitrary integer; values verified
   * accepted on 2026-05-28 are `7`, `30`, and `60`. Other values (1, 3, 14, 21, 28, 90) all
   * returned HTTP 400. Widen this union if the API later accepts more.
   */
  timeInterval?: 7 | 30 | 60;
  /**
   * Look-back window unit. Only `'days'` is supported by the API as of verification
   * (2026-05-28); `'hours'` / `'minutes'` return HTTP 400.
   */
  timeUnit?: 'days';
}

/**
 * Query parameters for {@link DashboardClient.applicationsOverview}.
 *
 * Distinct from {@link DashboardAppQuery} - this endpoint takes no `appId`/`appName` (it is the
 * enumeration source for those) and accepts a wider set of time windows.
 */
export interface DashboardApplicationsOverviewQuery {
  /**
   * Look-back window length. Accepted values vary by `timeUnit`:
   * - `timeUnit: 'days'` accepts `7`, `30`, or `60`.
   * - `timeUnit: 'day'` accepts `1`.
   * - `timeUnit: 'hour'` accepts `1`.
   *
   * Defaults to `30`. Other combinations return HTTP 400.
   */
  timeInterval?: 1 | 7 | 30 | 60;
  /**
   * Look-back window unit. The dashboard apps-overview endpoint accepts `'days'`, `'day'`,
   * and `'hour'` (note the singular forms - unlike the per-app `application` endpoint, which
   * only accepts `'days'`). Defaults to `'days'`.
   */
  timeUnit?: 'days' | 'day' | 'hour';
  /** Maximum items to return. Defaults to 25 (matches the SCM UI). */
  limit?: number;
  /** Number of items to skip (offset-based pagination). Defaults to 0. */
  offset?: number;
}

/** Time window for undocumented dashboard rankings and trends. */
export interface DashboardTimeRangeQuery {
  /** Positive integer look-back length. Defaults to 1; verified with `timeUnit: 'day'`. */
  timeInterval?: number;
  /** Non-empty API time unit. Defaults to 'day'; other windows are server-dependent. */
  timeUnit?: string;
}

/** Paginated session inventory. Defaults to one day, offset 0, limit 25. */
export interface DashboardSessionsOverviewQuery extends DashboardTimeRangeQuery {
  /** Positive page size; default 25. */
  limit?: number;
  /** Nonnegative item offset; default 0. */
  offset?: number;
}
/** Session detail identity and action pagination. Defaults to 30 days. */
export interface DashboardSessionQuery extends DashboardSessionsOverviewQuery {
  sessionId: string;
  appId: string;
  appName: string;
}
/** Transaction identity. Sub-request zero is valid and must be sent. Defaults to 30 days. */
export interface DashboardSessionTransactionQuery extends Omit<
  DashboardSessionQuery,
  'limit' | 'offset'
> {
  scanId: string;
  scanSubReqId: number;
}
/** Exact scan content identity; no guessed date window or application filters. */
export interface DashboardScanContentQuery {
  scanId: string;
  scanSubReqId: number;
}

const nonBlank = z.string().refine((value) => value.trim().length > 0);
const appQuerySchema = z
  .object({
    appId: nonBlank,
    appName: nonBlank,
    timeInterval: z.union([z.literal(7), z.literal(30), z.literal(60)]).default(30),
    timeUnit: z.literal('days').default('days'),
  })
  .strict();
const timeRangeSchema = z
  .object({
    timeInterval: z.number().int().positive().safe().default(1),
    timeUnit: nonBlank.default('day'),
  })
  .strict();
const pageShape = {
  limit: z.number().int().positive().safe().default(25),
  offset: z.number().int().nonnegative().safe().default(0),
};
const sessionsOverviewQuerySchema = timeRangeSchema.extend(pageShape);
const sessionIdentityShape = { sessionId: nonBlank, appId: nonBlank, appName: nonBlank };
const sessionWindowSchema = timeRangeSchema.extend({
  timeInterval: z.number().int().positive().safe().default(30),
  timeUnit: nonBlank.default('days'),
});
const sessionQuerySchema = sessionWindowSchema.extend({ ...sessionIdentityShape, ...pageShape });
const scanContentQuerySchema = z
  .object({ scanId: nonBlank, scanSubReqId: z.number().int().nonnegative().safe() })
  .strict();
const sessionTransactionQuerySchema = sessionWindowSchema.extend({
  ...sessionIdentityShape,
  ...scanContentQuerySchema.shape,
});

function parseQuery<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    // Never echo rejected values: app names and identifiers may be confidential.
    throw new AISecSDKException(
      'Invalid dashboard query parameters',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
  return result.data;
}

/**
 * Client for AIRS SCM dashboard endpoints that power the
 * "AI Security > Runtime > API Applications" panel.
 *
 * The dashboard buckets traffic by the **literal `metadata.app_name` value scan payloads
 * actually sent**. A single registered customer-app (`customer_apps.customer_appId`) can therefore
 * map to multiple dashboard buckets, one per distinct scan-payload name. Use
 * {@link applicationsOverview} to enumerate all dashboard buckets, then {@link application} and
 * {@link applicationViolationBreakdown} to drill into any specific `(id, name)` pair.
 *
 * @example
 * ```ts
 * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
 * const mgmt = new ManagementClient();
 *
 * const apps = await mgmt.customerApps.list();
 * const first = apps.customer_apps?.[0];
 * if (!first?.customer_appId) return;
 *
 * const overview = await mgmt.dashboard.application({
 *   appId: first.customer_appId,
 *   appName: first.app_name,
 * });
 * // overview.token_stats?.monthly_total_tokens + scale ("K" | "M") = current month consumption
 *
 * const violations = await mgmt.dashboard.applicationViolationBreakdown({
 *   appId: first.customer_appId,
 *   appName: first.app_name,
 * });
 * // violations.detection_type_violation_breakdown -> per-detector severity counts
 * ```
 */
export class DashboardClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;
  private readonly headers: Record<string, string>;

  constructor(opts: DashboardClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
    this.headers = opts.tsgId ? { 'x-tsg-id': opts.tsgId } : {};
  }

  /**
   * Get per-application token consumption and session activity over the requested window.
   *
   * @param query - App identity and time window. `appId` and `appName` are both required.
   * @returns The application overview with `token_stats`, `session_stats`, attached profiles,
   *   and monitoring metadata.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const overview = await mgmt.dashboard.application({
   *   appId: 'd8dc4033-593b-45e7-9633-e0dfc130cc82',
   *   appName: 'chatbot',
   * });
   * // overview =>
   * // { name: 'chatbot', cloud: 'other', source: 'api',
   * //   token_stats: { average_daily_tokens: 744.233, average_daily_tokens_scale: 'K',
   * //                  monthly_total_tokens: 17.71, monthly_total_tokens_scale: 'M' },
   * //   session_stats: { total: 56935, violating: 31136, ... },
   * //   profiles: ['ms-tuned', 'golden-v2'] }
   * ```
   */
  async application(query: DashboardAppQuery): Promise<DashboardApplication> {
    return request({
      ...this.applicationRequest(MGMT_DASHBOARD_APPLICATION_PATH, query),
      responseSchema: DashboardApplicationSchema,
    });
  }

  /**
   * Inspect per-application JSON without a response model. Empty body becomes `undefined`;
   * debug bodies are suppressed. Query validation and OAuth still apply.
   * @example `const raw = await mgmt.dashboard.applicationRaw({ appId: 'app-id', appName: 'chatbot', timeInterval: 30 });`
   */
  async applicationRaw(query: DashboardAppQuery): Promise<unknown> {
    return request({
      ...this.applicationRequest(MGMT_DASHBOARD_APPLICATION_PATH, query),
      responseSchema: z.unknown(),
      allowEmptyBody: true,
      omitDebugBody: true,
    });
  }

  /**
   * Get per-detector violation severity counts for the application over the requested window.
   *
   * @param query - App identity and time window. `appId` and `appName` are both required.
   * @returns The detection-type breakdown (one entry per detector observed live:
   *   `agent_security`, `contextual_grounding`, `dbs` (database security), `dlp`,
   *   `malicious_code`, `pi` (prompt injection), `source_code`, `tc` (toxic content),
   *   `topic_guardrails`, `uf` (URL filtering)) plus `total_violating`. Detector set may
   *   evolve; `.passthrough()` schemas accept additions.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const breakdown = await mgmt.dashboard.applicationViolationBreakdown({
   *   appId: 'd8dc4033-593b-45e7-9633-e0dfc130cc82',
   *   appName: 'chatbot',
   * });
   * // breakdown =>
   * // { detection_type_violation_breakdown: [
   * //     { detection_type: 'topic_guardrails',
   * //       violation_breakdown: { critical: 0, high: 0, medium: 3, low: 0, total: 3 } },
   * //     { detection_type: 'dlp',
   * //       violation_breakdown: { critical: 0, high: 0, medium: 0, low: 0, total: 0 } },
   * //     ... ],
   * //   total_violating: 3 }
   * ```
   */
  async applicationViolationBreakdown(
    query: DashboardAppQuery,
  ): Promise<DashboardApplicationViolationBreakdown> {
    return request({
      ...this.applicationRequest(MGMT_DASHBOARD_APPLICATION_VIOLATION_BREAKDOWN_PATH, query),
      responseSchema: DashboardApplicationViolationBreakdownSchema,
    });
  }

  /**
   * Inspect per-detector breakdown JSON without imposing a response model.
   * Empty body becomes `undefined`; debug bodies are suppressed.
   * @example `const raw = await mgmt.dashboard.applicationViolationBreakdownRaw({ appId: 'app-id', appName: 'chatbot' });`
   */
  async applicationViolationBreakdownRaw(query: DashboardAppQuery): Promise<unknown> {
    return request({
      ...this.applicationRequest(MGMT_DASHBOARD_APPLICATION_VIOLATION_BREAKDOWN_PATH, query),
      responseSchema: z.unknown(),
      allowEmptyBody: true,
      omitDebugBody: true,
    });
  }

  /**
   * Inspect top-application policy-violation JSON. Defaults to the verified one-day window.
   * Empty body becomes `undefined`; debug bodies are suppressed.
   * @example `const raw = await mgmt.dashboard.topApplicationsViolationsRaw({ timeInterval: 1, timeUnit: 'day' });`
   */
  async topApplicationsViolationsRaw(query?: DashboardTimeRangeQuery): Promise<unknown> {
    return request({
      ...this.timeRangeRequest(MGMT_DASHBOARD_TOP_APPLICATIONS_VIOLATIONS_PATH, query),
      responseSchema: z.unknown(),
      allowEmptyBody: true,
      omitDebugBody: true,
    });
  }

  /**
   * Retrieve the server's top applications by detector-policy violations.
   * Defaults to one day; rankings are not a complete inventory or distinct-session counts.
   * @example `const top = await mgmt.dashboard.topApplicationsViolations({ timeInterval: 1, timeUnit: 'day' });`
   */
  async topApplicationsViolations(
    query?: DashboardTimeRangeQuery,
  ): Promise<DashboardTopApplicationsViolations> {
    return request({
      ...this.timeRangeRequest(MGMT_DASHBOARD_TOP_APPLICATIONS_VIOLATIONS_PATH, query),
      responseSchema: DashboardTopApplicationsViolationsSchema,
    });
  }

  /**
   * Inspect aggregate violation-trend JSON. Defaults to the verified one-day window.
   * Empty body becomes `undefined`; debug bodies are suppressed.
   * @example `const raw = await mgmt.dashboard.applicationsViolationsTrendRaw({ timeInterval: 1, timeUnit: 'day' });`
   */
  async applicationsViolationsTrendRaw(query?: DashboardTimeRangeQuery): Promise<unknown> {
    return request({
      ...this.timeRangeRequest(MGMT_DASHBOARD_APPLICATIONS_VIOLATIONS_TREND_PATH, query),
      responseSchema: z.unknown(),
      allowEmptyBody: true,
      omitDebugBody: true,
    });
  }

  /**
   * Retrieve aggregate severity counts over time, preserving server bucket order and timestamps.
   * Defaults to one day. These counters need not equal distinct violating-session counts.
   * @example `const trend = await mgmt.dashboard.applicationsViolationsTrend({ timeInterval: 1, timeUnit: 'day' });`
   */
  async applicationsViolationsTrend(
    query?: DashboardTimeRangeQuery,
  ): Promise<DashboardApplicationsViolationsTrend> {
    return request({
      ...this.timeRangeRequest(MGMT_DASHBOARD_APPLICATIONS_VIOLATIONS_TREND_PATH, query),
      responseSchema: DashboardApplicationsViolationsTrendSchema,
    });
  }

  /**
   * Unstructured dashboard application identities; defaults to 30 days. Names and IDs can repeat.
   * @example `const raw = await mgmt.dashboard.appsListRaw({ timeInterval: 30, timeUnit: 'days' });`
   */
  async appsListRaw(query?: DashboardTimeRangeQuery): Promise<unknown> {
    return this.rawRead(this.appsListRequest(query));
  }

  /**
   * Retrieve dashboard application identities. Defaults to 30 days; preserves duplicate names and IDs.
   * @example `const apps = await mgmt.dashboard.appsList({ timeInterval: 30, timeUnit: 'days' });`
   */
  async appsList(query?: DashboardTimeRangeQuery): Promise<DashboardAppsList> {
    return request({ ...this.appsListRequest(query), responseSchema: DashboardAppsListSchema });
  }

  /**
   * Unstructured session-count time series; defaults to one day.
   * @example `const raw = await mgmt.dashboard.sessionsChartRaw({ timeInterval: 1, timeUnit: 'day' });`
   */
  async sessionsChartRaw(query?: DashboardTimeRangeQuery): Promise<unknown> {
    return this.rawRead(this.timeRangeRequest(MGMT_DASHBOARD_SESSIONS_CHART_PATH, query));
  }

  /**
   * Retrieve aggregate session-count buckets. Defaults to one day; violation counts remain separate.
   * @example `const chart = await mgmt.dashboard.sessionsChart({ timeInterval: 1, timeUnit: 'day' });`
   */
  async sessionsChart(query?: DashboardTimeRangeQuery): Promise<DashboardSessionsChart> {
    return request({
      ...this.timeRangeRequest(MGMT_DASHBOARD_SESSIONS_CHART_PATH, query),
      responseSchema: DashboardSessionsChartSchema,
    });
  }

  /**
   * Unstructured paginated session inventory; defaults to one day, offset 0, limit 25.
   * @example `const raw = await mgmt.dashboard.sessionsOverviewRaw({ limit: 25, offset: 0 });`
   */
  async sessionsOverviewRaw(query?: DashboardSessionsOverviewQuery): Promise<unknown> {
    return this.rawRead(this.sessionsOverviewRequest(query));
  }

  /**
   * Retrieve one session-inventory page. Defaults to one day, offset 0, limit 25.
   * @example `const page = await mgmt.dashboard.sessionsOverview({ limit: 25, offset: 0 });`
   */
  async sessionsOverview(
    query?: DashboardSessionsOverviewQuery,
  ): Promise<DashboardSessionsOverview> {
    return request({
      ...this.sessionsOverviewRequest(query),
      responseSchema: DashboardSessionsOverviewSchema,
      omitDebugBody: true,
    });
  }

  /**
   * Unstructured session detail and actions. Defaults to 30 days. Bodies never enter SDK debug logs.
   * @example `const raw = await mgmt.dashboard.sessionRaw({ sessionId: 'session', appId: 'app', appName: 'demo' });`
   */
  async sessionRaw(query: DashboardSessionQuery): Promise<unknown> {
    return this.rawRead(this.sessionRequest(query));
  }

  /**
   * Retrieve a session and one page of its actions. Defaults to 30 days; content is not fetched.
   * @example `const detail = await mgmt.dashboard.session({ sessionId: 'session', appId: 'app', appName: 'demo', limit: 25, offset: 0 });`
   */
  async session(query: DashboardSessionQuery): Promise<DashboardSession> {
    return request({
      ...this.sessionRequest(query),
      responseSchema: DashboardSessionSchema,
      omitDebugBody: true,
    });
  }

  /**
   * Unstructured transaction detail. Bodies never enter SDK debug logs.
   * @example `const raw = await mgmt.dashboard.sessionTransactionRaw({ sessionId: 'session', appId: 'app', appName: 'demo', scanId: 'scan', scanSubReqId: 0 });`
   */
  async sessionTransactionRaw(query: DashboardSessionTransactionQuery): Promise<unknown> {
    return this.rawRead(this.sessionTransactionRequest(query));
  }

  /**
   * Retrieve transaction metadata, preserving null and literal sentinel values. Defaults to 30 days.
   * @example `const tx = await mgmt.dashboard.sessionTransaction({ sessionId: 'session', appId: 'app', appName: 'demo', scanId: 'scan', scanSubReqId: 0 });`
   */
  async sessionTransaction(
    query: DashboardSessionTransactionQuery,
  ): Promise<DashboardSessionTransaction> {
    return request({
      ...this.sessionTransactionRequest(query),
      responseSchema: DashboardSessionTransactionSchema,
      omitDebugBody: true,
    });
  }

  /**
   * Explicitly retrieve potentially sensitive scan content from the same dashboard host.
   * No automatic content retrieval is performed by session methods; bodies never enter SDK debug logs.
   * @example `const raw = await mgmt.dashboard.scanContentRaw({ scanId: 'scan', scanSubReqId: 0 });`
   */
  async scanContentRaw(query: DashboardScanContentQuery): Promise<unknown> {
    return this.rawRead(this.scanContentRequest(query));
  }

  /**
   * Explicitly retrieve scan content from `/v1/mgmt/reports/scancontent` on the configured dashboard host.
   * This may expose prompts/responses; SDK debug bodies are always suppressed. Never fetched automatically.
   * @example `const report = await mgmt.dashboard.scanContent({ scanId: 'scan', scanSubReqId: 0 }); // protect report.scan_contents`
   */
  async scanContent(query: DashboardScanContentQuery): Promise<DashboardScanContent> {
    return request({
      ...this.scanContentRequest(query),
      responseSchema: DashboardScanContentSchema,
      omitDebugBody: true,
    });
  }

  private rawRead(spec: ReturnType<DashboardClient['getRequest']>): Promise<unknown> {
    return request({
      ...spec,
      responseSchema: z.unknown(),
      allowEmptyBody: true,
      omitDebugBody: true,
    });
  }

  private appsListRequest(query?: DashboardTimeRangeQuery) {
    const parsed = parseQuery(sessionWindowSchema, query ?? {});
    return this.getRequest(MGMT_DASHBOARD_APPS_LIST_PATH, {
      time_interval: String(parsed.timeInterval),
      time_unit: parsed.timeUnit,
    });
  }

  private sessionsOverviewRequest(query?: DashboardSessionsOverviewQuery) {
    const parsed = parseQuery(sessionsOverviewQuerySchema, query ?? {});
    return this.getRequest(MGMT_DASHBOARD_SESSIONS_OVERVIEW_PATH, {
      time_interval: String(parsed.timeInterval),
      time_unit: parsed.timeUnit,
      limit: String(parsed.limit),
      offset: String(parsed.offset),
    });
  }

  private sessionRequest(query: DashboardSessionQuery) {
    const p = parseQuery(sessionQuerySchema, query);
    return this.getRequest(MGMT_DASHBOARD_SESSION_PATH, {
      session_id: p.sessionId,
      app_id: p.appId,
      app_name: p.appName,
      offset: String(p.offset),
      limit: String(p.limit),
      time_interval: String(p.timeInterval),
      time_unit: p.timeUnit,
    });
  }

  private sessionTransactionRequest(query: DashboardSessionTransactionQuery) {
    const p = parseQuery(sessionTransactionQuerySchema, query);
    return this.getRequest(MGMT_DASHBOARD_SESSION_TRANSACTION_PATH, {
      session_id: p.sessionId,
      app_id: p.appId,
      app_name: p.appName,
      scan_id: p.scanId,
      scan_sub_req_id: String(p.scanSubReqId),
      time_interval: String(p.timeInterval),
      time_unit: p.timeUnit,
    });
  }

  private scanContentRequest(query: DashboardScanContentQuery) {
    const p = parseQuery(scanContentQuerySchema, query);
    return this.getRequest(MGMT_REPORT_SCAN_CONTENT_PATH, {
      scan_id: p.scanId,
      scan_sub_req_id: String(p.scanSubReqId),
    });
  }

  private getRequest(path: string, params: Record<string, string>) {
    return {
      method: 'GET' as const,
      baseUrl: this.baseUrl,
      path,
      params,
      headers: this.headers,
      auth: this.auth,
      numRetries: this.numRetries,
    };
  }

  private applicationRequest(path: string, query: DashboardAppQuery) {
    const parsed = parseQuery(appQuerySchema, query);
    return this.getRequest(path, {
      appid: parsed.appId,
      appname: parsed.appName,
      time_interval: String(parsed.timeInterval),
      time_unit: parsed.timeUnit,
    });
  }

  private timeRangeRequest(path: string, query?: DashboardTimeRangeQuery) {
    const parsed = parseQuery(timeRangeSchema, query ?? {});
    return this.getRequest(path, {
      time_interval: String(parsed.timeInterval),
      time_unit: parsed.timeUnit,
    });
  }

  /**
   * Enumerate all dashboard application buckets the tenant has data for.
   *
   * This is the canonical apps-list source for the dashboard. The customer-apps endpoint
   * (`mgmt.customerApps.list`) lists registered customer applications, but each registered
   * customer-app can have **multiple dashboard buckets** when its API key is used to send scan
   * requests carrying different `metadata.app_name` values - one bucket per distinct
   * scan-payload name. This endpoint returns every bucket, so it is what you want for
   * per-app token-consumption reporting and dashboard inventory.
   *
   * The `id` field on each item is the registered `customer_appId` UUID; the `name` field is
   * the scan-payload value. Pass that `(id, name)` pair to {@link application} or
   * {@link applicationViolationBreakdown} to retrieve drill-down data for a specific bucket.
   *
   * @param query - Time window and pagination.
   * @returns Paginated bucket list plus pagination metadata.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const { items } = await mgmt.dashboard.applicationsOverview();
   * for (const item of items ?? []) {
   *   const overview = await mgmt.dashboard.application({
   *     appId: item.id ?? '',
   *     appName: item.name ?? '',
   *   });
   *   console.log(item.name, overview.token_stats?.monthly_total_tokens);
   * }
   * ```
   */
  async applicationsOverview(
    query?: DashboardApplicationsOverviewQuery,
  ): Promise<DashboardApplicationsOverview> {
    return request({
      ...this.applicationsOverviewRequest(query),
      responseSchema: DashboardApplicationsOverviewSchema,
    });
  }

  /**
   * Retrieve unstructured JSON for an undocumented dashboard deployment.
   * Uses the same OAuth, tenant routing, query, and retry workflow as the typed method.
   * No response fields are validated or discarded. An empty HTTP body returns `undefined`,
   * not an invented empty result. Prefer {@link applicationsOverview} for normal consumers.
   * @example
   * ```ts
   * const mgmt = new ManagementClient({
   *   dashboardEndpoint: 'https://api.apps.paloaltonetworks.com/aisec',
   * });
   * const raw: unknown = await mgmt.dashboard.applicationsOverviewRaw({
   *   timeInterval: 1, timeUnit: 'day', limit: 25, offset: 0,
   * });
   * ```
   */
  async applicationsOverviewRaw(query?: DashboardApplicationsOverviewQuery): Promise<unknown> {
    return request({
      ...this.applicationsOverviewRequest(query),
      responseSchema: z.unknown(),
      allowEmptyBody: true,
      omitDebugBody: true,
    });
  }

  private applicationsOverviewRequest(query?: DashboardApplicationsOverviewQuery) {
    return {
      method: 'GET' as const,
      baseUrl: this.baseUrl,
      path: MGMT_DASHBOARD_APPLICATIONS_OVERVIEW_PATH,
      headers: this.headers,
      params: {
        time_interval: String(query?.timeInterval ?? 30),
        time_unit: query?.timeUnit ?? 'days',
        limit: String(query?.limit ?? 25),
        offset: String(query?.offset ?? 0),
      },
      auth: this.auth,
      numRetries: this.numRetries,
    };
  }
}
