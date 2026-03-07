// src/models/red-team.ts — Zod schemas + types for AIRS Red Teaming API

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared / utility schemas
// ---------------------------------------------------------------------------

export const RedTeamPaginationSchema = z
  .object({ total_items: z.number().int().nullable().optional() })
  .passthrough();
export type RedTeamPagination = z.infer<typeof RedTeamPaginationSchema>;

export const CountByNameSchema = z.object({ name: z.string(), count: z.number().int() });
export type CountByName = z.infer<typeof CountByNameSchema>;

export const ValidationErrorSchema = z.object({
  loc: z.array(z.union([z.string(), z.number()])),
  msg: z.string(),
  type: z.string(),
});
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

export const HTTPValidationErrorSchema = z
  .object({ detail: z.array(ValidationErrorSchema).optional() })
  .passthrough();
export type HTTPValidationError = z.infer<typeof HTTPValidationErrorSchema>;

// ---------------------------------------------------------------------------
// Target context schemas (shared between data plane & management)
// ---------------------------------------------------------------------------

export const TargetBackgroundSchema = z
  .object({
    industry: z.unknown().optional(),
    use_case: z.unknown().optional(),
    competitors: z.unknown().optional(),
  })
  .passthrough();
export type TargetBackground = z.infer<typeof TargetBackgroundSchema>;

export const TargetAdditionalContextSchema = z
  .object({
    base_model: z.unknown().optional(),
    core_architecture: z.unknown().optional(),
    system_prompt: z.unknown().optional(),
    languages_supported: z.unknown().optional(),
    banned_keywords: z.unknown().optional(),
    tools_accessible: z.unknown().optional(),
  })
  .passthrough();
export type TargetAdditionalContext = z.infer<typeof TargetAdditionalContextSchema>;

export const TargetMetadataSchema = z
  .object({
    multi_turn: z.boolean().optional(),
    multi_turn_error_message: z.unknown().optional(),
    rate_limit: z.unknown().optional(),
    rate_limit_enabled: z.boolean().optional(),
    rate_limit_error_code: z.unknown().optional(),
    rate_limit_error_json: z.unknown().optional(),
    rate_limit_error_message: z.unknown().optional(),
    content_filter_enabled: z.boolean().optional(),
    content_filter_error_code: z.unknown().optional(),
    content_filter_error_json: z.unknown().optional(),
    content_filter_error_message: z.unknown().optional(),
    probe_message: z.string().optional(),
    request_timeout: z.number().optional(),
  })
  .passthrough();
export type TargetMetadata = z.infer<typeof TargetMetadataSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Job / Scan schemas
// ---------------------------------------------------------------------------

export const TargetJobRequestSchema = z.object({
  uuid: z.string(),
  version: z.number().int().nullable().optional(),
});
export type TargetJobRequest = z.infer<typeof TargetJobRequestSchema>;

export const JobTimeRecordSchema = z
  .object({
    queued_at: z.string().nullable().optional(),
    started_at: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    time_taken: z.string().nullable().optional(),
  })
  .passthrough();
export type JobTimeRecord = z.infer<typeof JobTimeRecordSchema>;

export const StaticJobMetadataSchema = z
  .object({
    categories: z.record(z.unknown()),
    rate_limit_enabled: z.boolean().optional(),
    rate_limit: z.number().int().nullable().optional(),
    rate_limit_error_code: z.number().int().nullable().optional(),
    rate_limit_error_message: z.string().nullable().optional(),
    rate_limit_error_json: z.unknown().optional(),
    content_filter_enabled: z.boolean().optional(),
    content_filter_error_code: z.number().int().nullable().optional(),
    content_filter_error_message: z.string().nullable().optional(),
    content_filter_error_json: z.unknown().optional(),
  })
  .passthrough();
export type StaticJobMetadata = z.infer<typeof StaticJobMetadataSchema>;

export const DynamicJobMetadataSchema = z
  .object({
    rate_limit_enabled: z.boolean().optional(),
    rate_limit: z.number().int().nullable().optional(),
    rate_limit_error_code: z.number().int().nullable().optional(),
    rate_limit_error_message: z.string().nullable().optional(),
    rate_limit_error_json: z.unknown().optional(),
    content_filter_enabled: z.boolean().optional(),
    content_filter_error_code: z.number().int().nullable().optional(),
    content_filter_error_message: z.string().nullable().optional(),
    content_filter_error_json: z.unknown().optional(),
    stream_breadth: z.number().int().optional(),
    stream_depth: z.number().int().optional(),
    max_tokens: z.number().int().optional(),
    context_size: z.number().int().optional(),
    attack_goals: z.array(z.unknown()).optional(),
    base_model: z.string().nullable().optional(),
    use_case: z.string().nullable().optional(),
    system_prompt: z.string().nullable().optional(),
  })
  .passthrough();
export type DynamicJobMetadata = z.infer<typeof DynamicJobMetadataSchema>;

