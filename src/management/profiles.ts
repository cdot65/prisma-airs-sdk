import { MGMT_PROFILE_PATH, MGMT_PROFILES_TSG_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  SecurityProfileSchema,
  SecurityProfileListResponseSchema,
  DeleteProfileResponseSchema,
  type SecurityProfile,
  type CreateSecurityProfileRequest,
  type SecurityProfileListResponse,
  type DeleteProfileResponse,
} from '../models/mgmt-security-profile.js';

/** Pagination parameters for list operations. */
export interface PaginationOptions {
  /** Starting offset. Defaults to 0. */
  offset?: number;
  /** Max items to return. Defaults to 100. */
  limit?: number;
}

/** @internal */
export interface ProfilesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS security profile CRUD operations. */
export class ProfilesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly tsgId: string;
  private readonly numRetries: number;

  constructor(opts: ProfilesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.tsgId = opts.tsgId;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new security profile.
   * @param body - Profile configuration.
   * @returns The created security profile.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const profile = await mgmt.profiles.create({
   *   profile_name: 'sdk-example-profile',
   *   active: true,
   *   policy: { 'ai-security-profiles': [], 'dlp-data-profiles': [] },
   * });
   * // profile =>
   * // { profile_id: '550e8400-e29b-41d4-a716-446655440000',
   * //   profile_name: 'sdk-example-profile', revision: 1, active: true }
   * ```
   */
  async create(body: CreateSecurityProfileRequest): Promise<SecurityProfile> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_PROFILE_PATH,
      body,
      responseSchema: SecurityProfileSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List security profiles for the TSG.
   * @param opts - Pagination options.
   * @returns Paginated list of security profiles.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const page = await mgmt.profiles.list({ offset: 0, limit: 5 });
   * // page =>
   * // { ai_profiles: [ { profile_id: '550e8400-...', profile_name: 'prod', revision: 1, active: true } ],
   * //   next_offset: 20 }
   * ```
   */
  async list(opts?: PaginationOptions): Promise<SecurityProfileListResponse> {
    const params: Record<string, string> = {
      offset: String(opts?.offset ?? 0),
      limit: String(opts?.limit ?? 100),
    };

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MGMT_PROFILES_TSG_PATH}/${this.tsgId}`,
      params,
      responseSchema: SecurityProfileListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a security profile by UUID.
   * Fetches all profiles and filters — no dedicated API endpoint exists.
   * @param profileId - UUID of the profile to retrieve.
   * @returns The matching security profile.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const profile = await mgmt.profiles.get('550e8400-e29b-41d4-a716-446655440000');
   * // profile =>
   * // { profile_id: '550e8400-e29b-41d4-a716-446655440000',
   * //   profile_name: 'prod', revision: 1, active: true }
   * ```
   */
  async get(profileId: string): Promise<SecurityProfile> {
    const { ai_profiles } = await this.list();
    const profile = ai_profiles.find((p) => p.profile_id === profileId);
    if (!profile) {
      throw new AISecSDKException(
        `Profile not found: ${profileId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    return profile;
  }

  /**
   * Get a security profile by name.
   * Returns the highest-revision match (latest version).
   * @param profileName - Name of the profile to retrieve.
   * @returns The matching security profile with the highest revision.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const profile = await mgmt.profiles.getByName('prod');
   * // profile =>
   * // { profile_id: '550e8400-...', profile_name: 'prod', revision: 3, active: true }
   * ```
   */
  async getByName(profileName: string): Promise<SecurityProfile> {
    const { ai_profiles } = await this.list();
    const matches = ai_profiles.filter((p) => p.profile_name === profileName);
    if (matches.length === 0) {
      throw new AISecSDKException(
        `Profile not found: ${profileName}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    return matches.reduce((best, p) => ((p.revision ?? 0) > (best.revision ?? 0) ? p : best));
  }

  /**
   * Update an existing security profile.
   * @param profileId - UUID of the profile to update.
   * @param body - Updated profile configuration.
   * @returns The updated security profile.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const updated = await mgmt.profiles.update('550e8400-e29b-41d4-a716-446655440000', {
   *   profile_name: 'prod',
   *   active: false,
   *   policy: { 'ai-security-profiles': [], 'dlp-data-profiles': [] },
   * });
   * // updated =>
   * // { profile_id: '550e8400-...', profile_name: 'prod', revision: 2, active: false }
   * ```
   */
  async update(profileId: string, body: CreateSecurityProfileRequest): Promise<SecurityProfile> {
    assertUuid(profileId, 'profile_id');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MGMT_PROFILE_PATH}/uuid/${profileId}`,
      body,
      responseSchema: SecurityProfileSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a security profile.
   * @param profileId - UUID of the profile to delete.
   * @returns Deletion confirmation message.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const result = await mgmt.profiles.delete('550e8400-e29b-41d4-a716-446655440000');
   * // result => { message: 'deleted' }
   * ```
   */
  async delete(profileId: string): Promise<DeleteProfileResponse> {
    assertUuid(profileId, 'profile_id');
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_PROFILE_PATH}/${profileId}`,
      responseSchema: DeleteProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Force-delete a security profile, bypassing safety checks.
   * @param profileId - UUID of the profile to force-delete.
   * @param updatedBy - Email of the user performing the deletion.
   * @returns Deletion confirmation message.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const result = await mgmt.profiles.forceDelete(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   'admin@example.com',
   * );
   * // result => { message: 'force deleted' }
   * ```
   */
  async forceDelete(profileId: string, updatedBy: string): Promise<DeleteProfileResponse> {
    assertUuid(profileId, 'profile_id');
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_PROFILE_PATH}/${profileId}/force`,
      params: { updated_by: updatedBy },
      responseSchema: DeleteProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
