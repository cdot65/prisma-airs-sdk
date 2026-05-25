import { MGMT_DEPLOYMENT_PROFILES_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  DeploymentProfilesResponseSchema,
  type DeploymentProfilesResponse,
} from '../models/mgmt-deployment-profile.js';

/** @internal */
export interface DeploymentProfilesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Options for listing deployment profiles. */
export interface DeploymentProfileListOptions {
  /** Include unactivated deployment profiles. */
  unactivated?: boolean;
}

/** Client for listing deployment profiles. */
export class DeploymentProfilesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: DeploymentProfilesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List deployment profiles for the TSG.
   * @param opts - Optional filter options.
   * @returns Deployment profiles response.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const result = await mgmt.deploymentProfiles.list({ unactivated: true });
   * // result =>
   * // { deployment_profiles: [ { dp_name: 'prod-dp', auth_code: 'ac', status: 'active' } ],
   * //   status: 'ok' }
   * ```
   */
  async list(opts?: DeploymentProfileListOptions): Promise<DeploymentProfilesResponse> {
    const params: Record<string, string> = {};
    if (opts?.unactivated !== undefined) params.unactivated = String(opts.unactivated);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MGMT_DEPLOYMENT_PROFILES_PATH,
      params: Object.keys(params).length > 0 ? params : undefined,
      responseSchema: DeploymentProfilesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
