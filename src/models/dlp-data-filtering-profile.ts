import { z } from 'zod';
import { AuditResponseSchema } from './dlp-audit.js';
import { pageSchema } from './dlp-page.js';

/** App exclusion entry — application-level bypass for DLP scanning. */
export const AppExclusionSchema = z
  .object({
    app_id: z.string().nullish(),
    app_name: z.string().nullish(),
    type: z.string().nullish(),
  })
  .passthrough();
export type AppExclusion = z.infer<typeof AppExclusionSchema>;

/** URL exclusion entry — URL-level bypass for DLP scanning. */
export const URLExclusionSchema = z
  .object({
    type: z.string().nullish(),
    url_id: z.string().nullish(),
    url_name: z.string().nullish(),
  })
  .passthrough();
export type URLExclusion = z.infer<typeof URLExclusionSchema>;

/** Exclusions block — wraps app, URL, and arbitrary keyword exclusion lists. */
export const ExclusionsSchema = z
  .object({
    app_exclusion_list: z.array(AppExclusionSchema).nullish(),
    url_exclusion_list: z.array(URLExclusionSchema).nullish(),
    /**
     * Map of category-name → string-array. `additionalProperties: { type: array of string }`
     * in the OpenAPI spec; modeled here as `z.record(z.array(z.string()))`.
     */
    exclusion_list: z.record(z.array(z.string())).nullish(),
  })
  .passthrough();
export type Exclusions = z.infer<typeof ExclusionsSchema>;

/** Source attributes for an exception rule. */
export const SourceAttributesSchema = z
  .object({
    match_any: z.boolean().nullish(),
    user_group_ids: z.array(z.string()).nullish(),
    user_ids: z.array(z.string()).nullish(),
  })
  .passthrough();
export type SourceAttributes = z.infer<typeof SourceAttributesSchema>;

/** Destination attributes for an exception rule. */
export const DestinationAttributesSchema = z
  .object({
    match_any: z.boolean().nullish(),
    app_ids: z.array(z.string()).nullish(),
    url_patterns: z.array(z.string()).nullish(),
  })
  .passthrough();
export type DestinationAttributes = z.infer<typeof DestinationAttributesSchema>;

/** Exception rule — bypass that fires before the main filter logic. */
export const ExceptionRuleDTOSchema = z
  .object({
    id: z.string().nullish(),
    action: z.enum(['ALLOW', 'ALERT', 'BLOCK']).nullish(),
    log_severity: z.enum(['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).nullish(),
    /**
     * `int64` per spec; declared as `z.number()` since JS numbers cover any realistic
     * data_profile_id and the SDK never round-trips these unmodified.
     */
    data_profile_ids: z.array(z.number()).nullish(),
    destination_attributes: DestinationAttributesSchema.nullish(),
    source_attributes: SourceAttributesSchema.nullish(),
  })
  .passthrough();
export type ExceptionRuleDTO = z.infer<typeof ExceptionRuleDTOSchema>;

/** Secondary filtering rule (rule1 / rule2 slots on a profile). */
export const DataFilteringRuleDTOSchema = z
  .object({
    action: z.string().nullish(),
    response_page: z.string().nullish(),
    show_rsp_page: z.string().nullish(),
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
    action: z.string().nullish(),
    dataProfileId: z.number().nullish(),
    direction: z.string().nullish(),
    euc_template_id: z.string().nullish(),
    fileBased: z.string().nullish(),
    fileTypes: z.array(z.string()).nullish(),
    is_end_user_coaching_enabled: z.boolean().nullish(),
    logSeverity: z.string().nullish(),
    nonFileBased: z.string().nullish(),
    scanType: z.string().nullish(),
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

/**
 * Response payload returned by GET / PUT on a Data Filtering Profile.
 *
 * Every optional field is `.nullish()` — the live API emits `null` (not `undefined`)
 * for unset values across the entire resource family.
 */
export const DataFilteringProfileResponseSchema = z
  .object({
    id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    tenant_id: z.string().nullish(),
    type: z.string().nullish(),
    data_profile_id: z.number().nullish(),
    direction: z.string().nullish(),
    file_based: z.boolean().nullish(),
    non_file_based: z.boolean().nullish(),
    log_severity: z.string().nullish(),
    scan_type: z.enum(['include', 'exclude']).nullish(),
    is_end_user_coaching_enabled: z.boolean().nullish(),
    is_granular_profile: z.boolean().nullish(),
    is_parent_managed: z.boolean().nullish(),
    euc_template_id: z.string().nullish(),
    version: z.number().nullish(),
    file_type: z.array(z.string()).nullish(),
    audit_metadata: AuditResponseSchema.nullish(),
    criteria_details: z.array(DataFilteringDetailsSchema).nullish(),
    exception_rules: z.array(ExceptionRuleDTOSchema).nullish(),
    exclusions: ExclusionsSchema.nullish(),
    rule1: DataFilteringRuleDTOSchema.nullish(),
    rule2: DataFilteringRuleDTOSchema.nullish(),
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
