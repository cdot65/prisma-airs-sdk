import { z } from 'zod';

// ── Policy sub-schemas (matching OpenAPI spec) ────────────────────────────

/** Zod schema for inline latency configuration within a security profile policy. */
export const PolicyLatencySchema = z
  .object({
    'inline-timeout-action': z.string().optional(),
    'max-inline-latency': z.number().optional(),
  })
  .passthrough();

/** Inline latency configuration. */
export type PolicyLatency = z.infer<typeof PolicyLatencySchema>;

/** Zod schema for a data-leak-detection member entry. */
export const DataLeakDetectionMemberSchema = z
  .object({
    text: z.string(),
    id: z.string().optional(),
    version: z.string().optional(),
  })
  .passthrough();

/** Data-leak-detection member entry. */
export type DataLeakDetectionMember = z.infer<typeof DataLeakDetectionMemberSchema>;

/** Zod schema for a database-security rule item. */
export const DatabaseSecurityItemSchema = z
  .object({
    name: z.string(),
    action: z.string(),
  })
  .passthrough();

/** Database-security rule item. */
export type DatabaseSecurityItem = z.infer<typeof DatabaseSecurityItemSchema>;

/** Zod schema for the data-protection section of a model configuration. */
//
// Two known divergences from the OpenAPI flagged by `npm run preflight`:
// - `data-leak-detection.member`: spec marks required, but the API returns
//   `null` on some profiles (see test/models/mgmt-security-profile.spec.ts).
//   We allow `null`/missing to match observed behavior.
// - `database-security`: not in the OpenAPI but the API does return it.
//   Kept until upstream OpenAPI documents it.
export const DataProtectionSchema = z
  .object({
    'data-leak-detection': z
      .object({
        member: z.array(DataLeakDetectionMemberSchema).nullable().optional(),
        action: z.string(),
        'mask-data-inline': z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    'database-security': z.array(DatabaseSecurityItemSchema).nullable().optional(),
  })
  .passthrough();

/** Data-protection configuration (DLP detection + database security). */
export type DataProtection = z.infer<typeof DataProtectionSchema>;

/** Zod schema for a URL category object (member array). */
export const UrlCategorySchema = z
  .object({
    member: z.array(z.string()).nullable().optional(),
  })
  .passthrough();

/** URL category with member list. */
export type UrlCategory = z.infer<typeof UrlCategorySchema>;

/** Zod schema for malicious code protection settings. */
export const MaliciousCodeProtectionSchema = z
  .object({
    name: z.string(),
    action: z.string(),
  })
  .passthrough();

/** Malicious code protection settings. */
export type MaliciousCodeProtection = z.infer<typeof MaliciousCodeProtectionSchema>;

/** Zod schema for the app-protection section of a model configuration. */
export const PolicyAppProtectionSchema = z
  .object({
    'alert-url-category': UrlCategorySchema.optional(),
    'block-url-category': UrlCategorySchema.optional(),
    'allow-url-category': UrlCategorySchema.optional(),
    'default-url-category': UrlCategorySchema.optional(),
    'url-detected-action': z.string().optional(),
    'malicious-code-protection': MaliciousCodeProtectionSchema.optional(),
  })
  .passthrough();

/** App-protection configuration (URL filtering + malicious code detection). */
export type PolicyAppProtection = z.infer<typeof PolicyAppProtectionSchema>;

/** Zod schema for a topic object within a topic guardrail. */
export const TopicObjectSchema = z
  .object({
    topic_name: z.string(),
    topic_id: z.string(),
    revision: z.number(),
  })
  .passthrough();

/** Topic reference in a model-protection guardrail. */
export type TopicObject = z.infer<typeof TopicObjectSchema>;

/** Zod schema for a topic array within model protection. */
//
// `topic` accepts `null` to match observed API behavior: when the allow or block
// bucket has no topics, the API serializes `"topic": null` rather than `[]`.
// The upstream OpenAPI marks this required and non-nullable; this is a known
// divergence (verified against a live `/v1/mgmt/profiles/tsg` response).
export const TopicArraySchema = z
  .object({
    action: z.string(),
    topic: z.array(TopicObjectSchema).nullable(),
  })
  .passthrough();

/** Topic array with action and topic references. */
export type TopicArray = z.infer<typeof TopicArraySchema>;

/** Zod schema for a model-protection array item. */
export const ModelProtectionItemSchema = z
  .object({
    name: z.string(),
    action: z.string(),
    'topic-list': z.array(TopicArraySchema).optional(),
    options: z.array(z.unknown()).optional(),
  })
  .passthrough();

/** Model-protection guardrail item. */
export type ModelProtectionItem = z.infer<typeof ModelProtectionItemSchema>;

/** Zod schema for an agent-protection array item. */
export const AgentProtectionItemSchema = z
  .object({
    name: z.string(),
    action: z.string(),
  })
  .passthrough();

/** Agent-protection rule item. */
export type AgentProtectionItem = z.infer<typeof AgentProtectionItemSchema>;

/** Zod schema for a DLP rule (rule1/rule2) in a DLP data profile. */
export const DlpRuleSchema = z
  .object({
    action: z.string().optional(),
  })
  .passthrough();

/** DLP rule with optional action. */
export type DlpRule = z.infer<typeof DlpRuleSchema>;

/** Zod schema for a DLP data profile within the policy. */
export const DlpDataProfilePolicySchema = z
  .object({
    name: z.string(),
    uuid: z.string(),
    id: z.string().optional(),
    version: z.string().optional(),
    description: z.string().optional(),
    rule1: DlpRuleSchema.optional(),
    rule2: DlpRuleSchema.optional(),
    'log-severity': z.string().optional(),
    'non-file-based': z.string().optional(),
    'file-based': z.string().optional(),
  })
  .passthrough();

/** DLP data profile within a security profile policy. */
export type DlpDataProfilePolicy = z.infer<typeof DlpDataProfilePolicySchema>;

// ── Composite schemas ─────────────────────────────────────────────────────

/** Zod schema for model-configuration within an AI security profile. */
export const ModelConfigurationSchema = z
  .object({
    'mask-data-in-storage': z.boolean().optional(),
    latency: PolicyLatencySchema.optional(),
    'data-protection': DataProtectionSchema.optional(),
    'app-protection': PolicyAppProtectionSchema.optional(),
    'model-protection': z.array(ModelProtectionItemSchema).optional(),
    'agent-protection': z.array(AgentProtectionItemSchema).optional(),
  })
  .passthrough();

/** Model configuration containing all protection and latency settings. */
export type ModelConfiguration = z.infer<typeof ModelConfigurationSchema>;

/** Zod schema for an AI security profile within the policy. */
export const AiSecurityProfileSchema = z
  .object({
    'model-type': z.string().optional(),
    'content-type': z.string().optional(),
    'model-configuration': ModelConfigurationSchema.optional(),
  })
  .passthrough();

/** AI security profile with model type and configuration. */
export type AiSecurityProfile = z.infer<typeof AiSecurityProfileSchema>;

/** Zod schema for the security profile policy. */
export const PolicySchema = z
  .object({
    'ai-security-profiles': z.array(AiSecurityProfileSchema).optional(),
    'dlp-data-profiles': z.array(DlpDataProfilePolicySchema).optional(),
  })
  .passthrough();

/** Security profile policy containing AI security profiles and DLP data profiles. */
export type Policy = z.infer<typeof PolicySchema>;

// ── Top-level profile schemas ─────────────────────────────────────────────

/** AIRS security profile with name, policy, and audit metadata. */
export interface SecurityProfile {
  profile_id?: string;
  profile_name: string;
  csp_id?: string;
  tsg_id?: string;
  revision?: number;
  active?: boolean;
  policy?: Policy;
  created_by?: string;
  updated_by?: string;
  last_modified_ts?: string;
  [key: string]: unknown;
}

/** Zod schema for an AIRS security profile. */
export const SecurityProfileSchema: z.ZodType<SecurityProfile> = z
  .object({
    profile_id: z.string().optional(),
    profile_name: z.string(),
    csp_id: z.string().optional(),
    tsg_id: z.string().optional(),
    revision: z.number().optional(),
    active: z.boolean().optional(),
    policy: PolicySchema.optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    last_modified_ts: z.string().optional(),
  })
  .passthrough();

/** Request body for creating or updating a security profile. */
export interface CreateSecurityProfileRequest {
  profile_id?: string;
  profile_name: string;
  csp_id?: string;
  tsg_id?: string;
  revision?: number;
  active?: boolean;
  policy?: Policy;
  created_by?: string;
  updated_by?: string;
  last_modified_ts?: string;
  [key: string]: unknown;
}

/** Zod schema for a security profile create/update request. */
export const CreateSecurityProfileRequestSchema: z.ZodType<CreateSecurityProfileRequest> = z
  .object({
    profile_id: z.string().optional(),
    profile_name: z.string(),
    csp_id: z.string().optional(),
    tsg_id: z.string().optional(),
    revision: z.number().optional(),
    active: z.boolean().optional(),
    policy: PolicySchema.optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    last_modified_ts: z.string().optional(),
  })
  .passthrough();

/** Paginated list of security profiles. */
export interface SecurityProfileListResponse {
  ai_profiles: SecurityProfile[];
  next_offset?: number;
  [key: string]: unknown;
}

/** Zod schema for a paginated security profile list response. */
export const SecurityProfileListResponseSchema: z.ZodType<SecurityProfileListResponse> = z
  .object({
    ai_profiles: z.array(SecurityProfileSchema),
    next_offset: z.number().optional(),
  })
  .passthrough();

// AIRS management returns a JSON-encoded plain string (e.g.
// `"successfully deleted profileId: <id>"`) on a successful DELETE despite
// Content-Type: application/json. Accept both shapes and normalize the string
// form to { message } so consumers see a stable object. See issue #164.
/** Zod schema for a profile deletion response. */
export const DeleteProfileResponseSchema = z.union([
  z.string().transform((message) => ({ message })),
  z.object({ message: z.string() }).passthrough(),
]);

/** Response from deleting a security profile. */
export type DeleteProfileResponse = z.infer<typeof DeleteProfileResponseSchema>;

/** Zod schema for a profile deletion conflict (409). */
export const DeleteProfileConflictSchema = z
  .object({
    message: z.string(),
    payload: z.array(
      z
        .object({
          policy_id: z.string(),
          policy_name: z.string(),
          priority: z.number(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

/** Conflict response when deleting a profile referenced by policies. */
export type DeleteProfileConflict = z.infer<typeof DeleteProfileConflictSchema>;
