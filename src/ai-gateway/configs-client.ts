import { AI_GW_CONFIGS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListConfigsResponseSchema,
  GatewayConfigSchema,
  GatewayWriteResponseSchema,
  type ListConfigsResponse,
  type GatewayConfig,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** Options for listing configs. */
export interface AIGatewayConfigListOptions {
  /** Workspace UUID. Required — omitting it returns `404 AB02`, not an empty list. */
  workspaceId: string;
}

/** Request body for creating or updating a config. */
export interface GatewayConfigCreateRequest {
  name: string;
  /** Workspace UUID the config belongs to. */
  workspace_id: string;
  /**
   * The gateway routing config. Sent as an **object**; note the API returns it back as a
   * JSON-encoded **string** on reads.
   */
  config: Record<string, unknown>;
}

/** Client for AI Gateway config operations (data plane). */
export class AIGatewayConfigsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List configs in a workspace.
   * @param opts - Must include the workspace UUID.
   * @returns Configs, each with `config` as a JSON-encoded string.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const cfgs = await gw.configs.list({ workspaceId: '16f7e90d-382a-4e78-b577-1b01eb5f8297' });
   * const routing = JSON.parse(cfgs.data[0].config) as Record<string, unknown>;
   * // routing.provider => '@anthropic-prod'
   * ```
   */
  async list(opts: AIGatewayConfigListOptions): Promise<ListConfigsResponse> {
    assertUuid(opts.workspaceId, 'workspaceId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_CONFIGS_PATH,
      params: { workspace_id: opts.workspaceId },
      responseSchema: ListConfigsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch one config.
   * @param configId - Config UUID.
   * @returns The config; `config` is a JSON-encoded string, not an object.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const cfg = await gw.configs.get('764cf9cd-4ebf-449e-b669-08149b0fbbbc');
   * // cfg.name => 'claude-code'
   * ```
   */
  async get(configId: string): Promise<GatewayConfig> {
    assertUuid(configId, 'configId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_CONFIGS_PATH}/${configId}`,
      responseSchema: GatewayConfigSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a config.
   * @param body - Name, workspace UUID, and the routing config object.
   * @returns The raw create response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.configs.create({
   *   name: 'vertex-airs',
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   config: { retry: { attempts: 3 }, cache: { mode: 'simple' } },
   * });
   * ```
   */
  async create(body: GatewayConfigCreateRequest): Promise<GatewayWriteResponse> {
    assertUuid(body.workspace_id, 'workspace_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_CONFIGS_PATH,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a config.
   * @param configId - Config UUID.
   * @param body - Replacement fields.
   * @returns The raw update response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.configs.update('764cf9cd-4ebf-449e-b669-08149b0fbbbc', {
   *   name: 'claude-code',
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   config: { retry: { attempts: 5 } },
   * });
   * ```
   */
  async update(configId: string, body: GatewayConfigCreateRequest): Promise<GatewayWriteResponse> {
    assertUuid(configId, 'configId');
    assertUuid(body.workspace_id, 'workspace_id');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_CONFIGS_PATH}/${configId}`,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
