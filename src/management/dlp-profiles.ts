import { MGMT_DLP_PROFILES_PATH } from '../constants.js';
import { managementHttpRequest } from './management-http-client.js';
import type { OAuthClient } from './oauth-client.js';
import type { DlpProfileListResponse } from '../models/mgmt-dlp-profile.js';

/** @internal */
export interface DlpProfilesClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Client for listing DLP profiles. */
export class DlpProfilesClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: DlpProfilesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * List all DLP profiles for the TSG.
   * @returns List of DLP profiles.
   */
  async list(): Promise<DlpProfileListResponse> {
    const res = await managementHttpRequest<DlpProfileListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MGMT_DLP_PROFILES_PATH,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
