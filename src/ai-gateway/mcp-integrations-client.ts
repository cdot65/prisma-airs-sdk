import { AI_GW_MCP_INTEGRATIONS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListMcpIntegrationsResponseSchema,
  GatewayWriteResponseSchema,
  McpIntegrationDetailSchema,
  McpIntegrationCapabilitiesResponseSchema,
  McpIntegrationMetadataSchema,
  McpIntegrationCapabilitiesUpdateResponseSchema,
  McpIntegrationWorkspacesUpdateResponseSchema,
  type ListMcpIntegrationsResponse,
  type GatewayWriteResponse,
  type McpIntegrationDetail,
  type McpIntegrationCapabilitiesResponse,
  type McpIntegrationMetadata,
  type McpIntegrationCapabilitiesUpdateResponse,
  type McpIntegrationWorkspacesUpdateResponse,
} from '../models/ai-gateway.js';
import {
  McpIntegrationCapabilitiesBulkUpdateRequestSchema,
  McpIntegrationCreateRequestSchema,
  McpIntegrationUpdateRequestSchema,
  McpIntegrationWorkspacesBulkUpdateRequestSchema,
  type McpIntegrationCapabilitiesBulkUpdateRequest,
  type McpIntegrationCreateRequest,
  type McpIntegrationUpdateRequest,
  type McpIntegrationWorkspacesBulkUpdateRequest,
} from '../models/ai-gateway-requests.js';
import type { AIGatewaySubClientOptions } from './types.js';
import { z } from 'zod';
import {
  GatewayMcpIntegrationWorkspacesListResponseSchema,
  GatewayMcpIntegrationWorkspacesLegacyResponseSchema,
  type GatewayMcpIntegrationWorkspacesListResponse,
  type GatewayMcpIntegrationWorkspacesLegacyResponse,
} from '../models/ai-gateway-extensions.js';

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

  /** List MCP integration workspace access; version selects the upstream envelope. @example `await gw.mcpIntegrations.getWorkspaces(id, { version: '2' });` */
  async getWorkspaces(
    mcpIntegrationId: string,
    opts: { version?: string } = {},
  ): Promise<
    GatewayMcpIntegrationWorkspacesListResponse | GatewayMcpIntegrationWorkspacesLegacyResponse
  > {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}/workspaces`,
      params: opts.version === undefined ? undefined : { version: opts.version },
      responseSchema: z.union([
        GatewayMcpIntegrationWorkspacesListResponseSchema,
        GatewayMcpIntegrationWorkspacesLegacyResponseSchema,
      ]),
      auth: this.auth,
      numRetries: this.numRetries,
    });
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
   * Fetch one MCP integration. Verified live 2026-08-29.
   * @param mcpIntegrationId - MCP integration UUID.
   * @returns Integration detail; unlike list rows, `configurations` is an object.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   * const integration = await gw.mcpIntegrations.get('2a6f4e2e-6f5a-4a1f-9d0e-9b2b6f6c3a11');
   * console.log(integration.url);
   * ```
   */
  async get(mcpIntegrationId: string): Promise<McpIntegrationDetail> {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}`,
      responseSchema: McpIntegrationDetailSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List capabilities discovered from an MCP integration. Verified live 2026-08-29.
   * @param mcpIntegrationId - MCP integration UUID.
   * @returns Tools, prompts, resources, and resource templates with enablement counts.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   * const capabilities = await gw.mcpIntegrations.getCapabilities('2a6f4e2e-6f5a-4a1f-9d0e-9b2b6f6c3a11');
   * console.log(capabilities.data.map((capability) => capability.name));
   * ```
   */
  async getCapabilities(mcpIntegrationId: string): Promise<McpIntegrationCapabilitiesResponse> {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}/capabilities`,
      responseSchema: McpIntegrationCapabilitiesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch metadata discovered from an MCP server. Verified live 2026-08-29.
   * @param mcpIntegrationId - MCP integration UUID.
   * @returns Server identity, protocol, capability flags, and sync state.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   * const metadata = await gw.mcpIntegrations.getMetadata('2a6f4e2e-6f5a-4a1f-9d0e-9b2b6f6c3a11');
   * console.log(metadata.sync_status);
   * ```
   */
  async getMetadata(mcpIntegrationId: string): Promise<McpIntegrationMetadata> {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}/metadata`,
      responseSchema: McpIntegrationMetadataSchema,
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
      requestSchema: McpIntegrationCreateRequestSchema,
      secretOperation: 'mcpIntegrations.create',
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Update an MCP integration. @example `await gw.mcpIntegrations.update(id, { name: 'Docs MCP' });` */
  async update(
    mcpIntegrationId: string,
    body: McpIntegrationUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}`,
      body,
      requestSchema: McpIntegrationUpdateRequestSchema,
      secretOperation: 'mcpIntegrations.update',
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Permanently delete an MCP integration. @example `await gw.mcpIntegrations.delete(id);` */
  async delete(mcpIntegrationId: string): Promise<void> {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Bulk-update capability enablement values. @example `await gw.mcpIntegrations.setCapabilities(id, { capabilities: [{ name: 'lookup', type: 'tool', enabled: true }] });` */
  async setCapabilities(
    mcpIntegrationId: string,
    body: McpIntegrationCapabilitiesBulkUpdateRequest,
  ): Promise<McpIntegrationCapabilitiesUpdateResponse> {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}/capabilities`,
      body,
      requestSchema: McpIntegrationCapabilitiesBulkUpdateRequestSchema,
      responseSchema: McpIntegrationCapabilitiesUpdateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Bulk-update which workspaces may use this MCP integration.
   * @param mcpIntegrationId - MCP integration UUID.
   * @param body - Workspace bindings or global-access settings. Use the explicit override flag
   * to request replacement behavior.
   * @returns An empty object. Verified live 2026-08-30.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.mcpIntegrations.setWorkspaces('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   workspaces: [{ id: 'ws-development', enabled: true }],
   *   global_workspace_access: { enabled: false },
   *   override_existing_workspace_access: true,
   * });
   * ```
   */
  async setWorkspaces(
    mcpIntegrationId: string,
    body: McpIntegrationWorkspacesBulkUpdateRequest,
  ): Promise<McpIntegrationWorkspacesUpdateResponse> {
    assertUuid(mcpIntegrationId, 'mcpIntegrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_MCP_INTEGRATIONS_PATH}/${mcpIntegrationId}/workspaces`,
      body,
      requestSchema: McpIntegrationWorkspacesBulkUpdateRequestSchema,
      responseSchema: McpIntegrationWorkspacesUpdateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
