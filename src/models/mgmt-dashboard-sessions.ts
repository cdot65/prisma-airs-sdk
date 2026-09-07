import { z } from 'zod';
import {
  DashboardPaginationSchema,
  DetectorViolationBreakdownEntrySchema,
  ViolationSeverityCountsSchema,
} from './mgmt-dashboard.js';

const count = z.number().int().nonnegative();

/** One application identity from appslist; neither ID nor name alone is unique. */
export const DashboardAppListItemSchema = z
  .object({ application_id: z.string(), application_name: z.string() })
  .passthrough();
/** Application identity returned by appslist. */
export type DashboardAppListItem = z.infer<typeof DashboardAppListItemSchema>;
/** Dashboard application identities; no pagination contract has been observed for this route. */
export const DashboardAppsListSchema = z
  .object({ applications: z.array(DashboardAppListItemSchema) })
  .passthrough();
/** Application identities response. */
export type DashboardAppsList = z.infer<typeof DashboardAppsListSchema>;

/** One session-chart time bucket. Session counts and detector violations are distinct. */
export const DashboardSessionsChartBucketSchema = z
  .object({
    bucket_number: count,
    time: z.string(),
    total: count,
    violating: count,
    detection_type_violation_breakdown: z.array(DetectorViolationBreakdownEntrySchema),
    violation_breakdown: ViolationSeverityCountsSchema,
  })
  .passthrough();
/** One session-chart bucket. */
export type DashboardSessionsChartBucket = z.infer<typeof DashboardSessionsChartBucketSchema>;
/** Session-count time series, preserving timestamps and API bucket size. */
export const DashboardSessionsChartSchema = z
  .object({
    bucket_size_seconds: z.number().positive(),
    buckets: z.array(DashboardSessionsChartBucketSchema),
  })
  .passthrough();
/** Session chart response. */
export type DashboardSessionsChart = z.infer<typeof DashboardSessionsChartSchema>;

/** One session inventory entry; status and detector names are forward-compatible strings. */
export const DashboardSessionOverviewItemSchema = DashboardAppListItemSchema.extend({
  session_id: z.string(),
  last_session_activity: z.string().nullable().optional(),
  violation_status: z.string(),
  violation_breakdown: ViolationSeverityCountsSchema,
  detection_type_violation_breakdown: z.array(DetectorViolationBreakdownEntrySchema),
});
/** Session inventory entry. */
export type DashboardSessionOverviewItem = z.infer<typeof DashboardSessionOverviewItemSchema>;
/** Paginated session inventory; absent items are not silently converted to an empty list. */
export const DashboardSessionsOverviewSchema = z
  .object({
    items: z.array(DashboardSessionOverviewItemSchema),
    pagination: DashboardPaginationSchema,
  })
  .passthrough();
/** Session inventory response. */
export type DashboardSessionsOverview = z.infer<typeof DashboardSessionsOverviewSchema>;

/** One action inside a session, retaining nullable inspection and correlation metadata. */
export const DashboardSessionActionSchema = z
  .object({
    application_id: z.string(),
    application_name: z.string(),
    session_id: z.string(),
    scan_id: z.string(),
    scan_sub_req_id: count,
    transaction_id: z.string().optional(),
    status: z.string().optional(),
    start_time: z.string().optional(),
    profile_name: z.string().optional(),
    kind: z.array(z.string()).optional(),
    correlation_type: z.string().nullable().optional(),
    enable_full_conversation_inspection: z.boolean().nullable().optional(),
    detection_type_violation_breakdown: z.array(DetectorViolationBreakdownEntrySchema),
    violation_breakdown: ViolationSeverityCountsSchema,
  })
  .passthrough();
/** Session action identity and detector metadata. */
export type DashboardSessionAction = z.infer<typeof DashboardSessionActionSchema>;

/** Session detail and paginated actions. */
export const DashboardSessionSchema = z
  .object({
    application: z.object({ id: z.string(), name: z.string() }).passthrough(),
    id: z.string(),
    session_actions: z.array(DashboardSessionActionSchema),
    pagination: DashboardPaginationSchema,
    cloud: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    last_session_activity: z.string().nullable().optional(),
    violation_status: z.string().optional(),
  })
  .passthrough();
/** Session detail response. */
export type DashboardSession = z.infer<typeof DashboardSessionSchema>;

/** Potentially sensitive transaction attributes. Literal sentinel strings such as 'None' are preserved. */
export const DashboardTransactionAttributesSchema = z
  .object({
    environment: z.string().nullable().optional(),
    model_name: z.string().nullable().optional(),
    profile: z.string().nullable().optional(),
    text_records: count.optional(),
    user_id: z.string().nullable().optional(),
    user_ip: z.string().nullable().optional(),
  })
  .passthrough();
/** Transaction attribute metadata. */
export type DashboardTransactionAttributes = z.infer<typeof DashboardTransactionAttributesSchema>;
/** Transaction detail; returned only on explicit request and omitted from SDK debug bodies. */
export const DashboardSessionTransactionSchema = DashboardSessionActionSchema.extend({
  ai_traffic_latency_ms: z.number().nonnegative().optional(),
  attributes: DashboardTransactionAttributesSchema.optional(),
  end_time: z.string().nullable().optional(),
  timeout: z.boolean().optional(),
  tokens: count.optional(),
});
/** Session transaction response. */
export type DashboardSessionTransaction = z.infer<typeof DashboardSessionTransactionSchema>;

/** Potentially sensitive scan text. Missing/null text stays distinct from an empty string. */
export const DashboardScanContentsSchema = z
  .object({ prompt: z.string().nullable().optional(), response: z.string().nullable().optional() })
  .passthrough();
/** Scan text and forward-compatible content fields. */
export type DashboardScanContents = z.infer<typeof DashboardScanContentsSchema>;
/** Scan-content report. Response sub_scan_req_id deliberately differs from query scan_sub_req_id. */
export const DashboardScanContentSchema = z
  .object({
    report_id: z.string(),
    scan_id: z.string(),
    sub_scan_req_id: count,
    transaction_id: z.string(),
    scan_contents: DashboardScanContentsSchema.nullable(),
  })
  .passthrough();
/** Scan-content report response; callers must protect its contents. */
export type DashboardScanContent = z.infer<typeof DashboardScanContentSchema>;
