import { MGMT_DEPLOYMENT_PROFILES_PATH } from '../constants.js';
import { managementHttpRequest } from './management-http-client.js';
import type { OAuthClient } from './oauth-client.js';
import type { DeploymentProfilesResponse } from '../models/mgmt-deployment-profile.js';

/** @internal */
export interface DeploymentProfilesClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
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
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: DeploymentProfilesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * List deployment profiles for the TSG.
   * @param opts - Optional filter options.
   * @returns Deployment profiles response.
   */
  async list(opts?: DeploymentProfileListOptions): Promise<DeploymentProfilesResponse> {
    const params: Record<string, string> = {};
    if (opts?.unactivated !== undefined) params.unactivated = String(opts.unactivated);

    const res = await managementHttpRequest<DeploymentProfilesResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MGMT_DEPLOYMENT_PROFILES_PATH,
      params: Object.keys(params).length > 0 ? params : undefined,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
