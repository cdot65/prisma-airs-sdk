import { DLP_DATA_FILTERING_PROFILES_PATH } from '../../constants.js';
import { request } from '../../http/request.js';
import type { AuthAdapter } from '../../http/types.js';
import {
  DataFilteringProfileResponseSchema,
  PageDataFilteringProfileResponseSchema,
  type DataFilteringProfileRequest,
  type DataFilteringProfileResponse,
  type PageDataFilteringProfileResponse,
} from '../../models/dlp-data-filtering-profile.js';

/** Query parameters accepted by {@link DataFilteringProfilesClient.list}. */
export interface DataFilteringProfileListParams {
  /** Zero-based page index. Defaults server-side to 0. */
  page?: number;
  /** Page size. Defaults server-side to 20. */
  size?: number;
  /**
   * Sort criteria in `property,(asc|desc)` form. Pass multiple entries to sort by several fields;
   * each entry is emitted as a separate `sort=` query parameter.
   */
  sort?: string[];
  /** Filter by profile lifecycle status. */
  status?: 'enabled' | 'disabled';
  /** Partial-match filter on profile name. */
  name?: string;
}

/** @internal */
export interface DataFilteringProfilesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * Client for the DLP Data Filtering Profiles resource (`/v2/api/data-filtering-profiles`).
 *
 * Read + full-replace surface only — the underlying API does not expose create or delete.
 */
export class DataFilteringProfilesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: DataFilteringProfilesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List data filtering profiles. Returns the Spring `Page<>` envelope verbatim so callers can
   * inspect `totalElements`, `pageable`, etc. without a second round-trip.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const page = await mgmt.dlp.dataFilteringProfiles.list({ size: 5, status: 'enabled' });
   * // page =>
   * // {
   * //   content: [{ id: 'dfp-1', name: 'Finance', file_based: true, non_file_based: false }],
   * //   totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true
   * // }
   * ```
   */
  async list(
    params: DataFilteringProfileListParams = {},
  ): Promise<PageDataFilteringProfileResponse> {
    const queryParams: Record<string, string | string[]> = {};
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.size !== undefined) queryParams.size = String(params.size);
    if (params.sort !== undefined) queryParams.sort = params.sort;
    if (params.status !== undefined) queryParams.status = params.status;
    if (params.name !== undefined) queryParams.name = params.name;

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: DLP_DATA_FILTERING_PROFILES_PATH,
      params: queryParams,
      responseSchema: PageDataFilteringProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single data filtering profile by resource ID.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const profile = await mgmt.dlp.dataFilteringProfiles.get('dfp-1');
   * // profile =>
   * // { id: 'dfp-1', name: 'Finance', file_based: true, non_file_based: false }
   * ```
   */
  async get(resourceId: string): Promise<DataFilteringProfileResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_FILTERING_PROFILES_PATH}/${encodeURIComponent(resourceId)}`,
      responseSchema: DataFilteringProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Full-replace (PUT) the profile at `resourceId`. Returns the updated resource as the API
   * echoes it back.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const updated = await mgmt.dlp.dataFilteringProfiles.replace('dfp-1', {
   *   file_based: true,
   *   non_file_based: false,
   *   description: 'Finance — updated',
   * });
   * // updated =>
   * // { id: 'dfp-1', name: 'Finance', file_based: true, non_file_based: false }
   * ```
   */
  async replace(
    resourceId: string,
    body: DataFilteringProfileRequest,
  ): Promise<DataFilteringProfileResponse> {
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_FILTERING_PROFILES_PATH}/${encodeURIComponent(resourceId)}`,
      body,
      responseSchema: DataFilteringProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
