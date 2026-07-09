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

  // ── DLP Page<T> envelopes ────────────────────────────────────────────────────
  // The Spring `Page<>` envelope marks `content` optional in the OpenAPI spec, but in practice
  // every list response includes a (possibly empty) `content` array. Zod requires it so callers
  // can iterate without first probing for the field.
  {
    schema: 'PageDataFilteringProfileResponse',
    pathSubstring: '$',
    kind: 'extra-required-field',
    reason: 'pageSchema() requires `content`; API always returns it (possibly empty).',
  },
  {
    schema: 'PageDataPatternResponse',
    pathSubstring: '$',
    kind: 'extra-required-field',
    reason: 'pageSchema() requires `content`; API always returns it (possibly empty).',
  },
  {
    schema: 'PageDataProfileResponse',
    pathSubstring: '$',
    kind: 'extra-required-field',
    reason: 'pageSchema() requires `content`; API always returns it (possibly empty).',
  },
  {
    schema: 'PageDictionaryResponse',
    pathSubstring: '$',
    kind: 'extra-required-field',
    reason: 'pageSchema() requires `content`; API always returns it (possibly empty).',
  },

  // ── DLP JSON Merge Patch — jsonNullable() vs spec `nullable: true` ───────────
  // RFC 7396 Merge Patch needs the explicit-null distinction. The `jsonNullable()` helper
  // wraps each field in `nullable().optional()`, which zod-to-json-schema renders as a
  // `{ anyOf | type: object }` shape that doesn't equal the spec's bare nullable string/array.
  // The wire shape matches; only the JSON Schema rendering differs.
  {
    schema: 'DataPatternPatchRequest',
    pathSubstring: '$.name',
    kind: 'type-mismatch',
    reason: 'jsonNullable() renders differently from spec `nullable: true`; wire shape matches.',
  },
  {
    schema: 'DataPatternPatchRequest',
    pathSubstring: '$.type',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DataPatternPatchRequest',
    pathSubstring: '$.description',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DataPatternPatchRequest',
    pathSubstring: '$.detection_config',
    reason:
      'Patch reuses create-side DataPatternDetectionConfigSchema with `technique` required; ' +
      'spec leaves it optional. Sending `null` clears via RFC 7396 — required-ness only ' +
      'applies when the field is present.',
  },
  {
    schema: 'DataPatternPatchRequest',
    pathSubstring: '$.matching_rules',
    kind: 'extra-field',
    reason: 'Patch reuses create-side DataPatternMatchingRulesSchema; spec uses a slimmer shape.',
  },
  {
    schema: 'DataPatternPatchRequest',
    pathSubstring: '$.tags',
    kind: 'extra-field',
    reason: 'Patch reuses create-side DataPatternTagsSchema; spec uses a slimmer shape.',
  },
  {
    schema: 'DataProfilePatchRequest',
    pathSubstring: '$.name',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DataProfilePatchRequest',
    pathSubstring: '$.profile_type',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DataProfilePatchRequest',
    pathSubstring: '$.description',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DataProfilePatchRequest',
    pathSubstring: '$.detection_rules',
    kind: 'type-mismatch',
    reason: 'jsonNullable(array) rendering; wire shape matches.',
  },
  {
    schema: 'DictionaryPatchRequest',
    pathSubstring: '$.category',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DictionaryPatchRequest',
    pathSubstring: '$.name',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DictionaryPatchRequest',
    pathSubstring: '$.original_file_name',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DictionaryPatchRequest',
    pathSubstring: '$.description',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DictionaryPatchRequest',
    pathSubstring: '$.is_case_sensitive',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },
  {
    schema: 'DictionaryPatchRequest',
    pathSubstring: '$.region_name',
    kind: 'type-mismatch',
    reason: 'jsonNullable() rendering; wire shape matches.',
  },

  // ── DLP DetectionRule discriminated-union literals ───────────────────────────
  // The Zod `z.discriminatedUnion('rule_type', ...)` adds a required literal `rule_type` field
  // to each arm. The OpenAPI spec uses a sibling `discriminator` block without redeclaring
  // `rule_type` on the subtypes. The wire shape is identical; only the schema modeling differs.
  {
    schema: 'DefaultTreeDetectionRule',
    pathSubstring: '$',
    reason: 'Discriminator literal + branch field added in Zod for tagged-union narrowing.',
  },
  {
    schema: 'MultiProfileDetectionRule',
    pathSubstring: '$',
    reason: 'Discriminator literal + branch field added in Zod for tagged-union narrowing.',
  },

  // ── DLP DetectionRuleItem — combined-passthrough union ───────────────────────
  // The OpenAPI spec marks `detection_technique` as a discriminator across 4 subtypes
  // (DataPattern, Dictionary, DocumentType, EDM) but every subtype's enum lists all 13
  // technique values — there is no real partition. The Zod schema therefore unions all
  // subtype fields onto one passthrough object. Field-level discrimination is left to callers
  // who know which technique they configured.
  {
    schema: 'DetectionRuleItem',
    pathSubstring: '$',
    kind: 'extra-field',
    reason: 'Combined passthrough union of all 4 OpenAPI subtypes — see schema JSDoc.',
  },

  // ── z.unknown() fields the spec marks required ───────────────────────────────
  // These fields ARE modeled in Zod, but as `z.unknown()`, which zod-to-json-schema
  // cannot emit as `required`. The field is present and accepted; the divergence is a
  // modeling-expressiveness artifact, not a missing field. Surfaced once the preflight
  // resolver began matching `*Schema`-suffixed OpenAPI components (issue #192).
  {
    schema: 'JobResponseSchema',
    pathSubstring: 'job_metadata',
    kind: 'missing-required-field',
    reason: 'job_metadata is modeled as z.unknown() (arbitrary shape); cannot be marked required.',
  },
  {
    schema: 'TargetAuthValidationRequestSchema',
    pathSubstring: 'auth_config',
    kind: 'missing-required-field',
    reason:
      'auth_config is modeled as z.unknown() (union of auth shapes); cannot be marked required.',
  },
  {
    schema: 'TargetResponseSchema',
    pathSubstring: 'status',
    kind: 'missing-required-field',
    reason: 'status is modeled as z.unknown(); cannot be marked required.',
  },
  {
    schema: 'TargetListItemSchema',
    pathSubstring: 'status',
    kind: 'missing-required-field',
    reason: 'status is modeled as z.unknown(); cannot be marked required.',
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
