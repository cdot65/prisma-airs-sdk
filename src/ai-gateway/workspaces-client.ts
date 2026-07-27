import { AI_GW_WORKSPACES_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListWorkspacesResponseSchema,
  GatewayWorkspaceDetailSchema,
  type ListWorkspacesResponse,
  type GatewayWorkspaceDetail,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** Client for AI Gateway workspace reads (data plane). */
export class AIGatewayWorkspacesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List workspaces visible to the caller.
   * @returns All workspaces, each with the `scope_name` that grants data-plane access to it.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const ws = await gw.workspaces.list();
   * // ws.data[0] => { slug: 'ws-main-a-349e0e', scope_name: 'main_airs_workspace_1852583913', ... }
   * ```
   */
  async list(): Promise<ListWorkspacesResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_WORKSPACES_PATH,
      responseSchema: ListWorkspacesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch one workspace, including its security and rate-limit settings.
   * @param workspaceId - Workspace UUID.
   * @returns Workspace detail; list rows do not carry the settings blocks.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const ws = await gw.workspaces.get('16f7e90d-382a-4e78-b577-1b01eb5f8297');
   * // ws.security_settings?.membersViewLogs => true
   * ```
   */
  async get(workspaceId: string): Promise<GatewayWorkspaceDetail> {
    assertUuid(workspaceId, 'workspaceId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_WORKSPACES_PATH}/${workspaceId}`,
      responseSchema: GatewayWorkspaceDetailSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