export const CustomJobMetadataSchema = z
  .object({
    custom_prompt_sets: z.array(z.unknown()),
    rate_limit_enabled: z.boolean().optional(),
    rate_limit: z.number().int().nullable().optional(),
    rate_limit_error_code: z.number().int().nullable().optional(),
    rate_limit_error_message: z.string().nullable().optional(),
    rate_limit_error_json: z.unknown().optional(),
    content_filter_enabled: z.boolean().optional(),
    content_filter_error_code: z.number().int().nullable().optional(),
    content_filter_error_message: z.string().nullable().optional(),
    content_filter_error_json: z.unknown().optional(),
  })
  .passthrough();
export type CustomJobMetadata = z.infer<typeof CustomJobMetadataSchema>;

export const JobCreateRequestSchema = z.object({
  name: z.string(),
  target: TargetJobRequestSchema,
  job_type: z.string(),
  job_metadata: z.union([
    StaticJobMetadataSchema,
    DynamicJobMetadataSchema,
    CustomJobMetadataSchema,
  ]),
  version: z.number().int().nullable().optional(),
  extra_info: z.record(z.unknown()).nullable().optional(),
});
export type JobCreateRequest = z.infer<typeof JobCreateRequestSchema>;

export const StaticJobReportStatsSchema = z
  .object({
    output_completion_percentage: z.number(),
    partial_report_unlocked: z.boolean().optional(),
    partial_report_unlocked_at: z.string().nullable().optional(),
    report_summary: z.string().nullable().optional(),
  })
  .passthrough();
export type StaticJobReportStats = z.infer<typeof StaticJobReportStatsSchema>;

export const DynamicJobReportStatsSchema = z
  .object({
    total_goals: z.number().int().optional(),
    total_streams: z.number().int().optional(),
    total_threats: z.number().int().optional(),
    goals_achieved: z.number().int().optional(),
    report_summary: z.string().nullable().optional(),
  })
  .passthrough();
export type DynamicJobReportStats = z.infer<typeof DynamicJobReportStatsSchema>;

export const TargetReferenceSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    target_type: z.string().nullable().optional(),
    connection_type: z.string().nullable().optional(),
    api_endpoint_type: z.string().nullable().optional(),
    response_mode: z.string().nullable().optional(),
    session_supported: z.boolean().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
    status: z.string(),
    active: z.boolean(),
    validated: z.boolean(),
    version: z.number().int().nullable().optional(),
    secret_version: z.string().nullable().optional(),
    created_by_user_id: z.string().nullable().optional(),
    updated_by_user_id: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    target_metadata: TargetMetadataSchema.optional(),
    target_background: TargetBackgroundSchema.nullable().optional(),
    profiling_status: z.string().nullable().optional(),
    additional_context: TargetAdditionalContextSchema.nullable().optional(),
  })
  .passthrough();
export type TargetReference = z.infer<typeof TargetReferenceSchema>;

export const JobResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    name: z.string(),
    target: TargetReferenceSchema,
    job_type: z.string(),
    job_metadata: z.unknown(),
    version: z.number().int().nullable().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
    target_id: z.string(),
    target_type: z.string(),
    total: z.number().int().nullable().optional(),
    completed: z.number().int().nullable().optional(),
    status: z.string().optional(),
    score: z.number().nullable().optional(),
    asr: z.number().nullable().optional(),
    time_record: JobTimeRecordSchema.nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    created_by_user_id: z.string().nullable().optional(),
    report_stats: z.unknown().optional(),
    metering_quota_uuid: z.string().nullable().optional(),
    counted_towards_quota: z.string().optional(),
    invocation_id: z.string().nullable().optional(),
  })
  .passthrough();
export type JobResponse = z.infer<typeof JobResponseSchema>;

export const JobListResponseSchema = z
  .object({
    pagination: RedTeamPaginationSchema,
    data: z.array(JobResponseSchema),
  })
  .passthrough();
export type JobListResponse = z.infer<typeof JobListResponseSchema>;

export const JobAbortResponseSchema = z.object({
  job_id: z.string(),
  message: z.string(),
});
export type JobAbortResponse = z.infer<typeof JobAbortResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Category schemas
// ---------------------------------------------------------------------------

export const PrerequisiteModelSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  description: z.string(),
});
export type PrerequisiteModel = z.infer<typeof PrerequisiteModelSchema>;

export const SubCategoryModelSchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
    description: z.string(),
    preselect: z.boolean().optional(),
    prerequisites: z.array(PrerequisiteModelSchema).nullable().optional(),
    active: z.boolean().optional(),
  })
  .passthrough();
export type SubCategoryModel = z.infer<typeof SubCategoryModelSchema>;

export const CategoryModelSchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
    description: z.string(),
    preselect: z.boolean().optional(),
    sub_categories: z.array(SubCategoryModelSchema),
  })
  .passthrough();
export type CategoryModel = z.infer<typeof CategoryModelSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Attack schemas
// ---------------------------------------------------------------------------

export const AttackOutputSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    attack_id: z.string(),
    job_id: z.string(),
    target_id: z.string(),
    output: z.string(),
    threat: z.boolean().nullable().optional(),
    marked_safe: z.boolean().nullable().optional(),
  })
  .passthrough();
