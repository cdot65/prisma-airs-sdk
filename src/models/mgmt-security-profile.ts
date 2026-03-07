import { z } from 'zod';

/** Zod schema for DLP data profile configuration. */
export const DlpDataProfileSchema = z
  .object({
    profile_name: z.string(),
    active: z.boolean().optional(),
  })
  .passthrough();

/** DLP data profile configuration. */
export type DlpDataProfile = z.infer<typeof DlpDataProfileSchema>;

/** Zod schema for DLP configuration. */
export const DlpSchema = z
  .object({
    dlp_status: z.string().optional(),
    data_profiles: z.array(DlpDataProfileSchema).optional(),
  })
  .passthrough();

/** DLP configuration with status and data profiles. */
export type Dlp = z.infer<typeof DlpSchema>;

/** Zod schema for data leak detection settings. */
export const DataLeakDetectionSchema = z
  .object({
    'data-leak-detection-status': z.string().optional(),
    dlp: DlpSchema.optional(),
  })
  .passthrough();

/** Data leak detection settings. */
export type DataLeakDetection = z.infer<typeof DataLeakDetectionSchema>;

/** Zod schema for application protection settings. */
export const AppProtectionSchema = z
  .object({
    'prompt-injection': z.string().optional(),
    'jailbreak-detection': z.string().optional(),
  })
  .passthrough();

/** Application protection settings (prompt injection, jailbreak detection). */
export type AppProtection = z.infer<typeof AppProtectionSchema>;

/** Zod schema for model protection settings. */
export const ModelProtectionSchema = z
  .object({
    'model-denial-of-service': z.string().optional(),
  })
  .passthrough();

/** Model protection settings (DoS protection). */
export type ModelProtection = z.infer<typeof ModelProtectionSchema>;

/** Zod schema for agent protection settings. */
export const AgentProtectionSchema = z
  .object({
    'malicious-agent-activity': z.string().optional(),
  })
  .passthrough();

/** Agent protection settings (malicious agent activity detection). */
export type AgentProtection = z.infer<typeof AgentProtectionSchema>;

/** Zod schema for latency configuration. */
export const LatencySchema = z
  .object({
    status: z.string().optional(),
    max_latency_ms: z.number().optional(),
  })
  .passthrough();

/** Latency configuration for inline scanning. */
export type Latency = z.infer<typeof LatencySchema>;

/** Zod schema for model configuration. */
export const ModelConfigurationSchema = z
  .object({
    latency: LatencySchema.optional(),
  })
  .passthrough();

/** Model configuration including latency settings. */
export type ModelConfiguration = z.infer<typeof ModelConfigurationSchema>;

/** Zod schema for the security profile policy. */
export const PolicySchema = z
  .object({
    'data-leak-detection': DataLeakDetectionSchema.optional(),
    'app-protection': AppProtectionSchema.optional(),
    'model-protection': ModelProtectionSchema.optional(),
    'agent-protection': AgentProtectionSchema.optional(),
    'model-configuration': ModelConfigurationSchema.optional(),
  })
  .passthrough();

/** Security profile policy containing all protection and configuration settings. */
export type Policy = z.infer<typeof PolicySchema>;

/** Zod schema for an AIRS security profile. */
export const SecurityProfileSchema = z
  .object({
    profile_id: z.string().optional(),
    profile_name: z.string(),
    revision: z.number().optional(),
    active: z.boolean().optional(),
    policy: PolicySchema.optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    last_modified_ts: z.string().optional(),
  })
  .passthrough();

/** AIRS security profile with name, policy, and audit metadata. */
export type SecurityProfile = z.infer<typeof SecurityProfileSchema>;

/** Zod schema for a security profile create/update request. */
export const CreateSecurityProfileRequestSchema = z
  .object({
    profile_id: z.string().optional(),
    profile_name: z.string(),
    revision: z.number().optional(),
    active: z.boolean().optional(),
    policy: PolicySchema.optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    last_modified_ts: z.string().optional(),
  })
  .passthrough();

/** Request body for creating or updating a security profile. */
export type CreateSecurityProfileRequest = z.infer<typeof CreateSecurityProfileRequestSchema>;

/** Zod schema for a paginated security profile list response. */
export const SecurityProfileListResponseSchema = z
  .object({
    ai_profiles: z.array(SecurityProfileSchema),
    next_offset: z.number().optional(),
  })
  .passthrough();

/** Paginated list of security profiles. */
export type SecurityProfileListResponse = z.infer<typeof SecurityProfileListResponseSchema>;

/** Zod schema for a profile deletion response. */
export const DeleteProfileResponseSchema = z
  .object({
    message: z.string(),
  })
  .passthrough();

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
