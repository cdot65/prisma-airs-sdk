import { AI_GW_INTEGRATIONS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid, assertNumericId, assertWorkspaceRef, assertLength } from '../validators.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import {
  ListIntegrationsResponseSchema,
  GatewayIntegrationSchema,
  GatewayIntegrationModelsResponseSchema,
  GatewayIntegrationWorkspacesResponseSchema,
  GatewayWriteResponseSchema,
  type ListIntegrationsResponse,
  type GatewayIntegration,
  type GatewayIntegrationModelsResponse,
  type GatewayIntegrationWorkspacesResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import {
  GatewayIntegrationCreateRequestSchema,
  GatewayIntegrationModelsBulkUpdateRequestSchema,
  GatewayIntegrationUpdateRequestSchema,
  GatewayIntegrationWorkspacesBulkUpdateRequestSchema,
  type GatewayIntegrationCreateRequest,
  type GatewayIntegrationModelsBulkUpdateRequest,
  type GatewayIntegrationUpdateRequest,
  type GatewayIntegrationWorkspacesBulkUpdateRequest,
} from '../models/ai-gateway-requests.js';
import type { AIGatewaySubClientOptions } from './types.js';

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

  /** Remove explicitly named custom models from one integration.
   * Verified on an owned integration and custom model, 2026-09-06. Base models cannot be deleted.
   * @example `await gw.integrations.deleteModels('integration-slug', ['model-slug']);`
   */
  async deleteModels(integrationId: string, slugs: string[]): Promise<GatewayWriteResponse> {
    assertWorkspaceRef(integrationId, 'integrationId');
    assertLength(slugs.join(','), 1, 16384, 'slugs');
    for (const slug of slugs) {
      assertLength(slug, 1, 512, 'model slug');
      if (slug.includes(','))
        throw new AISecSDKException(
          'A model slug cannot contain a comma',
          ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        );
    }
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${encodeURIComponent(integrationId)}/models`,
      params: { slugs: slugs.join(',') },
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
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
  async get(integrationId: string): Promise<GatewayIntegration> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      responseSchema: GatewayIntegrationSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create an integration.
   *
   * @remarks
   * `body.key` (the provider API key) is a live secret. SDK debug logs replace known
   * credential fields with `[REDACTED]`, but callers must still avoid logging the input object.
   *
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
  async create(body: GatewayIntegrationCreateRequest): Promise<GatewayWriteResponse> {
    assertUuid(body.ai_provider_id, 'ai_provider_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_INTEGRATIONS_PATH,
      body,
      requestSchema: GatewayIntegrationCreateRequestSchema,
      secretOperation: 'integrations.create',
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an integration.
   * @param integrationId - Integration UUID.
   * @param body - One or more fields to update.
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
    body: GatewayIntegrationUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      body,
      requestSchema: GatewayIntegrationUpdateRequestSchema,
      secretOperation: 'integrations.update',
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
    assertNumericId(organisationId, 'organisationId');
    // The API returns 200 with an empty body. request() resolves to undefined whenever
    // no responseSchema is supplied, regardless of allowEmptyBody — so that flag is
    // intentionally omitted here rather than implying it does something.
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      params: { organisation_id: organisationId },
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
  async getModels(integrationId: string): Promise<GatewayIntegrationModelsResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/models`,
      responseSchema: GatewayIntegrationModelsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Bulk-update model enablement for this integration.
   * @param integrationId - Integration UUID.
   * @param body - One or more model entries to update; omission is not documented as deletion.
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
    body: GatewayIntegrationModelsBulkUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/models`,
      body,
      requestSchema: GatewayIntegrationModelsBulkUpdateRequestSchema,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Read which workspaces may use this integration.
   *
   * @remarks
   * `global_workspace_access` is an **object** on this read, not a boolean, despite the
   * field name — `{ enabled, rate_limits, usage_limits }`. The corresponding write
   * ({@link setWorkspaces}) uses the same object shape.
   *
   * @param integrationId - Integration UUID.
   * @returns Bound workspaces plus the `global_workspace_access` object.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const w = await gw.integrations.getWorkspaces('f6692544-3265-49be-9711-bbdcebc079e4');
   * // w.global_workspace_access => { enabled: false, rate_limits: null, usage_limits: null }
   * ```
   */
  async getWorkspaces(integrationId: string): Promise<GatewayIntegrationWorkspacesResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/workspaces`,
      responseSchema: GatewayIntegrationWorkspacesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Bulk-update which workspaces may use this integration.
   * @param integrationId - Integration UUID.
   * @param body - Workspace bindings, global-access settings, or explicit override behavior.
   * @returns The raw response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.setWorkspaces('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   global_workspace_access: { enabled: true },
   * });
   * ```
   */
  async setWorkspaces(
    integrationId: string,
    body: GatewayIntegrationWorkspacesBulkUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/workspaces`,
      body,
      requestSchema: GatewayIntegrationWorkspacesBulkUpdateRequestSchema,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
