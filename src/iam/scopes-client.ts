import { IAM_SCOPES_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertIamScopeName } from '../validators.js';
import {
  IamScopeCreateRequestSchema,
  IamScopeListResponseSchema,
  IamScopeSchema,
  IamScopeUpdateRequestSchema,
  type IamScope,
  type IamScopeCreateRequest,
  type IamScopeListResponse,
  type IamScopeResourceInput,
  type IamScopeUpdateRequest,
} from '../models/iam.js';

/** @internal Construction options for {@link IamScopesClient}. */
export interface IamScopesClientOptions {
  /** IAM base URL (`.../iam/v1`). */
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** What callers pass to {@link IamScopesClient.create}: `description` and `resources` default. */
export interface IamScopeCreateInput {
  name: string;
  description?: string;
  resources?: IamScopeResourceInput[];
}

/** What callers pass to {@link IamScopesClient.update}: the path supplies `name`. */
export interface IamScopeUpdateInput {
  description?: string;
  resources?: IamScopeResourceInput[];
}

/**
 * Client for Strata Cloud Manager **IAM scopes** (`/iam/v1/scopes`).
 *
 * A scope is the SCM role-scope object that an AI Gateway workspace's `scope_name` points at.
 * SCM's own UI provisions a workspace in three steps, and this client covers the IAM half:
 *
 * 1. `iamScopes.create({ name })` — the scope must exist **before** the workspace.
 * 2. `workspaces.create({ name, scope_name })` — returns the workspace `slug`.
 * 3. `iamScopes.bindWorkspace(name, slug)` — PUT the scope back with the workspace as a resource.
 *
 * {@link AIGatewayWorkspacesClient.provision} runs all three. Creating a workspace against a
 * scope that does not exist yet is rejected with `400 AB01`.
 *
 * Same OAuth credentials and `x-tsg-id` header as the AI Gateway admin plane. The caller needs a
 * tenant-root admin role; workspace-scoped roles cannot read or write IAM scopes.
 */
export class IamScopesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: IamScopesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List every IAM scope in the tenant. Not paginated in observed traffic (`count` equals
   * `items.length`). Verified live 2026-09-11.
   *
   * A scope with an empty `resources` array is not bound to any workspace — typically the
   * leftover of a provisioning run that failed between steps 1 and 2.
   *
   * @returns `{ count, items }`.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const { items } = await gw.iamScopes.list();
   * const unbound = items.filter((s) => s.resources.length === 0).map((s) => s.name);
   * // items[0] => { name: 'main_airs_workspace_1852583913', resources: [{ resource_type: 'workspace', resource_id: 'ws-main-a-349e0e', metadata: [] }], ... }
   * ```
   */
  async list(): Promise<IamScopeListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: IAM_SCOPES_PATH,
      responseSchema: IamScopeListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch one scope by **name** (the `id` field, `name:tsg`, is not a valid key).
   * Verified live 2026-09-11.
   *
   * @param name - Scope name, e.g. `ws_production_bx7qw0`.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const scope = await gw.iamScopes.get('ws_production_bx7qw0');
   * // scope.resources[0].resource_id => 'ws-produc-985697' (the workspace slug)
   * ```
   */
  async get(name: string): Promise<IamScope> {
    assertIamScopeName(name, 'name');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${IAM_SCOPES_PATH}/${name}`,
      responseSchema: IamScopeSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a scope. Step 1 of workspace provisioning — run it **before**
   * `workspaces.create()`, which rejects an unknown `scope_name` with `400 AB01`.
   *
   * Mirrors SCM's captured request (2026-09-11): `description` defaults to `''` and `resources`
   * to `[]`; the workspace is bound afterwards with {@link IamScopesClient.bindWorkspace}.
   *
   * @param input - `name` is required and must be unique in the tenant.
   * @returns The created scope. `id` is `${name}:${tsg_id}`.
   * @example
   * ```ts
   * import { AIGatewayClient, generateWorkspaceScopeName } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const scope = await gw.iamScopes.create({
   *   name: generateWorkspaceScopeName('Truffles'), // 'ws_truffles_ggolfu'
   *   description: 'Online recipe generation application',
   * });
   * // scope => { name: 'ws_truffles_ggolfu', description: '...', resources: [], tsg_id: '1001464285', id: 'ws_truffles_ggolfu:1001464285' }
   * ```
   */
  async create(input: IamScopeCreateInput): Promise<IamScope> {
    const body: IamScopeCreateRequest = {
      name: input.name,
      description: input.description ?? '',
      resources: (input.resources ?? []).map(withMetadata),
    };
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: IAM_SCOPES_PATH,
      body,
      requestSchema: IamScopeCreateRequestSchema,
      responseSchema: IamScopeSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Replace a scope's description and resources. **Full replacement** (`PUT`), not a patch: omit
   * `resources` and the scope ends up bound to nothing. Prefer
   * {@link IamScopesClient.bindWorkspace} to add a workspace without dropping the others.
   *
   * Mirrors SCM's captured request (2026-09-11), which repeats `name` in the body; this method
   * copies it from the path.
   *
   * @param name - Scope name (path key).
   * @param input - Fields to write. Missing fields are sent as `''` / `[]`.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.iamScopes.update('ws_truffles_ggolfu', {
   *   description: 'Online recipe generation application',
   *   resources: [{ resource_type: 'workspace', resource_id: 'ws-truffl-03e7d9' }],
   * });
   * ```
   */
  async update(name: string, input: IamScopeUpdateInput): Promise<IamScope> {
    assertIamScopeName(name, 'name');
    const body: IamScopeUpdateRequest = {
      name,
      description: input.description ?? '',
      resources: (input.resources ?? []).map(withMetadata),
    };
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${IAM_SCOPES_PATH}/${name}`,
      body,
      requestSchema: IamScopeUpdateRequestSchema,
      responseSchema: IamScopeSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Bind a workspace to a scope. Step 3 of workspace provisioning.
   *
   * Reads the scope, appends `{ resource_type: 'workspace', resource_id: slug }` unless an
   * identical binding is already present, and PUTs the result — so existing bindings survive and
   * re-running after a partial failure is safe. For a freshly created scope the resulting body is
   * byte-for-byte the request SCM's UI sends.
   *
   * @param name - Scope name.
   * @param workspaceSlug - The workspace **slug** (`ws-truffl-03e7d9`) from
   * `workspaces.create()`. Not the UUID: SCM binds by slug.
   * @returns The updated scope.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const ws = await gw.workspaces.create({ name: 'Truffles', scope_name: 'ws_truffles_ggolfu' });
   * const scope = await gw.iamScopes.bindWorkspace('ws_truffles_ggolfu', ws.slug);
   * // scope.resources => [{ metadata: [], resource_id: 'ws-truffl-03e7d9', resource_type: 'workspace' }]
   * ```
   */
  async bindWorkspace(name: string, workspaceSlug: string): Promise<IamScope> {
    const current = await this.get(name);
    const binding: IamScopeResourceInput = {
      resource_type: 'workspace',
      resource_id: workspaceSlug,
      metadata: [],
    };
    const resources: IamScopeResourceInput[] = current.resources.map((r) => ({
      resource_type: r.resource_type,
      resource_id: r.resource_id,
      metadata: r.metadata ?? [],
    }));
    const bound = resources.some(
      (r) => r.resource_type === 'workspace' && r.resource_id === workspaceSlug,
    );
    if (!bound) resources.push(binding);
    return this.update(name, { description: current.description, resources });
  }

  /**
   * Delete a scope by name.
   *
   * **Not live-verified** — SCM's UI was not observed deleting a scope, and no scope in the
   * verification tenant could be sacrificed. The route follows the resource's REST shape; treat a
   * `405` or `404` as the API declining rather than as an SDK bug. Used by
   * {@link AIGatewayWorkspacesClient.provision} to roll back a scope it created when the
   * workspace step fails.
   *
   * @param name - Scope name.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.iamScopes.delete('ws_truffles_ggolfu');
   * ```
   */
  async delete(name: string): Promise<void> {
    assertIamScopeName(name, 'name');
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${IAM_SCOPES_PATH}/${name}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}

function withMetadata(resource: IamScopeResourceInput): IamScopeResourceInput {
  return { ...resource, metadata: resource.metadata ?? [] };
}
