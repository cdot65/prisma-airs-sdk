import { AI_GW_WORKSPACES_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertWorkspaceRef } from '../validators.js';
import {
  ListWorkspacesResponseSchema,
  GatewayWorkspaceDetailSchema,
  GatewayWriteResponseSchema,
  GatewayWorkspaceCreateResponseSchema,
  type ListWorkspacesResponse,
  type GatewayWorkspaceDetail,
  type GatewayWriteResponse,
  type GatewayWorkspaceCreateResponse,
} from '../models/ai-gateway.js';
import {
  GatewayWorkspaceCreateRequestSchema,
  GatewayWorkspaceUpdateRequestSchema,
  type GatewayWorkspaceCreateRequest,
  type GatewayWorkspaceUpdateRequest,
} from '../models/ai-gateway-requests.js';
import type {
  AIGatewayPlane,
  AIGatewayWorkspaceGetOptions,
  AIGatewayWorkspaceListOptions,
  AIGatewayWorkspacesClientOptions,
} from './types.js';

/**
 * Client for AI Gateway workspaces.
 *
 * The only sub-client spanning **both planes**: reads default to the data plane but can be routed
 * to the admin plane, and every write is admin-only. Each of the other eleven sub-clients is wired
 * to exactly one plane.
 */
export class AIGatewayWorkspacesClient {
  private readonly baseUrl: string;
  private readonly adminBaseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewayWorkspacesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.adminBaseUrl = opts.adminBaseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  private urlFor(plane: AIGatewayPlane | undefined): string {
    return plane === 'admin' ? this.adminBaseUrl : this.baseUrl;
  }

