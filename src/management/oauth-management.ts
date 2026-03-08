import { MGMT_OAUTH_INVALIDATE_PATH, MGMT_OAUTH_TOKEN_PATH } from '../constants.js';
import { managementHttpRequest } from './management-http-client.js';
import type { OAuthClient } from './oauth-client.js';
import type { ClientIdAndCustomerApp, Oauth2Token } from '../models/mgmt-oauth.js';

/** @internal */
export interface OAuthManagementClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Options for getting an OAuth token. */
export interface GetTokenOptions {
  /** Client ID and customer app. */
  body: ClientIdAndCustomerApp;
  /** Token TTL interval. */
  tokenTtlInterval?: number;
  /** Token TTL unit (e.g. 'hours'). */
  tokenTtlUnit?: string;
}

/** Client for OAuth token management operations. */
export class OAuthManagementClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: OAuthManagementClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * Invalidate an OAuth token.
   * @param token - The OAuth token to invalidate.
   * @param body - Client ID and customer app.
   * @returns Confirmation string.
   */
  async invalidateToken(token: string, body: ClientIdAndCustomerApp): Promise<string> {
    const res = await managementHttpRequest<string>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_OAUTH_INVALIDATE_PATH,
      params: { token },
      body,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get an OAuth token for client credentials.
   * @param opts - Token request options.
   * @returns OAuth2 token response.
   */
  async getAccessToken(opts: GetTokenOptions): Promise<Oauth2Token> {
    const params: Record<string, string> = {};
    if (opts.tokenTtlInterval !== undefined)
      params.tokenTtlInterval = String(opts.tokenTtlInterval);
    if (opts.tokenTtlUnit !== undefined) params.tokenTtlUnit = opts.tokenTtlUnit;

    const res = await managementHttpRequest<Oauth2Token>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_OAUTH_TOKEN_PATH,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: opts.body,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
