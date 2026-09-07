// src/models/red-team.ts — Zod schemas + types for AIRS Red Teaming API

import { z } from 'zod';
import {
  ApiEndpointType,
  JobType,
  ResponseMode,
  TargetAuthType,
  TargetConnectionType,
  TargetType,
} from './red-team-enums.js';
import {
  ComplianceFrameworkSchema,
  RuntimeSecurityPolicyConfigSchema,
  StreamGoalSchema,
  TargetConnectionConfigSchema,
  MultiTurnConfigSchema,
} from './red-team-details.js';

// ---------------------------------------------------------------------------
// Shared / utility schemas
// ---------------------------------------------------------------------------

export const RedTeamPaginationSchema = z
  .object({ total_items: z.number().int().nullable().optional() })
  .passthrough();
export type RedTeamPagination = z.infer<typeof RedTeamPaginationSchema>;

export const CountByNameSchema = z
  .object({ name: z.string(), count: z.number().int() })
  .passthrough();
export type CountByName = z.infer<typeof CountByNameSchema>;

export const ValidationErrorSchema = z
  .object({
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
    type: z.string(),
  })
  .passthrough();
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
    agentic_profiling_enabled: z.boolean().optional(),
    industry: z.string().nullable().optional(),
    use_case: z.string().nullable().optional(),
    competitors: z.array(z.string()).nullable().optional(),
  })
  .passthrough();
export type TargetBackground = z.infer<typeof TargetBackgroundSchema>;

export const TargetAdditionalContextSchema = z
  .object({
    base_model: z.string().nullable().optional(),
    core_architecture: z.string().nullable().optional(),
    system_prompt: z.string().nullable().optional(),
    languages_supported: z.array(z.string()).nullable().optional(),
    banned_keywords: z.array(z.string()).nullable().optional(),
    tools_accessible: z.array(z.string()).nullable().optional(),
  })
  .passthrough();
export type TargetAdditionalContext = z.infer<typeof TargetAdditionalContextSchema>;

export const TargetMetadataSchema = z
  .object({
    supports_multimodal_files: z.boolean().optional(),
    supports_multimodal_files_error_message: z.union([z.string(), z.null()]).optional(),
    multi_turn: z.boolean().optional(),
    multi_turn_error_message: z.string().nullable().optional(),
    rate_limit: z.number().int().nullable().optional(),
    rate_limit_enabled: z.boolean().optional(),
    rate_limit_error_code: z.number().int().nullable().optional(),
    rate_limit_error_json: z.record(z.unknown()).nullable().optional(),
    rate_limit_error_message: z.string().nullable().optional(),
    content_filter_enabled: z.boolean().optional(),
    content_filter_error_code: z.number().int().nullable().optional(),
    content_filter_error_json: z.record(z.unknown()).nullable().optional(),
    content_filter_error_message: z.string().nullable().optional(),
    probe_message: z.string().optional(),
    request_timeout: z.number().optional(),
  })
  .passthrough();
export type TargetMetadata = z.infer<typeof TargetMetadataSchema>;

// ---------------------------------------------------------------------------
// Multi-turn configuration schemas
// ---------------------------------------------------------------------------

export const MultiTurnStatefulConfigSchema = z
  .object({
    type: z.string().default('stateful'),
    response_id_field: z.string(),
    request_id_field: z.string(),
  })
  .passthrough();
export type MultiTurnStatefulConfig = z.infer<typeof MultiTurnStatefulConfigSchema>;

export const MultiTurnStatelessConfigSchema = z
  .object({
    type: z.string().default('stateless'),
    assistant_role: z.string().nullable().optional(),
  })
  .passthrough();
export type MultiTurnStatelessConfig = z.infer<typeof MultiTurnStatelessConfigSchema>;

// ---------------------------------------------------------------------------
// Auth config schemas
// ---------------------------------------------------------------------------

export const HeadersAuthConfigSchema = z
  .object({ auth_header: z.record(z.string()) })
  .passthrough();
export type HeadersAuthConfig = z.infer<typeof HeadersAuthConfigSchema>;

export const BasicAuthAuthConfigSchema = z
  .object({
    basic_auth_location: z.string().default('HEADER'),
    basic_auth_header: z.record(z.string()).nullable().optional(),
  })
  .passthrough();
export type BasicAuthAuthConfig = z.infer<typeof BasicAuthAuthConfigSchema>;

export const OAuth2AuthConfigSchema = z
  .object({
    oauth2_token_url: z.string(),
    oauth2_expiry_minutes: z.number().int().default(60),
    oauth2_headers: z.record(z.unknown()).optional(),
    oauth2_body_params: z.record(z.unknown()).optional(),
    oauth2_token_response_key: z.string().default('access_token'),
    oauth2_inject_header: z.record(z.string()),
  })
  .passthrough();
export type OAuth2AuthConfig = z.infer<typeof OAuth2AuthConfigSchema>;

export const AuthConfigSchema = z.union([
  HeadersAuthConfigSchema,
  BasicAuthAuthConfigSchema,
  OAuth2AuthConfigSchema,
]);
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/** Request auth variants do not inject defaults belonging to a different auth method. */
export const AuthConfigRequestSchema = z.union([
  HeadersAuthConfigSchema,
  OAuth2AuthConfigSchema.extend({
    oauth2_expiry_minutes: z.number().int().min(0).optional(),
    oauth2_token_response_key: z.string().optional(),
  }),
  BasicAuthAuthConfigSchema.extend({ basic_auth_location: z.string().optional() }),
]);

// ---------------------------------------------------------------------------
// Provider-specific connection parameter schemas
// ---------------------------------------------------------------------------

export const OpenAIConnectionParamsSchema = z
  .object({
    api_key: z.string(),
    model_name: z.string(),
  })
  .passthrough();
export type OpenAIConnectionParams = z.infer<typeof OpenAIConnectionParamsSchema>;

export const HuggingfaceConnectionParamsSchema = z
  .object({
    api_key: z.string(),
    model_name: z.string(),
  })
  .passthrough();
export type HuggingfaceConnectionParams = z.infer<typeof HuggingfaceConnectionParamsSchema>;

export const DatabricksConnectionParamsSchema = z
  .object({
    auth_type: z.string(),
    workspace_url: z.string(),
    model_name: z.string(),
    access_token: z.string().nullable().optional(),
    client_id: z.string().nullable().optional(),
    secret: z.string().nullable().optional(),
  })
  .passthrough();
