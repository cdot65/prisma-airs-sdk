import { MGMT_DLP_PROFILES_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  DlpProfileListResponseSchema,
  type DlpProfileListResponse,
} from '../models/mgmt-dlp-profile.js';

/** @internal */
export interface DlpProfilesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for listing DLP profiles. */
export class DlpProfilesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: DlpProfilesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List all DLP profiles for the TSG.
   * @returns List of DLP profiles.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const result = await mgmt.dlpProfiles.list();
   * // result =>
   * // { dlp_profiles: [ { name: 'pci-dss', uuid: 'u1' } ] }
   * ```
   */
  async list(): Promise<DlpProfileListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MGMT_DLP_PROFILES_PATH,
      responseSchema: DlpProfileListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
