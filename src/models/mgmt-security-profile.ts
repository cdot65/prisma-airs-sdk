import { z } from 'zod';

export const DlpDataProfileSchema = z
  .object({
    profile_name: z.string(),
    active: z.boolean().optional(),
  })
  .passthrough();

export type DlpDataProfile = z.infer<typeof DlpDataProfileSchema>;

export const DlpSchema = z
  .object({
    dlp_status: z.string().optional(),
    data_profiles: z.array(DlpDataProfileSchema).optional(),
  })
  .passthrough();

export type Dlp = z.infer<typeof DlpSchema>;

export const DataLeakDetectionSchema = z
  .object({
    'data-leak-detection-status': z.string().optional(),
    dlp: DlpSchema.optional(),
  })
  .passthrough();

export type DataLeakDetection = z.infer<typeof DataLeakDetectionSchema>;

export const AppProtectionSchema = z
  .object({
    'prompt-injection': z.string().optional(),
    'jailbreak-detection': z.string().optional(),
  })
  .passthrough();

export type AppProtection = z.infer<typeof AppProtectionSchema>;

export const ModelProtectionSchema = z
  .object({
    'model-denial-of-service': z.string().optional(),
  })
  .passthrough();

export type ModelProtection = z.infer<typeof ModelProtectionSchema>;

export const AgentProtectionSchema = z
  .object({
    'malicious-agent-activity': z.string().optional(),
  })
  .passthrough();

export type AgentProtection = z.infer<typeof AgentProtectionSchema>;

export const LatencySchema = z
  .object({
    status: z.string().optional(),
    max_latency_ms: z.number().optional(),
  })
  .passthrough();

export type Latency = z.infer<typeof LatencySchema>;

export const ModelConfigurationSchema = z
  .object({
    latency: LatencySchema.optional(),
  })
  .passthrough();

export type ModelConfiguration = z.infer<typeof ModelConfigurationSchema>;

export const PolicySchema = z
  .object({
    'data-leak-detection': DataLeakDetectionSchema.optional(),
    'app-protection': AppProtectionSchema.optional(),
    'model-protection': ModelProtectionSchema.optional(),
    'agent-protection': AgentProtectionSchema.optional(),
    'model-configuration': ModelConfigurationSchema.optional(),
  })
  .passthrough();

export type Policy = z.infer<typeof PolicySchema>;

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

export type SecurityProfile = z.infer<typeof SecurityProfileSchema>;

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

export type CreateSecurityProfileRequest = z.infer<typeof CreateSecurityProfileRequestSchema>;

export const SecurityProfileListResponseSchema = z
  .object({
    ai_profiles: z.array(SecurityProfileSchema),
    next_offset: z.number().optional(),
  })
  .passthrough();

export type SecurityProfileListResponse = z.infer<typeof SecurityProfileListResponseSchema>;

export const DeleteProfileResponseSchema = z
  .object({
    message: z.string(),
  })
  .passthrough();

export type DeleteProfileResponse = z.infer<typeof DeleteProfileResponseSchema>;

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

export type DeleteProfileConflict = z.infer<typeof DeleteProfileConflictSchema>;
