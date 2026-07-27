import { AI_GW_PROVIDERS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListProvidersResponseSchema,
  GatewayWriteResponseSchema,
  type ListProvidersResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';
import type { AIGatewayWorkspaceScopedListOptions } from './guardrails-client.js';

/** Request body for binding an org integration into a workspace as a provider. */
export interface GatewayProviderCreateRequest {
  workspace_id: string;
  /** Upstream AI provider id (e.g. the OpenAI or Vertex provider). */
  ai_provider_id: string;
  name: string;
  /** Org-level integration this provider draws credentials from. */
  integration_id: string;
  slug: string;
  note?: string;
  expires_at?: string | null;
}

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
   * Create a provider.
   * @param body - Workspace UUID, upstream provider id, integration id, name, and slug.
   * @returns The raw create response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.providers.create({
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
   *   integration_id: 'f6692544-3265-49be-9711-bbdcebc079e4',
   *   name: 'openai-calvin',
   *   slug: 'openai-calvin',
   * });
   * ```
   */
  async create(body: GatewayProviderCreateRequest): Promise<GatewayWriteResponse> {
    assertUuid(body.workspace_id, 'workspace_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_PROVIDERS_PATH,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