export type AttackOutput = z.infer<typeof AttackOutputSchema>;

export const AttackMultiTurnOutputSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    attack_id: z.string(),
    job_id: z.string(),
    target_id: z.string(),
    output: z.string(),
    prompt: z.string(),
    turn: z.number().int(),
    threat: z.boolean().nullable().optional(),
    marked_safe: z.boolean().nullable().optional(),
    generation: z.number().int().optional(),
    multi_turn: z.boolean().optional(),
  })
  .passthrough();
export type AttackMultiTurnOutput = z.infer<typeof AttackMultiTurnOutputSchema>;

export const AttackListItemSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    job_id: z.string(),
    target_id: z.string(),
    prompt: z.string(),
    prompt_mapping_id: z.string(),
    prompt_id: z.string(),
    category: z.string(),
    sub_category: z.string(),
    category_display_name: z.string(),
    sub_category_display_name: z.string(),
    status: z.string().optional(),
    marked_safe: z.boolean().nullable().optional(),
    extra_info: z.record(z.unknown()).optional(),
    threat: z.boolean().nullable().optional(),
    attack_type: z.string().optional(),
    multi_turn: z.boolean().optional(),
    asr: z.number().nullable().optional(),
    version: z.number().int().nullable().optional(),
    severity: z.string().optional(),
  })
  .passthrough();
export type AttackListItem = z.infer<typeof AttackListItemSchema>;

export const AttackListResponseSchema = z
  .object({
    pagination: RedTeamPaginationSchema,
    data: z.array(AttackListItemSchema),
  })
  .passthrough();
export type AttackListResponse = z.infer<typeof AttackListResponseSchema>;

export const AttackDetailResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    job_id: z.string(),
    target_id: z.string(),
    prompt: z.string(),
    prompt_mapping_id: z.string(),
    prompt_id: z.string(),
    category: z.string(),
    sub_category: z.string(),
    category_display_name: z.string(),
    sub_category_display_name: z.string(),
    compliance_frameworks: z.array(z.unknown()),
    goal: z.string().nullable(),
    status: z.string().optional(),
    marked_safe: z.boolean().nullable().optional(),
    extra_info: z.record(z.unknown()).optional(),
    threat: z.boolean().nullable().optional(),
    attack_type: z.string().optional(),
    multi_turn: z.boolean().optional(),
    asr: z.number().nullable().optional(),
    version: z.number().int().nullable().optional(),
    severity: z.string().optional(),
    outputs: z.array(AttackOutputSchema).optional(),
  })
  .passthrough();
export type AttackDetailResponse = z.infer<typeof AttackDetailResponseSchema>;

export const AttackMultiTurnDetailResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    job_id: z.string(),
    target_id: z.string(),
    prompt: z.string(),
    prompt_mapping_id: z.string(),
    prompt_id: z.string(),
    category: z.string(),
    sub_category: z.string(),
    category_display_name: z.string(),
    sub_category_display_name: z.string(),
    compliance_frameworks: z.array(z.unknown()),
    goal: z.string().nullable(),
    status: z.string().optional(),
    marked_safe: z.boolean().nullable().optional(),
    extra_info: z.record(z.unknown()).optional(),
    threat: z.boolean().nullable().optional(),
    attack_type: z.string().optional(),
    multi_turn: z.boolean().optional(),
    asr: z.number().nullable().optional(),
    version: z.number().int().nullable().optional(),
    severity: z.string().optional(),
    outputs: z.array(AttackMultiTurnOutputSchema).optional(),
  })
  .passthrough();
export type AttackMultiTurnDetailResponse = z.infer<typeof AttackMultiTurnDetailResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Report schemas
// ---------------------------------------------------------------------------

export const SubCategoryStatsSchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
    description: z.string(),
    preselect: z.boolean().optional(),
    prerequisites: z.array(PrerequisiteModelSchema).nullable().optional(),
    active: z.boolean().optional(),
    successful: z.number().int(),
    failed: z.number().int(),
    total: z.number().int().optional(),
  })
  .passthrough();
export type SubCategoryStats = z.infer<typeof SubCategoryStatsSchema>;

export const CategoryReportSchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
    description: z.string(),
    preselect: z.boolean().optional(),
    sub_categories: z.array(SubCategoryStatsSchema),
    asr: z.number(),
    total_prompts: z.number().int(),
    total_attacks: z.number().int(),
    successful: z.number().int(),
    failed: z.number().int(),
  })
  .passthrough();
export type CategoryReport = z.infer<typeof CategoryReportSchema>;

export const SeverityStatsSchema = z
  .object({
    severity: z.string(),
    successful: z.number().int().optional(),
    failed: z.number().int().optional(),
  })
  .passthrough();
export type SeverityStats = z.infer<typeof SeverityStatsSchema>;

export const SeverityReportSchema = z
  .object({
    stats: z.array(SeverityStatsSchema),
    successful: z.number().int().optional(),
    failed: z.number().int().optional(),
    total_attacks: z.number().int().optional(),
  })
  .passthrough();
export type SeverityReport = z.infer<typeof SeverityReportSchema>;

