import { z } from 'zod';

const count = z.number().int().nonnegative().safe();
const pagination = z.object({ total_items: count }).passthrough();
const nullableText = z.string().nullable();

/** Observed AgentGuard scan response. Unknown fields and new status values are preserved. */
export const AgentGuardScanSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    name: z.string(),
    git_url: nullableText,
    artifact_type: z.string(),
    status: z.string(),
    error_message: nullableText,
    summary: z
      .object({ vulnerability_count: count, attack_chain_count: count })
      .passthrough()
      .nullable(),
    eval_outcome: nullableText,
    eval_summary: z
      .object({ total_rules: count, blocked: count, allowed: count })
      .passthrough()
      .nullable(),
    eval_details: z
      .object({
        rule_outcomes: z.array(
          z
            .object({
              rule_instance_uuid: z.string(),
              rule_name: z.string(),
              vulnerability_types: z.array(z.string()),
              state: z.string(),
              outcome: z.string(),
              description: z.string(),
              remediation: z.string(),
              vulnerability_count: count,
            })
            .passthrough(),
        ),
        skill_override_applied: z.boolean(),
        unknown_findings: z.array(z.unknown()),
      })
      .passthrough()
      .nullable(),
    duration_seconds: z.number().finite().nonnegative().nullable(),
    fingerprint: z.string(),
    scanner_version: nullableText,
    device_metadata: z.record(z.unknown()).nullable(),
    parent_uuid: nullableText,
    is_batch: z.boolean(),
    child_scan_uuids: z.array(z.string()),
    batch_summary: z.unknown(),
  })
  .passthrough();
/** Agent or skill scan; batch rows must not be summed with their children. */
export type AgentGuardScan = z.infer<typeof AgentGuardScanSchema>;
/** Paginated AgentGuard scans. */
export const AgentGuardScanListSchema = z
  .object({ pagination, scans: z.array(AgentGuardScanSchema) })
  .passthrough();
/** Paginated AgentGuard scans. */
export type AgentGuardScanList = z.infer<typeof AgentGuardScanListSchema>;

const metric = z.object({ count, percent_change: z.number().finite().nullable() }).passthrough();
/** Server-reported skill statistics; null percentage changes mean unavailable, not zero. */
export const AgentGuardScanStatsSchema = z
  .object({
    unique_skills_scanned: metric,
    total_vulnerabilities_found: metric,
    top_vulnerability: z
      .object({ vulnerability_type: z.string(), finding_count: count })
      .passthrough()
      .nullable(),
  })
  .passthrough();
/** Server-reported skill statistics. */
export type AgentGuardScanStats = z.infer<typeof AgentGuardScanStatsSchema>;

/** Vulnerability detail can contain sensitive source code and paths. */
export const AgentGuardVulnerabilitySchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    scan_uuid: z.string(),
    title: z.string(),
    description: z.string(),
    vulnerability_type: z.string(),
    file_path: z.string(),
    node_id: nullableText,
    node_type: nullableText,
    node_name: nullableText,
    remediation_description: nullableText,
    original_code: nullableText,
    suggested_code: nullableText,
    attack_chain_count: count,
    attack_chain_uuids: z.array(z.string()),
    type_description: z.string(),
  })
  .passthrough();
/** Vulnerability detail. Treat as sensitive. */
export type AgentGuardVulnerability = z.infer<typeof AgentGuardVulnerabilitySchema>;
/** Vulnerabilities returned for a scan. Pagination does not imply supported request filters. */
export const AgentGuardVulnerabilityListSchema = z
  .object({ pagination, vulnerabilities: z.array(AgentGuardVulnerabilitySchema) })
  .passthrough();
/** Scan vulnerability response. */
export type AgentGuardVulnerabilityList = z.infer<typeof AgentGuardVulnerabilityListSchema>;

/** Rule catalog entry. Default state is not proof of an effective tenant policy. */
export const AgentGuardRuleSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    vulnerability_types: z.array(z.string()),
    default_state: z.string(),
    description: z.string(),
    remediation: z.string(),
  })
  .passthrough();
/** Rule catalog entry. */
export type AgentGuardRule = z.infer<typeof AgentGuardRuleSchema>;
/** Paginated rule catalog. */
export const AgentGuardRuleListSchema = z
  .object({ pagination, rules: z.array(AgentGuardRuleSchema) })
  .passthrough();
/** Paginated rule catalog. */
export type AgentGuardRuleList = z.infer<typeof AgentGuardRuleListSchema>;

/** Strict pagination for the observed list endpoints. */
export const AgentGuardPageOptionsSchema = z
  .object({ skip: count.optional(), limit: count.positive().optional() })
  .strict();
/** List pagination. */
export type AgentGuardPageOptions = z.infer<typeof AgentGuardPageOptionsSchema>;
/** Strict scan query; browser refresh flags retain false rather than being dropped. */
export const AgentGuardScanListOptionsSchema = AgentGuardPageOptionsSchema.extend({
  isBackgroundRefresh: z.boolean().optional(),
  start_time: z.string().datetime({ offset: true }).optional(),
  end_time: z.string().datetime({ offset: true }).optional(),
}).refine(
  (v) => !v.start_time || !v.end_time || Date.parse(v.start_time) <= Date.parse(v.end_time),
  {
    message: 'start_time must not follow end_time',
    path: ['end_time'],
  },
);
/** Scan listing filters. */
export type AgentGuardScanListOptions = z.infer<typeof AgentGuardScanListOptionsSchema>;
/** Only the captured and live-verified 30-day period is currently supported. */
export const AgentGuardStatsOptionsSchema = z
  .object({ time_period: z.literal('30_DAYS').optional() })
  .strict();
/** Statistics query options. */
export type AgentGuardStatsOptions = z.infer<typeof AgentGuardStatsOptionsSchema>;
