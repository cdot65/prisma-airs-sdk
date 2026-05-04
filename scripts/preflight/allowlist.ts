/**
 * @internal
 * Acknowledged divergences between the Zod schemas in `src/models/` and the OpenAPI specs in
 * `specs/`. Each entry documents a finding the pre-flight should *not* count as new drift.
 *
 * Add an entry only when:
 * - the divergence is intentional (Zod accurately models the API; the spec is incomplete or stale), AND
 * - leaving Zod as-is is the right answer (changing it would lose information about real responses).
 *
 * Removing or strictening Zod to match the spec is the *preferred* fix when both sides can match.
 * Use this allowlist for cases where the upstream OpenAPI does not match observed API behavior.
 */
import type { DriftFinding } from './diff-schemas.js';

export interface AllowlistEntry {
  /** Schema name as it appears in `DriftFinding.schemaName`. */
  schema: string;
  /**
   * Substring that must appear in `DriftFinding.path`. Use the most-specific path you can to avoid
   * accidentally allowlisting unrelated drift.
   */
  pathSubstring: string;
  /** Drift kind to match. Omit to match any kind. */
  kind?: DriftFinding['kind'];
  /** Why this divergence is acknowledged. Shown in pre-flight output for context. */
  reason: string;
}

export const PREFLIGHT_ALLOWLIST: AllowlistEntry[] = [
  // ── DataProtectionObject ─────────────────────────────────────────────────────
  {
    schema: 'DataProtectionObject',
    pathSubstring: 'database-security',
    kind: 'extra-field',
    reason:
      'API returns `database-security` on profiles even though it is not in the upstream OpenAPI.',
  },
  {
    schema: 'DataProtectionObject',
    pathSubstring: 'data-leak-detection.member',
    kind: 'missing-required-field',
    reason:
      'OpenAPI marks `member` required, but the API returns `null` for it on some profiles. ' +
      'Zod accepts null/missing to match observed behavior.',
  },
  {
    schema: 'AiSecurityProfileObject',
    pathSubstring: 'data-leak-detection.member',
    kind: 'missing-required-field',
    reason: 'See DataProtectionObject.data-leak-detection.member — same field, nested.',
  },

  // ── DetectionServiceResultObject + DSDetailResultObject ──────────────────────
  // The API returns richer detection-report objects than the upstream OpenAPI documents.
  // Tests in test/models/* exercise these fields against real response shapes.
  {
    schema: 'DSDetailResultObject',
    pathSubstring: 'dlp_report.dlp_report_id',
    kind: 'extra-field',
    reason: 'API returns `dlp_report_id`; not in upstream OpenAPI DlpReportObject.',
  },
  {
    schema: 'DSDetailResultObject',
    pathSubstring: 'dlp_report.data_pattern_detection_offsets',
    kind: 'extra-field',
    reason:
      'API returns `data_pattern_detection_offsets`; not in upstream OpenAPI DlpReportObject.',
  },
  {
    schema: 'DSDetailResultObject',
    pathSubstring: 'mc_report.all_code_blocks',
    kind: 'extra-field',
    reason: 'API returns `all_code_blocks`; not in upstream OpenAPI McReportObject.',
  },
  {
    schema: 'DSDetailResultObject',
    pathSubstring: 'mc_report.code_analysis_by_type',
    kind: 'extra-field',
    reason: 'API returns `code_analysis_by_type`; not in upstream OpenAPI McReportObject.',
  },
  {
    schema: 'DSDetailResultObject',
    pathSubstring: 'mc_report.malware_script_report',
    kind: 'extra-field',
    reason: 'API returns `malware_script_report`; not in upstream OpenAPI McReportObject.',
  },
  {
    schema: 'DSDetailResultObject',
    pathSubstring: 'mc_report.command_injection_report',
    kind: 'extra-field',
    reason: 'API returns `command_injection_report`; not in upstream OpenAPI McReportObject.',
  },
  {
    schema: 'DSDetailResultObject',
    pathSubstring: 'topic_guardrails_report',
    kind: 'extra-field',
    reason: 'API returns top-level `topic_guardrails_report`; not in upstream OpenAPI.',
  },
  {
    schema: 'DSDetailResultObject',
    pathSubstring: 'cg_report',
    kind: 'extra-field',
    reason: 'API returns top-level `cg_report` (context grounding); not in upstream OpenAPI.',
  },
  // Same fields surface again under DetectionServiceResultObject.result_detail
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'metadata',
    kind: 'extra-field',
    reason: 'API returns top-level `metadata` on detection results; not in upstream OpenAPI.',
  },
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'result_detail.dlp_report.dlp_report_id',
    kind: 'extra-field',
    reason: 'See DSDetailResultObject.dlp_report.dlp_report_id.',
  },
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'result_detail.dlp_report.data_pattern_detection_offsets',
    kind: 'extra-field',
    reason: 'See DSDetailResultObject.dlp_report.data_pattern_detection_offsets.',
  },
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'result_detail.mc_report.all_code_blocks',
    kind: 'extra-field',
    reason: 'See DSDetailResultObject.mc_report.all_code_blocks.',
  },
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'result_detail.mc_report.code_analysis_by_type',
    kind: 'extra-field',
    reason: 'See DSDetailResultObject.mc_report.code_analysis_by_type.',
  },
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'result_detail.mc_report.malware_script_report',
    kind: 'extra-field',
    reason: 'See DSDetailResultObject.mc_report.malware_script_report.',
  },
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'result_detail.mc_report.command_injection_report',
    kind: 'extra-field',
    reason: 'See DSDetailResultObject.mc_report.command_injection_report.',
  },
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'result_detail.topic_guardrails_report',
    kind: 'extra-field',
    reason: 'See DSDetailResultObject.topic_guardrails_report.',
  },
  {
    schema: 'DetectionServiceResultObject',
    pathSubstring: 'result_detail.cg_report',
    kind: 'extra-field',
    reason: 'See DSDetailResultObject.cg_report.',
  },

  // ── McReportObject and DlpReportObject (top-level) ───────────────────────────
  // The same `mc_report.*` and `dlp_report.*` fields surface directly on the
  // top-level Mc/Dlp report schemas. Tests in test/models/detection-reports.spec.ts
  // exercise these against real response shapes.
  {
    schema: 'McReportObject',
    pathSubstring: 'all_code_blocks',
    kind: 'extra-field',
    reason: 'API returns `all_code_blocks`; not in upstream OpenAPI McReportObject.',
  },
  {
    schema: 'McReportObject',
    pathSubstring: 'code_analysis_by_type',
    kind: 'extra-field',
    reason: 'API returns `code_analysis_by_type`; not in upstream OpenAPI McReportObject.',
  },
  {
    schema: 'McReportObject',
    pathSubstring: 'malware_script_report',
    kind: 'extra-field',
    reason: 'API returns `malware_script_report`; not in upstream OpenAPI McReportObject.',
  },
  {
    schema: 'McReportObject',
    pathSubstring: 'command_injection_report',
    kind: 'extra-field',
    reason: 'API returns `command_injection_report`; not in upstream OpenAPI McReportObject.',
  },
  {
    schema: 'DlpReportObject',
    pathSubstring: 'dlp_report_id',
    kind: 'extra-field',
    reason: 'API returns `dlp_report_id`; not in upstream OpenAPI DlpReportObject.',
  },
  {
    schema: 'DlpReportObject',
    pathSubstring: 'data_pattern_detection_offsets',
    kind: 'extra-field',
    reason:
      'API returns `data_pattern_detection_offsets`; not in upstream OpenAPI DlpReportObject.',
  },

  // ── DSResultMetadata ─────────────────────────────────────────────────────────
  {
    schema: 'DSResultMetadata',
    pathSubstring: 'score',
    kind: 'extra-field',
    reason: 'API returns `score`; not in upstream OpenAPI DSResultMetadata.',
  },
  {
    schema: 'DSResultMetadata',
    pathSubstring: 'confidence',
    kind: 'extra-field',
    reason: 'API returns `confidence`; not in upstream OpenAPI DSResultMetadata.',
  },

  // ── AiSecurityProfileObject extras ───────────────────────────────────────────
  // app-protection has fields the OpenAPI does not document. Tests in
  // test/models/mgmt-security-profile.spec.ts exercise these against real responses.
  {
    schema: 'AiSecurityProfileObject',
    pathSubstring: 'data-protection.database-security',
    kind: 'extra-field',
    reason: 'See DataProtectionObject.database-security.',
  },
  {
    schema: 'AiSecurityProfileObject',
    pathSubstring: 'app-protection.default-url-category',
    kind: 'extra-field',
    reason: 'API returns `default-url-category`; not in upstream OpenAPI AppProtectionObject.',
  },
  {
    schema: 'AiSecurityProfileObject',
    pathSubstring: 'app-protection.url-detected-action',
    kind: 'extra-field',
    reason: 'API returns `url-detected-action`; not in upstream OpenAPI AppProtectionObject.',
  },
  {
    schema: 'AiSecurityProfileObject',
    pathSubstring: 'app-protection.malicious-code-protection',
    kind: 'extra-field',
    reason: 'API returns `malicious-code-protection`; not in upstream OpenAPI AppProtectionObject.',
  },

  // ── ThreatScanReportObject extras ────────────────────────────────────────────
  // Tests use these; the API returns them on threat reports.
  {
    schema: 'ThreatScanReportObject',
    pathSubstring: 'source',
    kind: 'extra-field',
    reason: 'API returns `source` on threat reports; not in upstream OpenAPI.',
  },
  {
    schema: 'ThreatScanReportObject',
    pathSubstring: 'req_id',
    kind: 'extra-field',
    reason: 'API returns `req_id` on threat reports; not in upstream OpenAPI.',
  },
  {
    schema: 'ThreatScanReportObject',
    pathSubstring: 'session_id',
    kind: 'extra-field',
    reason: 'API returns `session_id` on threat reports; not in upstream OpenAPI.',
  },

  // ── UrlfEntryObject ──────────────────────────────────────────────────────────
  {
    schema: 'UrlfEntryObject',
    pathSubstring: 'action',
    kind: 'extra-field',
    reason: 'API returns `action` on URL filter entries; not in upstream OpenAPI.',
  },
];

/**
 * @internal
 * True when `finding` is acknowledged as expected drift via the allowlist.
 */
export function isAllowlisted(finding: DriftFinding): boolean {
  return PREFLIGHT_ALLOWLIST.some(
    (entry) =>
      entry.schema === finding.schemaName &&
      finding.path.includes(entry.pathSubstring) &&
      (entry.kind === undefined || entry.kind === finding.kind),
  );
}
