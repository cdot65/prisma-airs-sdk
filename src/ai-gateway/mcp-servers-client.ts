import { queryParams } from '../http/query.js';
import { request } from '../http/request.js';
import { gatewayPathSegment } from './runtime-wire.js';
import { assertLength } from '../validators.js';
import type { AIGatewaySubClientOptions } from './types.js';
import {
  type GatewayMcpServersClientListOptions,
  GatewayMcpServersClientListOptionsSchema,
  type GatewayMcpServersClientListResponse,
  GatewayMcpServersClientListResponseSchema,
  type GatewayMcpServersClientCreateRequest,
  GatewayMcpServersClientCreateRequestSchema,
  type GatewayMcpServersClientCreateResponse,
  GatewayMcpServersClientCreateResponseSchema,
  type GatewayMcpServersClientGetResponse,
  GatewayMcpServersClientGetResponseSchema,
  type GatewayMcpServersClientUpdateRequest,
  GatewayMcpServersClientUpdateRequestSchema,
  type GatewayMcpServersClientUpdateResponse,
  GatewayMcpServersClientUpdateResponseSchema,
  type GatewayMcpServersClientDeleteResponse,
  GatewayMcpServersClientDeleteResponseSchema,
  type GatewayMcpServersClientTestResponse,
  GatewayMcpServersClientTestResponseSchema,
  type GatewayMcpServersClientGetCapabilitiesOptions,
  GatewayMcpServersClientGetCapabilitiesOptionsSchema,
  type GatewayMcpServersClientGetCapabilitiesResponse,
  GatewayMcpServersClientGetCapabilitiesResponseSchema,
  type GatewayMcpServersClientUpdateCapabilitiesRequest,
  GatewayMcpServersClientUpdateCapabilitiesRequestSchema,
  type GatewayMcpServersClientUpdateCapabilitiesResponse,
  GatewayMcpServersClientUpdateCapabilitiesResponseSchema,
  type GatewayMcpServersClientGetUserAccessOptions,
  GatewayMcpServersClientGetUserAccessOptionsSchema,
  type GatewayMcpServersClientGetUserAccessResponse,
  GatewayMcpServersClientGetUserAccessResponseSchema,
  type GatewayMcpServersClientUpdateUserAccessRequest,
  GatewayMcpServersClientUpdateUserAccessRequestSchema,
  type GatewayMcpServersClientUpdateUserAccessResponse,
  GatewayMcpServersClientUpdateUserAccessResponseSchema,
  type GatewayMcpServersClientGetConnectionsOptions,
  GatewayMcpServersClientGetConnectionsOptionsSchema,
  type GatewayMcpServersClientGetConnectionsResponse,
  GatewayMcpServersClientGetConnectionsResponseSchema,
  type GatewayMcpServersClientDeleteConnectionsOptions,
  GatewayMcpServersClientDeleteConnectionsOptionsSchema,
  type GatewayMcpServersClientDeleteConnectionsResponse,
  GatewayMcpServersClientDeleteConnectionsResponseSchema,
} from '../models/ai-gateway-extensions.js';

/** Workspace-scoped mcpServers operations on the SCM data plane.
 * @example `const client = new AIGatewayClient().mcpServers;`
 */
export class AIGatewayMcpServersClient {
  constructor(private readonly options: AIGatewaySubClientOptions) {}

