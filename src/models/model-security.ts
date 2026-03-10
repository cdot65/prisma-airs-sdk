// src/models/model-security.ts — Zod schemas + types for AIRS Model Security API

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared / utility schemas
// ---------------------------------------------------------------------------

/** Zod schema for model security pagination metadata. */
export const ModelSecurityPaginationSchema = z
  .object({
    total_items: z.number().int().nullable().optional(),
  })
  .passthrough();

/** Pagination metadata for model security list responses. */
export type ModelSecurityPagination = z.infer<typeof ModelSecurityPaginationSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Labels
// ---------------------------------------------------------------------------

/** Zod schema for a single label key-value pair. */
export const LabelSchema = z
  .object({
    key: z.string(),
    value: z.string(),
  })
  .passthrough();

/** A single label key-value pair. */
export type Label = z.infer<typeof LabelSchema>;

/** Zod schema for creating/setting labels on a scan. */
export const LabelsCreateRequestSchema = z
  .object({
    labels: z.array(LabelSchema),
  })
  .passthrough();

/** Request body for creating or setting scan labels. */
export type LabelsCreateRequest = z.infer<typeof LabelsCreateRequestSchema>;

/** Zod schema for labels response (empty body on success). */
export const LabelsResponseSchema = z.object({}).passthrough();

/** Response from label create/set operations. */
export type LabelsResponse = z.infer<typeof LabelsResponseSchema>;

/** Zod schema for a paginated list of label keys. */
export const LabelKeyListSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    keys: z.array(z.string()),
  })
  .passthrough();

/** Paginated list of distinct label keys. */
export type LabelKeyList = z.infer<typeof LabelKeyListSchema>;

/** Zod schema for a paginated list of label values. */
export const LabelValueListSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    values: z.array(z.string()),
  })
  .passthrough();

/** Paginated list of distinct label values. */
export type LabelValueList = z.infer<typeof LabelValueListSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Eval summary
// ---------------------------------------------------------------------------

/** Zod schema for evaluation summary counts. */
export const EvalSummarySchema = z
  .object({
    rules_failed: z.number().int().optional().default(0),
    rules_passed: z.number().int().optional().default(0),
    total_rules: z.number().int().optional().default(0),
  })
  .passthrough();

/** Summary of rule evaluation pass/fail counts. */
export type EvalSummary = z.infer<typeof EvalSummarySchema>;

// ---------------------------------------------------------------------------
// DataPlane — Model scan issues & file scan data
// ---------------------------------------------------------------------------

/** Zod schema for a single issue detected during model scanning. */
export const ModelScanIssueSchema = z
  .object({
    description: z.string(),
    source: z.string(),
    threat: z.string().nullable().optional(),
    module: z.string().nullable().optional(),
    operator: z.string().nullable().optional(),
  })
  .passthrough();

/** A single issue detected during model file scanning. */
export type ModelScanIssue = z.infer<typeof ModelScanIssueSchema>;

/** Zod schema for per-file scan data within a scan request. */
export const FileScanDataSchema = z
  .object({
    file_path: z.string(),
    modelscan_status: z.string(),
    blob_id: z.string(),
    error_message: z.string().nullable().optional(),
    formats: z.array(z.string()).nullable().optional(),
    issues_detected: z.array(ModelScanIssueSchema).nullable().optional(),
  })
  .passthrough();

/** Per-file scan data included in a scan creation request. */
export type FileScanData = z.infer<typeof FileScanDataSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Scan details (nested in create request)
// ---------------------------------------------------------------------------

/** Zod schema for detailed scan results submitted with a scan creation. */
export const ScanDetailsSchema = z
  .object({
    scanner_version: z.string(),
    time_started: z.string(),
    files: z.array(FileScanDataSchema),
    total_files_scanned: z.number().int(),
    total_files_skipped: z.number().int(),
    model_formats: z.array(z.string()),
    model_size_bytes: z.number().int(),
    scan_duration_ms: z.number().int(),
    error_code: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
  })
  .passthrough();

/** Detailed scan results submitted with a scan creation request. */
export type ScanDetails = z.infer<typeof ScanDetailsSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Scan create request
// ---------------------------------------------------------------------------

/** Zod schema for creating a new model security scan. */
export const ScanCreateRequestSchema = z
  .object({
    model_uri: z.string(),
    security_group_uuid: z.string(),
    scan_origin: z.string(),
    allow_patterns: z.array(z.string()).nullable().optional(),
    ignore_patterns: z.array(z.string()).nullable().optional(),
    labels: z.array(LabelSchema).nullable().optional(),
    model_author: z.string().nullable().optional(),
    model_name: z.string().nullable().optional(),
    model_version: z.string().nullable().optional(),
    scan_details: ScanDetailsSchema.nullable().optional(),
  })
  .passthrough();

/** Request body for creating a new model security scan. */
export type ScanCreateRequest = z.infer<typeof ScanCreateRequestSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Scan base response
// ---------------------------------------------------------------------------

