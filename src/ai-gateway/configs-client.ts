import { AI_GW_CONFIGS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListConfigsResponseSchema,
  GatewayConfigDetailSchema,
  GatewayConfigCreateResponseSchema,
  GatewayWriteResponseSchema,
  ListConfigVersionsResponseSchema,
  type ListConfigsResponse,
  type GatewayConfigDetail,
  type GatewayConfigCreateResponse,
  type GatewayWriteResponse,
  type ListConfigVersionsResponse,
} from '../models/ai-gateway.js';
import {
  GatewayConfigCreateRequestSchema,
  GatewayConfigUpdateRequestSchema,
  type GatewayConfigCreateRequest,
  type GatewayConfigUpdateRequest,
} from '../models/ai-gateway-requests.js';
import type { AIGatewaySubClientOptions, AIGatewayWorkspaceScopedListOptions } from './types.js';

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
   *
   * @remarks
   * List rows are a strict 12-field subset of the detail read — they do NOT carry `config`,
   * `format`, `type`, or `version_id`. Call {@link get} for those.
   *
   * @param opts - Must include the workspace UUID.
   * @returns Config list rows.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const cfgs = await gw.configs.list({ workspaceId: '16f7e90d-382a-4e78-b577-1b01eb5f8297' });
   * // cfgs.data[0] => { name: 'claude-code', slug: 'pc-claude-e46fe6', status: 'active', ... }
   * ```
   */
  async list(opts: AIGatewayWorkspaceScopedListOptions): Promise<ListConfigsResponse> {
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
   * @returns The config detail — adds `config` (a JSON-encoded string, not an object),
   * `format`, `type`, and `version_id` on top of the list row.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const cfg = await gw.configs.get('764cf9cd-4ebf-449e-b669-08149b0fbbbc');
   * const routing = JSON.parse(cfg.config) as Record<string, unknown>;
   * // routing.provider => '@anthropic-prod'
   * ```
   */
  async get(configId: string): Promise<GatewayConfigDetail> {
    assertUuid(configId, 'configId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_CONFIGS_PATH}/${configId}`,
      responseSchema: GatewayConfigDetailSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List the immutable version history for one config. Verified live 2026-08-29.
   * @param configId - Config UUID.
   * @returns Config versions, including version ownership and creation timestamps.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   * const versions = await gw.configs.listVersions('764cf9cd-4ebf-449e-b669-08149b0fbbbc');
   * console.log(versions.data[0].version_id);
   * ```
   */
  async listVersions(configId: string): Promise<ListConfigVersionsResponse> {
    assertUuid(configId, 'configId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_CONFIGS_PATH}/${configId}/versions`,
      responseSchema: ListConfigVersionsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a config.
   *
   * @remarks
   * The response is a **creation receipt** — `{ id, version_id, slug, object }` — not a
   * {@link GatewayConfigDetail}. Call {@link get} for the full record. Verified live
   * 2026-07-28.
   *
   * @param body - Name, workspace UUID, and the routing config object.
   * @returns The creation receipt.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const receipt = await gw.configs.create({
   *   name: 'vertex-airs',
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   config: { retry: { attempts: 3 }, cache: { mode: 'simple' } },
   * });
   * // receipt => { id: '...', version_id: '...', slug: 'pc-sdk-ve-14620d', object: 'config' }
   * ```
   */
  async create(body: GatewayConfigCreateRequest): Promise<GatewayConfigCreateResponse> {
    assertUuid(body.workspace_id, 'workspace_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_CONFIGS_PATH,
      body,
      requestSchema: GatewayConfigCreateRequestSchema,
      responseSchema: GatewayConfigCreateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a config.
   * @param configId - Config UUID.
   * @param body - One or more fields to update. A supplied `config` replaces the routing document.
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
  async update(configId: string, body: GatewayConfigUpdateRequest): Promise<GatewayWriteResponse> {
    assertUuid(configId, 'configId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_CONFIGS_PATH}/${configId}`,
      body,
      requestSchema: GatewayConfigUpdateRequestSchema,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a config.
   *
   * @remarks
   * This is a **hard delete** — unlike {@link AIGatewayDeploymentsClient.delete | deployments.delete}
   * (which archives), the config disappears from {@link list} entirely. Verified live
   * 2026-07-28. No `organisation_id` query param is required, unlike deployments/integrations.
   *
   * @param configId - Config UUID.
   * @returns Nothing.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.configs.delete('764cf9cd-4ebf-449e-b669-08149b0fbbbc');
   * // the config no longer appears in gw.configs.list()
   * ```
   */
  async delete(configId: string): Promise<void> {
    assertUuid(configId, 'configId');
    // The API returns 200 with an empty body. request() resolves to undefined whenever
    // no responseSchema is supplied, regardless of allowEmptyBody — see
    // deployments-client.ts's delete() for the fuller explanation.
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_CONFIGS_PATH}/${configId}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
