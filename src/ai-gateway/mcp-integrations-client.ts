import { AI_GW_MCP_INTEGRATIONS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListMcpIntegrationsResponseSchema,
  GatewayWriteResponseSchema,
  type ListMcpIntegrationsResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** Request body for registering an MCP server. */
export interface McpIntegrationCreateRequest {
  name: string;
  /** The TSG as a numeric string. */
  organisation_id: string;
  slug: string;
  /** MCP server URL. */
  url: string;
  /** e.g. `none`, `bearer`. */
  auth_type: string;
  /** e.g. `http`, `sse`. */
  transport: string;
  description?: string;
  configurations?: Record<string, unknown>;
  secret_mappings?: unknown[];
}

/**
 * Workspace-binding payload for `mcp-integrations/{id}/workspaces`.
 * Shape inferred from the sibling `IntegrationWorkspacesRequest` — not confirmed against a
 * live MCP-integrations tenant.
 */
export interface McpIntegrationWorkspacesRequest {
  workspaces?: unknown[];
  global_workspace_access?: boolean;
}

/** Client for AI Gateway MCP server integrations (admin plane). */
export class AIGatewayMcpIntegrationsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List organisation MCP integrations.
   * @returns All MCP server integrations defined on the organisation.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const mcp = await gw.mcpIntegrations.list();
   * // mcp.data[0] => { name: 'Context 7', url: 'https://mcp.context7.com/mcp', transport: 'http', ... }
   * ```
   */
  async list(): Promise<ListMcpIntegrationsResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_MCP_INTEGRATIONS_PATH,
      responseSchema: ListMcpIntegrationsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Register an MCP server.
   * @param body - Name, server URL, auth type, transport, and provider-specific configuration.
   * @returns The raw create response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.mcpIntegrations.create({
   *   name: 'Context 7',
   *   organisation_id: '1852583913',
   *   slug: 'context-7',
   *   url: 'https://mcp.context7.com/mcp',
   *   auth_type: 'none',
   *   transport: 'http',
   * });
   * ```
   */
  async create(body: McpIntegrationCreateRequest): Promise<GatewayWriteResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_MCP_INTEGRATIONS_PATH,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Replace which workspaces may use this MCP integration.
   * @param mcpIntegrationId - MCP integration UUID.
   * @param body - Workspace bindings or a global-access flag; this is a replace, not a merge.
   * @returns The raw response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.mcpIntegrations.setWorkspaces('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   global_workspace_access: true,
   * });
   * ```
   */
  async setWorkspaces(
    mcpIntegrationId: string,
    body: McpIntegrationWorkspacesRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}/workspaces`,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