/** Zod schema for the base scan response returned by the API. */
export const ScanBaseResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    model_uri: z.string(),
    owner: z.string(),
    scan_origin: z.string(),
    security_group_uuid: z.string(),
    security_group_name: z.string(),
    model_version_uuid: z.string(),
    eval_outcome: z.string(),
    source_type: z.string(),
    created_by: z.string().nullable().optional(),
    enabled_rule_count_snapshot: z.number().int().nullable().optional(),
    error_code: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    eval_summary: EvalSummarySchema.nullable().optional(),
    labels: z.array(LabelSchema).optional(),
    model_formats: z.array(z.string()).nullable().optional(),
    scanner_version: z.string().nullable().optional(),
    time_started: z.string().nullable().optional(),
    total_files_scanned: z.number().int().nullable().optional(),
    total_files_skipped: z.number().int().nullable().optional(),
  })
  .passthrough();

/** Base scan response from the Model Security API. */
export type ScanBaseResponse = z.infer<typeof ScanBaseResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Scan list
// ---------------------------------------------------------------------------

/** Zod schema for a paginated list of scans. */
export const ScanListSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    scans: z.array(ScanBaseResponseSchema),
  })
  .passthrough();

/** Paginated list of model security scans. */
export type ScanList = z.infer<typeof ScanListSchema>;

// ---------------------------------------------------------------------------
// DataPlane — File response
// ---------------------------------------------------------------------------

/** Zod schema for a file entry in the scanned model tree. */
export const FileResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    path: z.string(),
    parent_path: z.string(),
    type: z.string(),
    result: z.string(),
    model_version_uuid: z.string(),
    blob_id: z.string().nullable().optional(),
    formats: z.array(z.string()).nullable().optional(),
    scan_uuid: z.string().nullable().optional(),
  })
  .passthrough();

/** A file entry in the scanned model tree. */
export type FileResponse = z.infer<typeof FileResponseSchema>;

/** Zod schema for a paginated list of files. */
export const FileListSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    files: z.array(FileResponseSchema),
  })
  .passthrough();

/** Paginated list of scanned model files. */
export type FileList = z.infer<typeof FileListSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Rule evaluation response
// ---------------------------------------------------------------------------

/** Zod schema for a single rule evaluation result. */
export const RuleEvaluationResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    result: z.string(),
    violation_count: z.number().int(),
    rule_instance_uuid: z.string(),
    scan_uuid: z.string(),
    rule_name: z.string(),
    rule_description: z.string(),
    rule_instance_state: z.string(),
  })
  .passthrough();

/** A single rule evaluation result for a scan. */
export type RuleEvaluationResponse = z.infer<typeof RuleEvaluationResponseSchema>;

/** Zod schema for a paginated list of rule evaluations. */
export const RuleEvaluationListSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    evaluations: z.array(RuleEvaluationResponseSchema),
  })
  .passthrough();

/** Paginated list of rule evaluations. */
export type RuleEvaluationList = z.infer<typeof RuleEvaluationListSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Violation response
// ---------------------------------------------------------------------------

/** Zod schema for a single violation response. */
export const ViolationResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.string(),
    rule_instance_uuid: z.string(),
    rule_name: z.string(),
    rule_description: z.string(),
    rule_instance_state: z.string(),
    file: z.string().nullable().optional(),
    hash: z.string().nullable().optional(),
    module: z.string().nullable().optional(),
    operator: z.string().nullable().optional(),
    threat: z.string().nullable().optional(),
    threat_description: z.string().nullable().optional(),
  })
  .passthrough();

/** A single violation with detailed rule information. */
export type ViolationResponse = z.infer<typeof ViolationResponseSchema>;

/** Zod schema for a paginated list of violations. */
export const ViolationListSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    violations: z.array(ViolationResponseSchema),
  })
  .passthrough();

/** Paginated list of rule violations. */
export type ViolationList = z.infer<typeof ViolationListSchema>;

// ---------------------------------------------------------------------------
// Management — Rule editable field & remediation
// ---------------------------------------------------------------------------

/** Zod schema for a dropdown option on a rule editable field. */
export const RuleEditableFieldDropdownSchema = z
  .object({
    value: z.string(),
    label: z.string(),
  })
  .passthrough();

/** A dropdown option for a rule editable field. */
export type RuleEditableFieldDropdown = z.infer<typeof RuleEditableFieldDropdownSchema>;

/** Zod schema for a rule editable field definition. */
export const RuleEditableFieldSchema = z
  .object({
    attribute_name: z.string(),
    type: z.string(),
    display_name: z.string(),
    display_type: z.string(),
    description: z.string().nullable().optional(),
    dropdown_values: z.array(RuleEditableFieldDropdownSchema).nullable().optional(),
  })
  .passthrough();

/** A rule editable field definition for UI rendering. */
export type RuleEditableField = z.infer<typeof RuleEditableFieldSchema>;

/** Zod schema for rule remediation steps. */
export const RuleRemediationSchema = z
  .object({
    description: z.string(),
    steps: z.array(z.string()),
    url: z.string(),
  })
  .passthrough();

/** Remediation steps for a security rule. */
export type RuleRemediation = z.infer<typeof RuleRemediationSchema>;

