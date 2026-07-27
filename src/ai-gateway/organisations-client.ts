import { AI_GW_ORGANISATIONS_SELF_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  OrganisationSelfResponseSchema,
  AuthSettingsResponseSchema,
  GatewayWriteResponseSchema,
  type OrganisationSelfResponse,
  type AuthSettingsResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** Client for AI Gateway organisation settings (admin plane). */
export class AIGatewayOrganisationsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Fetch the calling organisation's settings.
   * @returns The organisation record.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const org = await gw.organisations.getSelf();
   * // org.data.name => 'Acme Corp'
   * ```
   */
  async getSelf(): Promise<OrganisationSelfResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_ORGANISATIONS_SELF_PATH,
      responseSchema: OrganisationSelfResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update the calling organisation's settings.
   * @param body - Replacement fields.
   * @returns The raw update response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.organisations.updateSelf({ name: 'Acme Corp' });
   * ```
   */
  async updateSelf(body: Record<string, unknown>): Promise<GatewayWriteResponse> {
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: AI_GW_ORGANISATIONS_SELF_PATH,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch an organisation's auth settings.
   *
   * @remarks
   * The response includes a `scim_token` — a live secret. Never log the returned object.
   *
   * @param tsgId - The TSG as a numeric string, not a UUID.
   * @returns Auth settings, including domains and the SCIM token.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const auth = await gw.organisations.getAuthSettings('1852583913');
   * // Object.keys(auth.data) => ['auth_settings', 'domains', 'scim_token', ...]
   * ```
   */
  async getAuthSettings(tsgId: string): Promise<AuthSettingsResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `/organisations/${tsgId}/auth-settings`,
      responseSchema: AuthSettingsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an organisation's auth settings.
   * @param tsgId - The TSG as a numeric string, not a UUID.
   * @param body - Replacement fields.
   * @returns The raw update response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.organisations.updateAuthSettings('1852583913', {
   *   domains: ['acme.com'],
   * });
   * ```
   */
  async updateAuthSettings(
    tsgId: string,
    body: Record<string, unknown>,
  ): Promise<GatewayWriteResponse> {
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `/organisations/${tsgId}/auth-settings`,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