export const ComplianceTechniqueSchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
    compliance_id: z.string(),
    description: z.string(),
    link: z.string(),
    version: z.string(),
    active: z.boolean(),
    successful: z.number().int().optional(),
    failed: z.number().int().optional(),
    total: z.number().int().optional(),
  })
  .passthrough();
export type ComplianceTechnique = z.infer<typeof ComplianceTechniqueSchema>;

export const ComplianceReportSchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
    description: z.string(),
    active: z.boolean(),
    version: z.string(),
    link: z.string(),
    techniques: z.array(ComplianceTechniqueSchema),
    score: z.number().int().optional(),
  })
  .passthrough();
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;

export const RuntimeSecurityPolicySchema = z
  .object({
    policy_id: z.string(),
    display_name: z.string(),
    config: z.record(z.unknown()),
  })
  .passthrough();
export type RuntimeSecurityPolicy = z.infer<typeof RuntimeSecurityPolicySchema>;

export const StaticJobRemediationSchema = z
  .object({
    remediation: z.string(),
    description: z.string(),
    mapping_remediation_id: z.string().nullable().optional(),
    subcategories: z.array(z.string()).nullable().optional(),
    effectiveness: z.number().int().optional(),
    ease_of_implementation: z.number().int().optional(),
    priority: z.number().int().optional(),
    resource_links: z.array(z.string()).optional(),
    categories: z.array(z.string()).nullable().optional(),
  })
  .passthrough();
export type StaticJobRemediation = z.infer<typeof StaticJobRemediationSchema>;

export const StaticJobRemediationRecommendationSchema = z
  .object({
    runtime_security_policy_configuration: z
      .array(RuntimeSecurityPolicySchema)
      .nullable()
      .optional(),
    other_measures: z.array(StaticJobRemediationSchema).optional(),
  })
  .passthrough();
export type StaticJobRemediationRecommendation = z.infer<
  typeof StaticJobRemediationRecommendationSchema
>;

export const StaticJobReportSchema = z
  .object({
    severity_report: SeverityReportSchema,
    asr: z.number().nullable().optional(),
    score: z.number().nullable().optional(),
    security_report: CategoryReportSchema.nullable().optional(),
    safety_report: CategoryReportSchema.nullable().optional(),
    brand_report: CategoryReportSchema.nullable().optional(),
    compliance_report: z.array(ComplianceReportSchema).nullable().optional(),
    report_summary: z.string().nullable().optional(),
    recommendations: StaticJobRemediationRecommendationSchema.nullable().optional(),
  })
  .passthrough();
export type StaticJobReport = z.infer<typeof StaticJobReportSchema>;

export const DynamicJobReportSchema = z
  .object({
    total_goals: z.number().int().optional(),
    total_streams: z.number().int().optional(),
    total_threats: z.number().int().optional(),
    goals_achieved: z.number().int().optional(),
    report_summary: z.string().nullable().optional(),
    score: z.number().optional(),
    asr: z.number().optional(),
  })
  .passthrough();
export type DynamicJobReport = z.infer<typeof DynamicJobReportSchema>;

export const RemediationDetailSchema = z
  .object({
    remediation: z.string(),
    description: z.string(),
    resource_links: z.array(z.string()).optional(),
    priority_level: z.string().optional(),
    ease_of_implementation_level: z.string().optional(),
    effectiveness_level: z.string().optional(),
  })
  .passthrough();
export type RemediationDetail = z.infer<typeof RemediationDetailSchema>;

export const RemediationResponseSchema = z
  .object({ remediations: z.array(RemediationDetailSchema).optional() })
  .passthrough();
export type RemediationResponse = z.infer<typeof RemediationResponseSchema>;

export const RuntimeSecurityProfileResponseSchema = z
  .object({
    runtime_security_profile: z.array(RuntimeSecurityPolicySchema).nullable().optional(),
  })
  .passthrough();
export type RuntimeSecurityProfileResponse = z.infer<typeof RuntimeSecurityProfileResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Goal & Stream schemas (dynamic reports)
// ---------------------------------------------------------------------------

export const GoalSchema = z
  .object({
    goal: z.string(),
    safe_response: z.string(),
    jailbroken_response: z.string(),
    goal_metadata: z.record(z.unknown()).optional(),
    custom_goal: z.boolean().optional(),
    goal_type: z.string().optional(),
    uuid: z.string(),
    tsg_id: z.string(),
    job_id: z.string(),
    goal_to_show: z.string().nullable().optional(),
    threat: z.boolean().optional(),
    version: z.number().int().nullable().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();
export type Goal = z.infer<typeof GoalSchema>;

export const GoalListResponseSchema = z
  .object({ pagination: RedTeamPaginationSchema, data: z.array(GoalSchema) })
  .passthrough();
export type GoalListResponse = z.infer<typeof GoalListResponseSchema>;

export const StreamIterationDataSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    job_id: z.string(),
    stream_id: z.string(),
    goal_id: z.string(),
    iteration: z.number().int(),
    prompt: z.string(),
    techniques: z.string(),
    improvement: z.string(),
    prompts_objective: z.string(),
    summary: z.string(),
    output: z.string().nullable().optional(),
    score: z.number().int().nullable().optional(),
    judge_reasoning: z.string().nullable().optional(),
    threat: z.boolean().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
    version: z.number().int().nullable().optional(),
  })
  .passthrough();
