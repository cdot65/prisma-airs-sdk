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
