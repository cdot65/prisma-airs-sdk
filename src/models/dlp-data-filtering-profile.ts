import { z } from 'zod';
import { AuditResponseSchema } from './dlp-audit.js';
import { pageSchema } from './dlp-page.js';

/** App exclusion entry — application-level bypass for DLP scanning. */
export const AppExclusionSchema = z
  .object({
    app_id: z.string().optional(),
    app_name: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();
export type AppExclusion = z.infer<typeof AppExclusionSchema>;

/** URL exclusion entry — URL-level bypass for DLP scanning. */
export const URLExclusionSchema = z
  .object({
    type: z.string().optional(),
    url_id: z.string().optional(),
    url_name: z.string().optional(),
  })
  .passthrough();
export type URLExclusion = z.infer<typeof URLExclusionSchema>;

/** Exclusions block — wraps app, URL, and arbitrary keyword exclusion lists. */
export const ExclusionsSchema = z
  .object({
    app_exclusion_list: z.array(AppExclusionSchema).optional(),
    url_exclusion_list: z.array(URLExclusionSchema).optional(),
    /**
     * Map of category-name → string-array. `additionalProperties: { type: array of string }`
     * in the OpenAPI spec; modeled here as `z.record(z.array(z.string()))`.
     */
    exclusion_list: z.record(z.array(z.string())).optional(),
  })
  .passthrough();
export type Exclusions = z.infer<typeof ExclusionsSchema>;

/** Source attributes for an exception rule. */
export const SourceAttributesSchema = z
  .object({
    match_any: z.boolean().optional(),
    user_group_ids: z.array(z.string()).optional(),
    user_ids: z.array(z.string()).optional(),
  })
  .passthrough();
export type SourceAttributes = z.infer<typeof SourceAttributesSchema>;

/** Destination attributes for an exception rule. */
export const DestinationAttributesSchema = z
  .object({
    match_any: z.boolean().optional(),
    app_ids: z.array(z.string()).optional(),
    url_patterns: z.array(z.string()).optional(),
  })
  .passthrough();
export type DestinationAttributes = z.infer<typeof DestinationAttributesSchema>;

/** Exception rule — bypass that fires before the main filter logic. */
export const ExceptionRuleDTOSchema = z
  .object({
    id: z.string().optional(),
    action: z.enum(['ALLOW', 'ALERT', 'BLOCK']).optional(),
    log_severity: z.enum(['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    /**
     * `int64` per spec; declared as `z.number()` since JS numbers cover any realistic
     * data_profile_id and the SDK never round-trips these unmodified.
     */
    data_profile_ids: z.array(z.number()).optional(),
    destination_attributes: DestinationAttributesSchema.optional(),
    source_attributes: SourceAttributesSchema.optional(),
  })
  .passthrough();
export type ExceptionRuleDTO = z.infer<typeof ExceptionRuleDTOSchema>;

/** Secondary filtering rule (rule1 / rule2 slots on a profile). */
export const DataFilteringRuleDTOSchema = z
  .object({
    action: z.string().optional(),
    response_page: z.string().optional(),
    show_rsp_page: z.string().optional(),
  })
  .passthrough();
export type DataFilteringRuleDTO = z.infer<typeof DataFilteringRuleDTOSchema>;

/**
 * Granular criteria-detail block. Note the spec uses camelCase for these specific fields
 * (e.g. `dataProfileId`, `fileBased`, `scanType`) where the surrounding profile uses
 * snake_case — preserved verbatim to match the wire shape.
 */
export const DataFilteringDetailsSchema = z
  .object({
    action: z.string().optional(),
    dataProfileId: z.number().optional(),
    direction: z.string().optional(),
    euc_template_id: z.string().optional(),
    fileBased: z.string().optional(),
    fileTypes: z.array(z.string()).optional(),
    is_end_user_coaching_enabled: z.boolean().optional(),
    logSeverity: z.string().optional(),
    nonFileBased: z.string().optional(),
    scanType: z.string().optional(),
  })
  .passthrough();
export type DataFilteringDetails = z.infer<typeof DataFilteringDetailsSchema>;

/** Request payload for a full-replace PUT on a Data Filtering Profile. */
export const DataFilteringProfileRequestSchema = z
  .object({
    file_based: z.boolean(),
    non_file_based: z.boolean(),
    description: z.string().optional(),
    direction: z.enum(['BOTH', 'UPLOAD', 'DOWNLOAD']).optional(),
    log_severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']).optional(),
    scan_type: z.enum(['include', 'exclude']).optional(),
    /**
     * `int64` per spec; declared as `z.number()`. JS will lose precision above 2^53 but
     * real-world IDs stay well under that ceiling.
     */
    data_profile_id: z.number().optional(),
    euc_template_id: z.string().optional(),
    is_end_user_coaching_enabled: z.boolean().optional(),
    is_granular_profile: z.boolean().optional(),
    file_type: z.array(z.string()).optional(),
    criteria_details: z.array(DataFilteringDetailsSchema).optional(),
    exception_rules: z.array(ExceptionRuleDTOSchema).optional(),
    exclusions: ExclusionsSchema.optional(),
    rule1: DataFilteringRuleDTOSchema.optional(),
    rule2: DataFilteringRuleDTOSchema.optional(),
  })
  .passthrough();
export type DataFilteringProfileRequest = z.infer<typeof DataFilteringProfileRequestSchema>;

/** Response payload returned by GET / PUT on a Data Filtering Profile. */
export const DataFilteringProfileResponseSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    tenant_id: z.string().optional(),
    type: z.string().optional(),
    data_profile_id: z.number().optional(),
    direction: z.string().optional(),
    file_based: z.boolean().optional(),
    non_file_based: z.boolean().optional(),
    log_severity: z.string().optional(),
    scan_type: z.enum(['include', 'exclude']).optional(),
    is_end_user_coaching_enabled: z.boolean().optional(),
    is_granular_profile: z.boolean().optional(),
    is_parent_managed: z.boolean().optional(),
    euc_template_id: z.string().optional(),
    version: z.number().optional(),
    file_type: z.array(z.string()).optional(),
    audit_metadata: AuditResponseSchema.optional(),
    criteria_details: z.array(DataFilteringDetailsSchema).optional(),
    exception_rules: z.array(ExceptionRuleDTOSchema).optional(),
    exclusions: ExclusionsSchema.optional(),
    rule1: DataFilteringRuleDTOSchema.optional(),
    rule2: DataFilteringRuleDTOSchema.optional(),
  })
  .passthrough();
export type DataFilteringProfileResponse = z.infer<typeof DataFilteringProfileResponseSchema>;

/** Spring `Page<DataFilteringProfileResponse>` envelope returned by the list endpoint. */
export const PageDataFilteringProfileResponseSchema = pageSchema(
  DataFilteringProfileResponseSchema,
);
export type PageDataFilteringProfileResponse = z.infer<
  typeof PageDataFilteringProfileResponseSchema
>;
