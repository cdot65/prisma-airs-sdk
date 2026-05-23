import { z } from 'zod';
import { AuditResponseSchema } from './dlp-audit.js';
import { jsonNullable } from './dlp-json-nullable.js';
import { pageSchema } from './dlp-page.js';

/** Pattern type — top-level taxonomy for a data pattern. */
export const DataPatternTypeSchema = z.enum(['predefined', 'custom', 'file_property']);
export type DataPatternType = z.infer<typeof DataPatternTypeSchema>;

/** Detection technique used by a pattern. */
export const DataPatternTechniqueSchema = z.enum([
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
export type DataPatternTechnique = z.infer<typeof DataPatternTechniqueSchema>;

/** Confidence level supported by a pattern. */
export const DataPatternConfidenceLevelSchema = z.enum(['low', 'medium', 'high']);
export type DataPatternConfidenceLevel = z.infer<typeof DataPatternConfidenceLevelSchema>;

/** License tier the pattern is gated behind. */
export const DataPatternLicenseTypeSchema = z.enum(['standard', 'enterprise', 'essentials']);
export type DataPatternLicenseType = z.infer<typeof DataPatternLicenseTypeSchema>;

/** Lifecycle status of a pattern. */
export const DataPatternStatusSchema = z.enum([
  'active',
  'disabled',
  'deleted',
  'deprecated',
  'silent',
]);
export type DataPatternStatus = z.infer<typeof DataPatternStatusSchema>;

/** Comparison operator used by metadata-criterion entries on matching rules. */
export const ComparisonOperatorTypeSchema = z.enum([
  'less_than',
  'less_than_or_equal_to',
  'greater_than_or_equal_to',
  'greater_than',
  'equal_to',
]);
export type ComparisonOperatorType = z.infer<typeof ComparisonOperatorTypeSchema>;

/** Weighted regex entry — `regex` is non-empty (spec minLength 1), `weight` required. */
export const WeightedRegexSchema = z
  .object({
    regex: z.string().min(1),
    weight: z.number(),
  })
  .passthrough();
export type WeightedRegex = z.infer<typeof WeightedRegexSchema>;

/**
 * Metadata criterion for granular filtering inside matching_rules.
 *
 * Inner fields are `.nullish()` — live API emits `null` for unset values on response;
 * shared with request paths but writing `null` would be unusual user input.
 */
export const MetadataCriterionSchema = z
  .object({
    comparisonOperatorType: ComparisonOperatorTypeSchema.nullish(),
    name: z.string().nullish(),
    type: z.string().nullish(),
    value: z.string().nullish(),
  })
  .passthrough();
export type MetadataCriterion = z.infer<typeof MetadataCriterionSchema>;

/**
 * Detection configuration — describes which technique the pattern uses and which confidence
 * levels are available for it.
 */
export const DataPatternDetectionConfigSchema = z
  .object({
    technique: DataPatternTechniqueSchema,
    supported_confidence_levels: z.array(DataPatternConfidenceLevelSchema).nullish(),
  })
  .passthrough();
export type DataPatternDetectionConfig = z.infer<typeof DataPatternDetectionConfigSchema>;

/**
 * Matching rules — controls proximity, delimiters, regex weights, and metadata filters.
 *
 * Every inner field is `.nullish()` — live API confirmed to emit `null` for unset values
 * (issue #160). `proximity_distance` keeps the 2..1000 bound only when a number is provided.
 */
export const DataPatternMatchingRulesSchema = z
  .object({
    delimiter: z.string().nullish(),
    /** Proximity window for keyword matching — spec bounds 2..1000 inclusive. */
    proximity_distance: z.number().int().min(2).max(1000).nullish(),
    proximity_keywords: z.array(z.string()).nullish(),
    regexes: z.array(WeightedRegexSchema).nullish(),
    metadata_criteria: z.array(MetadataCriterionSchema).nullish(),
  })
  .passthrough();
export type DataPatternMatchingRules = z.infer<typeof DataPatternMatchingRulesSchema>;

/** Metadata tag arrays attached to a pattern. */
export const DataPatternTagsSchema = z
  .object({
    classification: z.array(z.string()).nullish(),
    compliance: z.array(z.string()).nullish(),
    geography: z.array(z.string()).nullish(),
  })
  .passthrough();
export type DataPatternTags = z.infer<typeof DataPatternTagsSchema>;

/** Request payload for POST (create) and PUT (full-replace). */
export const DataPatternRequestSchema = z
  .object({
    name: z.string().min(1).max(64),
    type: DataPatternTypeSchema,
    detection_config: DataPatternDetectionConfigSchema,
    description: z.string().optional(),
    matching_rules: DataPatternMatchingRulesSchema.optional(),
    tags: DataPatternTagsSchema.optional(),
  })
  .passthrough();
export type DataPatternRequest = z.infer<typeof DataPatternRequestSchema>;

/**
 * Request payload for PATCH (JSON Merge Patch, RFC 7396).
 *
 * Spec marks `detection_config`, `name`, and `type` as required even on patch — they cannot
 * be cleared, but every other field may be omitted (leave unchanged) or sent as `null` (clear).
 */
export const DataPatternPatchRequestSchema = z
  .object({
    name: z.string().min(1).max(64),
    type: DataPatternTypeSchema,
    detection_config: DataPatternDetectionConfigSchema,
    description: jsonNullable(z.string()),
    matching_rules: jsonNullable(DataPatternMatchingRulesSchema),
    tags: jsonNullable(DataPatternTagsSchema),
  })
  .passthrough();
export type DataPatternPatchRequest = z.infer<typeof DataPatternPatchRequestSchema>;

/**
 * Response payload returned by GET / POST / PUT / PATCH on a data pattern.
 *
 * Every optional field is `.nullish()` — the live API emits `null` (not `undefined`)
 * for unset values.
 */
export const DataPatternResponseSchema = z
  .object({
    id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    tenant_id: z.string().nullish(),
    type: DataPatternTypeSchema.nullish(),
    status: DataPatternStatusSchema.nullish(),
    license_type: DataPatternLicenseTypeSchema.nullish(),
    is_parent_managed: z.boolean().nullish(),
    version: z.number().nullish(),
    detection_config: DataPatternDetectionConfigSchema.nullish(),
    matching_rules: DataPatternMatchingRulesSchema.nullish(),
    tags: DataPatternTagsSchema.nullish(),
    audit_metadata: AuditResponseSchema.nullish(),
  })
  .passthrough();
export type DataPatternResponse = z.infer<typeof DataPatternResponseSchema>;

/** Spring `Page<DataPatternResponse>` envelope returned by the list endpoint. */
export const PageDataPatternResponseSchema = pageSchema(DataPatternResponseSchema);
export type PageDataPatternResponse = z.infer<typeof PageDataPatternResponseSchema>;
