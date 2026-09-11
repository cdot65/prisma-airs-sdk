import type { AuthAdapter } from '../http/types.js';
import type { IamScopesClient } from '../iam/scopes-client.js';
import type { IamScope } from '../models/iam.js';
import type { GatewayWorkspaceCreateResponse } from '../models/ai-gateway.js';
import type { GatewayWorkspaceCreateRequest } from '../models/ai-gateway-requests.js';

/**
 * @internal
 * Construction options shared by every AI Gateway sub-client. Lives in its own module
 * rather than in any one resource client, because all twelve sub-clients consume it —
 * the same reason `AIGatewayWindowOptions` lives in `window.ts`.
 */
export interface AIGatewaySubClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * @internal
 * Construction options for `AIGatewayWorkspacesClient`, the one resource that spans both planes:
 * reads work on either, writes are admin-only.
 *
 * Declared standalone rather than extending {@link AIGatewaySubClientOptions}, matching the
 * precedent set by `AIGatewayTelemetryClientOptions` — sub-client option types in this subsystem
 * stay separate even when near-identical.
 */
export interface AIGatewayWorkspacesClientOptions {
  /** Data-plane base URL (`/ai_gw/v2`). Default for reads. */
  baseUrl: string;
  /** Admin-plane base URL (`/ai_gw/admin/v2`). Required for writes and tenant-wide reads. */
  adminBaseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
  /**
   * IAM scopes client used by `provision()`. Optional so direct sub-client construction keeps
   * working; without it `provision()` throws before any network call.
   */
  iamScopes?: IamScopesClient;
}

/**
 * Request for `AIGatewayWorkspacesClient.provision`. Same fields as a plain create, except
 * `scope_name` is optional — a fresh one is generated from `name` when omitted.
 */
export type GatewayWorkspaceProvisionRequest = Omit<GatewayWorkspaceCreateRequest, 'scope_name'> & {
  /** IAM scope to create (default) or reuse (`existingScope`). Generated when omitted. */
  scope_name?: string;
};

/** Options for `AIGatewayWorkspacesClient.provision`. */
export interface AIGatewayWorkspaceProvisionOptions {
  /**
   * Skip the scope-creation step and bind the workspace to an IAM scope that already exists.
   * Requires `scope_name`. Existing bindings on that scope are preserved.
   */
  existingScope?: boolean;
}

/** Result of `AIGatewayWorkspacesClient.provision`. */
export interface GatewayWorkspaceProvisionResult {
  /** The IAM scope after the workspace was bound to it. */
  scope: IamScope;
  /** The `POST /workspaces` response — most of the record, but call `get()` for settings. */
  workspace: GatewayWorkspaceCreateResponse;
  /** `false` when `existingScope` reused a scope instead of creating one. */
  scopeCreated: boolean;
}

/**
 * Which plane to route a workspace read through.
 *
 * - `data` (default) — `/ai_gw/v2`, returns only workspaces the caller holds a workspace-scope
 *   grant on. A workspace outside that scope answers `403 AB03`, not `404`.
 * - `admin` — `/ai_gw/admin/v2`, returns every workspace in the tenant. Needs a tenant-root
 *   admin role.
 */
export type AIGatewayPlane = 'data' | 'admin';

/** Options for `AIGatewayWorkspacesClient.list`. */
export interface AIGatewayWorkspaceListOptions {
  /**
   * Filter by lifecycle state. **Omitting this returns active workspaces only** — archived
   * workspaces are invisible unless asked for explicitly. Lowercase on the wire.
   */
  status?: 'active' | 'archived';
  /** Defaults to `data`. Use `admin` to enumerate the whole tenant. */
  plane?: AIGatewayPlane;
}

/** Options for `AIGatewayWorkspacesClient.get`. */
export interface AIGatewayWorkspaceGetOptions {
  /** Defaults to `data`. Use `admin` to read a workspace outside your workspace scope. */
  plane?: AIGatewayPlane;
}

/**
 * Options for listing workspace-scoped resources. Shared by every sub-client whose `list`
 * (or list-alike) endpoint takes only a workspace UUID — guardrails, providers, api-keys,
 * and configs.
 */
export interface AIGatewayWorkspaceScopedListOptions {
  /** Workspace UUID. Required — omitting it returns `404 AB02`. */
  workspaceId: string;
}