export type StreamIterationData = z.infer<typeof StreamIterationDataSchema>;

export const StreamDetailResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    job_id: z.string(),
    target_id: z.string(),
    goal_id: z.string(),
    stream_idx: z.number().int().optional(),
    iteration: z.number().int().optional(),
    goal: z.unknown().optional(),
    marked_safe: z.boolean().optional(),
    stream_type: z.string().nullable().optional(),
    threat: z.boolean().optional(),
    first_threat_iteration: StreamIterationDataSchema.nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    extra_info: z.record(z.unknown()).optional(),
    version: z.number().int().nullable().optional(),
    iterations: z.array(StreamIterationDataSchema).optional(),
  })
  .passthrough();
export type StreamDetailResponse = z.infer<typeof StreamDetailResponseSchema>;

export const StreamListResponseSchema = z
  .object({ pagination: RedTeamPaginationSchema, data: z.array(StreamDetailResponseSchema) })
  .passthrough();
export type StreamListResponse = z.infer<typeof StreamListResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Custom attack report schemas
// ---------------------------------------------------------------------------

export const CustomAttackOutputSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    custom_attack_id: z.string(),
    job_id: z.string(),
    target_id: z.string(),
    output: z.string(),
    threat: z.boolean().nullable().optional(),
    marked_safe: z.boolean().nullable().optional(),
  })
  .passthrough();
export type CustomAttackOutput = z.infer<typeof CustomAttackOutputSchema>;

export const PropertyAssignmentSchema = z.object({
  name: z.string(),
  value: z.string(),
});
export type PropertyAssignment = z.infer<typeof PropertyAssignmentSchema>;

export const PropertyValueStatisticSchema = z.object({
  value: z.string(),
  successful_attack_count: z.number().int(),
  total_attack_count: z.number().int(),
  success_rate: z.number(),
});
export type PropertyValueStatistic = z.infer<typeof PropertyValueStatisticSchema>;

export const PropertyStatisticSchema = z.object({
  property_name: z.string(),
  values: z.array(PropertyValueStatisticSchema),
});
export type PropertyStatistic = z.infer<typeof PropertyStatisticSchema>;

export const PromptSetSummarySchema = z
  .object({
    prompt_set_id: z.string(),
    prompt_set_name: z.string(),
    total_prompts: z.number().int(),
    total_attacks: z.number().int(),
    total_threats: z.number().int(),
    failed_attacks: z.number().int(),
    threat_rate: z.number(),
    property_names: z.array(z.string()).optional(),
    property_statistics: z.array(PropertyStatisticSchema).optional(),
  })
  .passthrough();
export type PromptSetSummary = z.infer<typeof PromptSetSummarySchema>;

export const CustomAttackReportResponseSchema = z
  .object({
    total_prompts: z.number().int(),
    total_attacks: z.number().int(),
    total_threats: z.number().int(),
    failed_attacks: z.number().int(),
    score: z.number(),
    asr: z.number(),
    custom_attack_reports: z.array(PromptSetSummarySchema).optional(),
    property_statistics: z.array(PropertyStatisticSchema).optional(),
  })
  .passthrough();
export type CustomAttackReportResponse = z.infer<typeof CustomAttackReportResponseSchema>;

export const PromptSetsReportResponseSchema = z
  .object({
    prompt_sets: z.array(PromptSetSummarySchema),
    total_prompt_sets: z.number().int(),
    applied_filters: z.record(z.unknown()).optional(),
  })
  .passthrough();
export type PromptSetsReportResponse = z.infer<typeof PromptSetsReportResponseSchema>;

export const PromptDetailResponseSchema = z
  .object({
    prompt_id: z.string(),
    prompt_text: z.string(),
    goal: z.string().nullable().optional(),
    user_defined_goal: z.boolean().optional(),
    properties: z.array(PropertyAssignmentSchema).optional(),
    attack_id: z.string().nullable().optional(),
    threat: z.boolean().nullable().optional(),
    attack_outputs: z.array(CustomAttackOutputSchema).optional(),
    asr: z.number().nullable().optional(),
    prompt_set_id: z.string().nullable().optional(),
    prompt_set_name: z.string().nullable().optional(),
  })
  .passthrough();
export type PromptDetailResponse = z.infer<typeof PromptDetailResponseSchema>;

export const CustomAttacksListResponseSchema = z
  .object({
    pagination: RedTeamPaginationSchema,
    data: z.array(z.unknown()),
    total_attacks: z.number().int(),
    total_threats: z.number().int(),
  })
  .passthrough();
export type CustomAttacksListResponse = z.infer<typeof CustomAttacksListResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Dashboard schemas
// ---------------------------------------------------------------------------

