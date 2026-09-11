import { AI_GW_WORKSPACES_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { generateWorkspaceScopeName } from '../iam/scope-name.js';
import type { IamScopesClient } from '../iam/scopes-client.js';
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
import type { IamScope } from '../models/iam.js';
import type {
  AIGatewayPlane,
  AIGatewayWorkspaceGetOptions,
  AIGatewayWorkspaceListOptions,
  AIGatewayWorkspaceProvisionOptions,
  AIGatewayWorkspacesClientOptions,
  GatewayWorkspaceProvisionRequest,
  GatewayWorkspaceProvisionResult,
} from './types.js';

/**
 * Client for AI Gateway workspaces.
 *
 * The only sub-client spanning **both planes**: reads default to the data plane but can be routed
 * to the admin plane, and every write is admin-only. Each of the other sub-clients is wired
 * to exactly one plane.
 */
export class AIGatewayWorkspacesClient {
  private readonly baseUrl: string;
  private readonly adminBaseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;
  private readonly iamScopes?: IamScopesClient;

  constructor(opts: AIGatewayWorkspacesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.adminBaseUrl = opts.adminBaseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
    this.iamScopes = opts.iamScopes;
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
   * **`scope_name` must name an IAM scope that already exists.** The 2026-09-06 revalidation's
   * `400 AB01` for synthetic scope names was this prerequisite, not a contract change: SCM's own
   * UI (captured 2026-09-11) first `POST`s `/iam/v1/scopes`, then creates the workspace, then
   * `PUT`s the scope back with the new workspace slug bound. Use
   * {@link AIGatewayWorkspacesClient.provision} for the whole sequence, or run
   * `gw.iamScopes.create()` yourself before calling this.
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
   * Provision a workspace the way Strata Cloud Manager's UI does — three calls, in order:
   *
   * 1. `iamScopes.create({ name: scope_name })` — the IAM scope must exist first; creating the
   *    workspace against a missing scope fails with `400 AB01`. Skipped with `existingScope`.
   * 2. `workspaces.create({ ...request, scope_name })` — returns the workspace `slug`.
   * 3. `iamScopes.bindWorkspace(scope_name, slug)` — `PUT`s the scope back with
   *    `{ resource_type: 'workspace', resource_id: slug }`, which is what actually grants
   *    data-plane access to the new workspace.
   *
   * Sequence captured from SCM on 2026-09-11. **Admin plane**; needs a tenant-root admin role.
   *
   * Partial failures are reported, not hidden. If step 2 fails after this call created the scope,
   * the scope is deleted again (best effort) and the error says whether that rollback succeeded.
   * If step 3 fails, the workspace exists but is unbound; the error names both the workspace
   * slug and the scope so you can finish with `gw.iamScopes.bindWorkspace(scope, slug)`.
   *
   * @param request - A workspace create request whose `scope_name` is optional. When omitted, one
   * is generated with {@link generateWorkspaceScopeName} (`ws_<name>_<6 random chars>`, matching
   * SCM's own naming).
   * @param options - `existingScope: true` binds to a scope that already exists instead of
   * creating one; `scope_name` is then required.
   * @returns The bound scope, the create response, and whether a scope was created.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const { scope, workspace } = await gw.workspaces.provision({
   *   name: 'truffles',
   *   description: 'Online recipe generation application',
   * });
   * // scope.name            => 'ws_truffles_ggolfu'   (generated)
   * // workspace.slug        => 'ws-truffl-03e7d9'
   * // scope.resources[0]    => { resource_type: 'workspace', resource_id: 'ws-truffl-03e7d9', metadata: [] }
   *
   * // Reuse a scope you already created (bindings on it are preserved):
   * await gw.workspaces.provision(
   *   { name: 'Staging', scope_name: 'ws_staging_q1x8mz' },
   *   { existingScope: true },
   * );
   * ```
   */
  async provision(
    request: GatewayWorkspaceProvisionRequest,
    options: AIGatewayWorkspaceProvisionOptions = {},
  ): Promise<GatewayWorkspaceProvisionResult> {
    const iamScopes = this.iamScopes;
    if (!iamScopes) {
      throw new AISecSDKException(
        'provision() needs an IAM scopes client; construct via new AIGatewayClient() or pass iamScopes',
        ErrorType.AISEC_SDK_ERROR,
      );
    }
    if (options.existingScope && !request.scope_name) {
      throw new AISecSDKException(
        'provision({ existingScope: true }) requires scope_name',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    const { scope_name: requestedScope, ...rest } = request;
    const scopeName = requestedScope ?? generateWorkspaceScopeName(request.name);
    const scopeCreated = !options.existingScope;

    if (scopeCreated) {
      await iamScopes.create({ name: scopeName, description: request.description ?? '' });
    }

    let workspace: GatewayWorkspaceCreateResponse;
    try {
      workspace = await this.create({ ...rest, scope_name: scopeName });
    } catch (err) {
      if (!scopeCreated) throw err;
      let rollback = `IAM scope ${scopeName} was deleted again`;
      try {
        await iamScopes.delete(scopeName);
      } catch (rollbackErr) {
        rollback =
          `IAM scope ${scopeName} was created and is still present ` +
          `(rollback failed: ${messageOf(rollbackErr)}); delete it or reuse it with existingScope`;
      }
      throw new AISecSDKException(
        `workspace create failed after creating its IAM scope — ${rollback}: ${messageOf(err)}`,
        ErrorType.AISEC_SDK_ERROR,
        statusOf(err),
      );
    }

    let scope: IamScope;
    try {
      scope = await iamScopes.bindWorkspace(scopeName, workspace.slug);
    } catch (err) {
      throw new AISecSDKException(
        `workspace ${workspace.slug} (${workspace.id}) was created but could not be bound to IAM scope ` +
          `${scopeName}; finish with iamScopes.bindWorkspace('${scopeName}', '${workspace.slug}'): ` +
          messageOf(err),
        ErrorType.AISEC_SDK_ERROR,
        statusOf(err),
      );
    }

    return { scope, workspace, scopeCreated };
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

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function statusOf(err: unknown): { statusCode?: number } {
  const status = (err as { statusCode?: unknown }).statusCode;
  return typeof status === 'number' ? { statusCode: status } : {};
}
