import { MGMT_PROFILE_PATH, MGMT_PROFILES_TSG_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from './management-http-client.js';
import type { OAuthClient } from './oauth-client.js';
import type {
  SecurityProfile,
  CreateSecurityProfileRequest,
  SecurityProfileListResponse,
  DeleteProfileResponse,
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
  oauthClient: OAuthClient;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS security profile CRUD operations. */
export class ProfilesClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly tsgId: string;
  private readonly numRetries: number;

  constructor(opts: ProfilesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.tsgId = opts.tsgId;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new security profile.
   * @param request - Profile configuration.
   * @returns The created security profile.
   */
  async create(request: CreateSecurityProfileRequest): Promise<SecurityProfile> {
    const res = await managementHttpRequest<SecurityProfile>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_PROFILE_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
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

    const res = await managementHttpRequest<SecurityProfileListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MGMT_PROFILES_TSG_PATH}/${this.tsgId}`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Update an existing security profile.
   * @param profileId - UUID of the profile to update.
   * @param request - Updated profile configuration.
   * @returns The updated security profile.
   */
  async update(profileId: string, request: CreateSecurityProfileRequest): Promise<SecurityProfile> {
    if (!isValidUuid(profileId)) {
      throw new AISecSDKException(
        `Invalid profile_id: ${profileId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<SecurityProfile>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MGMT_PROFILE_PATH}/uuid/${profileId}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Delete a security profile.
   * @param profileId - UUID of the profile to delete.
   * @returns Deletion confirmation message.
   */
  async delete(profileId: string): Promise<DeleteProfileResponse> {
    if (!isValidUuid(profileId)) {
      throw new AISecSDKException(
        `Invalid profile_id: ${profileId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<DeleteProfileResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_PROFILE_PATH}/${profileId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
