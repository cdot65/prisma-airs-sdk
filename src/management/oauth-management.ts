import { z } from 'zod';
import { MGMT_OAUTH_INVALIDATE_PATH, MGMT_OAUTH_TOKEN_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  Oauth2TokenSchema,
  type ClientIdAndCustomerApp,
  type Oauth2Token,
} from '../models/mgmt-oauth.js';

/** @internal */
export interface OAuthManagementClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
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
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: OAuthManagementClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Invalidate an OAuth token.
   * @param token - The OAuth token to invalidate.
   * @param body - Client ID and customer app.
   * @returns Confirmation string.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const result = await mgmt.oauth.invalidateToken('old-token', {
   *   client_id: 'cid',
   *   customer_app: 'app1',
   * });
   * // result => 'token invalidated'
   * ```
   */
  async invalidateToken(token: string, body: ClientIdAndCustomerApp): Promise<string> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_OAUTH_INVALIDATE_PATH,
      params: { token },
      body,
      responseSchema: z.string(),
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get an OAuth token for client credentials.
   * @param opts - Token request options.
   * @returns OAuth2 token response.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const token = await mgmt.oauth.getAccessToken({
   *   body: { client_id: 'cid', customer_app: 'app1' },
   *   tokenTtlInterval: 3,
   *   tokenTtlUnit: 'hours',
   * });
   * // token =>
   * // { access_token: 'new-token', expires_in: '86400', token_type: 'Bearer' }
   * ```
   */
  async getAccessToken(opts: GetTokenOptions): Promise<Oauth2Token> {
    const params: Record<string, string> = {};
    if (opts.tokenTtlInterval !== undefined)
      params.tokenTtlInterval = String(opts.tokenTtlInterval);
    if (opts.tokenTtlUnit !== undefined) params.tokenTtlUnit = opts.tokenTtlUnit;

    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_OAUTH_TOKEN_PATH,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: opts.body,
      responseSchema: Oauth2TokenSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
