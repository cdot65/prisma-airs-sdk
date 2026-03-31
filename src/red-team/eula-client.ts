import { RED_TEAM_EULA_PATH } from '../constants.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type { EulaAcceptRequest, EulaContentResponse, EulaResponse } from '../models/red-team.js';

/** @internal */
export interface RedTeamEulaClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Client for Red Team EULA management operations. */
export class RedTeamEulaClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: RedTeamEulaClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * Get the current EULA content.
   * @returns The EULA content response.
   */
  async getContent(): Promise<EulaContentResponse> {
    const res = await managementHttpRequest<EulaContentResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_EULA_PATH}/content`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get the current EULA acceptance status.
   * @returns The EULA status response.
   */
  async getStatus(): Promise<EulaResponse> {
    const res = await managementHttpRequest<EulaResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_EULA_PATH}/status`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Accept the EULA.
   * @param request - The acceptance request body.
   * @returns The EULA response with acceptance status.
   */
  async accept(request: EulaAcceptRequest): Promise<EulaResponse> {
    const res = await managementHttpRequest<EulaResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_EULA_PATH}/accept`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