export type DatabricksConnectionParams = z.infer<typeof DatabricksConnectionParamsSchema>;

export const BedrockAccessConnectionParamsSchema = z
  .object({
    access_id: z.string(),
    access_secret: z.string(),
    region: z.string(),
    model_id: z.string(),
    session_token: z.string().nullable().optional(),
  })
  .passthrough();
export type BedrockAccessConnectionParams = z.infer<typeof BedrockAccessConnectionParamsSchema>;

// ---------------------------------------------------------------------------
// Connection parameter schemas (REST & Streaming)
// ---------------------------------------------------------------------------

export const RestConnectionParamsSchema = z
  .object({
    multi_turn_supported: z.boolean().optional(),
    api_endpoint: z.string().nullable().optional(),
    request_headers: z.record(z.unknown()).nullable().optional(),
    request_json: z.record(z.unknown()).nullable().optional(),
    response_json: z.record(z.unknown()).nullable().optional(),
    response_key: z.string().nullable().optional(),
    target_connection_config: TargetConnectionConfigSchema.nullable().optional(),
    curl: z.string().nullable().optional(),
    multi_turn_config: MultiTurnConfigSchema.nullable().optional(),
  })
  .passthrough();
export type RestConnectionParams = z.infer<typeof RestConnectionParamsSchema>;

export const StreamingConnectionParamsSchema = RestConnectionParamsSchema.extend({
  response_stop_key: z.string(),
  response_stop_value: z.string(),
}).passthrough();
export type StreamingConnectionParams = z.infer<typeof StreamingConnectionParamsSchema>;

export const WebSocketConnectionParamsSchema = RestConnectionParamsSchema.extend({
  ws_response_timeout: z.number().default(110),
}).passthrough();
export type WebSocketConnectionParams = z.infer<typeof WebSocketConnectionParamsSchema>;

/** Union of WebSocket, Streaming, and REST connection params. */
export const ConnectionParamsSchema = z.union([
  WebSocketConnectionParamsSchema,
  StreamingConnectionParamsSchema,
  RestConnectionParamsSchema,
]);
export type ConnectionParams = z.infer<typeof ConnectionParamsSchema>;

/** Request variants preserve omitted defaults, especially REST vs WebSocket timeout. */
export const ConnectionParamsRequestSchema = z.union([
  StreamingConnectionParamsSchema,
  WebSocketConnectionParamsSchema.extend({ ws_response_timeout: z.number().optional() }),
  RestConnectionParamsSchema,
]);

// ---------------------------------------------------------------------------
// DataPlane — Job / Scan schemas
// ---------------------------------------------------------------------------

export const TargetJobRequestSchema = z
  .object({
    uuid: z.string().uuid(),
    version: z.number().int().nullable().optional(),
  })
  .passthrough();
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
    language: z
      .lazy(() => LanguageOptionSchema)
      .nullable()
      .optional(),
    include_file_attacks: z.boolean().optional(),
    categories: z.record(z.unknown()),
    rate_limit_enabled: z.boolean().optional(),
    rate_limit: z.number().int().nullable().optional(),
    rate_limit_error_code: z.number().int().nullable().optional(),
    rate_limit_error_message: z.string().nullable().optional(),
    rate_limit_error_json: z.record(z.unknown()).nullable().optional(),
    content_filter_enabled: z.boolean().optional(),
    content_filter_error_code: z.number().int().nullable().optional(),
    content_filter_error_message: z.string().nullable().optional(),
    content_filter_error_json: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();
export type StaticJobMetadata = z.infer<typeof StaticJobMetadataSchema>;

export const DynamicJobMetadataSchema = z
  .object({
    language: z
      .lazy(() => LanguageOptionSchema)
      .nullable()
      .optional(),
    goal_categories: z.array(z.string()).nullable().optional(),
    rate_limit_enabled: z.boolean().optional(),
    rate_limit: z.number().int().nullable().optional(),
    rate_limit_error_code: z.number().int().nullable().optional(),
    rate_limit_error_message: z.string().nullable().optional(),
    rate_limit_error_json: z.record(z.unknown()).nullable().optional(),
    content_filter_enabled: z.boolean().optional(),
    content_filter_error_code: z.number().int().nullable().optional(),
    content_filter_error_message: z.string().nullable().optional(),
    content_filter_error_json: z.record(z.unknown()).nullable().optional(),
    stream_breadth: z.number().int().optional(),
    stream_depth: z.number().int().optional(),
    max_tokens: z.number().int().optional(),
    context_size: z.number().int().optional(),
    attack_goals: z.array(z.string()).optional(),
    base_model: z.string().nullable().optional(),
    use_case: z.string().nullable().optional(),
    system_prompt: z.string().nullable().optional(),
  })
  .passthrough();
export type DynamicJobMetadata = z.infer<typeof DynamicJobMetadataSchema>;

