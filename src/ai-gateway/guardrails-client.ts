import { AI_GW_GUARDRAILS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListGuardrailsResponseSchema,
  GatewayWriteResponseSchema,
  type ListGuardrailsResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** Options for listing workspace-scoped resources. */
export interface AIGatewayWorkspaceScopedListOptions {
  /** Workspace UUID. Required — omitting it returns `404 AB02`. */
  workspaceId: string;
}

/** One guardrail check binding. */
export interface GatewayGuardrailCheck {
  /** Check id, e.g. the Prisma AIRS intercept check. */
  id: string;
  parameters: Record<string, unknown>;
  is_enabled: boolean;
}

/** Request body for creating a guardrail. */
export interface GatewayGuardrailCreateRequest {
  workspace_id: string;
  name: string;
  checks: GatewayGuardrailCheck[];
  actions: Record<string, unknown>;
}

/** Client for AI Gateway guardrail operations (data plane). */
export class AIGatewayGuardrailsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List guardrails in a workspace.
   * @param opts - Must include the workspace UUID.
   * @returns Guardrails defined on that workspace.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const g = await gw.guardrails.list({ workspaceId: '16f7e90d-382a-4e78-b577-1b01eb5f8297' });
   * // g.data[0].id => 'pg-prisma-099a16'
   * ```
   */
  async list(opts: AIGatewayWorkspaceScopedListOptions): Promise<ListGuardrailsResponse> {
    assertUuid(opts.workspaceId, 'workspaceId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_GUARDRAILS_PATH,
      params: { workspace_id: opts.workspaceId },
      responseSchema: ListGuardrailsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a guardrail.
   * @param body - Workspace UUID, name, checks, and pass/fail actions.
   * @returns The raw create response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.guardrails.create({
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   name: 'PrismaAIRS',
   *   checks: [{ id: 'panw.prisma-airs.intercept', parameters: { profile_name: 'AI Gateway - Strict' }, is_enabled: true }],
   *   actions: { deny: false, async: false, sequential: false },
   * });
   * ```
   */
  async create(body: GatewayGuardrailCreateRequest): Promise<GatewayWriteResponse> {
    assertUuid(body.workspace_id, 'workspace_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_GUARDRAILS_PATH,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