  /** List MCP Servers.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.list({});`
   */
  async list(
    opts: GatewayMcpServersClientListOptions = {},
  ): Promise<GatewayMcpServersClientListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers`,
      params: queryParams(opts, GatewayMcpServersClientListOptionsSchema),
      responseSchema: GatewayMcpServersClientListResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Create MCP Server.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.create(body);`
   */
  async create(
    body: GatewayMcpServersClientCreateRequest,
  ): Promise<GatewayMcpServersClientCreateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers`,
      body,
      requestSchema: GatewayMcpServersClientCreateRequestSchema,
      responseSchema: GatewayMcpServersClientCreateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Get MCP Server.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.get('resource-id');`
   */
  async get(mcpServerId: string): Promise<GatewayMcpServersClientGetResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}`,
      responseSchema: GatewayMcpServersClientGetResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Update MCP Server.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.update('resource-id', body);`
   */
  async update(
    mcpServerId: string,
    body: GatewayMcpServersClientUpdateRequest,
  ): Promise<GatewayMcpServersClientUpdateResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'PUT',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}`,
      body,
      requestSchema: GatewayMcpServersClientUpdateRequestSchema,
      responseSchema: GatewayMcpServersClientUpdateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Delete MCP Server.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.delete('resource-id');`
   */
  async delete(mcpServerId: string): Promise<GatewayMcpServersClientDeleteResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'DELETE',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}`,
      responseSchema: GatewayMcpServersClientDeleteResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Test MCP Server Connection.
   * @experimental SCM returned HTTP 403 on an owned server; authorization remains unverified.
   * @example `await gw.mcpServers.test('resource-id');`
   */
  async test(mcpServerId: string): Promise<GatewayMcpServersClientTestResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'POST',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}/test`,
      responseSchema: GatewayMcpServersClientTestResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** List MCP Server Capabilities.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.getCapabilities('resource-id', {});`
   */
  async getCapabilities(
    mcpServerId: string,
    opts: GatewayMcpServersClientGetCapabilitiesOptions = {},
  ): Promise<GatewayMcpServersClientGetCapabilitiesResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}/capabilities`,
      params: queryParams(opts, GatewayMcpServersClientGetCapabilitiesOptionsSchema),
      responseSchema: GatewayMcpServersClientGetCapabilitiesResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Bulk Update MCP Server Capabilities.
   * @experimental No discovered tool was available on the owned server; contract-tested only.
   * @example `await gw.mcpServers.updateCapabilities('resource-id', body);`
   */
  async updateCapabilities(
    mcpServerId: string,
    body: GatewayMcpServersClientUpdateCapabilitiesRequest,
  ): Promise<GatewayMcpServersClientUpdateCapabilitiesResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'PUT',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}/capabilities`,
      body,
      requestSchema: GatewayMcpServersClientUpdateCapabilitiesRequestSchema,
      responseSchema: GatewayMcpServersClientUpdateCapabilitiesResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** List MCP Server User Access.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.getUserAccess('resource-id', {});`
   */
  async getUserAccess(
    mcpServerId: string,
    opts: GatewayMcpServersClientGetUserAccessOptions = {},
  ): Promise<GatewayMcpServersClientGetUserAccessResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}/user-access`,
      params: queryParams(opts, GatewayMcpServersClientGetUserAccessOptionsSchema),
      responseSchema: GatewayMcpServersClientGetUserAccessResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Bulk Update MCP Server User Access.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.updateUserAccess('resource-id', body);`
   */
  async updateUserAccess(
    mcpServerId: string,
    body: GatewayMcpServersClientUpdateUserAccessRequest,
  ): Promise<GatewayMcpServersClientUpdateUserAccessResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'PUT',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}/user-access`,
      body,
      requestSchema: GatewayMcpServersClientUpdateUserAccessRequestSchema,
      responseSchema: GatewayMcpServersClientUpdateUserAccessResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** List MCP Server Connections.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.mcpServers.getConnections('resource-id', {});`
   */
  async getConnections(
    mcpServerId: string,
    opts: GatewayMcpServersClientGetConnectionsOptions = {},
  ): Promise<GatewayMcpServersClientGetConnectionsResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}/connections`,
      params: queryParams(opts, GatewayMcpServersClientGetConnectionsOptionsSchema),
      responseSchema: GatewayMcpServersClientGetConnectionsResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Delete MCP Server Connection.
   * @experimental SCM returned HTTP 403 on an owned server; authorization remains unverified.
   * @example `await gw.mcpServers.deleteConnections('resource-id', {});`
   */
  async deleteConnections(
    mcpServerId: string,
    opts: GatewayMcpServersClientDeleteConnectionsOptions = {},
  ): Promise<GatewayMcpServersClientDeleteConnectionsResponse> {
    assertLength(mcpServerId, 1, 512, 'mcpServerId');
    return request({
      method: 'DELETE',
      baseUrl: this.options.baseUrl,
      path: `/mcp-servers/${gatewayPathSegment(mcpServerId)}/connections`,
      params: queryParams(opts, GatewayMcpServersClientDeleteConnectionsOptionsSchema),
      responseSchema: GatewayMcpServersClientDeleteConnectionsResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }
}