// ---------------------------------------------------------------------------
// Management — Rule configuration (used in group creation)
// ---------------------------------------------------------------------------

/** Zod schema for rule configuration during security group creation. */
export const RuleConfigurationSchema = z
  .object({
    field_values: z.record(z.unknown()).optional(),
    state: z.string().nullable().optional(),
  })
  .passthrough();

/** Configuration for customizing a rule during security group creation. */
export type RuleConfiguration = z.infer<typeof RuleConfigurationSchema>;

// ---------------------------------------------------------------------------
// Management — Model security rule response
// ---------------------------------------------------------------------------

/** Zod schema for a model security rule definition. */
export const ModelSecurityRuleResponseSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    description: z.string(),
    rule_type: z.string(),
    compatible_sources: z.array(z.string()),
    default_state: z.string(),
    remediation: RuleRemediationSchema,
    editable_fields: z.array(RuleEditableFieldSchema),
    constant_values: z.record(z.unknown()),
    default_values: z.record(z.unknown()),
  })
  .passthrough();

/** A model security rule definition. */
export type ModelSecurityRuleResponse = z.infer<typeof ModelSecurityRuleResponseSchema>;

/** Zod schema for a paginated list of security rules. */
export const ListModelSecurityRulesResponseSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    rules: z.array(ModelSecurityRuleResponseSchema),
  })
  .passthrough();

/** Paginated list of model security rules. */
export type ListModelSecurityRulesResponse = z.infer<typeof ListModelSecurityRulesResponseSchema>;

// ---------------------------------------------------------------------------
// Management — Rule instance
// ---------------------------------------------------------------------------

/** Zod schema for a model security rule instance response. */
export const ModelSecurityRuleInstanceResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    security_group_uuid: z.string(),
    security_rule_uuid: z.string(),
    state: z.string(),
    rule: ModelSecurityRuleResponseSchema,
    field_values: z.record(z.unknown()).optional(),
  })
  .passthrough();

/** An instantiated rule that gets evaluated against scans. */
export type ModelSecurityRuleInstanceResponse = z.infer<
  typeof ModelSecurityRuleInstanceResponseSchema
>;

/** Zod schema for updating a rule instance. */
export const ModelSecurityRuleInstanceUpdateRequestSchema = z
  .object({
    security_group_uuid: z.string(),
    state: z.string().nullable().optional(),
    field_values: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();

/** Request body for updating a rule instance. */
export type ModelSecurityRuleInstanceUpdateRequest = z.infer<
  typeof ModelSecurityRuleInstanceUpdateRequestSchema
>;

/** Zod schema for a paginated list of rule instances. */
export const ListModelSecurityRuleInstancesResponseSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    rule_instances: z.array(ModelSecurityRuleInstanceResponseSchema),
  })
  .passthrough();

/** Paginated list of model security rule instances. */
export type ListModelSecurityRuleInstancesResponse = z.infer<
  typeof ListModelSecurityRuleInstancesResponseSchema
>;

// ---------------------------------------------------------------------------
// Management — Security group
// ---------------------------------------------------------------------------

/** Zod schema for creating a model security group. */
export const ModelSecurityGroupCreateRequestSchema = z
  .object({
    name: z.string(),
    source_type: z.string(),
    description: z.string().optional().default(''),
    rule_configurations: z.record(RuleConfigurationSchema).optional(),
  })
  .passthrough();

/** Request body for creating a new model security group. */
export type ModelSecurityGroupCreateRequest = z.infer<typeof ModelSecurityGroupCreateRequestSchema>;

/** Zod schema for a model security group response. */
export const ModelSecurityGroupResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    name: z.string(),
    description: z.string(),
    source_type: z.string(),
    state: z.string(),
    is_tombstone: z.boolean(),
  })
  .passthrough();

/** A model security group with its configuration and state. */
export type ModelSecurityGroupResponse = z.infer<typeof ModelSecurityGroupResponseSchema>;

/** Zod schema for updating a model security group. */
export const ModelSecurityGroupUpdateRequestSchema = z
  .object({
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .passthrough();

/** Request body for updating a model security group. */
export type ModelSecurityGroupUpdateRequest = z.infer<typeof ModelSecurityGroupUpdateRequestSchema>;

/** Zod schema for a paginated list of security groups. */
export const ListModelSecurityGroupsResponseSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    security_groups: z.array(ModelSecurityGroupResponseSchema),
  })
  .passthrough();

/** Paginated list of model security groups. */
export type ListModelSecurityGroupsResponse = z.infer<typeof ListModelSecurityGroupsResponseSchema>;

// ---------------------------------------------------------------------------
// Management — PyPI auth
// ---------------------------------------------------------------------------

/** Zod schema for PyPI authentication response. */
export const PyPIAuthResponseSchema = z
  .object({
    url: z.string(),
    expires_at: z.string(),
  })
  .passthrough();

/** PyPI authentication response with Google Artifact Registry URL. */
export type PyPIAuthResponse = z.infer<typeof PyPIAuthResponseSchema>;
