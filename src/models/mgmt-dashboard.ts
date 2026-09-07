import { z } from 'zod';

/**
 * Token consumption stats for an application over the requested window.
 *
 * The API returns a numeric value paired with a scale qualifier ('K' for thousands, 'M' for
 * millions, etc.) - both are needed to reconstruct the SCM panel's display value.
 */
export const TokenStatsSchema = z
  .object({
    average_daily_tokens: z.number().nullable().optional(),
    average_daily_tokens_scale: z.string().nullable().optional(),
    monthly_total_tokens: z.number().nullable().optional(),
    monthly_total_tokens_scale: z.string().nullable().optional(),
  })
  .passthrough();

/** Per-application token consumption stats. */
export type TokenStats = z.infer<typeof TokenStatsSchema>;

/** Severity-bucketed counts used by both session stats and per-detector breakdowns. */
export const ViolationSeverityCountsSchema = z
  .object({
    critical: z.number().optional(),
    high: z.number().optional(),
    medium: z.number().optional(),
    low: z.number().optional(),
    total: z.number().optional(),
  })
  .passthrough();

/** Critical/high/medium/low/total severity counts. */
export type ViolationSeverityCounts = z.infer<typeof ViolationSeverityCountsSchema>;

/** Session-level activity stats for an application over the requested window. */
export const DashboardSessionStatsSchema = z
  .object({
    total: z.number().optional(),
    violating: z.number().optional(),
    violation_breakdown: ViolationSeverityCountsSchema.optional(),
    last_session_id: z.string().nullable().optional(),
    most_recent_session_time: z.string().nullable().optional(),
  })
  .passthrough();

/** Per-application session activity stats. */
export type DashboardSessionStats = z.infer<typeof DashboardSessionStatsSchema>;

/**
 * Per-application overview - powers SCM's "API Applications" detail panel (token consumption,
 * sessions, monitoring metadata, attached profiles).
 *
 * The requested history window defaults to 30 days. `appname` is REQUIRED on the request; omitting it
 * returns an all-null body.
 */
export const DashboardApplicationSchema = z
  .object({
    id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    cloud: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    has_webhook_sig: z.boolean().optional(),
    profiles: z.array(z.string()).nullable().optional(),
    token_stats: TokenStatsSchema.nullable(),
    session_stats: DashboardSessionStatsSchema.nullable(),
  })
  .passthrough();

/** Per-application dashboard overview response. */
export type DashboardApplication = z.infer<typeof DashboardApplicationSchema>;

/**
 * One entry in `detection_type_violation_breakdown[]` - severity counts for a single detector.
 *
 * `detection_type` values observed live (2026-05-28): `agent_security`, `contextual_grounding`,
 * `dbs` (database security), `dlp`, `malicious_code`, `pi` (prompt injection), `source_code`,
 * `tc` (toxic content), `topic_guardrails`, `uf` (URL filtering). Detector set may evolve;
 * the field uses a plain `z.string()` so additions parse without changes.
 */
export const DetectorViolationBreakdownEntrySchema = z
  .object({
    detection_type: z.string().optional(),
    violation_breakdown: ViolationSeverityCountsSchema.optional(),
  })
  .passthrough();

/** Per-detector violation severity counts entry. */
export type DetectorViolationBreakdownEntry = z.infer<typeof DetectorViolationBreakdownEntrySchema>;

/** Per-application violation breakdown response - detector by detector. */
export const DashboardApplicationViolationBreakdownSchema = z
  .object({
    detection_type_violation_breakdown: z.array(DetectorViolationBreakdownEntrySchema),
    total_violating: z.number().optional(),
  })
  .passthrough();

/** Per-application detector violation breakdown. */
export type DashboardApplicationViolationBreakdown = z.infer<
  typeof DashboardApplicationViolationBreakdownSchema
>;

/**
 * One time bucket of session activity inside an `applicationsoverview` item.
 *
 * The dashboard returns a series of buckets covering the requested window, useful for spark-line
 * style rendering. The exact shape varies by `time_unit`/`time_interval` combination; fields
 * use forward-compatible parsing. Observed buckets may have `total: 0` and nonzero `violated`;
 * do not assume their sums equal the item's `sessions_total` / `sessions_violated` counters.
 */
export const DashboardApplicationSessionsBucketSchema = z
  .object({
    bucket_number: z.number().optional(),
    date: z.string().nullable().optional(),
    total: z.number().optional(),
    violated: z.number().optional(),
  })
  .passthrough();