export const RiskLevelSchema = z
  .object({
    risk_rating: z.string(),
    total: z.number().int(),
    targets_by_type: z.array(CountByNameSchema).optional(),
  })
  .passthrough();
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const ScanStatisticsResponseSchema = z
  .object({
    total_scans: z.number().int(),
    targets_scanned: z.number().int(),
    targets_scanned_by_type: z.array(CountByNameSchema).optional(),
    scan_status: z.array(CountByNameSchema).optional(),
    risk_profile: z.array(RiskLevelSchema).optional(),
  })
  .passthrough();
export type ScanStatisticsResponse = z.infer<typeof ScanStatisticsResponseSchema>;

export const ScoreTrendSeriesSchema = z.object({
  label: z.string(),
  data: z.array(z.number().nullable()),
});
export type ScoreTrendSeries = z.infer<typeof ScoreTrendSeriesSchema>;

export const ScoreTrendResponseSchema = z.object({
  labels: z.array(z.string()),
  series: z.array(ScoreTrendSeriesSchema),
});
export type ScoreTrendResponse = z.infer<typeof ScoreTrendResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Sentiment, Quota, Error Log schemas
// ---------------------------------------------------------------------------

export const SentimentRequestSchema = z.object({
  job_id: z.string(),
  up_vote: z.boolean().optional(),
  down_vote: z.boolean().optional(),
});
export type SentimentRequest = z.infer<typeof SentimentRequestSchema>;

export const SentimentResponseSchema = z
  .object({
    job_id: z.string(),
    up_vote: z.boolean().optional(),
    down_vote: z.boolean().optional(),
  })
  .passthrough();
export type SentimentResponse = z.infer<typeof SentimentResponseSchema>;

export const QuotaDetailsSchema = z.object({
  allocated: z.number().int(),
  unlimited: z.boolean(),
  consumed: z.number().int(),
});
export type QuotaDetails = z.infer<typeof QuotaDetailsSchema>;

export const QuotaSummarySchema = z.object({
  static: QuotaDetailsSchema,
  dynamic: QuotaDetailsSchema,
  custom: QuotaDetailsSchema,
});
export type QuotaSummary = z.infer<typeof QuotaSummarySchema>;

export const ErrorLogSchema = z
  .object({
    created_at: z.string(),
    updated_at: z.string(),
    job_id: z.string().nullable().optional(),
    target_id: z.string().nullable().optional(),
    target_version: z.number().int().nullable().optional(),
    attack_id: z.string().nullable().optional(),
    error_type: z.string().nullable().optional(),
    error_source: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    target_object: z.record(z.unknown()).nullable().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
    version: z.number().int().optional(),
  })
  .passthrough();
export type ErrorLog = z.infer<typeof ErrorLogSchema>;

export const ErrorLogListResponseSchema = z
  .object({ pagination: RedTeamPaginationSchema, data: z.array(ErrorLogSchema) })
  .passthrough();
export type ErrorLogListResponse = z.infer<typeof ErrorLogListResponseSchema>;

// ---------------------------------------------------------------------------
// Management — Target schemas
// ---------------------------------------------------------------------------

export const TargetCreateRequestSchema = z
  .object({
    name: z.string(),
    description: z.unknown().optional(),
    target_type: z.unknown().optional(),
    connection_type: z.unknown().optional(),
    api_endpoint_type: z.unknown().optional(),
    response_mode: z.unknown().optional(),
    connection_params: z.unknown().optional(),
    session_supported: z.boolean().optional(),
    target_metadata: z.unknown().optional(),
    target_background: z.unknown().optional(),
    additional_context: z.unknown().optional(),
    extra_info: z.unknown().optional(),
    network_broker_channel_uuid: z.unknown().optional(),
  })
  .passthrough();
export type TargetCreateRequest = z.infer<typeof TargetCreateRequestSchema>;

export const TargetUpdateRequestSchema = z
  .object({
    name: z.string(),
    description: z.unknown().optional(),
    target_type: z.unknown().optional(),
    connection_type: z.unknown().optional(),
    api_endpoint_type: z.unknown().optional(),
    response_mode: z.unknown().optional(),
    connection_params: z.unknown().optional(),
    session_supported: z.boolean().optional(),
    target_metadata: z.unknown().optional(),
    target_background: z.unknown().optional(),
    additional_context: z.unknown().optional(),
    extra_info: z.unknown().optional(),
    network_broker_channel_uuid: z.unknown().optional(),
  })
  .passthrough();
export type TargetUpdateRequest = z.infer<typeof TargetUpdateRequestSchema>;

export const TargetContextUpdateSchema = z
  .object({
    target_background: z.unknown().optional(),
    additional_context: z.unknown().optional(),
  })
  .passthrough();
export type TargetContextUpdate = z.infer<typeof TargetContextUpdateSchema>;

