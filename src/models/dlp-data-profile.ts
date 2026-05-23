import { z } from 'zod';
import { AuditResponseSchema } from './dlp-audit.js';
import { jsonNullable } from './dlp-json-nullable.js';
import { pageSchema } from './dlp-page.js';

/** Boolean operator on an expression-tree node. */
export const ExpressionOperatorTypeSchema = z.enum(['and', 'or', 'not', 'and_not', 'or_not']);
export type ExpressionOperatorType = z.infer<typeof ExpressionOperatorTypeSchema>;

/**
 * Detection technique on a rule item.
 *
 * Shared with `data-patterns` — kept duplicated rather than re-imported to keep the model
 * surfaces independent. If a new technique ships, update both files.
 */
export const RuleItemDetectionTechniqueSchema = z.enum([
  'edm',
  'document_fingerprint',
  'trainable_classifier',
  'ml_document',
  'regex',
  'weighted_regex',
  'ml',
  'titus_tag',
  'wildfire',
  'file_property',
  'dictionary',
  'pab',
  'document_classifier',
]);
export type RuleItemDetectionTechnique = z.infer<typeof RuleItemDetectionTechniqueSchema>;

/** include / exclude — how a matched item participates in the rule. */
export const RuleItemMatchTypeSchema = z.enum(['include', 'exclude']);
export type RuleItemMatchType = z.infer<typeof RuleItemMatchTypeSchema>;

/** Comparison operator on occurrence-count thresholds. */
export const RuleItemOccurrenceOperatorTypeSchema = z.enum([
  'any',
  'less_than_equal_to',
  'more_than_equal_to',
  'between',
]);
export type RuleItemOccurrenceOperatorType = z.infer<typeof RuleItemOccurrenceOperatorTypeSchema>;

/** Confidence level for a rule item. */
export const RuleItemConfidenceLevelSchema = z.enum(['low', 'medium', 'high']);
export type RuleItemConfidenceLevel = z.infer<typeof RuleItemConfidenceLevelSchema>;

/** EDM match-criteria for primary/secondary field sets. */
export const RuleItemEdmMatchCriteriaSchema = z.enum(['any', 'all']);
export type RuleItemEdmMatchCriteria = z.infer<typeof RuleItemEdmMatchCriteriaSchema>;

/** Profile type — basic = single expression tree; advanced = nested via multi_profile rules. */
export const DataProfileTypeSchema = z.enum(['basic', 'advanced']);
export type DataProfileType = z.infer<typeof DataProfileTypeSchema>;

/** Lifecycle status of a data profile. */
export const DataProfileStatusSchema = z.enum(['active', 'disabled', 'deleted']);
export type DataProfileStatus = z.infer<typeof DataProfileStatusSchema>;

/** Subtype classification of a data profile. */
export const DataProfileSubtypeSchema = z.enum(['custom', 'predefined']);
export type DataProfileSubtype = z.infer<typeof DataProfileSubtypeSchema>;

/**
 * Combined detection-rule item — covers all four OpenAPI subtypes (DataPattern, Dictionary,
 * DocumentType, EDM) as a single schema with each subtype's fields optional.
 *
 * The spec marks `detection_technique` as a discriminator, but every subtype's enum lists all
 * 13 technique values — there is no real partition. We therefore model the union as a single
 * passthrough object: required `detection_technique`, everything else optional. Set whatever
 * combination of fields the chosen technique demands.
 */
export const DetectionRuleItemSchema = z
  .object({
    detection_technique: RuleItemDetectionTechniqueSchema,
    id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    version: z.number().int().nullish(),
    match_type: RuleItemMatchTypeSchema.nullish(),
    by_unique_count: z.boolean().nullish(),
    confidence_level: RuleItemConfidenceLevelSchema.nullish(),
    supported_confidence_levels: z.array(RuleItemConfidenceLevelSchema).nullish(),
    occurrence_count: z.number().int().nullish(),
    occurrence_high: z.number().int().nullish(),
    occurrence_low: z.number().int().nullish(),
    occurrence_operator_type: RuleItemOccurrenceOperatorTypeSchema.nullish(),
    // dictionary + document-type fields
    score: z.number().int().nullish(),
    score_high: z.number().int().nullish(),
    score_low: z.number().int().nullish(),
    // edm fields
    edm_dataset_id: z.string().nullish(),
    primary_fields: z.array(z.string()).nullish(),
    primary_match_criteria: RuleItemEdmMatchCriteriaSchema.nullish(),
    primary_match_any_count: z.number().int().nullish(),
    secondary_fields: z.array(z.string()).nullish(),
    secondary_match_criteria: RuleItemEdmMatchCriteriaSchema.nullish(),
    secondary_match_any_count: z.number().int().nullish(),
  })
  .passthrough();
export type DetectionRuleItem = z.infer<typeof DetectionRuleItemSchema>;