/** One session-activity bucket in a dashboard applications-overview item. */
export type DashboardApplicationSessionsBucket = z.infer<
  typeof DashboardApplicationSessionsBucketSchema
>;

/**
 * One application entry in the `applicationsoverview` response.
 *
 * The dashboard buckets traffic by **the literal `metadata.app_name` value scan payloads
 * actually sent**. A single registered customer-app can therefore appear here as multiple items,
 * one per distinct scan-payload name. The `id` field is the registered `customer_appId` UUID
 * (matches `customer_apps.customer_appId`); the `name` field is the scan-payload value (which
 * may differ from `customer_apps.app_name` when the integration overrides it).
 */
export const DashboardApplicationsOverviewItemSchema = z
  .object({
    id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    cloud: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    sessions: z.array(DashboardApplicationSessionsBucketSchema).nullable().optional(),
    sessions_total: z.number().nullable().optional(),
    sessions_violated: z.number().nullable().optional(),
  })
  .passthrough();

/** One application in the dashboard applications-overview response. */
export type DashboardApplicationsOverviewItem = z.infer<
  typeof DashboardApplicationsOverviewItemSchema
>;

/** Pagination metadata on the applications-overview response. */
export const DashboardPaginationSchema = z
  .object({
    limit: z.number().optional(),
    skip: z.number().optional(),
    total_items: z.number().optional(),
  })
  .passthrough();

/** Pagination metadata returned by the applications-overview endpoint. */
export type DashboardPagination = z.infer<typeof DashboardPaginationSchema>;

/**
 * Response from `dashboard/v2/apps/applicationsoverview`.
 *
 * Each item in `items[]` is one dashboard bucket (one per distinct scan-payload
 * `metadata.app_name` per registered customer-app). Use this to enumerate all buckets the
 * dashboard tracks, then call {@link DashboardClient.application} with each
 * `(item.id, item.name)` pair to retrieve `token_stats` for that bucket.
 */
export const DashboardApplicationsOverviewSchema = z
  .object({
    // A missing body/array is unavailable data, not a successful empty inventory.
    items: z.array(DashboardApplicationsOverviewItemSchema),
    pagination: DashboardPaginationSchema.optional(),
  })
  .passthrough();

/** Dashboard applications-overview response. */
export type DashboardApplicationsOverview = z.infer<typeof DashboardApplicationsOverviewSchema>;

/** One detector's policy-violation count, not a count of distinct violating sessions. */
export const DashboardPolicyViolationSchema = z
  .object({
    detection_type: z.string(),
    total: z.number().int().nonnegative(),
  })
  .passthrough();
/** One detector's policy-violation count. */
export type DashboardPolicyViolation = z.infer<typeof DashboardPolicyViolationSchema>;

/** One ranked application. Preserve server order and use (id, name) as the bucket identity. */
export const DashboardTopApplicationViolationsSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    policy_violations: z.array(DashboardPolicyViolationSchema),
    total_violations: z.number().int().nonnegative(),
  })
  .passthrough();
/** One application in the server's top-violations ranking. */
export type DashboardTopApplicationViolations = z.infer<
  typeof DashboardTopApplicationViolationsSchema
>;

/** Server-ranked applications; not a complete or paginated tenant inventory. */
export const DashboardTopApplicationsViolationsSchema = z
  .object({
    applications: z.array(DashboardTopApplicationViolationsSchema),
  })
  .passthrough();
/** Top-application violation ranking response. */
export type DashboardTopApplicationsViolations = z.infer<
  typeof DashboardTopApplicationsViolationsSchema
>;

/** One aggregate violation-trend bucket. Timestamp strings retain their original precision. */
export const DashboardViolationsTrendBucketSchema = z
  .object({
    bucket_number: z.number().int().nonnegative(),
    date: z.string(),
    violation_breakdown: ViolationSeverityCountsSchema,
  })
  .passthrough();
/** One aggregate severity bucket, not a distinct-session count. */
export type DashboardViolationsTrendBucket = z.infer<typeof DashboardViolationsTrendBucketSchema>;

/** Aggregate severity time series. Do not force totals to match session or ranked-app counts. */
export const DashboardApplicationsViolationsTrendSchema = z
  .object({
    violations: z.array(DashboardViolationsTrendBucketSchema),
  })
  .passthrough();
/** Aggregate application violation-trend response. */
export type DashboardApplicationsViolationsTrend = z.infer<
  typeof DashboardApplicationsViolationsTrendSchema
>;