  /**
   * List workspaces.
   *
   * Two defaults worth knowing, because each one hides rows:
   *
   * 1. **Active only.** Without `status`, archived workspaces are omitted. Pass
   *    `{ status: 'archived' }` to see them — that is where {@link AIGatewayWorkspacesClient.delete}
   *    leaves a workspace.
   * 2. **Your scope only.** The data plane returns just the workspaces your service account holds a
   *    workspace-scope grant on. Pass `{ plane: 'admin' }` to enumerate the whole tenant.
   *
   * @param options - Optional status filter and plane selection.
   * @returns Workspaces, each with the `scope_name` that grants data-plane access to it.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const mine = await gw.workspaces.list();
   * // mine.data[0] => { slug: 'ws-main-a-349e0e', scope_name: 'main_airs_workspace_1852583913', ... }
   *
   * const everything = await gw.workspaces.list({ plane: 'admin' });
   * const archived = await gw.workspaces.list({ plane: 'admin', status: 'archived' });
   * ```
   */
  async list(options: AIGatewayWorkspaceListOptions = {}): Promise<ListWorkspacesResponse> {
    return request({
      method: 'GET',
      baseUrl: this.urlFor(options.plane),
      path: AI_GW_WORKSPACES_PATH,
      params: options.status ? { status: options.status } : undefined,
      responseSchema: ListWorkspacesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch one workspace, including its security and rate-limit settings.
   *
   * @param workspaceRef - Workspace UUID **or** slug; the API accepts both.
   * @param options - Plane selection. A workspace outside your workspace scope answers `403 AB03`
   * on the data plane, not `404`; re-read it with `{ plane: 'admin' }`.
   *
   * **Archived workspaces are not retrievable here.** Once
   * {@link AIGatewayWorkspacesClient.delete} has archived a workspace, this returns `404 AB08`
   * for both its UUID and its slug, on either plane (verified live 2026-08-01) — even though the
   * row is still listed by `list({ status: 'archived' })`. Treat a 404 after a delete as expected,
   * and use the list filter to inspect archived workspaces.
   * @returns Workspace detail; list rows do not carry the settings blocks.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const ws = await gw.workspaces.get('16f7e90d-382a-4e78-b577-1b01eb5f8297');
   * // ws.security_settings?.membersViewLogs => true
   *
   * // Slugs work too, and the admin plane reaches workspaces you aren't scoped to:
   * const other = await gw.workspaces.get('ws-produc-985697', { plane: 'admin' });
   * ```
   */
  async get(
    workspaceRef: string,
    options: AIGatewayWorkspaceGetOptions = {},
  ): Promise<GatewayWorkspaceDetail> {
    assertWorkspaceRef(workspaceRef, 'workspaceRef');
    return request({
      method: 'GET',
      baseUrl: this.urlFor(options.plane),
      path: `${AI_GW_WORKSPACES_PATH}/${workspaceRef}`,
      responseSchema: GatewayWorkspaceDetailSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a workspace. **Admin plane** — needs a tenant-root admin role.
   *
   * @param body - `name` and `scope_name` are both required; the API rejects a body missing either.
   * @returns The created workspace. Unlike `configs`/`guardrails`/`providers`/`deployments`,
   * which return short receipts, this returns most of the record — but not `status`,
   * `is_default`, `icon`, `usage_limits`, `rate_limits`, or the settings blocks. Call
   * {@link AIGatewayWorkspacesClient.get} when you need those.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const created = await gw.workspaces.create({
   *   name: 'Production',
   *   scope_name: 'ws_production_bx7qw0', // the SCM scope, not derived from name
   *   description: 'All production applications',
   *   defaults: { metadata: { env: 'production' } },
   *   rate_limits: [{ type: 'requests', unit: 'rpm', value: 100 }],
   * });
   * ```
   */
  async create(body: GatewayWorkspaceCreateRequest): Promise<GatewayWorkspaceCreateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.adminBaseUrl,
      path: AI_GW_WORKSPACES_PATH,
      body,
      requestSchema: GatewayWorkspaceCreateRequestSchema,
      responseSchema: GatewayWorkspaceCreateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a workspace. **Admin plane.** Partial patch — send only the fields that change.
   *
   * @param workspaceRef - Workspace UUID or slug.
   * @param body - At least one field. An empty patch is rejected locally, mirroring the API's own
   * "No update fields provided" rejection, so a typo'd caller fails without a round trip.
   * @returns An **empty object** — the API acknowledges the write without echoing the record
   * (verified live 2026-08-01). The change does persist; re-read with
   * {@link AIGatewayWorkspacesClient.get} to see it.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.workspaces.update('ws-produc-985697', {
   *   description: 'Production workloads, us-east',
   * });
   * ```
   */
  async update(
    workspaceRef: string,
    body: GatewayWorkspaceUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertWorkspaceRef(workspaceRef, 'workspaceRef');
    return request({
      method: 'PUT',
      baseUrl: this.adminBaseUrl,
      path: `${AI_GW_WORKSPACES_PATH}/${workspaceRef}`,
      body,
      requestSchema: GatewayWorkspaceUpdateRequestSchema,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a workspace. **Admin plane.**
   *
   * This is a **soft delete**: the workspace is archived, not destroyed. It vanishes from a default
   * {@link AIGatewayWorkspacesClient.list} but stays visible via `list({ status: 'archived' })`.
   * Note that `list` is the *only* way to see it afterwards —
   * {@link AIGatewayWorkspacesClient.get} answers `404 AB08` for an archived workspace.
   * Same semantics as `deployments.delete()`, and the opposite of `configs`/`guardrails`/`providers`,
   * which hard delete. There is no hard delete for workspaces.
   *
   * Takes no query parameters — unlike `integrations.delete()` and `deployments.delete()`, which
   * both require `organisation_id`.
   *
   * @param workspaceRef - Workspace UUID or slug.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.workspaces.delete('ws-produc-985697');
   *
   * // Still there, archived:
   * const gone = await gw.workspaces.list({ plane: 'admin', status: 'archived' });
   * ```
   */
  async delete(workspaceRef: string): Promise<void> {
    assertWorkspaceRef(workspaceRef, 'workspaceRef');
    return request({
      method: 'DELETE',
      baseUrl: this.adminBaseUrl,
      path: `${AI_GW_WORKSPACES_PATH}/${workspaceRef}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