/**
 * Recursive expression-tree node. A node has either child `sub_expressions` (nested boolean
 * structure) or a leaf `rule_item` (the actual detection criterion), and an `operator_type`
 * joining children.
 */
export interface ExpressionTreeNode {
  operator_type?: ExpressionOperatorType | null;
  rule_item?: DetectionRuleItem | null;
  sub_expressions?: ExpressionTreeNode[] | null;
  [key: string]: unknown;
}

export const ExpressionTreeNodeSchema: z.ZodType<ExpressionTreeNode> = z.lazy(() =>
  z
    .object({
      operator_type: ExpressionOperatorTypeSchema.nullish(),
      rule_item: DetectionRuleItemSchema.nullish(),
      sub_expressions: z.array(ExpressionTreeNodeSchema).nullish(),
    })
    .passthrough(),
);

/**
 * Multi-profile data node — references other data profiles by id, joined by an operator.
 * `data_profile_ids` are `int64` on the wire; JavaScript safe-integer caveats apply for ids
 * above `Number.MAX_SAFE_INTEGER` (~9 × 10^15).
 */
export const MultiProfileDataNodeSchema = z
  .object({
    data_profile_ids: z.array(z.number()).nullish(),
    operator_type: ExpressionOperatorTypeSchema.nullish(),
  })
  .passthrough();
export type MultiProfileDataNode = z.infer<typeof MultiProfileDataNodeSchema>;

/** `expression_tree` variant of `DetectionRule` — carries a recursive node. */
export const DefaultTreeDetectionRuleSchema = z
  .object({
    rule_type: z.literal('expression_tree'),
    expression_tree: ExpressionTreeNodeSchema.nullish(),
  })
  .passthrough();
export type DefaultTreeDetectionRule = z.infer<typeof DefaultTreeDetectionRuleSchema>;

/** `multi_profile` variant of `DetectionRule` — carries a multi-profile node. */
export const MultiProfileDetectionRuleSchema = z
  .object({
    rule_type: z.literal('multi_profile'),
    multi_profile: MultiProfileDataNodeSchema.nullish(),
  })
  .passthrough();
export type MultiProfileDetectionRule = z.infer<typeof MultiProfileDetectionRuleSchema>;

/**
 * Detection rule discriminated by `rule_type`:
 * - `expression_tree` → `DefaultTreeDetectionRule`
 * - `multi_profile` → `MultiProfileDetectionRule`
 */
export const DetectionRuleSchema = z.discriminatedUnion('rule_type', [
  DefaultTreeDetectionRuleSchema,
  MultiProfileDetectionRuleSchema,
]);
export type DetectionRule = z.infer<typeof DetectionRuleSchema>;

/** Request payload for POST (create) and PUT (full-replace). */
export const AdvancedDataProfileRequestSchema = z
  .object({
    name: z.string().min(1).max(64),
    detection_rules: z.array(DetectionRuleSchema),
    description: z.string().optional(),
    is_granular_data_profile: z.boolean().optional(),
  })
  .passthrough();
export type AdvancedDataProfileRequest = z.infer<typeof AdvancedDataProfileRequestSchema>;

/**
 * Request payload for PATCH (JSON Merge Patch, RFC 7396).
 *
 * Spec marks `name` and `profile_type` as required. All other fields use `jsonNullable` —
 * omit to leave unchanged, send `null` to clear.
 */
export const DataProfilePatchRequestSchema = z
  .object({
    name: z.string(),
    profile_type: DataProfileTypeSchema,
    description: jsonNullable(z.string()),
    detection_rules: jsonNullable(z.array(DetectionRuleSchema)),
  })
  .passthrough();
export type DataProfilePatchRequest = z.infer<typeof DataProfilePatchRequestSchema>;

/**
 * Response payload returned by GET / POST / PUT / PATCH on a data profile.
 *
 * Every optional field is `.nullish()` — the live API emits `null` (not `undefined`)
 * for unset values.
 */
export const DataProfileResponseSchema = z
  .object({
    id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    tenant_id: z.string().nullish(),
    type: DataProfileSubtypeSchema.nullish(),
    profile_status: DataProfileStatusSchema.nullish(),
    profile_type: DataProfileTypeSchema.nullish(),
    is_granular_data_profile: z.boolean().nullish(),
    is_parent_managed: z.boolean().nullish(),
    version: z.number().int().nullish(),
    advance_data_patterns_rule_request: z.array(z.string()).nullish(),
    detection_rules: z.array(DetectionRuleSchema).nullish(),
    audit_metadata: AuditResponseSchema.nullish(),
  })
  .passthrough();
export type DataProfileResponse = z.infer<typeof DataProfileResponseSchema>;

/** Spring `Page<DataProfileResponse>` envelope returned by the list endpoint. */
export const PageDataProfileResponseSchema = pageSchema(DataProfileResponseSchema);
export type PageDataProfileResponse = z.infer<typeof PageDataProfileResponseSchema>;
