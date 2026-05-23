import { z } from 'zod';
import { AuditResponseSchema } from './dlp-audit.js';
import { jsonNullable } from './dlp-json-nullable.js';
import { pageSchema } from './dlp-page.js';

/** Top-level dictionary type. */
export const DictionaryTypeSchema = z.enum(['predefined', 'custom']);
export type DictionaryType = z.infer<typeof DictionaryTypeSchema>;

/**
 * Dictionary category. Note `'Source Code'` includes a literal space — preserved verbatim per
 * the OpenAPI spec.
 */
export const DictionaryCategorySchema = z.enum([
  'Academic',
  'Confidential',
  'Employment',
  'Financial',
  'Government',
  'Healthcare',
  'Legal',
  'Marketing',
  'Source Code',
]);
export type DictionaryCategory = z.infer<typeof DictionaryCategorySchema>;

/** Classification tag values supported on a dictionary. */
export const DictionaryClassificationSchema = z.enum(['pab', 'endpoint']);
export type DictionaryClassification = z.infer<typeof DictionaryClassificationSchema>;

/** Detection technique reported on a dictionary response. Shares the technique vocabulary
 *  used by data-patterns. */
export const DictionaryDetectionTechniqueSchema = z.enum([
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
export type DictionaryDetectionTechnique = z.infer<typeof DictionaryDetectionTechniqueSchema>;

/** Detection sub-technique reported on a dictionary response. */
export const DictionaryDetectionSubTechniqueSchema = z.enum([
  'dnn',
  'gamma',
  'ml_gateway',
  'encoding',
  'password_protected',
  'encryption',
  'compression',
  'threshold',
]);
export type DictionaryDetectionSubTechnique = z.infer<typeof DictionaryDetectionSubTechniqueSchema>;

/** Metadata about the uploaded keyword file. */
export const DictionaryMetaDataDTOSchema = z
  .object({
    number_of_keywords: z.number().nullish(),
    original_file_name: z.string().nullish(),
    original_file_size_in_byte: z.number().nullish(),
  })
  .passthrough();
export type DictionaryMetaDataDTO = z.infer<typeof DictionaryMetaDataDTOSchema>;

/** Tag block attached to a dictionary. */
export const DictionaryTagsSchema = z
  .object({
    classification: z.array(DictionaryClassificationSchema).nullish(),
  })
  .passthrough();
export type DictionaryTags = z.infer<typeof DictionaryTagsSchema>;

/** Free-form k/v extension entry returned on dictionary responses. */
export const ResourceModelExtensionSchema = z
  .object({
    key: z.string().nullish(),
    value: z.string().nullish(),
  })
  .passthrough();
export type ResourceModelExtension = z.infer<typeof ResourceModelExtensionSchema>;

/**
 * Metadata payload sent as the `json` part of the multipart upload on POST/PUT. The binary
 * keyword `file` part is supplied separately.
 */
export const DictionaryRequestSchema = z
  .object({
    category: DictionaryCategorySchema,
    name: z.string(),
    original_file_name: z.string(),
    region_name: z.string(),
    description: z.string().optional(),
    is_case_sensitive: z.boolean().optional(),
    type: DictionaryTypeSchema.optional(),
  })
  .passthrough();
export type DictionaryRequest = z.infer<typeof DictionaryRequestSchema>;

/**
 * Request payload for PATCH (JSON Merge Patch, RFC 7396). `category`, `name`, and
 * `original_file_name` are required even on patch — every other field may be omitted or
 * set to `null`.
 */
export const DictionaryPatchRequestSchema = z
  .object({
    category: DictionaryCategorySchema,
    name: z.string(),
    original_file_name: z.string(),
    description: jsonNullable(z.string()),
    is_case_sensitive: jsonNullable(z.boolean()),
    region_name: jsonNullable(z.string()),
  })
  .passthrough();
export type DictionaryPatchRequest = z.infer<typeof DictionaryPatchRequestSchema>;

/**
 * Response payload returned by GET / POST / PUT / PATCH on a dictionary.
 *
 * Every optional field is `.nullish()` — the live API emits `null` (not `undefined`)
 * for unset values.
 */
export const DictionaryResponseSchema = z
  .object({
    id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    category: z.string().nullish(),
    region_name: z.string().nullish(),
    type: DictionaryTypeSchema.nullish(),
    is_case_sensitive: z.boolean().nullish(),
    is_parent_managed: z.boolean().nullish(),
    detection_technique: DictionaryDetectionTechniqueSchema.nullish(),
    detection_sub_technique: DictionaryDetectionSubTechniqueSchema.nullish(),
    dictionary_metadata: DictionaryMetaDataDTOSchema.nullish(),
    /** Keyword list — populated only when `keywords=true` is passed as a query parameter. */
    keywords: z.array(z.string()).nullish(),
    tags: DictionaryTagsSchema.nullish(),
    attributes: z.array(ResourceModelExtensionSchema).nullish(),
    audit_metadata: AuditResponseSchema.nullish(),
  })
  .passthrough();
export type DictionaryResponse = z.infer<typeof DictionaryResponseSchema>;

/** Spring `Page<DictionaryResponse>` envelope returned by the list endpoint. */
export const PageDictionaryResponseSchema = pageSchema(DictionaryResponseSchema);
export type PageDictionaryResponse = z.infer<typeof PageDictionaryResponseSchema>;