export const CustomJobMetadataSchema = z
  .object({
    language: z
      .lazy(() => LanguageOptionSchema)
      .nullable()
      .optional(),
    custom_prompt_sets: z.array(z.string()),
    rate_limit_enabled: z.boolean().optional(),
    rate_limit: z.number().int().nullable().optional(),
    rate_limit_error_code: z.number().int().nullable().optional(),
    rate_limit_error_message: z.string().nullable().optional(),
    rate_limit_error_json: z.record(z.unknown()).nullable().optional(),
    content_filter_enabled: z.boolean().optional(),
    content_filter_error_code: z.number().int().nullable().optional(),
    content_filter_error_message: z.string().nullable().optional(),
    content_filter_error_json: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();
export type CustomJobMetadata = z.infer<typeof CustomJobMetadataSchema>;

/** Metadata for imported CLARA scans, which do not execute attacks. */
export const ClaraJobMetadataSchema = z
  .object({
    scan_name: z.string().min(3).max(255),
    categories: z.record(z.array(z.string())).optional(),
    language: z.null().optional(),
  })
  .passthrough();
export type ClaraJobMetadata = z.infer<typeof ClaraJobMetadataSchema>;

export const JobCreateRequestSchema = z
  .object({
    name: z.string().min(3).max(255),
    target: TargetJobRequestSchema,
    job_type: z.nativeEnum(JobType),
    job_metadata: z.union([
      StaticJobMetadataSchema.extend({
        content_filter_error_code: z.number().int().min(400).max(599).nullable().optional(),
      }),
      DynamicJobMetadataSchema.extend({
        content_filter_error_code: z.number().int().min(400).max(599).nullable().optional(),
      }),
      CustomJobMetadataSchema.extend({
        content_filter_error_code: z.number().int().min(400).max(599).nullable().optional(),
      }),
      ClaraJobMetadataSchema,
    ]),
    version: z.number().int().nullable().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();
/** Request input keeps string-valued CLI options source-compatible; the schema validates JobType at submission. */
export type JobCreateRequest = Omit<z.infer<typeof JobCreateRequestSchema>, 'job_type'> & {
  job_type: string;
};

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
    adapter_uuid: z.union([z.string(), z.null()]).optional(),
    canonical_id: z.union([z.string(), z.null()]).optional(),
    adapter_secret_version: z.union([z.string(), z.null()]).optional(),
    profiling_progress: z.union([z.number().int(), z.null()]).optional(),
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
    auth_type: z.string().nullable().optional(),
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
    job_metadata: z.union([
      StaticJobMetadataSchema,
      DynamicJobMetadataSchema,
      CustomJobMetadataSchema,
      ClaraJobMetadataSchema,
    ]),
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
    report_stats: z
      .union([StaticJobReportStatsSchema, DynamicJobReportStatsSchema])
      .nullable()
      .optional(),
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

export const JobAbortResponseSchema = z
  .object({
    job_id: z.string(),
    message: z.string(),
  })
  .passthrough();
export type JobAbortResponse = z.infer<typeof JobAbortResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Category schemas
// ---------------------------------------------------------------------------

export const PrerequisiteModelSchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
    description: z.string(),
  })
  .passthrough();
export type PrerequisiteModel = z.infer<typeof PrerequisiteModelSchema>;

export const SubCategoryModelSchema = z
  .object({
    file_supported: z.boolean().optional(),
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
    error: z.union([z.boolean(), z.null()]).optional(),
    error_message: z.union([z.string(), z.null()]).optional(),
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
    error: z.union([z.boolean(), z.null()]).optional(),
    error_message: z.union([z.string(), z.null()]).optional(),
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
    error: z.union([z.boolean(), z.null()]).optional(),
    attack_modality: z.string().optional(),
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
    error: z.union([z.boolean(), z.null()]).optional(),
    attack_modality: z.string().optional(),
    file: z
      .union([
        z
          .object({
            file_name: z.string(),
            signed_url: z.union([z.string(), z.null()]).optional(),
            file_type: z.string(),
          })
          .passthrough(),
        z.null(),
      ])
      .optional(),
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
    compliance_frameworks: z.array(ComplianceFrameworkSchema),
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
    error: z.union([z.boolean(), z.null()]).optional(),
    attack_modality: z.string().optional(),
    file: z
      .union([
        z
          .object({
            file_name: z.string(),
            signed_url: z.union([z.string(), z.null()]).optional(),
            file_type: z.string(),
          })
          .passthrough(),
        z.null(),
      ])
      .optional(),
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
    compliance_frameworks: z.array(ComplianceFrameworkSchema),
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
    // Current API groups turns into conversations; accept the earlier flat response too.
    outputs: z
      .union([z.array(z.array(AttackMultiTurnOutputSchema)), z.array(AttackMultiTurnOutputSchema)])
      .optional(),
  })
  .passthrough();
export type AttackMultiTurnDetailResponse = z.infer<typeof AttackMultiTurnDetailResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Report schemas
// ---------------------------------------------------------------------------

export const SubCategoryStatsSchema = z
  .object({
    file_supported: z.boolean().optional(),
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
    config: RuntimeSecurityPolicyConfigSchema,
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
    goal_category: z.union([z.string(), z.null()]).optional(),
    error: z.union([z.boolean(), z.null()]).optional(),
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
    prompt_english: z.union([z.string(), z.null()]).optional(),
    output_english: z.union([z.string(), z.null()]).optional(),
    error: z.union([z.boolean(), z.null()]).optional(),
    error_message: z.union([z.string(), z.null()]).optional(),
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
    error: z.union([z.boolean(), z.null()]).optional(),
    error_message: z.union([z.string(), z.null()]).optional(),
    goal_category: z.union([z.string(), z.null()]).optional(),
    goal_metadata: z.union([z.object({}).passthrough(), z.null()]).optional(),
    uuid: z.string(),
    tsg_id: z.string(),
    job_id: z.string(),
    target_id: z.string(),
    goal_id: z.string(),
    stream_idx: z.number().int().optional(),
    iteration: z.number().int().optional(),
    goal: StreamGoalSchema.optional(),
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
    error: z.boolean().nullable().optional(),
    error_message: z.string().nullable().optional(),
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

export const PropertyAssignmentSchema = z
  .object({
    name: z.string(),
    value: z.string(),
  })
  .passthrough();
export type PropertyAssignment = z.infer<typeof PropertyAssignmentSchema>;

export const PropertyValueStatisticSchema = z
  .object({
    value: z.string(),
    successful_attack_count: z.number().int(),
    total_attack_count: z.number().int(),
    success_rate: z.number(),
  })
  .passthrough();
export type PropertyValueStatistic = z.infer<typeof PropertyValueStatisticSchema>;

export const PropertyStatisticSchema = z
  .object({
    property_name: z.string(),
    values: z.array(PropertyValueStatisticSchema),
  })
  .passthrough();
export type PropertyStatistic = z.infer<typeof PropertyStatisticSchema>;

/** The standalone property-stats endpoint also permits arbitrary aggregate objects. */
export const PropertyStatisticResultSchema = PropertyStatisticSchema.partial();
export type PropertyStatisticResult = z.infer<typeof PropertyStatisticResultSchema>;

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
    error: z.union([z.boolean(), z.null()]).optional(),
    prompt_id: z.string(),
    prompt_text: z.string(),
    goal: z.string().nullable().optional(),
    user_defined_goal: z.boolean().optional(),
    properties: z.array(PropertyAssignmentSchema).optional(),
    attack_id: z.string().nullable().optional(),
    threat: z.boolean().nullable().optional(),
    attack_outputs: z.array(z.union([z.string(), CustomAttackOutputSchema])).optional(),
    asr: z.number().nullable().optional(),
    prompt_set_id: z.string().nullable().optional(),
    prompt_set_name: z.string().nullable().optional(),
  })
  .passthrough();
export type PromptDetailResponse = z.infer<typeof PromptDetailResponseSchema>;

export const CustomAttacksListResponseSchema = z
  .object({
    pagination: RedTeamPaginationSchema,
    data: z.array(PromptDetailResponseSchema),
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

export const ScoreTrendSeriesSchema = z
  .object({
    label: z.string(),
    data: z.array(z.number().nullable()),
  })
  .passthrough();
export type ScoreTrendSeries = z.infer<typeof ScoreTrendSeriesSchema>;

export const ScoreTrendResponseSchema = z
  .object({
    labels: z.array(z.string()),
    series: z.array(ScoreTrendSeriesSchema),
  })
  .passthrough();
export type ScoreTrendResponse = z.infer<typeof ScoreTrendResponseSchema>;

// ---------------------------------------------------------------------------
// DataPlane — Sentiment, Quota, Error Log schemas
// ---------------------------------------------------------------------------

export const SentimentRequestSchema = z
  .object({
    job_id: z.string().uuid(),
    up_vote: z.boolean().optional(),
    down_vote: z.boolean().optional(),
  })
  .passthrough();
export type SentimentRequest = z.infer<typeof SentimentRequestSchema>;

export const SentimentResponseSchema = z
  .object({
    job_id: z.string(),
    up_vote: z.boolean().optional(),
    down_vote: z.boolean().optional(),
  })
  .passthrough();
export type SentimentResponse = z.infer<typeof SentimentResponseSchema>;

export const QuotaDetailsSchema = z
  .object({
    allocated: z.number().int(),
    unlimited: z.boolean(),
    consumed: z.number().int(),
  })
  .passthrough();
export type QuotaDetails = z.infer<typeof QuotaDetailsSchema>;

export const QuotaSummarySchema = z
  .object({
    static: QuotaDetailsSchema,
    dynamic: QuotaDetailsSchema,
    custom: QuotaDetailsSchema,
  })
  .passthrough();
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
// Supported languages (data plane & management plane)
// ---------------------------------------------------------------------------

/** A single language option (code + display name). */
export const LanguageOptionSchema = z.object({ code: z.string(), name: z.string() }).passthrough();
export type LanguageOption = z.infer<typeof LanguageOptionSchema>;

/** Tenant's allowed languages for Red Team scans. */
export const TenantLanguagesResponseSchema = z
  .object({
    multilingual_enabled: z.boolean(),
    supported_job_types: z.array(z.string()),
    languages: z.array(LanguageOptionSchema),
  })
  .passthrough();
export type TenantLanguagesResponse = z.infer<typeof TenantLanguagesResponseSchema>;

// ---------------------------------------------------------------------------
// Management — Custom target adapters (spec: mp-openapi 0.7.67, Adapters service)
// ---------------------------------------------------------------------------

/** Whether an adapter configuration variable is a plain var or a sensitive secret. */
export const AdapterVarTypeSchema = z.enum(['VAR', 'SECRET']);
export type AdapterVarType = z.infer<typeof AdapterVarTypeSchema>;

/**
 * A single adapter configuration variable, as *sent* in requests (spec `AdapterVarBase`).
 * Also the shape of `TargetCreateRequest.adapter_variable_overrides` entries.
 *
 * On update, `value: null` means "keep the existing value" — the mechanism for leaving a
 * secret unchanged, since secret values are never returned.
 */
export const AdapterVarSchema = z.object({
  key: z.string().max(255),
  value: z.string().nullable().optional(),
  type: AdapterVarTypeSchema,
});
export type AdapterVar = z.infer<typeof AdapterVarSchema>;

/**
 * A variable as *returned* in adapter responses (spec `AdapterVarResponseSchema`).
 *
 * Secrets are masked with `is_redacted: true`. The spec says the masked `value` is `null`, but a
 * live tenant returns the literal placeholder string `'**********'` (verified 2026-08-01) — so
 * treat `is_redacted`, not the value, as the signal. Either form round-trips: pass the variable
 * back on validate/update alongside `adapter_uuid` and the real value is resolved from storage.
 */
export const AdapterVarResponseSchema = AdapterVarSchema.extend({
  is_redacted: z.boolean().optional(),
}).passthrough();
export type AdapterVarResponse = z.infer<typeof AdapterVarResponseSchema>;

export const AdapterCreateRequestSchema = z
  .object({
    name: z.string().max(255),
    description: z.string().nullable().optional(),
    script_b64: z.string(),
    /** Optional while the adapter is a DRAFT; required to activate (`validate: true`). */
    network_broker_channel_uuid: z.string().uuid().nullable().optional(),
    variables: z.array(AdapterVarSchema).optional(),
    /** Sample prompt used to exercise the adapter end-to-end during validation. Not stored. */
    prompt: z.string(),
  })
  .strict();
export type AdapterCreateRequest = z.infer<typeof AdapterCreateRequestSchema>;

/**
 * Update is a **full replacement** (PUT): `name`, `script_b64`, and `prompt` are required,
 * exactly as on create — this is not a partial patch.
 *
 * `variables` defines the complete desired key set:
 * - value provided → set/add the value
 * - value `null`   → keep the existing value (unchanged secrets)
 * - key omitted    → **delete** the variable
 */
export const AdapterUpdateRequestSchema = z
  .object({
    name: z.string().max(255),
    description: z.string().nullable().optional(),
    script_b64: z.string(),
    network_broker_channel_uuid: z.string().uuid().nullable().optional(),
    variables: z.array(AdapterVarSchema).optional(),
    prompt: z.string(),
  })
  .strict();
export type AdapterUpdateRequest = z.infer<typeof AdapterUpdateRequestSchema>;

/**
 * Full adapter record (spec `CustomTargetAdapterSchema`) — returned by get, create, and update.
 * List rows use the smaller {@link AdapterListItemSchema}.
 *
 * `status` values are `DRAFT` | `ACTIVE`; kept as an open string per house convention so a
 * new upstream status cannot break response parsing.
 */
export const AdapterResponseSchema = z
  .object({
    uuid: z.string().uuid(),
    tsg_id: z.string(),
    name: z.string(),
    script_b64: z.string(),
    status: z.string(),
    description: z.string().nullable().optional(),
    network_broker_channel_uuid: z.string().uuid().nullable().optional(),
    variables: z.array(AdapterVarResponseSchema).optional(),
    /** Number of targets currently referencing this adapter. */
    target_count: z.number().int().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    created_by_user_id: z.string().uuid().nullable().optional(),
    updated_by_user_id: z.string().uuid().nullable().optional(),
  })
  .passthrough();
export type AdapterResponse = z.infer<typeof AdapterResponseSchema>;

/**
 * One list row (spec `CustomTargetAdapterListItemSchema`) — a 7-field subset. List rows carry
 * no `script_b64`, `tsg_id`, `description`, or `variables`; call `get()` for the full record.
 * `target_count` is populated only when the list was requested with `include_target_count`.
 */
export const AdapterListItemSchema = z
  .object({
    uuid: z.string().uuid(),
    name: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by_user_id: z.string().uuid().nullable().optional(),
    target_count: z.number().int().nullable().optional(),
  })
  .passthrough();
export type AdapterListItem = z.infer<typeof AdapterListItemSchema>;

export const AdapterListSchema = z
  .object({
    pagination: RedTeamPaginationSchema,
    data: z.array(AdapterListItemSchema).optional(),
  })
  .passthrough();
export type AdapterList = z.infer<typeof AdapterListSchema>;

/**
 * Request for `POST /v1/adapters/validate` (spec `CustomTargetAdapterValidateRequestSchema`).
 * Deliberately NOT the create request: there is no `name`, `network_broker_channel_uuid` is
 * **required**, and `adapter_uuid` may reference an existing adapter so redacted/`null`
 * variable values are resolved from its stored secret before validation.
 */
export const AdapterValidateRequestSchema = z
  .object({
    script_b64: z.string(),
    network_broker_channel_uuid: z.string().uuid(),
    prompt: z.string(),
    variables: z.array(AdapterVarSchema).optional(),
    /** Omit when validating a brand-new adapter. */
    adapter_uuid: z.string().uuid().nullable().optional(),
  })
  .strict();
export type AdapterValidateRequest = z.infer<typeof AdapterValidateRequestSchema>;

/**
 * Result of a validation run (spec `CustomTargetAdapterValidateResponseSchema`) — the script's
 * execution outcome, not an adapter record.
 */
export const AdapterValidateResponseSchema = z
  .object({
    validated: z.boolean(),
    stdout: z.string().nullable().optional(),
    stderr: z.string().nullable().optional(),
    traceback: z.string().nullable().optional(),
  })
  .passthrough();
export type AdapterValidateResponse = z.infer<typeof AdapterValidateResponseSchema>;

// ---------------------------------------------------------------------------
// Management — Target schemas
// ---------------------------------------------------------------------------

/** Shared base fields for target create, update, and probe requests. */
const TargetRequestBaseFields = {
  name: z.string(),
  description: z.string().nullable().optional(),
  target_type: z.nativeEnum(TargetType).nullable().optional(),
  connection_type: z.nativeEnum(TargetConnectionType).nullable().optional(),
  api_endpoint_type: z.nativeEnum(ApiEndpointType).nullable().optional(),
  response_mode: z.nativeEnum(ResponseMode).nullable().optional(),
  connection_params: ConnectionParamsRequestSchema.nullable().optional(),
  auth_config: AuthConfigRequestSchema.nullable().optional(),
  auth_type: z.nativeEnum(TargetAuthType).nullable().optional(),
  canonical_id: z.string().max(512).nullable().optional(),
  session_supported: z.boolean().optional(),
  target_metadata: TargetMetadataSchema.optional(),
  target_background: TargetBackgroundSchema.nullable().optional(),
  additional_context: TargetAdditionalContextSchema.nullable().optional(),
  extra_info: z.record(z.unknown()).nullable().optional(),
  network_broker_channel_uuid: z.string().uuid().nullable().optional(),
  /** UUID of the custom target adapter to use. Required when connection_type is CUSTOM_TARGET_ADAPTER. */
  adapter_uuid: z.string().uuid().nullable().optional(),
  /** Per-target overrides for the adapter's variables. Array of AdapterVar objects. */
  adapter_variable_overrides: z.array(AdapterVarSchema).nullable().optional(),
} as const;

export const TargetCreateRequestSchema = z.object(TargetRequestBaseFields).strict();
export type TargetCreateRequest = z.infer<typeof TargetCreateRequestSchema>;

export const TargetUpdateRequestSchema = z.object(TargetRequestBaseFields).strict();
export type TargetUpdateRequest = z.infer<typeof TargetUpdateRequestSchema>;

export const TargetContextUpdateSchema = z
  .object({
    target_background: TargetBackgroundSchema.nullable().optional(),
    additional_context: TargetAdditionalContextSchema.nullable().optional(),
  })
  .passthrough();
export type TargetContextUpdate = z.infer<typeof TargetContextUpdateSchema>;

export const TargetResponseSchema = z
  .object({
    adapter_uuid: z.union([z.string(), z.null()]).optional(),
    canonical_id: z.union([z.string(), z.null()]).optional(),
    adapter_secret_version: z.union([z.string(), z.null()]).optional(),
    profiling_progress: z.union([z.number().int(), z.null()]).optional(),
    connection_params: ConnectionParamsSchema.nullable().optional(),
    auth_config: AuthConfigSchema.nullable().optional(),
    network_broker_channel_uuid: z.union([z.string(), z.null()]).optional(),
    adapter_variable_overrides: z.array(AdapterVarResponseSchema).nullable().optional(),
    uuid: z.string(),
    tsg_id: z.string(),
    name: z.string(),
    status: z.string(),
    active: z.boolean(),
    validated: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.string().nullable().optional(),
    target_type: z.string().nullable().optional(),
    connection_type: z.string().nullable().optional(),
    api_endpoint_type: z.string().nullable().optional(),
    response_mode: z.string().nullable().optional(),
    session_supported: z.boolean().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
    version: z.number().int().nullable().optional(),
    secret_version: z.string().nullable().optional(),
    created_by_user_id: z.string().nullable().optional(),
    updated_by_user_id: z.string().nullable().optional(),
    target_metadata: TargetMetadataSchema.optional(),
    target_background: TargetBackgroundSchema.nullable().optional(),
    profiling_status: z.string().nullable().optional(),
    additional_context: TargetAdditionalContextSchema.nullable().optional(),
    auth_type: z.string().nullable().optional(),
  })
  .passthrough();
export type TargetResponse = z.infer<typeof TargetResponseSchema>;

export const TargetListItemSchema = z
  .object({
    adapter_uuid: z.union([z.string(), z.null()]).optional(),
    profiling_status: z.union([z.string(), z.null()]).optional(),
    canonical_id: z.union([z.string(), z.null()]).optional(),
    uuid: z.string(),
    tsg_id: z.string(),
    name: z.string(),
    status: z.string(),
    active: z.boolean(),
    validated: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.string().nullable().optional(),
    target_type: z.string().nullable().optional(),
    connection_type: z.string().nullable().optional(),
    api_endpoint_type: z.string().nullable().optional(),
    response_mode: z.string().nullable().optional(),
    session_supported: z.boolean().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
    version: z.number().int().nullable().optional(),
    secret_version: z.string().nullable().optional(),
    created_by_user_id: z.string().nullable().optional(),
    updated_by_user_id: z.string().nullable().optional(),
    auth_type: z.string().nullable().optional(),
  })
  .passthrough();
export type TargetListItem = z.infer<typeof TargetListItemSchema>;

export const TargetListSchema = z
  .object({ pagination: RedTeamPaginationSchema, data: z.array(TargetListItemSchema).optional() })
  .passthrough();
export type TargetList = z.infer<typeof TargetListSchema>;

export const TargetProbeRequestSchema = z
  .object({
    ...TargetRequestBaseFields,
    uuid: z.string().uuid().nullable().optional(),
    probe_fields: z.array(z.string()).nullable().optional(),
  })
  .strict();
export type TargetProbeRequest = z.infer<typeof TargetProbeRequestSchema>;

export const TargetAuthValidationRequestSchema = z
  .object({
    auth_type: z.nativeEnum(TargetAuthType),
    auth_config: AuthConfigRequestSchema,
    target_id: z.string().uuid().nullable().optional(),
    network_broker_channel_uuid: z.string().uuid().nullable().optional(),
  })
  .passthrough();
export type TargetAuthValidationRequest = z.infer<typeof TargetAuthValidationRequestSchema>;

export const TargetAuthValidationResponseSchema = z
  .object({
    validated: z.boolean(),
    token_preview: z.string().nullable().optional(),
    expires_in: z.number().int().nullable().optional(),
  })
  .passthrough();
export type TargetAuthValidationResponse = z.infer<typeof TargetAuthValidationResponseSchema>;

export const TargetProfileResponseSchema = z
  .object({
    other_details_prettified: z
      .union([
        z
          .object({
            execution_environment: z.object({}).passthrough().optional(),
            core_architecture_and_identity: z.object({}).passthrough().optional(),
            tools_and_integrations: z.object({}).passthrough().optional(),
            audience_and_governance: z.object({}).passthrough().optional(),
            performance_and_metrics: z.object({}).passthrough().optional(),
            content_policy: z.object({}).passthrough().optional(),
            other_discoveries: z.object({}).passthrough().optional(),
          })
          .passthrough(),
        z.null(),
      ])
      .optional(),
    ai_generated_items: z
      .union([
        z
          .object({
            languages_supported: z
              .union([
                z
                  .object({
                    ai_discovered_items: z.array(z.string()),
                    current_items: z.array(
                      z
                        .object({
                          value: z.string(),
                          is_ai_generated: z.boolean(),
                          country_code: z.union([z.string(), z.null()]).optional(),
                        })
                        .passthrough(),
                    ),
                    ai_count: z.number().int().optional(),
                    user_count: z.number().int().optional(),
                  })
                  .passthrough(),
                z.null(),
              ])
              .optional(),
            tools_accessible: z
              .union([
                z
                  .object({
                    ai_discovered_items: z.array(z.string()),
                    current_items: z.array(
                      z.object({ value: z.string(), is_ai_generated: z.boolean() }).passthrough(),
                    ),
                    ai_count: z.number().int().optional(),
                    user_count: z.number().int().optional(),
                  })
                  .passthrough(),
                z.null(),
              ])
              .optional(),
            banned_keywords: z
              .union([
                z
                  .object({
                    ai_discovered_items: z.array(z.string()),
                    current_items: z.array(
                      z.object({ value: z.string(), is_ai_generated: z.boolean() }).passthrough(),
                    ),
                    ai_count: z.number().int().optional(),
                    user_count: z.number().int().optional(),
                  })
                  .passthrough(),
                z.null(),
              ])
              .optional(),
            competitors: z
              .union([
                z
                  .object({
                    ai_discovered_items: z.array(z.string()),
                    current_items: z.array(
                      z.object({ value: z.string(), is_ai_generated: z.boolean() }).passthrough(),
                    ),
                    ai_count: z.number().int().optional(),
                    user_count: z.number().int().optional(),
                  })
                  .passthrough(),
                z.null(),
              ])
              .optional(),
            base_model: z
              .union([
                z
                  .object({
                    ai_discovered_value: z.string(),
                    is_ai_generated: z.boolean().optional(),
                  })
                  .passthrough(),
                z.null(),
              ])
              .optional(),
            core_architecture: z
              .union([
                z
                  .object({
                    ai_discovered_value: z.string(),
                    is_ai_generated: z.boolean().optional(),
                  })
                  .passthrough(),
                z.null(),
              ])
              .optional(),
            system_prompt: z
              .union([
                z
                  .object({
                    ai_discovered_value: z.string(),
                    is_ai_generated: z.boolean().optional(),
                  })
                  .passthrough(),
                z.null(),
              ])
              .optional(),
          })
          .passthrough(),
        z.null(),
      ])
      .optional(),
    profiling_completed_at: z.union([z.string(), z.null()]).optional(),
    profiling_progress: z.union([z.number().int(), z.null()]).optional(),
    target_id: z.string(),
    target_version: z.number().int(),
    status: z.string(),
    profiling_status: z.string().nullable().optional(),
    target_background: TargetBackgroundSchema.nullable().optional(),
    additional_context: TargetAdditionalContextSchema.nullable().optional(),
    ai_generated_fields: z.array(z.string()).nullable().optional(),
    other_details: z
      .object({ items: z.record(z.unknown()).optional() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();
export type TargetProfileResponse = z.infer<typeof TargetProfileResponseSchema>;

export const TargetTemplateCollectionSchema = z
  .object({
    OPENAI: z.record(z.unknown()),
    HUGGING_FACE: z.record(z.unknown()),
    DATABRICKS: z.record(z.unknown()),
    BEDROCK: z.record(z.unknown()),
    REST: z.record(z.unknown()),
    STREAMING: z.record(z.unknown()),
    WEBSOCKET: z.record(z.unknown()),
  })
  .passthrough();
export type TargetTemplateCollection = z.infer<typeof TargetTemplateCollectionSchema>;

export const BaseResponseSchema = z
  .object({
    message: z.string(),
    status: z.number().int(),
  })
  .passthrough();
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

export const CustomPromptSetCreateRequestSchema = z
  .object({
    language: z
      .enum([
        'ar',
        'bn',
        'zh-CN',
        'zh-TW',
        'nl',
        'en',
        'fr',
        'de',
        'hi',
        'id',
        'it',
        'ja',
        'ko',
        'pl',
        'pt',
        'ru',
        'es',
        'sv',
        'th',
        'tr',
        'vi',
      ])
      .optional(),
    name: z.string().max(255),
    description: z.string().nullable().optional(),
    property_names: z.array(z.string()).optional(),
  })
  .passthrough();
export type CustomPromptSetCreateRequest = z.infer<typeof CustomPromptSetCreateRequestSchema>;

export const CustomPromptSetUpdateRequestSchema = z
  .object({
    name: z.string().max(255).nullable().optional(),
    description: z.string().nullable().optional(),
    archive: z.boolean().nullable().optional(),
    property_names: z.array(z.string()).nullable().optional(),
  })
  .passthrough();
export type CustomPromptSetUpdateRequest = z.infer<typeof CustomPromptSetUpdateRequestSchema>;

export const CustomPromptSetArchiveRequestSchema = z.object({ archive: z.boolean() }).passthrough();
export type CustomPromptSetArchiveRequest = z.infer<typeof CustomPromptSetArchiveRequestSchema>;

export const CustomPromptSetResponseSchema = z
  .object({
    language: z.object({ code: z.string(), name: z.string() }).passthrough().optional(),
    uuid: z.string(),
    name: z.string(),
    active: z.boolean(),
    archive: z.boolean(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.string().nullable().optional(),
    property_names: z.array(z.string()).optional(),
    properties: z.array(z.lazy(() => PropertyDefinitionSchema)).optional(),
    stats: PromptSetStatsSchema.nullable().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
    version: z.string().nullable().optional(),
    created_by_user_id: z.string().nullable().optional(),
    updated_by_user_id: z.string().nullable().optional(),
  })
  .passthrough();
export type CustomPromptSetResponse = z.infer<typeof CustomPromptSetResponseSchema>;

export const CustomPromptSetListItemSchema = z
  .object({
    language: z.object({ code: z.string(), name: z.string() }).passthrough().optional(),
    uuid: z.string(),
    name: z.string(),
    active: z.boolean(),
    archive: z.boolean(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.string().nullable().optional(),
    property_names: z.array(z.string()).optional(),
    stats: PromptSetStatsSchema.nullable().optional(),
    created_by_user_id: z.string().nullable().optional(),
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

export const CustomPromptSetReferenceSchema = z
  .object({
    language: z.string().optional(),
    uuid: z.string(),
    name: z.string(),
    status: z.string(),
    active: z.boolean(),
    tsg_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    version: z.string().nullable().optional(),
  })
  .passthrough();
export type CustomPromptSetReference = z.infer<typeof CustomPromptSetReferenceSchema>;

export const CustomPromptSetListActiveSchema = z
  .object({ data: z.array(CustomPromptSetReferenceSchema).optional() })
  .passthrough();
export type CustomPromptSetListActive = z.infer<typeof CustomPromptSetListActiveSchema>;

export const CustomPromptSetVersionInfoSchema = z
  .object({
    uuid: z.string(),
    status: z.string(),
    is_latest: z.boolean(),
    version: z.string().nullable().optional(),
    stats: PromptSetStatsSchema.nullable().optional(),
    snapshot_created_at: z.string().nullable().optional(),
  })
  .passthrough();
export type CustomPromptSetVersionInfo = z.infer<typeof CustomPromptSetVersionInfoSchema>;

export const CustomPromptCreateRequestSchema = z
  .object({
    prompt: z.string(),
    prompt_set_id: z.string().uuid(),
    goal: z.string().nullable().optional(),
    properties: z.record(z.string()).optional(),
  })
  .passthrough();
export type CustomPromptCreateRequest = z.infer<typeof CustomPromptCreateRequestSchema>;

export const CustomPromptUpdateRequestSchema = z
  .object({
    prompt: z.string().nullable().optional(),
    goal: z.string().nullable().optional(),
    properties: z.record(z.string()).nullable().optional(),
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
    goal: z.string().nullable().optional(),
    properties: z.record(z.string()).optional(),
    property_assignments: z
      .array(z.object({ property_name: z.string(), property_value: z.string() }).passthrough())
      .optional(),
    detector_category: z.string().nullable().optional(),
    severity: z.string().nullable().optional(),
    extra_info: z.record(z.unknown()).nullable().optional(),
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
    goal: z.string().nullable().optional(),
    properties: z.record(z.string()).optional(),
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

export const PropertyNameCreateRequestSchema = z
  .object({ name: z.string().max(256) })
  .passthrough();
export type PropertyNameCreateRequest = z.infer<typeof PropertyNameCreateRequestSchema>;

export const PropertyValueCreateRequestSchema = z
  .object({
    property_name: z.string(),
    property_value: z.string().max(256),
  })
  .passthrough();
export type PropertyValueCreateRequest = z.infer<typeof PropertyValueCreateRequestSchema>;

export const PropertyDefinitionSchema = z
  .object({
    property_name: z.string(),
    created_at: z.string(),
  })
  .passthrough();
export type PropertyDefinition = z.infer<typeof PropertyDefinitionSchema>;

export const PropertyNamesListResponseSchema = z
  .object({ data: z.array(z.string()).optional() })
  .passthrough();
export type PropertyNamesListResponse = z.infer<typeof PropertyNamesListResponseSchema>;

/** Property-name creation: the specified list response or a legacy status response. */
export const PropertyNameCreateResponseSchema = z.union([
  BaseResponseSchema,
  PropertyNamesListResponseSchema,
]);
export type PropertyNameCreateResponse = z.infer<typeof PropertyNameCreateResponseSchema>;

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

// ---------------------------------------------------------------------------
// Management — EULA schemas
// ---------------------------------------------------------------------------

export const EulaAcceptRequestSchema = z
  .object({
    eula_content: z.string(),
    accepted_at: z.string().nullable().optional(),
  })
  .passthrough();
export type EulaAcceptRequest = z.infer<typeof EulaAcceptRequestSchema>;

export const EulaContentResponseSchema = z
  .object({
    content: z.string(),
  })
  .passthrough();
export type EulaContentResponse = z.infer<typeof EulaContentResponseSchema>;

export const EulaResponseSchema = z
  .object({
    uuid: z.string().nullable().optional(),
    is_accepted: z.boolean(),
    accepted_at: z.string().nullable().optional(),
    accepted_by_user_id: z.string().nullable().optional(),
  })
  .passthrough();
export type EulaResponse = z.infer<typeof EulaResponseSchema>;

// ---------------------------------------------------------------------------
// Management — Instance/Licensing schemas
// ---------------------------------------------------------------------------

export const DeviceInstanceSchema = z
  .object({
    app_id: z.string(),
    region: z.string(),
    tenant_id: z.string(),
    tsg_id: z.string(),
  })
  .passthrough();
export type DeviceInstance = z.infer<typeof DeviceInstanceSchema>;

export const DeviceLicenseSchema = z
  .object({
    authorizationCode: z.string().optional(),
    expirationDate: z.string().optional(),
    licensePanDbIdentification: z.string().optional(),
    partNumber: z.string().optional(),
    serialNumber: z.string().optional(),
    subtypeName: z.string().optional(),
    registrationDate: z.string().optional(),
  })
  .passthrough();
export type DeviceLicense = z.infer<typeof DeviceLicenseSchema>;

export const DeviceSchema = z
  .object({
    serial_number: z.string(),
    model: z.string().optional(),
    sku: z.string().optional(),
    device_type: z.string().optional(),
    device_name: z.string().optional(),
    tsg_id: z.string().optional(),
    support_account_id: z.string().optional(),
    asset_type: z.string().optional(),
    licenses: z.array(DeviceLicenseSchema).optional(),
  })
  .passthrough();
export type Device = z.infer<typeof DeviceSchema>;

export const DeviceStatusSchema = z
  .object({
    status: z.string(),
    error: z.string().optional(),
    serial_number: z.string().optional(),
  })
  .passthrough();
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;

export const DeviceRequestSchema = z
  .object({
    instance: DeviceInstanceSchema,
    created_by: z.string().optional(),
    devices: z.array(DeviceSchema).optional(),
  })
  .passthrough();
export type DeviceRequest = z.infer<typeof DeviceRequestSchema>;

export const DeviceResponseSchema = z
  .object({
    devices: z.array(DeviceStatusSchema).optional(),
    status: z.string().optional(),
  })
  .passthrough();
export type DeviceResponse = z.infer<typeof DeviceResponseSchema>;

export const DeploymentProfileAttributeSchema = z
  .object({
    quantity: z.number().optional(),
    unit_of_measure: z.string().optional(),
  })
  .passthrough();
export type DeploymentProfileAttribute = z.infer<typeof DeploymentProfileAttributeSchema>;

export const DeploymentProfileRequestSchema = z
  .object({
    dAuthCode: z.string().optional(),
    deploymentProfileId: z.string().optional(),
    license_expiration: z.string().optional(),
    profileName: z.string().optional(),
    subType: z.string().optional(),
    subscriptions: z.string().optional(),
    type: z.string().optional(),
    aveTextRecord: z.number().default(0),
    attributes: z.array(DeploymentProfileAttributeSchema).optional(),
  })
  .passthrough();
export type DeploymentProfileRequest = z.infer<typeof DeploymentProfileRequestSchema>;

export const InstanceExtraDetailsSchema = z
  .object({
    deployment_profiles: z.array(DeploymentProfileRequestSchema).optional(),
    airs_shared_by_tsg: z.string().optional(),
    airs_unshared_dps: z.string().optional(),
  })
  .passthrough();
export type InstanceExtraDetails = z.infer<typeof InstanceExtraDetailsSchema>;

export const InstanceRequestSchema = z
  .object({
    tsg_id: z.string(),
    tenant_id: z.string(),
    app_id: z.string(),
    region: z.string(),
    support_account_id: z.string().optional(),
    support_account_name: z.string().optional(),
    created_by: z.string().optional(),
    internal: z.boolean().optional(),
    tenant_instance_name: z.string().optional(),
    extra: InstanceExtraDetailsSchema.optional(),
    iam_controlled: z.boolean().optional(),
    platform_region: z.string().optional(),
    csp_tenant_id: z.string().optional(),
    tsg_instances: z.unknown().optional(),
  })
  .passthrough();
export type InstanceRequest = z.infer<typeof InstanceRequestSchema>;

export const InstanceResponseSchema = z
  .object({
    tsg_id: z.string(),
    tenant_id: z.string().optional(),
    app_id: z.string().optional(),
    is_success: z.boolean().optional(),
  })
  .passthrough();
export type InstanceResponse = z.infer<typeof InstanceResponseSchema>;

export const InstanceGetResponseSchema = z
  .object({
    tsg_id: z.string(),
    tenant_id: z.string(),
    app_id: z.string(),
    region: z.string(),
    support_account_id: z.string().optional(),
    support_account_name: z.string().optional(),
    created_by: z.string().optional(),
    internal: z.boolean().optional(),
    tenant_instance_name: z.string().optional(),
    deployment_profiles: z.array(DeploymentProfileRequestSchema).optional(),
  })
  .passthrough();
export type InstanceGetResponse = z.infer<typeof InstanceGetResponseSchema>;

export const RegistryCredentialsSchema = z
  .object({
    token: z.string(),
    expiry: z.string(),
  })
  .passthrough();
export type RegistryCredentials = z.infer<typeof RegistryCredentialsSchema>;
