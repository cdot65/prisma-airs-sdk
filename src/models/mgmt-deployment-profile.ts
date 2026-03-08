import { z } from 'zod';

/** Zod schema for a deployment profile entry. */
export const DeploymentProfileEntrySchema = z
  .object({
    dp_name: z.string(),
    auth_code: z.string(),
    tsg_id: z.string().optional(),
    status: z.string().optional(),
    expiration_date: z.string().optional(),
    ave_text_records: z.number().optional(),
  })
  .passthrough();

/** Deployment profile entry. */
export type DeploymentProfileEntry = z.infer<typeof DeploymentProfileEntrySchema>;

/** Zod schema for deployment profiles response. */
export const DeploymentProfilesResponseSchema = z
  .object({
    deployment_profiles: z.array(DeploymentProfileEntrySchema),
    status: z.string(),
  })
  .passthrough();

/** Deployment profiles response. */
export type DeploymentProfilesResponse = z.infer<typeof DeploymentProfilesResponseSchema>;
