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
    number_of_keywords: z.number().optional(),
    original_file_name: z.string().optional(),
    original_file_size_in_byte: z.number().optional(),
  })
  .passthrough();
export type DictionaryMetaDataDTO = z.infer<typeof DictionaryMetaDataDTOSchema>;

/** Tag block attached to a dictionary. */
export const DictionaryTagsSchema = z
  .object({
    classification: z.array(DictionaryClassificationSchema).optional(),
  })
  .passthrough();
export type DictionaryTags = z.infer<typeof DictionaryTagsSchema>;

/** Free-form k/v extension entry returned on dictionary responses. */
export const ResourceModelExtensionSchema = z
  .object({
    key: z.string().optional(),
    value: z.string().optional(),
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

/** Response payload returned by GET / POST / PUT / PATCH on a dictionary. */
export const DictionaryResponseSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    region_name: z.string().optional(),
    type: DictionaryTypeSchema.optional(),
    is_case_sensitive: z.boolean().optional(),
    is_parent_managed: z.boolean().optional(),
    detection_technique: DictionaryDetectionTechniqueSchema.optional(),
    detection_sub_technique: DictionaryDetectionSubTechniqueSchema.optional(),
    dictionary_metadata: DictionaryMetaDataDTOSchema.optional(),
    /** Keyword list — populated only when `keywords=true` is passed as a query parameter. */
    keywords: z.array(z.string()).optional(),
    tags: DictionaryTagsSchema.optional(),
    attributes: z.array(ResourceModelExtensionSchema).optional(),
    audit_metadata: AuditResponseSchema.optional(),
  })
  .passthrough();
export type DictionaryResponse = z.infer<typeof DictionaryResponseSchema>;

/** Spring `Page<DictionaryResponse>` envelope returned by the list endpoint. */
export const PageDictionaryResponseSchema = pageSchema(DictionaryResponseSchema);
export type PageDictionaryResponse = z.infer<typeof PageDictionaryResponseSchema>;
