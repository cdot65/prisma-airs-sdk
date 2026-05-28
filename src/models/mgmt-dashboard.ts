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
 * History window is 30 days (the API's max). `appname` is REQUIRED on the request; omitting it
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
    profiles: z.array(z.string()).nullable().optional(),
    token_stats: TokenStatsSchema.nullable().optional(),
    session_stats: DashboardSessionStatsSchema.nullable().optional(),
  })
  .passthrough();

/** Per-application dashboard overview response. */
export type DashboardApplication = z.infer<typeof DashboardApplicationSchema>;

/**
 * One entry in `detection_type_violation_breakdown[]` - severity counts for a single detector.
 *
 * `detection_type` values observed live: `agent_security`, `dlp`, `malicious_code`, `pi`
 * (prompt injection), `tc` (toxic content), `topic_guardrails`, `uf` (URL filtering).
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
    detection_type_violation_breakdown: z.array(DetectorViolationBreakdownEntrySchema).optional(),
    total_violating: z.number().optional(),
  })
  .passthrough();

/** Per-application detector violation breakdown. */
export type DashboardApplicationViolationBreakdown = z.infer<
  typeof DashboardApplicationViolationBreakdownSchema
>;
