import { DLP_DATA_PROFILES_PATH } from '../../constants.js';
import { request } from '../../http/request.js';
import type { AuthAdapter } from '../../http/types.js';
import {
  DataProfileResponseSchema,
  PageDataProfileResponseSchema,
  type AdvancedDataProfileRequest,
  type DataProfilePatchRequest,
  type DataProfileResponse,
  type PageDataProfileResponse,
} from '../../models/dlp-data-profile.js';

/** Query parameters accepted by {@link DataProfilesClient.list}. */
export interface DataProfileListParams {
  /** Zero-based page index. Server defaults to 0. */
  page?: number;
  /** Page size. Server defaults to 20. */
  size?: number;
  /**
   * Sort criteria in `property,(asc|desc)` form. Pass multiple entries to sort by several
   * fields; each entry is emitted as a separate `sort=` query parameter.
   */
  sort?: string[];
}

/** @internal */
export interface DataProfilesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * Client for the DLP Data Profiles resource (`/v2/api/data-profiles`).
 *
 * CRUD-without-DELETE: list, create, get, replace (PUT), patch (JSON Merge Patch). The DLP
 * spec does not expose a DELETE for data profiles — to remove a profile, patch it to a
 * deleted lifecycle state via the underlying API (typically `profile_status: "deleted"`).
 */
export class DataProfilesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: DataProfilesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List data profiles. Returns the Spring `Page<>` envelope verbatim so callers can inspect
   * `totalElements`, `pageable`, etc.
   */
  async list(params: DataProfileListParams = {}): Promise<PageDataProfileResponse> {
    const queryParams: Record<string, string | string[]> = {};
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.size !== undefined) queryParams.size = String(params.size);
    if (params.sort !== undefined) queryParams.sort = params.sort;

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: DLP_DATA_PROFILES_PATH,
      params: queryParams,
      responseSchema: PageDataProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Create a new data profile. */
  async create(body: AdvancedDataProfileRequest): Promise<DataProfileResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: DLP_DATA_PROFILES_PATH,
      body,
      responseSchema: DataProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Get a single data profile by resource ID. */
  async get(resourceId: string): Promise<DataProfileResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_PROFILES_PATH}/${encodeURIComponent(resourceId)}`,
      responseSchema: DataProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Full-replace (PUT) the profile at `resourceId`. Returns the updated resource as the API
   * echoes it back.
   */
  async replace(
    resourceId: string,
    body: AdvancedDataProfileRequest,
  ): Promise<DataProfileResponse> {
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_PROFILES_PATH}/${encodeURIComponent(resourceId)}`,
      body,
      responseSchema: DataProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Partial update via JSON Merge Patch (RFC 7396). Sent with
   * `Content-Type: application/merge-patch+json`. Fields set to `null` clear server-side;
   * omitted fields are left unchanged.
   */
  async patch(resourceId: string, body: DataProfilePatchRequest): Promise<DataProfileResponse> {
    return request({
      method: 'PATCH',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_PROFILES_PATH}/${encodeURIComponent(resourceId)}`,
      body,
      contentType: 'application/merge-patch+json',
      responseSchema: DataProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
