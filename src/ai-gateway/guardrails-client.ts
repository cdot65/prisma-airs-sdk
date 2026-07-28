import { AI_GW_GUARDRAILS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListGuardrailsResponseSchema,
  GatewayGuardrailDetailSchema,
  GatewayGuardrailCreateResponseSchema,
  type ListGuardrailsResponse,
  type GatewayGuardrailDetail,
  type GatewayGuardrailCreateResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions, AIGatewayWorkspaceScopedListOptions } from './types.js';

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
   * Fetch one guardrail.
   * @param guardrailId - Guardrail UUID.
   * @returns Guardrail detail — adds `checks`, `actions`, and `version_id` on top of the list
   * row.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const g = await gw.guardrails.get('9f6c2a8e-2b3d-4e5f-8a9b-0c1d2e3f4a5b');
   * // g.checks[0].id => 'panw-prisma-airs.intercept'
   * ```
   */
  async get(guardrailId: string): Promise<GatewayGuardrailDetail> {
    assertUuid(guardrailId, 'guardrailId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GUARDRAILS_PATH}/${guardrailId}`,
      responseSchema: GatewayGuardrailDetailSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a guardrail.
   *
   * @remarks
   * The response is a **creation receipt** — `{ id, version_id, slug, object }` — not a
   * {@link GatewayGuardrailDetail}. Call {@link get} for the full record. Verified live
   * 2026-07-28.
   *
   * @param body - Workspace UUID, name, checks, and pass/fail actions.
   * @returns The creation receipt.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const receipt = await gw.guardrails.create({
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   name: 'PrismaAIRS',
   *   checks: [{ id: 'panw-prisma-airs.intercept', parameters: { profile_name: 'AI Gateway - Strict' }, is_enabled: true }],
   *   actions: { deny: false, async: false, sequential: false },
   * });
   * // receipt => { id: '...', version_id: '...', slug: 'pg-sdk-ve-874b62', object: 'guardrail' }
   * ```
   */
  async create(body: GatewayGuardrailCreateRequest): Promise<GatewayGuardrailCreateResponse> {
    assertUuid(body.workspace_id, 'workspace_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_GUARDRAILS_PATH,
      body,
      responseSchema: GatewayGuardrailCreateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a guardrail.
   *
   * @remarks
   * This is a **hard delete** — unlike {@link AIGatewayDeploymentsClient.delete | deployments.delete}
   * (which archives), the guardrail disappears from {@link list} entirely. Verified live
   * 2026-07-28. No `organisation_id` query param is required, unlike deployments/integrations.
   *
   * @param guardrailId - Guardrail UUID.
   * @returns Nothing.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.guardrails.delete('9f6c2a8e-2b3d-4e5f-8a9b-0c1d2e3f4a5b');
   * // the guardrail no longer appears in gw.guardrails.list()
   * ```
   */
  async delete(guardrailId: string): Promise<void> {
    assertUuid(guardrailId, 'guardrailId');
    // The API returns 200 with an empty body. request() resolves to undefined whenever
    // no responseSchema is supplied, regardless of allowEmptyBody — see
    // deployments-client.ts's delete() for the fuller explanation.
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_GUARDRAILS_PATH}/${guardrailId}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
