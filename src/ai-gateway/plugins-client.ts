import { AI_GW_PLUGINS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListPluginsResponseSchema,
  GatewayWriteResponseSchema,
  type ListPluginsResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** Request body for binding a plugin (e.g. the Prisma AIRS scanner) to the organisation. */
export interface GatewayPluginCreateRequest {
  /** The TSG as a numeric string. */
  organisation_id: string;
  /** Plugin provider integration id, e.g. the `panw-prisma-airs` provider. */
  integration_id: string;
  /** Provider-specific secrets, e.g. `{ AIRS_API_KEY: '...' }`. Never log this. */
  credentials: Record<string, string>;
}

/** Client for AI Gateway plugin bindings (admin plane). */
export class AIGatewayPluginsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List organisation plugin bindings.
   * @returns All plugins bound to the organisation, with masked credentials.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const p = await gw.plugins.list();
   * // p.data[0] => { integration_slug: 'panw-prisma-airs', credentials: { AIRS_API_KEY: 'sn*****Gul' }, ... }
   * ```
   */
  async list(): Promise<ListPluginsResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_PLUGINS_PATH,
      responseSchema: ListPluginsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Bind a plugin to the organisation.
   *
   * @remarks
   * `body.credentials` (e.g. `AIRS_API_KEY`) is a live secret. Setting `PANW_AI_SEC_DEBUG`
   * will print it, unredacted, to the SDK's own debug log.
   *
   * @param body - Integration id and provider-specific credentials.
   * @returns The raw create response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.plugins.create({
   *   organisation_id: '1852583913',
   *   integration_id: '232e45c4-809a-11f1-af60-2ca2a760eb7b',
   *   credentials: { AIRS_API_KEY: process.env.PANW_AI_SEC_API_KEY ?? '' },
   * });
   * ```
   */
  async create(body: GatewayPluginCreateRequest): Promise<GatewayWriteResponse> {
    assertUuid(body.integration_id, 'integration_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_PLUGINS_PATH,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
