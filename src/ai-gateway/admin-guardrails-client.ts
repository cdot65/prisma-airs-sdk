import { AI_GW_GUARDRAILS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  GatewayAdminGuardrailMcpMappingRequestSchema,
  GatewayAdminGuardrailMcpSyncRequestSchema,
  type GatewayAdminGuardrailMcpMappingRequest,
  type GatewayAdminGuardrailMcpSyncRequest,
  GatewayAdminGuardrailListOptionsSchema,
  GatewayAdminGuardrailListResponseSchema,
  GatewayAdminGuardrailDetailSchema,
  GatewayAdminGuardrailCreateRequestSchema,
  GatewayAdminGuardrailCreateResponseSchema,
  GatewayAdminGuardrailUpdateResponseSchema,
  type GatewayAdminGuardrailListOptions,
  type GatewayAdminGuardrailListResponse,
  type GatewayAdminGuardrailDetail,
  type GatewayAdminGuardrailCreateRequest,
  type GatewayAdminGuardrailCreateResponse,
  type GatewayAdminGuardrailUpdateResponse,
} from '../models/ai-gateway-admin-guardrails.js';
import {
  GatewayGuardrailUpdateRequestSchema,
  type GatewayGuardrailUpdateRequest,
} from '../models/ai-gateway-requests.js';
import type { AIGatewaySubClientOptions } from './types.js';
import {
  GatewayMcpServerMappingsResponseSchema,
  GatewayBulkSyncMcpServerMappingsResponseSchema,
  GatewayUpsertMcpServerMappingResponseSchema,
  type GatewayMcpServerMapping,
  type GatewayBulkSyncMcpServerMappingsResponse,
  type GatewayUpsertMcpServerMappingResponse,
} from '../models/ai-gateway-extensions.js';

/** Explicit admin guardrail operations. No fallback to workspace routes. Only list has live read acceptance; mutations are specification-tested. */
export class AIGatewayAdminGuardrailsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /** List guardrail mappings to MCP servers. @example `await gw.adminGuardrails.getMcpServers(id);` */
  async getMcpServers(guardrailId: string): Promise<GatewayMcpServerMapping[]> {
    assertUuid(guardrailId, 'guardrailId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GUARDRAILS_PATH}/${guardrailId}/mcp-servers`,
      responseSchema: GatewayMcpServerMappingsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Replace all MCP server mappings on this guardrail. @example `await gw.adminGuardrails.syncMcpServers(id, body);` */
  async syncMcpServers(
    guardrailId: string,
    body: GatewayAdminGuardrailMcpSyncRequest,
  ): Promise<GatewayBulkSyncMcpServerMappingsResponse> {
    assertUuid(guardrailId, 'guardrailId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GUARDRAILS_PATH}/${guardrailId}/mcp-servers`,
      body,
      requestSchema: GatewayAdminGuardrailMcpSyncRequestSchema,
      responseSchema: GatewayBulkSyncMcpServerMappingsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Enable or disable one MCP server mapping. @example `await gw.adminGuardrails.upsertMcpServer(id, serverId, body);` */
  async upsertMcpServer(
    guardrailId: string,
    mcpServerId: string,
    body: GatewayAdminGuardrailMcpMappingRequest,
  ): Promise<GatewayUpsertMcpServerMappingResponse> {
    assertUuid(guardrailId, 'guardrailId');
    assertUuid(mcpServerId, 'mcpServerId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GUARDRAILS_PATH}/${guardrailId}/mcp-servers/${mcpServerId}`,
      body,
      requestSchema: GatewayAdminGuardrailMcpMappingRequestSchema,
      responseSchema: GatewayUpsertMcpServerMappingResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** List organisation guardrails; workspace filtering may be denied by deployment policy. @example `await gw.adminGuardrails.list({ pageSize: 100 });` */
  async list(
    opts: GatewayAdminGuardrailListOptions = {},
  ): Promise<GatewayAdminGuardrailListResponse> {
    const query = GatewayAdminGuardrailListOptionsSchema.parse(opts);
    const params: Record<string, string> = {};
    if (query.workspaceId !== undefined) params.workspace_id = query.workspaceId;
    if (query.pageSize !== undefined) params.page_size = String(query.pageSize);
    if (query.currentPage !== undefined) params.current_page = String(query.currentPage);
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_GUARDRAILS_PATH,
      params,
      responseSchema: GatewayAdminGuardrailListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Read one admin guardrail. @example `await gw.adminGuardrails.get(id);` */
  async get(guardrailId: string): Promise<GatewayAdminGuardrailDetail> {
    assertUuid(guardrailId, 'guardrailId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GUARDRAILS_PATH}/${guardrailId}`,
      responseSchema: GatewayAdminGuardrailDetailSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Create an admin guardrail; specification-tested, not live mutation-tested. @example `await gw.adminGuardrails.create({ name: "Policy", target: "mcp_tools" });` */
  async create(
    body: GatewayAdminGuardrailCreateRequest,
  ): Promise<GatewayAdminGuardrailCreateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_GUARDRAILS_PATH,
      body,
      requestSchema: GatewayAdminGuardrailCreateRequestSchema,
      responseSchema: GatewayAdminGuardrailCreateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Update an admin guardrail; specification-tested, not live mutation-tested. @example `await gw.adminGuardrails.update(id, { name: "Updated policy" });` */
  async update(
    guardrailId: string,
    body: GatewayGuardrailUpdateRequest,
  ): Promise<GatewayAdminGuardrailUpdateResponse> {
    assertUuid(guardrailId, 'guardrailId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GUARDRAILS_PATH}/${guardrailId}`,
      body,
      requestSchema: GatewayGuardrailUpdateRequestSchema,
      responseSchema: GatewayAdminGuardrailUpdateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Delete an admin guardrail; specification-tested, not live mutation-tested. @example `await gw.adminGuardrails.delete(id);` */
  async delete(guardrailId: string): Promise<void> {
    assertUuid(guardrailId, 'guardrailId');
    // Delete has no response payload contract.
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GUARDRAILS_PATH}/${guardrailId}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
