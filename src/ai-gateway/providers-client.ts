import { AI_GW_PROVIDERS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListProvidersResponseSchema,
  GatewayProviderCreateResponseSchema,
  GatewayProviderDetailSchema,
  GatewayWriteResponseSchema,
  type ListProvidersResponse,
  type GatewayProviderCreateResponse,
  type GatewayProviderDetail,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import {
  GatewayProviderCreateRequestSchema,
  GatewayProviderUpdateRequestSchema,
  type GatewayProviderCreateRequest,
  type GatewayProviderUpdateRequest,
} from '../models/ai-gateway-requests.js';
import type { AIGatewaySubClientOptions, AIGatewayWorkspaceScopedListOptions } from './types.js';

/** Client for AI Gateway provider operations (data plane). */
export class AIGatewayProvidersClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List providers in a workspace.
   * @param opts - Must include the workspace UUID.
   * @returns Providers bound into that workspace.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const p = await gw.providers.list({ workspaceId: '16f7e90d-382a-4e78-b577-1b01eb5f8297' });
   * // p.data[0].slug => 'openai-calvin'
   * ```
   */
  async list(opts: AIGatewayWorkspaceScopedListOptions): Promise<ListProvidersResponse> {
    assertUuid(opts.workspaceId, 'workspaceId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_PROVIDERS_PATH,
      params: { workspace_id: opts.workspaceId },
      responseSchema: ListProvidersResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch one provider binding. Verified live 2026-08-29.
   *
   * @remarks The response can contain provider credential material. Do not log or persist it,
   * and avoid logging the complete returned object. SDK debug logs redact the known credential
   * fields for this operation.
   * @param providerId - Provider UUID.
   * @returns Provider configuration and lifecycle detail.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   * const provider = await gw.providers.get('f6692544-3265-49be-9711-bbdcebc079e4');
   * console.log(provider.name);
   * ```
   */
  async get(providerId: string): Promise<GatewayProviderDetail> {
    assertUuid(providerId, 'providerId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_PROVIDERS_PATH}/${providerId}`,
      secretOperation: 'providers.get',
      responseSchema: GatewayProviderDetailSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a provider.
   *
   * @remarks
   * The response is a **creation receipt** — `{ id, slug, object }` — not a {@link
   * GatewayProvider}. Note it has **no `version_id`**, unlike the sibling receipts for
   * {@link AIGatewayConfigsClient.create | configs.create} and {@link
   * AIGatewayGuardrailsClient.create | guardrails.create}. Verified live 2026-07-28.
   *
   * @param body - Workspace UUID, upstream provider id, integration id, name, and slug.
   * @returns The creation receipt.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const receipt = await gw.providers.create({
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
   *   integration_id: 'f6692544-3265-49be-9711-bbdcebc079e4',
   *   name: 'openai-calvin',
   *   slug: 'openai-calvin',
   * });
   * // receipt => { id: '...', slug: 'sdk-verify-delete-me-provider', object: 'provider' }
   * ```
   */
  async create(body: GatewayProviderCreateRequest): Promise<GatewayProviderCreateResponse> {
    assertUuid(body.workspace_id, 'workspace_id');
    assertUuid(body.ai_provider_id, 'ai_provider_id');
    assertUuid(body.integration_id, 'integration_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_PROVIDERS_PATH,
      body,
      requestSchema: GatewayProviderCreateRequestSchema,
      responseSchema: GatewayProviderCreateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a provider binding. Verified live 2026-08-29.
   * @param providerId - Provider UUID.
   * @param body - Fields to update.
   * @returns The gateway write response.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   * await gw.providers.update('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   name: 'Vertex production',
   *   note: 'Updated by automation',
   * });
   * ```
   */
  async update(
    providerId: string,
    body: GatewayProviderUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(providerId, 'providerId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_PROVIDERS_PATH}/${providerId}`,
      body,
      requestSchema: GatewayProviderUpdateRequestSchema,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a provider.
   *
   * @remarks
   * This is a **hard delete** — unlike {@link AIGatewayDeploymentsClient.delete | deployments.delete}
   * (which archives), the provider disappears from {@link list} entirely. Verified live
   * 2026-07-28. No `organisation_id` query param is required, unlike deployments/integrations.
   *
   * @param providerId - Provider UUID.
   * @returns Nothing.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.providers.delete('f6692544-3265-49be-9711-bbdcebc079e4');
   * // the provider no longer appears in gw.providers.list()
   * ```
   */
  async delete(providerId: string): Promise<void> {
    assertUuid(providerId, 'providerId');
    // The API returns 200 with an empty body. request() resolves to undefined whenever
    // no responseSchema is supplied, regardless of allowEmptyBody — see
    // deployments-client.ts's delete() for the fuller explanation.
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_PROVIDERS_PATH}/${providerId}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
