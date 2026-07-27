import { AI_GW_INTEGRATIONS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListIntegrationsResponseSchema,
  IntegrationSchema,
  IntegrationModelsResponseSchema,
  IntegrationWorkspacesResponseSchema,
  GatewayWriteResponseSchema,
  type ListIntegrationsResponse,
  type Integration,
  type IntegrationModelsResponse,
  type IntegrationWorkspacesResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** Request body for creating an org-level provider integration. */
export interface IntegrationCreateRequest {
  /** The TSG as a numeric string. */
  organisation_id: string;
  /** Upstream AI provider id. */
  ai_provider_id: string;
  name: string;
  slug: string;
  description?: string;
  /** Provider-specific settings (e.g. `vertex_auth_type`, `vertex_region`). */
  configurations?: Record<string, unknown>;
  /** Provider API key, when the provider authenticates by key. */
  key?: string;
  secret_mappings?: unknown[];
}

/** Per-model enablement payload for `integrations/{id}/models`. */
export interface IntegrationModelsRequest {
  models: { slug: string; enabled: boolean }[];
}

/** Workspace-binding payload for `integrations/{id}/workspaces`. */
export interface IntegrationWorkspacesRequest {
  workspaces?: unknown[];
  global_workspace_access?: boolean;
}

/** Client for AI Gateway organisation-level integrations (admin plane). */
export class AIGatewayIntegrationsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List organisation integrations.
   * @returns All provider integrations defined on the organisation.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const ints = await gw.integrations.list();
   * // ints.data[0] => { name: 'openai-calvin', slug: 'openai-calvin', ... }
   * ```
   */
  async list(): Promise<ListIntegrationsResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_INTEGRATIONS_PATH,
      responseSchema: ListIntegrationsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch one integration.
   * @param integrationId - Integration UUID.
   * @returns The integration record.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const i = await gw.integrations.get('f6692544-3265-49be-9711-bbdcebc079e4');
   * // i.name => 'openai-calvin'
   * ```
   */
  async get(integrationId: string): Promise<Integration> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      responseSchema: IntegrationSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create an integration.
   * @param body - Provider id, name, slug, and provider-specific configuration.
   * @returns The raw create response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.create({
   *   organisation_id: '1852583913',
   *   ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
   *   name: 'openai-prod',
   *   slug: 'openai-prod',
   *   key: process.env.OPENAI_API_KEY,
   * });
   * ```
   */
  async create(body: IntegrationCreateRequest): Promise<GatewayWriteResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_INTEGRATIONS_PATH,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an integration.
   * @param integrationId - Integration UUID.
   * @param body - Replacement fields.
   * @returns The raw update response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.update('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   name: 'openai-prod',
   *   description: 'Production OpenAI',
   * });
   * ```
   */
  async update(
    integrationId: string,
    body: Partial<IntegrationCreateRequest>,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete an integration.
   * @param integrationId - Integration UUID.
   * @param organisationId - The TSG as a numeric string; sent as a query param.
   * @returns Nothing — the API replies 200 with an empty body.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.delete('f6692544-3265-49be-9711-bbdcebc079e4', '1852583913');
   * ```
   */
  async delete(integrationId: string, organisationId: string): Promise<void> {
    assertUuid(integrationId, 'integrationId');
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      params: { organisation_id: organisationId },
      allowEmptyBody: true,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Read which models this integration exposes.
   * @param integrationId - Integration UUID.
   * @returns Per-model enablement plus the `allow_all_models` flag.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const m = await gw.integrations.getModels('f6692544-3265-49be-9711-bbdcebc079e4');
   * // m.models[0] => { slug: 'gpt-4', enabled: true }
   * ```
   */
  async getModels(integrationId: string): Promise<IntegrationModelsResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/models`,
      responseSchema: IntegrationModelsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Replace which models this integration exposes.
   * @param integrationId - Integration UUID.
   * @param body - Full model list; this is a replace, not a merge.
   * @returns The raw response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.setModels('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   models: [{ slug: 'gpt-4', enabled: true }, { slug: 'gpt-4-32k', enabled: false }],
   * });
   * ```
   */
  async setModels(
    integrationId: string,
    body: IntegrationModelsRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/models`,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Read which workspaces may use this integration.
   * @param integrationId - Integration UUID.
   * @returns Bound workspaces plus the `global_workspace_access` flag.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const w = await gw.integrations.getWorkspaces('f6692544-3265-49be-9711-bbdcebc079e4');
   * // w.global_workspace_access => false
   * ```
   */
  async getWorkspaces(integrationId: string): Promise<IntegrationWorkspacesResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/workspaces`,
      responseSchema: IntegrationWorkspacesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Replace which workspaces may use this integration.
   * @param integrationId - Integration UUID.
   * @param body - Workspace bindings or a global-access flag.
   * @returns The raw response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.setWorkspaces('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   global_workspace_access: true,
   * });
   * ```
   */
  async setWorkspaces(
    integrationId: string,
    body: IntegrationWorkspacesRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/workspaces`,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
