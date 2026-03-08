import { z } from 'zod';

/** Zod schema for DLP data profile (as returned by list endpoint). */
export const DlpDataProfileSchema = z
  .object({
    name: z.string(),
    uuid: z.string(),
    id: z.string().optional(),
    version: z.string().optional(),
    rule1: z.object({ action: z.string().optional() }).passthrough().optional(),
    rule2: z.object({ action: z.string().optional() }).passthrough().optional(),
    'log-severity': z.string().optional(),
    'non-file-based': z.string().optional(),
    'file-based': z.string().optional(),
  })
  .passthrough();

/** DLP data profile. */
export type DlpDataProfile = z.infer<typeof DlpDataProfileSchema>;

/** Zod schema for DLP profiles list response. */
export const DlpProfileListResponseSchema = z
  .object({
    dlp_profiles: z.array(DlpDataProfileSchema).optional(),
  })
  .passthrough();

/** DLP profiles list response. */
export type DlpProfileListResponse = z.infer<typeof DlpProfileListResponseSchema>;
