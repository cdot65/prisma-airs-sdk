import { AI_GW_ORGANISATIONS_SELF_PATH, aiGwOrganisationsAuthSettingsPath } from '../constants.js';
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
import {
  GatewayOrganisationAuthSettingsUpdateRequestSchema,
  GatewayOrganisationUpdateRequestSchema,
  type GatewayOrganisationAuthSettingsUpdateRequest,
  type GatewayOrganisationUpdateRequest,
} from '../models/ai-gateway-requests.js';
import type { AIGatewaySubClientOptions } from './types.js';
import { assertNumericId } from '../validators.js';
import {
  GatewayOrganisationInfoSchema,
  type GatewayOrganisationInfo,
} from '../models/ai-gateway-dashboard.js';

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

  /** Organisation capabilities/settings (bare response, not getSelf's envelope). @example `await gw.organisations.getInfo('1852583913');` */
  async getInfo(tsgId: string): Promise<GatewayOrganisationInfo> {
    assertNumericId(tsgId, 'tsgId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `/organisations/${tsgId}/info`,
      responseSchema: GatewayOrganisationInfoSchema,
      auth: this.auth,
      numRetries: this.numRetries,
      secretOperation: 'organisations.getInfo',
    });
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
   * @param body - One or more fields to update.
   * @returns The raw update response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.organisations.updateSelf({ name: 'Acme Corp' });
   * ```
   */
  async updateSelf(body: GatewayOrganisationUpdateRequest): Promise<GatewayWriteResponse> {
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: AI_GW_ORGANISATIONS_SELF_PATH,
      body,
      requestSchema: GatewayOrganisationUpdateRequestSchema,
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
   * SDK debug logs redact `scim_token` and known nested client-secret fields. Callers must
   * still avoid logging the input object or returned auth settings directly.
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
    assertNumericId(tsgId, 'tsgId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: aiGwOrganisationsAuthSettingsPath(tsgId),
      secretOperation: 'organisations.getAuthSettings',
      responseSchema: AuthSettingsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an organisation's auth settings.
   * @param tsgId - The TSG as a numeric string, not a UUID.
   * @param body - One or more auth-setting fields to update.
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
    body: GatewayOrganisationAuthSettingsUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertNumericId(tsgId, 'tsgId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: aiGwOrganisationsAuthSettingsPath(tsgId),
      body,
      requestSchema: GatewayOrganisationAuthSettingsUpdateRequestSchema,
      secretOperation: 'organisations.updateAuthSettings',
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