export const TargetResponseSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    name: z.string(),
    status: z.unknown(),
    active: z.boolean(),
    validated: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.unknown().optional(),
    target_type: z.unknown().optional(),
    connection_type: z.unknown().optional(),
    api_endpoint_type: z.unknown().optional(),
    response_mode: z.unknown().optional(),
    session_supported: z.boolean().optional(),
    extra_info: z.unknown().optional(),
    version: z.unknown().optional(),
    secret_version: z.unknown().optional(),
    created_by_user_id: z.unknown().optional(),
    updated_by_user_id: z.unknown().optional(),
    target_metadata: z.unknown().optional(),
    target_background: z.unknown().optional(),
    profiling_status: z.unknown().optional(),
    additional_context: z.unknown().optional(),
  })
  .passthrough();
export type TargetResponse = z.infer<typeof TargetResponseSchema>;

export const TargetListItemSchema = z
  .object({
    uuid: z.string(),
    tsg_id: z.string(),
    name: z.string(),
    status: z.unknown(),
    active: z.boolean(),
    validated: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.unknown().optional(),
    target_type: z.unknown().optional(),
    connection_type: z.unknown().optional(),
    api_endpoint_type: z.unknown().optional(),
    response_mode: z.unknown().optional(),
    session_supported: z.boolean().optional(),
    extra_info: z.unknown().optional(),
    version: z.unknown().optional(),
    secret_version: z.unknown().optional(),
    created_by_user_id: z.unknown().optional(),
    updated_by_user_id: z.unknown().optional(),
  })
  .passthrough();
export type TargetListItem = z.infer<typeof TargetListItemSchema>;

export const TargetListSchema = z
  .object({ pagination: RedTeamPaginationSchema, data: z.array(TargetListItemSchema).optional() })
  .passthrough();
export type TargetList = z.infer<typeof TargetListSchema>;

export const TargetProbeRequestSchema = z
  .object({
    name: z.string(),
    uuid: z.unknown().optional(),
    description: z.unknown().optional(),
    target_type: z.unknown().optional(),
    connection_type: z.unknown().optional(),
    api_endpoint_type: z.unknown().optional(),
    response_mode: z.unknown().optional(),
    connection_params: z.unknown().optional(),
    session_supported: z.boolean().optional(),
    target_metadata: z.unknown().optional(),
    target_background: z.unknown().optional(),
    additional_context: z.unknown().optional(),
    extra_info: z.unknown().optional(),
    network_broker_channel_uuid: z.unknown().optional(),
    probe_fields: z.unknown().optional(),
  })
  .passthrough();
export type TargetProbeRequest = z.infer<typeof TargetProbeRequestSchema>;

export const TargetProfileResponseSchema = z
  .object({
    target_id: z.string(),
    target_version: z.number().int(),
    status: z.string(),
    profiling_status: z.unknown().optional(),
    target_background: z.unknown().optional(),
    additional_context: z.unknown().optional(),
    ai_generated_fields: z.unknown().optional(),
    other_details: z.unknown().optional(),
  })
  .passthrough();
export type TargetProfileResponse = z.infer<typeof TargetProfileResponseSchema>;

export const BaseResponseSchema = z.object({
  message: z.string(),
  status: z.number().int(),
});
export type BaseResponse = z.infer<typeof BaseResponseSchema>;

// ---------------------------------------------------------------------------
// Management — Custom attack / prompt set schemas
// ---------------------------------------------------------------------------

export const PromptSetStatsSchema = z
  .object({
    total_prompts: z.number().int(),
    active_prompts: z.number().int(),
    inactive_prompts: z.number().int(),
    failed_prompts: z.number().int().optional(),
    validation_prompts: z.number().int().optional(),
  })
  .passthrough();
export type PromptSetStats = z.infer<typeof PromptSetStatsSchema>;

export const CustomPromptSetCreateRequestSchema = z.object({
  name: z.string(),
  description: z.unknown().optional(),
  property_names: z.array(z.string()).optional(),
});
export type CustomPromptSetCreateRequest = z.infer<typeof CustomPromptSetCreateRequestSchema>;

export const CustomPromptSetUpdateRequestSchema = z
  .object({
    name: z.unknown().optional(),
    description: z.unknown().optional(),
    archive: z.unknown().optional(),
    property_names: z.unknown().optional(),
  })
  .passthrough();
export type CustomPromptSetUpdateRequest = z.infer<typeof CustomPromptSetUpdateRequestSchema>;

export const CustomPromptSetArchiveRequestSchema = z.object({ archive: z.boolean() });
export type CustomPromptSetArchiveRequest = z.infer<typeof CustomPromptSetArchiveRequestSchema>;

export const CustomPromptSetResponseSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    active: z.boolean(),
    archive: z.boolean(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.unknown().optional(),
    property_names: z.array(z.string()).optional(),
    properties: z.array(z.unknown()).optional(),
    stats: z.unknown().optional(),
    extra_info: z.unknown().optional(),
    version: z.unknown().optional(),
    created_by_user_id: z.unknown().optional(),
    updated_by_user_id: z.unknown().optional(),
  })
  .passthrough();
export type CustomPromptSetResponse = z.infer<typeof CustomPromptSetResponseSchema>;

export const CustomPromptSetListItemSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    active: z.boolean(),
    archive: z.boolean(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.unknown().optional(),
    property_names: z.array(z.string()).optional(),
    stats: z.unknown().optional(),
    created_by_user_id: z.unknown().optional(),
  })
  .passthrough();
