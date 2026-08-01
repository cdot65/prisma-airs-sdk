import type { AuthAdapter } from '../http/types.js';

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