export type CustomPromptSetListItem = z.infer<typeof CustomPromptSetListItemSchema>;

export const CustomPromptSetListSchema = z
  .object({
    pagination: RedTeamPaginationSchema,
    data: z.array(CustomPromptSetListItemSchema).optional(),
  })
  .passthrough();
export type CustomPromptSetList = z.infer<typeof CustomPromptSetListSchema>;

export const CustomPromptSetListActiveSchema = z
  .object({ data: z.array(CustomPromptSetListItemSchema).optional() })
  .passthrough();
export type CustomPromptSetListActive = z.infer<typeof CustomPromptSetListActiveSchema>;

export const CustomPromptSetReferenceSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    status: z.string(),
    active: z.boolean(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    version: z.unknown().optional(),
  })
  .passthrough();
export type CustomPromptSetReference = z.infer<typeof CustomPromptSetReferenceSchema>;

export const CustomPromptSetVersionInfoSchema = z
  .object({
    uuid: z.string(),
    status: z.string(),
    is_latest: z.boolean(),
    version: z.unknown().optional(),
    stats: z.unknown().optional(),
    snapshot_created_at: z.unknown().optional(),
  })
  .passthrough();
export type CustomPromptSetVersionInfo = z.infer<typeof CustomPromptSetVersionInfoSchema>;

export const CustomPromptCreateRequestSchema = z.object({
  prompt: z.string(),
  prompt_set_id: z.string(),
  goal: z.unknown().optional(),
  properties: z.unknown().optional(),
});
export type CustomPromptCreateRequest = z.infer<typeof CustomPromptCreateRequestSchema>;

export const CustomPromptUpdateRequestSchema = z
  .object({
    prompt: z.unknown().optional(),
    goal: z.unknown().optional(),
    properties: z.unknown().optional(),
  })
  .passthrough();
export type CustomPromptUpdateRequest = z.infer<typeof CustomPromptUpdateRequestSchema>;

export const CustomPromptResponseSchema = z
  .object({
    uuid: z.string(),
    prompt: z.string(),
    user_defined_goal: z.boolean(),
    status: z.string(),
    active: z.boolean(),
    prompt_set_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    goal: z.unknown().optional(),
    properties: z.unknown().optional(),
    property_assignments: z.array(z.unknown()).optional(),
    detector_category: z.unknown().optional(),
    severity: z.unknown().optional(),
    extra_info: z.unknown().optional(),
  })
  .passthrough();
export type CustomPromptResponse = z.infer<typeof CustomPromptResponseSchema>;

export const CustomPromptListItemSchema = z
  .object({
    uuid: z.string(),
    prompt: z.string(),
    user_defined_goal: z.boolean(),
    status: z.string(),
    active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    goal: z.unknown().optional(),
    properties: z.unknown().optional(),
  })
  .passthrough();
export type CustomPromptListItem = z.infer<typeof CustomPromptListItemSchema>;

export const CustomPromptListSchema = z
  .object({
    pagination: RedTeamPaginationSchema,
    data: z.array(CustomPromptListItemSchema).optional(),
  })
  .passthrough();
export type CustomPromptList = z.infer<typeof CustomPromptListSchema>;

// ---------------------------------------------------------------------------
// Management — Property schemas
// ---------------------------------------------------------------------------

export const PropertyNameCreateRequestSchema = z.object({ name: z.string() });
export type PropertyNameCreateRequest = z.infer<typeof PropertyNameCreateRequestSchema>;

export const PropertyValueCreateRequestSchema = z.object({
  property_name: z.string(),
  property_value: z.string(),
});
export type PropertyValueCreateRequest = z.infer<typeof PropertyValueCreateRequestSchema>;

export const PropertyDefinitionSchema = z.object({
  property_name: z.string(),
  created_at: z.string(),
});
export type PropertyDefinition = z.infer<typeof PropertyDefinitionSchema>;

export const PropertyNamesListResponseSchema = z
  .object({ data: z.array(PropertyDefinitionSchema).optional() })
  .passthrough();
export type PropertyNamesListResponse = z.infer<typeof PropertyNamesListResponseSchema>;

export const PropertyValuesResponseSchema = z
  .object({
    name: z.string(),
    values: z.array(z.string()).optional(),
  })
  .passthrough();
export type PropertyValuesResponse = z.infer<typeof PropertyValuesResponseSchema>;

export const PropertyValuesMultipleResponseSchema = z
  .object({ data: z.record(z.array(z.string())).optional() })
  .passthrough();
export type PropertyValuesMultipleResponse = z.infer<typeof PropertyValuesMultipleResponseSchema>;

// ---------------------------------------------------------------------------
// Management — Dashboard schemas
// ---------------------------------------------------------------------------

export const DashboardOverviewResponseSchema = z
  .object({
    total_targets: z.number().int(),
    targets_by_type: z.array(CountByNameSchema).optional(),
  })
  .passthrough();
export type DashboardOverviewResponse = z.infer<typeof DashboardOverviewResponseSchema>;
